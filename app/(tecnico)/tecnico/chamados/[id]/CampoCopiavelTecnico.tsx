'use client';

import { useState } from 'react';

type CampoCopiavelTecnicoProps = {
  label: string;
  value: string | null | undefined;
  emptyLabel?: string;
};

export default function CampoCopiavelTecnico({
  label,
  value,
  emptyLabel = 'Nao informado',
}: CampoCopiavelTecnicoProps) {
  const [copiado, setCopiado] = useState(false);
  const valor = value?.trim() || '';

  async function handleCopy() {
    if (!valor) {
      return;
    }

    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className="mt-2 flex items-center justify-between gap-3">
        <span className="min-w-0 break-all text-slate-700">{valor || emptyLabel}</span>
        {valor && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] transition ${
              copiado
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-sky-100 text-sky-700'
            }`}
          >
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </dd>
    </div>
  );
}
