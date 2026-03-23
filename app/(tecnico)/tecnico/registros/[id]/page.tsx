import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import DriveMediaPreview from '../../../../../components/DriveMediaPreview';
import { getRegistroEquipamentoTecnicoById } from '../../../../actions/tecnico-registros';

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString('pt-BR');
}

export default async function RegistroTecnicoDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const data = await getRegistroEquipamentoTecnicoById(id);

  if (!data?.sessao) {
    redirect('/tecnico/login');
  }

  if (!data?.registro) {
    notFound();
  }

  const { registro } = data;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_28%),linear-gradient(180deg,#eef6ff_0%,#edf2f7_52%,#e2e8f0_100%)] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Registro salvo</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">{registro.clienteNome}</h1>
          </div>
          <Link
            href="/tecnico"
            className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            Voltar
          </Link>
        </div>

        <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Resumo</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p><strong className="text-slate-900">Tipo de atendimento:</strong> {registro.tipoAtendimento}</p>
            <p><strong className="text-slate-900">Tecnico:</strong> {registro.tecnico?.nome || 'Nao identificado'}</p>
            <p><strong className="text-slate-900">Criado em:</strong> {formatDate(registro.criadoEm)}</p>
            {registro.alteradoPor && registro.alteradoEm && (
              <p>
                <strong className="text-slate-900">Ultima alteracao:</strong> {registro.alteradoPor} em {formatDate(registro.alteradoEm)}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          {registro.itens.map((item, index) => (
            <div
              key={item.id}
              className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Item {index + 1}</p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    {item.tipoEquipamento}
                    {[item.marca, item.modelo].filter(Boolean).length > 0
                      ? ` - ${[item.marca, item.modelo].filter(Boolean).join(' / ')}`
                      : ''}
                  </h2>
                </div>
                {item.imagemUrl && (
                  <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700">
                    Foto do item
                  </span>
                )}
              </div>

              {item.imagemUrl && (
                <div className="mt-4">
                  <DriveMediaPreview
                    fileId={item.driveFileId}
                    url={item.imagemUrl}
                    tipo="IMAGEM"
                    nomeArquivo={`Imagem do item ${index + 1}`}
                    heightClassName="h-44"
                  />
                </div>
              )}

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p><strong className="text-slate-900">MAC:</strong> {item.macAddress || 'Nao informado'}</p>
                <p><strong className="text-slate-900">Serial:</strong> {item.serialNumber || 'Nao informado'}</p>
                <p><strong className="text-slate-900">Codigo:</strong> {item.codigoEquipamento || 'Nao informado'}</p>
                <p><strong className="text-slate-900">Usuario:</strong> {item.usuarioAcesso || 'Nao informado'}</p>
                <p><strong className="text-slate-900">Senha:</strong> {item.senhaAcesso || 'Nao informado'}</p>
                <p><strong className="text-slate-900">Observacoes:</strong> {item.observacao || 'Sem observacoes'}</p>
              </div>

              {item.ocrTextoBruto && (
                <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Texto bruto lido da etiqueta</p>
                  <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-slate-600">{item.ocrTextoBruto}</pre>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
