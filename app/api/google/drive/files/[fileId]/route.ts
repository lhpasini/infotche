import { NextResponse } from 'next/server';
import { google } from 'googleapis';

import { getAuthSession } from '../../../../../../lib/auth-session';
import { getAuthorizedGoogleDriveClient } from '../../../../../../lib/google-drive-oauth';

function sanitizeFilename(value: string | null | undefined) {
  return (value || 'arquivo')
    .replace(/[\r\n"]/g, '')
    .trim();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const sessao = await getAuthSession();

    if (!sessao) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
    }

    const { fileId } = await context.params;
    const oauth = await getAuthorizedGoogleDriveClient();
    const drive = google.drive({ version: 'v3', auth: oauth.client });

    const metadata = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType',
      supportsAllDrives: true,
    });

    const media = await drive.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      {
        responseType: 'arraybuffer',
      }
    );

    const mimeType = metadata.data.mimeType || 'application/octet-stream';
    const fileName = sanitizeFilename(metadata.data.name);
    const body = Buffer.from(media.data as ArrayBuffer);

    return new NextResponse(body, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Erro ao servir arquivo do Google Drive:', error);
    return NextResponse.json({ error: 'Nao foi possivel carregar o arquivo.' }, { status: 500 });
  }
}
