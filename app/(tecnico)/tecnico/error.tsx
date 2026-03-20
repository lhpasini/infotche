'use client';

import { useEffect } from 'react';

type TecnicoErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TecnicoErrorPage({ error, reset }: TecnicoErrorPageProps) {
  useEffect(() => {
    console.error('Erro no modulo tecnico:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">Falha no modulo tecnico</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Algo quebrou ao carregar a pagina</h1>
        <p className="mt-3 text-sm text-slate-600">
          A mensagem abaixo ajuda a identificar exatamente o ponto que falhou no navegador.
        </p>

        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Mensagem</p>
          <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-rose-800">
            {error.message || 'Erro desconhecido no cliente.'}
          </pre>
          {error.digest && (
            <p className="mt-3 text-xs text-rose-700">Digest: {error.digest}</p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
          >
            Tentar novamente
          </button>
          <a
            href="/tecnico"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"
          >
            Voltar ao painel
          </a>
        </div>
      </div>
    </main>
  );
}
