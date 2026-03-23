export function extractDriveFileIdFromUrl(url?: string | null) {
  if (!url) return null;

  const byFilePath = url.match(/\/d\/([^/]+)/);
  if (byFilePath?.[1]) {
    return byFilePath[1];
  }

  const byQuery = url.match(/[?&]id=([^&]+)/);
  if (byQuery?.[1]) {
    return byQuery[1];
  }

  return null;
}

export function buildDriveMediaUrl(fileId?: string | null, url?: string | null) {
  const resolvedFileId = fileId || extractDriveFileIdFromUrl(url);

  if (resolvedFileId) {
    return `/api/google/drive/files/${resolvedFileId}`;
  }

  return url || null;
}

export function inferDriveMediaKind(input: {
  tipo?: string | null;
  mimeType?: string | null;
  nomeArquivo?: string | null;
  url?: string | null;
}) {
  const normalizedTipo = (input.tipo || '').toUpperCase();
  const normalizedMime = (input.mimeType || '').toLowerCase();
  const normalizedName = (input.nomeArquivo || '').toLowerCase();
  const normalizedUrl = (input.url || '').toLowerCase();

  if (normalizedTipo === 'AUDIO' || normalizedMime.startsWith('audio/')) {
    return 'audio';
  }

  if (normalizedTipo === 'VIDEO' || normalizedMime.startsWith('video/')) {
    return 'video';
  }

  if (
    normalizedTipo === 'IMAGEM' ||
    normalizedMime.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(normalizedName) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(normalizedUrl)
  ) {
    return 'image';
  }

  return 'file';
}
