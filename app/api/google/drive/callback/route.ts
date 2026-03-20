import { NextResponse } from 'next/server';
import { saveGoogleDriveTokens } from '../../../../../lib/google-drive-oauth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/tecnico?drive=error&reason=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/tecnico?drive=missing_code', request.url));
  }

  try {
    await saveGoogleDriveTokens(code);
    return NextResponse.redirect(new URL('/tecnico?drive=connected', request.url));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha ao concluir conexão com Google Drive.';
    return NextResponse.redirect(new URL(`/tecnico?drive=error&reason=${encodeURIComponent(message)}`, request.url));
  }
}
