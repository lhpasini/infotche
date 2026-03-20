'use client';

import { useState } from 'react';
import Link from 'next/link';
import { buscarHistoricoEquipamentosCompleto } from '../../../actions/tecnico-registros';

type HistoricoItem = {
  id: string;
  tipoEquipamento: string;
  marca: string | null;
  modelo: string | null;
  codigoEquipamento: string | null;
  macAddress: string | null;
  serialNumber: string | null;
  imagemUrl: string | null;
};

type HistoricoRegistro = {
  id: string;
  clienteNome: string;
  tipoAtendimento: string;
  criadoEm: Date | string;
  tecnico: { nome: string };
  itens: HistoricoItem[];
};

type HistoricoLegado = {
  id: string;
  dataMensagem: Date | string | null;
  autor: string | null;
  conteudo: string | null;
  tipoConteudo: string;
  arquivoNome: string | null;
  arquivoMime: string | null;
  arquivoUrl: string | null;
  importacao: {
    nomeArquivo: string;
    criadoEm: Date | string;
  };
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString('pt-BR');
}

export default function TecnicoHistoricoPage() {
  const [termo, setTermo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<HistoricoRegistro[]>([]);
  const [legadoResultados, setLegadoResultados] = useState<HistoricoLegado[]>([]);
  const [buscou, setBuscou] = useState(false);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setBuscou(true);
    const data = await buscarHistoricoEquipamentosCompleto(termo);
    setResultados(data.registros as HistoricoRegistro[]);
    setLegadoResultados(data.legado as HistoricoLegado[]);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_28%),linear-gradient(180deg,#eef6ff_0%,#edf2f7_52%,#e2e8f0_100%)] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Consulta</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Historico de equipamentos</h1>
          </div>
          <Link href="/tecnico" className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
            Voltar
          </Link>
        </div>

        <form onSubmit={handleSearch} className="rounded-[30px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Cliente, MAC, serial, modelo ou codigo
            </span>
            <input
              value={termo}
              onChange={(event) => setTermo(event.target.value)}
              placeholder="Ex: Joao, D4:3F..., FHTT..., WS7000..., grupo antigo..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-black text-white transition hover:bg-slate-800 disabled:opacity-70"
          >
            {loading ? 'Consultando...' : 'Buscar historico completo'}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            A busca agora une o historico novo dos atendimentos com o arquivo morto importado do WhatsApp.
          </p>
        </form>

        <div className="space-y-4">
          {resultados.length > 0 && (
            <div className="rounded-[30px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Origem</p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Registros novos</h2>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                  {resultados.length}
                </span>
              </div>
            </div>
          )}

          {resultados.map((registro) => (
            <section key={registro.id} className="rounded-[30px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{registro.clienteNome}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-700">{registro.tipoAtendimento}</p>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                  {registro.itens.length} item(ns)
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Tecnico: {registro.tecnico.nome} | {formatDate(registro.criadoEm)}
              </p>

              <div className="mt-4 space-y-3">
                {registro.itens.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {item.tipoEquipamento}
                          {item.marca || item.modelo ? ` - ${[item.marca, item.modelo].filter(Boolean).join(' / ')}` : ''}
                        </p>
                        <div className="mt-3 space-y-1 text-sm text-slate-600">
                          <p>MAC: {item.macAddress || 'Nao informado'}</p>
                          <p>Serial: {item.serialNumber || 'Nao informado'}</p>
                          <p>Codigo: {item.codigoEquipamento || 'Nao informado'}</p>
                        </div>
                        <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${item.imagemUrl ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {item.imagemUrl ? 'Foto enviada ao Drive' : 'Sem foto no Drive'}
                        </span>
                      </div>

                      {item.imagemUrl && (
                        <a
                          href={item.imagemUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"
                        >
                          Abrir foto
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {legadoResultados.length > 0 && (
            <div className="rounded-[30px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Origem</p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Arquivo morto do WhatsApp</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {legadoResultados.length}
                </span>
              </div>
            </div>
          )}

          {legadoResultados.map((registro) => (
            <section key={registro.id} className="rounded-[30px] border border-amber-100 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{registro.autor || 'Mensagem sem autor identificado'}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                    {registro.tipoConteudo === 'MIDIA' ? 'Midia do arquivo morto' : 'Mensagem do arquivo morto'}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {registro.dataMensagem ? formatDate(registro.dataMensagem) : 'Data nao identificada'}
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Importacao: {registro.importacao.nomeArquivo} | {formatDate(registro.importacao.criadoEm)}
              </p>

              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-4 text-sm leading-6 text-slate-700">
                {registro.conteudo ? (
                  <p className="whitespace-pre-line">{registro.conteudo}</p>
                ) : (
                  <p>Mensagem sem texto util. Consulte o anexo associado.</p>
                )}
              </div>

              {(registro.arquivoNome || registro.arquivoUrl) && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <div>
                    <p className="text-sm font-black text-slate-900">{registro.arquivoNome || 'Anexo importado'}</p>
                    <p className="mt-1 text-xs text-slate-500">{registro.arquivoMime || 'Tipo de arquivo nao identificado'}</p>
                  </div>
                  {registro.arquivoUrl && (
                    <a
                      href={registro.arquivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-800"
                    >
                      Abrir anexo
                    </a>
                  )}
                </div>
              )}
            </section>
          ))}

          {!loading && !buscou && (
            <div className="rounded-[30px] border border-white/70 bg-white/95 p-5 text-sm leading-6 text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              Faca uma busca para consultar o ciclo de vida dos equipamentos registrados e o historico antigo vindo do WhatsApp.
            </div>
          )}

          {!loading && buscou && resultados.length === 0 && legadoResultados.length === 0 && (
            <div className="rounded-[30px] border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-800 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              Nenhum resultado encontrado para esse termo. Tente buscar por cliente, serial, MAC, modelo, nome de arquivo ou trecho da conversa.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
