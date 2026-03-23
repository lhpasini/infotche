import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import DriveMediaPreview from '../../../../../components/DriveMediaPreview';
import { getChamadoTecnicoById } from '../../../../actions/tecnico-chamados';
import FechamentoChamadoTecnicoCard from './FechamentoChamadoTecnicoCard';

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return 'Nao informado';
  return new Date(value).toLocaleString('pt-BR');
}

export default async function ChamadoTecnicoDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const data = await getChamadoTecnicoById(id);

  if (!data?.sessao) {
    redirect('/tecnico/login');
  }

  if (!data?.chamado) {
    notFound();
  }

  const { chamado } = data;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_28%),linear-gradient(180deg,#eef6ff_0%,#edf2f7_52%,#e2e8f0_100%)] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Chamado do tecnico</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">#{chamado.protocolo}</h1>
          </div>
          <Link
            href="/tecnico/chamados"
            className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            Voltar
          </Link>
        </div>

        <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Cliente</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">{chamado.nomeCliente}</h2>
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

          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Categoria</dt>
              <dd className="mt-1">{chamado.categoria}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Endereco</dt>
              <dd className="mt-1">{chamado.enderecoCompleto}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Detalhes</dt>
              <dd className="mt-1">{chamado.motivo}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Contato</dt>
              <dd className="mt-1">{chamado.whatsCliente || 'Sem WhatsApp informado'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">PPPoE</dt>
              <dd className="mt-1">{chamado.pppoe || 'Nao informado'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Agendamento</dt>
              <dd className="mt-1">
                {formatDateTime(chamado.agendamentoData)}
                {chamado.agendamentoHora ? ` às ${chamado.agendamentoHora}` : ''}
              </dd>
            </div>
          </dl>
        </section>

        <FechamentoChamadoTecnicoCard
          chamadoId={chamado.id}
          status={chamado.status}
          fechamentoTecnicoTexto={chamado.fechamentoTecnicoTexto}
          fechamentoTecnicoTranscricao={chamado.fechamentoTecnicoTranscricao}
          midias={chamado.midiasFechamento.map((item) => ({
            id: item.id,
            tipo: item.tipo,
            arquivoUrl: item.arquivoUrl,
            nomeArquivo: item.nomeArquivo,
            driveFileId: item.driveFileId,
            mimeType: item.mimeType,
          }))}
        />

        {chamado.midiasFechamento.length > 0 && (
          <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Arquivos do fechamento</p>
            <div className="mt-4 space-y-4">
              {chamado.midiasFechamento.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-900">{item.nomeArquivo || 'Arquivo enviado'}</p>
                  <div className="mt-3">
                    <DriveMediaPreview
                      fileId={item.driveFileId}
                      url={item.arquivoUrl}
                      mimeType={item.mimeType}
                      tipo={item.tipo}
                      nomeArquivo={item.nomeArquivo}
                      heightClassName="h-52"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
