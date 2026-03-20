'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  buscarArquivoMortoWhatsapp,
  getResumoArquivoMortoWhatsapp,
  getUltimosArquivoMortoWhatsapp,
} from '../../../actions/tecnico-registros';

type ArquivoMortoRegistro = {
  id: string;
  dataMensagem: Date | string | null;
  dataTexto: string | null;
  autor: string | null;
  conteudo: string | null;
  tipoConteudo: string;
  arquivoNome: string | null;
  arquivoMime: string | null;
  arquivoUrl: string | null;
  mensagemBruta: string | null;
  importacao: {
    id: string;
    nomeArquivo: string;
    criadoEm: Date | string;
  };
};

type ResumoArquivoMorto = {
  totalMensagens: number;
  totalImportacoes: number;
  totalComAnexo: number;
  totalComMidiaVinculada: number;
  ultimaImportacao: {
    id: string;
    nomeArquivo: string;
    criadoEm: Date | string;
  } | null;
} | null;

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return 'Data nao identificada';
  }

  return new Date(value).toLocaleString('pt-BR');
}

function getTipoLabel(tipoConteudo: string) {
  if (tipoConteudo === 'MIDIA') return 'Com anexo';
  if (tipoConteudo === 'SISTEMA') return 'Sistema';
  return 'Texto';
}

export default function TecnicoArquivoMortoPage() {
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [termo, setTermo] = useState('');
  const [buscou, setBuscou] = useState(false);
  const [resumo, setResumo] = useState<ResumoArquivoMorto>(null);
  const [registros, setRegistros] = useState<ArquivoMortoRegistro[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [resumoData, registrosData] = await Promise.all([
        getResumoArquivoMortoWhatsapp(),
        getUltimosArquivoMortoWhatsapp(),
      ]);

      setResumo(resumoData as ResumoArquivoMorto);
      setRegistros(registrosData as ArquivoMortoRegistro[]);
      setLoading(false);
    }

    load();
  }, []);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const busca = termo.trim();

    setSearching(true);
    setBuscou(true);

    if (!busca) {
      const data = await getUltimosArquivoMortoWhatsapp();
      setRegistros(data as ArquivoMortoRegistro[]);
      setSearching(false);
      return;
    }

    const data = await buscarArquivoMortoWhatsapp(busca);
    setRegistros(data as ArquivoMortoRegistro[]);
    setSearching(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,transparent_24%),linear-gradient(180deg,#fff7ed_0%,#f8fafc_46%,#e2e8f0_100%)] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Legado</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Arquivo morto</h1>
          </div>
          <Link href="/tecnico" className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
            Voltar
          </Link>
        </div>

        <section className="rounded-[30px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-sm leading-6 text-slate-600">
            Esta area preserva o historico antigo vindo do grupo do WhatsApp, com linha bruta, autor, data e nome do anexo quando existir.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-amber-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Mensagens</p>
              <p className="mt-2 text-lg font-black text-slate-900">{resumo?.totalMensagens ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Importacoes</p>
              <p className="mt-2 text-lg font-black text-slate-900">{resumo?.totalImportacoes ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Ultima carga</p>
              <p className="mt-2 text-sm font-black text-slate-900">
                {resumo?.ultimaImportacao ? formatDate(resumo.ultimaImportacao.criadoEm) : '-'}
              </p>
            </div>
            <div className="rounded-2xl bg-orange-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">Com anexo</p>
              <p className="mt-2 text-lg font-black text-slate-900">{resumo?.totalComAnexo ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Midia vinculada</p>
              <p className="mt-2 text-lg font-black text-slate-900">{resumo?.totalComMidiaVinculada ?? '-'}</p>
            </div>
          </div>

          {resumo?.ultimaImportacao && (
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Origem mais recente: {resumo.ultimaImportacao.nomeArquivo}
            </p>
          )}

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {resumo
              ? `${resumo.totalComMidiaVinculada} de ${resumo.totalComAnexo} registros com anexo ja possuem link de midia.`
              : 'Carregando situacao das midias antigas.'}
          </p>
        </section>

        <form onSubmit={handleSearch} className="rounded-[30px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Buscar por cliente, trecho, tecnico antigo ou nome de arquivo
            </span>
            <input
              value={termo}
              onChange={(event) => setTermo(event.target.value)}
              placeholder="Ex: ROMEL, roteador 9353, IMG-20230904..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-amber-500 focus:bg-white"
            />
          </label>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={loading || searching}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-4 text-base font-black text-white transition hover:bg-slate-800 disabled:opacity-70"
            >
              {searching ? 'Buscando...' : 'Buscar no arquivo morto'}
            </button>
            <button
              type="button"
              disabled={loading || searching}
              onClick={async () => {
                setTermo('');
                setBuscou(false);
                setSearching(true);
                const data = await getUltimosArquivoMortoWhatsapp();
                setRegistros(data as ArquivoMortoRegistro[]);
                setSearching(false);
              }}
              className="rounded-2xl border border-slate-200 px-4 py-4 text-sm font-black text-slate-700 disabled:opacity-70"
            >
              Recentes
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {loading && (
            <div className="rounded-[30px] border border-white/70 bg-white/95 p-5 text-sm leading-6 text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              Carregando arquivo morto...
            </div>
          )}

          {!loading && registros.map((registro) => (
            <section key={registro.id} className="rounded-[30px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{registro.autor || 'Sem autor identificado'}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                    {getTipoLabel(registro.tipoConteudo)}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {registro.dataTexto || formatDate(registro.dataMensagem)}
                </span>
              </div>

              {registro.arquivoNome && (
                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-4">
                  <p className="text-sm font-black text-slate-900">{registro.arquivoNome}</p>
                  <p className="mt-1 text-xs text-slate-500">{registro.arquivoMime || 'Anexo importado sem URL nesta etapa'}</p>
                  {registro.arquivoUrl ? (
                    <a
                      href={registro.arquivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800"
                    >
                      Abrir anexo
                    </a>
                  ) : (
                    <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                      Midia ainda nao vinculada
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-700">
                <p className="whitespace-pre-line">{registro.conteudo || 'Sem conteudo tratado.'}</p>
              </div>

              <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <summary className="cursor-pointer text-sm font-black text-slate-700">
                  Ver linha bruta preservada
                </summary>
                <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                  {registro.mensagemBruta || 'Linha bruta indisponivel.'}
                </pre>
              </details>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Importacao: {registro.importacao.nomeArquivo} | {formatDate(registro.importacao.criadoEm)}
              </p>
            </section>
          ))}

          {!loading && registros.length === 0 && (
            <div className="rounded-[30px] border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-800 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              {buscou
                ? 'Nenhum registro encontrado para esse termo no arquivo morto.'
                : 'Ainda nao ha registros disponiveis no arquivo morto.'}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
