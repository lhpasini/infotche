import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getMeusChamadosTecnico } from '../../../actions/tecnico-chamados';

function formatDate(value: Date | string | null | undefined) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleDateString('pt-BR');
}

export default async function TecnicoChamadosPage() {
  const { sessao, chamados } = await getMeusChamadosTecnico();

  if (!sessao) {
    redirect('/tecnico/login');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_28%),linear-gradient(180deg,#eef6ff_0%,#edf2f7_52%,#e2e8f0_100%)] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tecnico em campo</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Meus atendimentos</h1>
          </div>
          <Link
            href="/tecnico"
            className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            Voltar
          </Link>
        </div>

        <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Fila do tecnico</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">Chamados agendados e em andamento</h2>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
              {chamados.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {chamados.length === 0 && (
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                Nenhum chamado direcionado para voce neste momento.
              </div>
            )}

            {chamados.map((chamado) => (
              <Link
                key={chamado.id}
                href={`/tecnico/chamados/${chamado.id}`}
                className="block rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      #{chamado.protocolo}
                    </p>
                    <p className="mt-2 text-lg font-black text-slate-900">{chamado.nomeCliente}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                      chamado.status === 'andamento'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {chamado.status === 'andamento' ? 'Em andamento' : 'Agendado'}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>{chamado.categoria}</p>
                  <p>{chamado.enderecoCompleto}</p>
                  <p>
                    Agendamento: {formatDate(chamado.agendamentoData)}
                    {chamado.agendamentoHora ? ` às ${chamado.agendamentoHora}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
