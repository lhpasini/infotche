'use client';

import { useState } from 'react';
import { buildDriveMediaUrl, inferDriveMediaKind } from '../lib/drive-media';

type Props = {
  fileId?: string | null;
  url?: string | null;
  mimeType?: string | null;
  tipo?: string | null;
  nomeArquivo?: string | null;
  heightClassName?: string;
  compact?: boolean;
  expandable?: boolean;
};

export default function DriveMediaPreview(props: Props) {
  const [open, setOpen] = useState(false);
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
      <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => props.expandable && setOpen(true)}
          className={`w-full ${props.expandable ? 'cursor-zoom-in' : 'cursor-default'} bg-transparent p-0 text-left border-none`}
          style={{ border: 'none', background: 'transparent' }}
        >
          <img
            src={resolvedUrl}
            alt={props.nomeArquivo || 'Imagem enviada'}
            className={`w-full rounded-2xl border border-slate-200 bg-slate-100 object-cover ${heightClassName}`}
          />
        </button>
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
      {props.expandable && open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[1700] flex items-center justify-center bg-slate-950/80 p-6"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] rounded-[28px] bg-white p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-black text-slate-900">{props.nomeArquivo || 'Imagem enviada'}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
              >
                Fechar
              </button>
            </div>
            <img
              src={resolvedUrl}
              alt={props.nomeArquivo || 'Imagem enviada'}
              className="max-h-[80vh] max-w-[88vw] rounded-[20px] object-contain"
            />
          </div>
        </div>
      )}
      </>
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
