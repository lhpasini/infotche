import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import JSZip from 'jszip';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

function printUsage() {
  console.log('Uso: node scripts/import-whatsapp-archive.mjs "<caminho-do-zip>" [--no-drive]');
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

function parseWhatsAppDate(rawDate, rawTime) {
  const [day, month, yearRaw] = rawDate.split('/');
  let normalizedTime = rawTime.trim().replace(/\u202f/g, ' ');
  const hasAmPm = /\b(am|pm)\b/i.test(normalizedTime);
  let [timePart, amPm] = normalizedTime.split(/\s+/);
  let [hours, minutes, seconds = '00'] = timePart.split(':');

  let year = Number(yearRaw);
  if (yearRaw.length === 2) {
    year += year >= 70 ? 1900 : 2000;
  }

  let hourNumber = Number(hours);
  if (hasAmPm) {
    const period = amPm.toLowerCase();
    if (period === 'pm' && hourNumber < 12) hourNumber += 12;
    if (period === 'am' && hourNumber === 12) hourNumber = 0;
  }

  const iso = `${String(year).padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${String(hourNumber).padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractAttachmentFilename(content, availableFiles) {
  if (!content) return null;

  const directMatch = content.match(/([A-Za-z0-9._-]+\.(?:jpg|jpeg|png|gif|webp|mp4|mov|mp3|ogg|opus|pdf))/i);
  if (directMatch) {
    const filename = directMatch[1];
    if (availableFiles.has(filename)) {
      return filename;
    }
  }

  for (const filename of availableFiles) {
    if (content.includes(filename)) {
      return filename;
    }
  }

  return null;
}

function inferContentType(content, attachmentFilename) {
  if (attachmentFilename) {
    return 'MIDIA';
  }

  if (!content || !content.trim()) {
    return 'SISTEMA';
  }

  return 'TEXTO';
}

function isIgnorableSystemMessage(content, autor) {
  const normalized = (content || '').trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (normalized === 'mensagem apagada') {
    return true;
  }

  if (autor) {
    return false;
  }

  const ignorablePatterns = [
    'as mensagens e ligações são protegidas com a criptografia de ponta a ponta',
    'as mensagens e ligacoes sao protegidas com a criptografia de ponta a ponta',
    'você criou este grupo',
    'voce criou este grupo',
    'mudou a descrição do grupo',
    'mudou a descricao do grupo',
    'mudou o ícone deste grupo',
    'mudou o icone deste grupo',
    'adicionou',
    'entrou usando o link de convite deste grupo',
    'saiu',
    'foi removido',
  ];

  return ignorablePatterns.some((pattern) => normalized.includes(pattern));
}

function parseWhatsAppMessages(chatText, availableFiles) {
  const lines = chatText.replace(/^\uFEFF/, '').split(/\r?\n/);
  const messages = [];
  const headerRegex = /^(\[)?(\d{1,2}\/\d{1,2}\/\d{2,4})(?:,)?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APMapm]{2})?)(\])?\s+-\s+(.*)$/;
  let current = null;

  for (const line of lines) {
    const match = line.match(headerRegex);

    if (match) {
      if (current) {
        messages.push(current);
      }

      const [, , rawDate, rawTime, , tail] = match;
      const authorSplitIndex = tail.indexOf(': ');
      const autor = authorSplitIndex >= 0 ? tail.slice(0, authorSplitIndex).trim() : null;
      const content = authorSplitIndex >= 0 ? tail.slice(authorSplitIndex + 2).trim() : tail.trim();
      const attachmentFilename = extractAttachmentFilename(content, availableFiles);

      current = {
        dataMensagem: parseWhatsAppDate(rawDate, rawTime),
        dataTexto: `${rawDate} ${rawTime}`.trim(),
        autor,
        conteudo: content || null,
        tipoConteudo: inferContentType(content, attachmentFilename),
        arquivoNome: attachmentFilename,
        mensagemBruta: line,
      };

      continue;
    }

    if (current) {
      current.conteudo = current.conteudo ? `${current.conteudo}\n${line}` : line;
      current.mensagemBruta = `${current.mensagemBruta}\n${line}`;
      if (!current.arquivoNome) {
        current.arquivoNome = extractAttachmentFilename(current.conteudo, availableFiles);
        current.tipoConteudo = inferContentType(current.conteudo, current.arquivoNome);
      }
    }
  }

  if (current) {
    messages.push(current);
  }

  const kept = [];
  let ignoredCount = 0;

  for (const message of messages) {
    if (isIgnorableSystemMessage(message.conteudo, message.autor)) {
      ignoredCount += 1;
      continue;
    }

    kept.push(message);
  }

  return {
    messages: kept,
    ignoredCount,
    totalParsed: messages.length,
  };
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
  const uploadToDrive = !process.argv.includes('--no-drive');
  const dryRun = process.argv.includes('--dry-run');

  if (!zipPath) {
    printUsage();
    process.exit(1);
  }

  const zipBuffer = await fs.readFile(zipPath);
  const zip = await JSZip.loadAsync(zipBuffer);
  const zipEntries = Object.values(zip.files).filter((entry) => !entry.dir && !entry.name.startsWith('__MACOSX/'));
  const txtEntry = zipEntries.find((entry) => entry.name.toLowerCase().endsWith('.txt'));

  if (!txtEntry) {
    throw new Error('Nenhum arquivo .txt de conversa foi encontrado dentro do ZIP.');
  }

  const availableFiles = new Set(
    zipEntries
      .map((entry) => path.basename(entry.name))
      .filter((filename) => filename !== path.basename(txtEntry.name)),
  );

  const chatText = await txtEntry.async('string');
  const parsed = parseWhatsAppMessages(chatText, availableFiles);
  const messages = parsed.messages;
  const mediaReferenced = new Set(messages.map((message) => message.arquivoNome).filter(Boolean));

  if (messages.length === 0) {
    throw new Error('Nenhuma mensagem valida foi identificada no arquivo exportado.');
  }

  if (dryRun) {
    console.log('Pre-analise concluida.');
    console.log(`Arquivo: ${path.basename(zipPath)}`);
    console.log(`Mensagens lidas: ${parsed.totalParsed}`);
    console.log(`Mensagens mantidas: ${messages.length}`);
    console.log(`Mensagens ignoradas: ${parsed.ignoredCount}`);
    console.log(`Midias encontradas no ZIP: ${availableFiles.size}`);
    console.log(`Midias referenciadas nas mensagens: ${mediaReferenced.size}`);
    console.log(`Primeira mensagem: ${messages[0].dataTexto || 'sem data'}`);
    console.log(`Ultima mensagem: ${messages[messages.length - 1].dataTexto || 'sem data'}`);
    console.log('Amostra de mensagens mantidas:');
    messages.slice(0, 5).forEach((message, index) => {
      console.log(`--- ${index + 1} ---`);
      console.log(`DATA: ${message.dataTexto || 'sem data'}`);
      console.log(`AUTOR: ${message.autor || 'sem autor'}`);
      console.log(`TIPO: ${message.tipoConteudo}`);
      console.log(`ANEXO: ${message.arquivoNome || 'sem anexo'}`);
      console.log(`CONTEUDO: ${(message.conteudo || '').slice(0, 220)}`);
      console.log(`BRUTA: ${(message.mensagemBruta || '').slice(0, 220)}`);
    });
    return;
  }

  const driveAuth = uploadToDrive ? await getAuthorizedGoogleDriveClient() : null;
  const mediaCache = new Map();
  let uploadedMediaCount = 0;

  const importacao = await prisma.importacaoArquivoMortoWhatsapp.create({
    data: {
      nomeArquivo: path.basename(zipPath),
      totalMensagens: messages.length,
      totalMidias: mediaReferenced.size,
    },
  });

  console.log(`Importacao criada: ${importacao.id}`);
  console.log(`Mensagens lidas: ${parsed.totalParsed}`);
  console.log(`Mensagens mantidas: ${messages.length}`);
  console.log(`Mensagens ignoradas: ${parsed.ignoredCount}`);

  const records = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    let arquivoUrl = null;
    let driveFileId = null;
    let arquivoMime = message.arquivoNome ? detectMimeType(message.arquivoNome) : null;

    if (message.arquivoNome && driveAuth) {
      if (!mediaCache.has(message.arquivoNome)) {
        const mediaEntry = zipEntries.find((entry) => path.basename(entry.name) === message.arquivoNome);

        if (mediaEntry) {
          const mediaBuffer = await mediaEntry.async('nodebuffer');
          const upload = await uploadBufferToDrive(
            driveAuth,
            mediaBuffer,
            sanitizeFilename(`arquivo-morto-${Date.now()}-${message.arquivoNome}`),
            arquivoMime || 'application/octet-stream',
          );

          mediaCache.set(message.arquivoNome, upload);
          uploadedMediaCount += 1;
          console.log(`Midia enviada (${uploadedMediaCount}): ${message.arquivoNome}`);
        }
      }

      const cachedUpload = mediaCache.get(message.arquivoNome);
      arquivoUrl = cachedUpload?.url || null;
      driveFileId = cachedUpload?.fileId || null;
    }

    records.push({
      importacaoId: importacao.id,
      dataMensagem: message.dataMensagem,
      dataTexto: message.dataTexto,
      autor: message.autor,
      conteudo: message.conteudo,
      tipoConteudo: message.tipoConteudo,
      arquivoNome: message.arquivoNome,
      arquivoMime,
      arquivoUrl,
      driveFileId,
      mensagemBruta: message.mensagemBruta,
    });

    if (records.length === 200 || index === messages.length - 1) {
      await prisma.arquivoMortoWhatsappMensagem.createMany({
        data: records,
      });
      records.length = 0;
      console.log(`Mensagens gravadas ate agora: ${index + 1}/${messages.length}`);
    }
  }

  await prisma.importacaoArquivoMortoWhatsapp.update({
    where: { id: importacao.id },
    data: {
      totalMidias: uploadedMediaCount,
    },
  });

  console.log('Importacao concluida com sucesso.');
  console.log(`Total de mensagens: ${messages.length}`);
  console.log(`Total de midias enviadas ao Drive: ${uploadedMediaCount}`);
}

main()
  .catch(async (error) => {
    console.error('Falha ao importar arquivo morto do WhatsApp.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
