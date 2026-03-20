import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getResumoTecnico } from '../../actions/tecnico-registros';
import { fazerLogout } from '../../actions/auth';

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString('pt-BR');
}

export default async function TecnicoDashboardPage() {
  const { sessao, recentes } = await getResumoTecnico();

  if (!sessao) {
    redirect('/tecnico/login');
  }

  async function logoutAction() {
    'use server';

    await fazerLogout();
    redirect('/tecnico/login');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_28%),linear-gradient(180deg,#eef6ff_0%,#edf2f7_52%,#e2e8f0_100%)] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <section className="overflow-hidden rounded-[32px] border border-sky-100 bg-[linear-gradient(145deg,#082f49_0%,#0f172a_62%,#111827_100%)] px-5 py-6 text-white shadow-[0_24px_50px_rgba(15,23,42,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Infotche / Mhnet</p>
              <h1 className="mt-3 text-3xl font-black">Painel tecnico</h1>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-200">
                Registre equipamentos em campo com o minimo de toque e acompanhe os ultimos atendimentos.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-lg font-black text-white ring-1 ring-white/10">
              {sessao.nome.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-4 ring-1 ring-white/10">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-200">Tecnico</p>
              <p className="mt-2 text-sm font-black">{sessao.nome}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-4 ring-1 ring-white/10">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-200">Atendimentos</p>
              <p className="mt-2 text-sm font-black">{recentes.length} recente(s)</p>
            </div>
          </div>

          <form action={logoutAction} className="mt-5">
            <button
              type="submit"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15"
            >
              Sair
            </button>
          </form>
        </section>

        <Link
          href="/tecnico/novo"
          className="overflow-hidden rounded-[30px] bg-[linear-gradient(145deg,#0f172a_0%,#0b3b5f_100%)] px-5 py-6 text-white shadow-[0_22px_38px_rgba(15,23,42,0.18)] transition hover:translate-y-[-1px]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-100">Acao principal</p>
          <h2 className="mt-2 text-2xl font-black text-white">Adicionar novo registro</h2>
          <p className="mt-3 text-sm leading-6 text-slate-100">
            Comece um atendimento novo, leia a etiqueta com a camera e salve um ou mais equipamentos.
          </p>
        </Link>

        <Link
          href="/tecnico/historico"
          className="rounded-[30px] border border-white/70 bg-white/95 px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:translate-y-[-1px]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Consulta</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Consultar historico completo</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Busque por cliente, MAC, serial, modelo, codigo ou conversas antigas para enxergar o ciclo de vida do equipamento.
          </p>
        </Link>

        <Link
          href="/tecnico/arquivo-morto"
          className="rounded-[30px] border border-amber-100 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:translate-y-[-1px]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Legado</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Arquivo morto do WhatsApp</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Consulte o acervo antigo preservado com texto tratado, linha bruta e referencia dos anexos originais.
          </p>
        </Link>

        <section className="rounded-[30px] border border-white/70 bg-white/95 px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ultimos registros</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">Movimento recente</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {recentes.length}
            </span>
          </div>

          <div className="space-y-3">
            {recentes.length === 0 && (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                Ainda nao ha registros novos nesta ferramenta.
              </p>
            )}

            {recentes.map((registro) => (
              <div key={registro.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-slate-900">{registro.clienteNome}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
                      {registro.tipoAtendimento}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                    {registro.itens.length} item(ns)
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">{formatDate(registro.criadoEm)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
