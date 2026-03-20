import { Readable } from 'stream';
import { google } from 'googleapis';
import { getAuthorizedGoogleDriveClient } from './google-drive-oauth';

export async function uploadBufferToDrive({
  buffer,
  filename,
  mimeType,
}: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}) {
  const oauth = await getAuthorizedGoogleDriveClient();
  const drive = google.drive({ version: 'v3', auth: oauth.client });

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [oauth.folderId],
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
    throw new Error('Falha ao criar arquivo no Google Drive.');
  }

  return {
    fileId,
    url: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  };
}
