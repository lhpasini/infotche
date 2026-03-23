'use client';

import { buildDriveMediaUrl, inferDriveMediaKind } from '../lib/drive-media';

type Props = {
  fileId?: string | null;
  url?: string | null;
  mimeType?: string | null;
  tipo?: string | null;
  nomeArquivo?: string | null;
  heightClassName?: string;
  compact?: boolean;
};

export default function DriveMediaPreview(props: Props) {
  const resolvedUrl = buildDriveMediaUrl(props.fileId, props.url);
  const kind = inferDriveMediaKind({
    tipo: props.tipo,
    mimeType: props.mimeType,
    nomeArquivo: props.nomeArquivo,
    url: props.url,
  });

  if (!resolvedUrl) {
    return <span className="text-sm text-slate-500">Arquivo indisponivel</span>;
  }

  const heightClassName = props.heightClassName || 'h-48';

  if (kind === 'image') {
    return (
      <div className="space-y-3">
        <img
          src={resolvedUrl}
          alt={props.nomeArquivo || 'Imagem enviada'}
          className={`w-full rounded-2xl border border-slate-200 bg-slate-100 object-cover ${heightClassName}`}
        />
        {!props.compact && (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"
          >
            Abrir imagem
          </a>
        )}
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="space-y-3">
        <audio controls preload="none" src={resolvedUrl} className="w-full" />
        {!props.compact && (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"
          >
            Abrir audio
          </a>
        )}
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="space-y-3">
        <video controls preload="metadata" src={resolvedUrl} className={`w-full rounded-2xl border border-slate-200 bg-black ${heightClassName}`} />
        {!props.compact && (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"
          >
            Abrir video
          </a>
        )}
      </div>
    );
  }

  return (
    <a
      href={resolvedUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"
    >
      Abrir arquivo
    </a>
  );
}
