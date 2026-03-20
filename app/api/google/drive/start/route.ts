import { NextResponse } from 'next/server';
import { getGoogleDriveAuthUrl } from '../../../../../lib/google-drive-oauth';

export async function GET() {
  try {
    const url = getGoogleDriveAuthUrl();
    return NextResponse.redirect(url);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha ao iniciar conexão com Google Drive.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
