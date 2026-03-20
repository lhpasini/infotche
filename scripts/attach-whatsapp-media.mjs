import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import JSZip from 'jszip';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

function printUsage() {
  console.log('Uso: node scripts/attach-whatsapp-media.mjs "<caminho-do-zip>" "<importacaoId>" [--dry-run]');
}

function sanitizeFilename(value) {
  return value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
}

function detectMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  const mimeByExtension = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/ogg',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
  };

  return mimeByExtension[extension] || 'application/octet-stream';
}

async function getAuthorizedGoogleDriveClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Variaveis do OAuth do Google Drive nao configuradas.');
  }

  const connection = await prisma.integracaoGoogleDrive.findFirst({
    orderBy: { atualizadoEm: 'desc' },
  });

  if (!connection) {
    throw new Error('Google Drive ainda nao foi conectado via OAuth.');
  }

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({
    refresh_token: connection.refreshToken,
    access_token: connection.accessToken || undefined,
    expiry_date: connection.expiryDate ? connection.expiryDate.getTime() : undefined,
    scope: connection.scope || undefined,
    token_type: connection.tokenType || undefined,
  });

  client.on('tokens', async (tokens) => {
    await prisma.integracaoGoogleDrive.update({
      where: { id: connection.id },
      data: {
        accessToken: tokens.access_token || connection.accessToken,
        refreshToken: tokens.refresh_token || connection.refreshToken,
        scope: tokens.scope || connection.scope,
        tokenType: tokens.token_type || connection.tokenType,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : connection.expiryDate,
      },
    });
  });

  return {
    client,
    folderId: connection.pastaId,
  };
}

async function uploadBufferToDrive(driveAuth, buffer, filename, mimeType) {
  const drive = google.drive({ version: 'v3', auth: driveAuth.client });
  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [driveAuth.folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error(`Falha ao subir ${filename} para o Google Drive.`);
  }

  return {
    fileId,
    url: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  };
}

async function main() {
  const zipPath = process.argv[2];
  const importacaoId = process.argv[3];
  const dryRun = process.argv.includes('--dry-run');

  if (!zipPath || !importacaoId) {
    printUsage();
    process.exit(1);
  }

  const importacao = await prisma.importacaoArquivoMortoWhatsapp.findUnique({
    where: { id: importacaoId },
  });

  if (!importacao) {
    throw new Error(`Importacao ${importacaoId} nao encontrada.`);
  }

  const registros = await prisma.arquivoMortoWhatsappMensagem.findMany({
    where: {
      importacaoId,
      arquivoNome: { not: null },
    },
    select: {
      id: true,
      arquivoNome: true,
      arquivoUrl: true,
      driveFileId: true,
    },
  });

  const pendingByFilename = new Map();
  let alreadyLinked = 0;

  for (const registro of registros) {
    if (registro.arquivoUrl || registro.driveFileId) {
      alreadyLinked += 1;
      continue;
    }

    const fileName = registro.arquivoNome;
    if (!fileName) continue;

    const current = pendingByFilename.get(fileName) || [];
    current.push(registro.id);
    pendingByFilename.set(fileName, current);
  }

  const zipBuffer = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipBuffer);
  const zipEntries = Object.values(zip.files).filter((entry) => !entry.dir && !entry.name.startsWith('__MACOSX/'));
  const entryMap = new Map(zipEntries.map((entry) => [path.basename(entry.name), entry]));

  const missingFiles = [];
  for (const filename of pendingByFilename.keys()) {
    if (!entryMap.has(filename)) {
      missingFiles.push(filename);
    }
  }

  console.log(`Importacao: ${importacao.id}`);
  console.log(`Arquivo original: ${importacao.nomeArquivo}`);
  console.log(`Registros com anexo: ${registros.length}`);
  console.log(`Ja vinculados a URL/Drive: ${alreadyLinked}`);
  console.log(`Arquivos pendentes unicos: ${pendingByFilename.size}`);
  console.log(`Arquivos ausentes no ZIP: ${missingFiles.length}`);

  if (missingFiles.length > 0) {
    console.log('Exemplos de arquivos ausentes:');
    missingFiles.slice(0, 10).forEach((filename) => console.log(`- ${filename}`));
  }

  if (dryRun) {
    console.log('Pre-analise concluida sem upload.');
    return;
  }

  const driveAuth = await getAuthorizedGoogleDriveClient();
  let uploaded = 0;
  let updatedRows = 0;

  for (const [filename, rowIds] of pendingByFilename.entries()) {
    const entry = entryMap.get(filename);
    if (!entry) {
      continue;
    }

    const buffer = await entry.async('nodebuffer');
    const mimeType = detectMimeType(filename);
    const upload = await uploadBufferToDrive(
      driveAuth,
      buffer,
      sanitizeFilename(`arquivo-morto-${importacao.id}-${filename}`),
      mimeType,
    );

    const result = await prisma.arquivoMortoWhatsappMensagem.updateMany({
      where: {
        id: { in: rowIds },
        arquivoUrl: null,
        driveFileId: null,
      },
      data: {
        arquivoMime: mimeType,
        arquivoUrl: upload.url,
        driveFileId: upload.fileId,
      },
    });

    uploaded += 1;
    updatedRows += result.count;
    console.log(`Midia enviada ${uploaded}/${pendingByFilename.size}: ${filename} -> ${result.count} registro(s)`);
  }

  const totalLinked = await prisma.arquivoMortoWhatsappMensagem.count({
    where: {
      importacaoId: importacao.id,
      arquivoUrl: { not: null },
    },
  });

  await prisma.importacaoArquivoMortoWhatsapp.update({
    where: { id: importacao.id },
    data: {
      totalMidias: totalLinked,
    },
  });

  console.log('Vinculacao de midias concluida.');
  console.log(`Arquivos enviados ao Drive: ${uploaded}`);
  console.log(`Linhas atualizadas no banco: ${updatedRows}`);
  console.log(`Total acumulado de registros com link: ${totalLinked}`);
}

main()
  .catch(async (error) => {
    console.error('Falha ao anexar midias do arquivo morto.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
