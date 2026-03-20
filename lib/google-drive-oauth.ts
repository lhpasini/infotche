import { google } from 'googleapis';
import { prisma } from './prisma';

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const GOOGLE_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Configuracao OAuth do Google Drive incompleta.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleDriveAuthUrl() {
  const client = getGoogleOAuthClient();

  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GOOGLE_DRIVE_SCOPE, GOOGLE_EMAIL_SCOPE],
  });
}

export async function saveGoogleDriveTokens(code: string) {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID nao configurado.');
  }

  const existing = await prisma.integracaoGoogleDrive.findFirst({
    orderBy: { atualizadoEm: 'desc' },
  });

  const refreshToken = tokens.refresh_token || existing?.refreshToken || null;

  if (!refreshToken) {
    throw new Error('O Google nao retornou refresh token. Tente reconectar com consentimento.');
  }

  const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
  let email = existing?.email || 'google-drive';

  try {
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: client, version: 'v2' });
    const userInfo = await oauth2.userinfo.get();
    email = userInfo.data.email || email;
  } catch {
    // O upload para o Drive funciona mesmo sem buscar o perfil do usuario.
  }

  const data = {
    email,
    refreshToken,
    accessToken: tokens.access_token || existing?.accessToken || null,
    scope: tokens.scope || existing?.scope || null,
    tokenType: tokens.token_type || existing?.tokenType || null,
    expiryDate,
    pastaId: folderId,
  };

  if (existing) {
    return prisma.integracaoGoogleDrive.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.integracaoGoogleDrive.create({ data });
}

export async function getGoogleDriveConnection() {
  return prisma.integracaoGoogleDrive.findFirst({
    orderBy: { atualizadoEm: 'desc' },
  });
}

export async function getAuthorizedGoogleDriveClient() {
  const connection = await getGoogleDriveConnection();

  if (!connection) {
    throw new Error('Google Drive ainda nao foi conectado via OAuth.');
  }

  const client = getGoogleOAuthClient();
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
