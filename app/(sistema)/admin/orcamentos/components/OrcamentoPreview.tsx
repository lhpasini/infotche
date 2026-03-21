import {
  calcularResumo,
  calcularItemTotal,
  formatarData,
  formatarMoeda,
  normalizarQuantidade,
  type OrcamentoEditorData,
} from '../../../../../lib/orcamentos';

type OrcamentoPreviewProps = {
  orcamento: OrcamentoEditorData;
  modo?: 'painel' | 'impressao';
};

export function OrcamentoPreview({
  orcamento,
  modo = 'painel',
}: OrcamentoPreviewProps) {
  const resumo = calcularResumo(orcamento);
  const itens = orcamento.itens.filter(
    (item) => item.descricao.trim() || item.valorUnitario || item.quantidade,
  );
  const dataBase = orcamento.atualizadoEm || orcamento.criadoEm || new Date().toISOString();
  const dataValidade = new Date(dataBase);
  dataValidade.setDate(dataValidade.getDate() + (orcamento.validadeDias || 15));

  return (
    <article
      className={
        modo === 'impressao'
          ? 'mx-auto max-w-5xl bg-white text-slate-900'
          : 'overflow-hidden rounded-[32px] border border-white/70 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.12)]'
      }
      style={{
        fontFamily: orcamento.fonteCorpo,
      }}
    >
      <div className="border-b border-slate-200 bg-[linear-gradient(120deg,#f8fafc_0%,#ffffff_55%,#eff6ff_100%)] px-8 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <img src="/logo-admin.png" alt="Infotche" className="h-20 w-auto object-contain" />
            </div>
            <div className="max-w-md">
              <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-slate-500">
                Infotche Tecnologia
              </p>
              <h1
                className="mt-3 text-3xl font-black leading-tight"
                style={{
                  color: orcamento.corDestaque,
                  fontFamily: orcamento.fonteTitulo,
                }}
              >
                {orcamento.titulo || 'Proposta Comercial'}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Zenatti &amp; Cia. Ltda. EPP
                <br />
                Av. Presidente Vargas Sala C
                <br />
                Santa Barbara do Sul - RS
                <br />
                Fone: (55) 996 76-77-78
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-slate-600">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Contato</p>
              <p className="mt-2">atendimento@infotche.com.br</p>
              <p>www.infotche.com.br</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Documento</p>
              <p className="mt-2">CNPJ 09.253.836/0001-72</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Orcamento</p>
              <p className="mt-2 text-lg font-black text-slate-900">
                #{String(orcamento.numero || 0).padStart(4, '0')}
              </p>
              <p className="mt-1 text-xs text-slate-500">Atualizado em {formatarData(dataBase)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <section>
          <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-slate-400">Cliente</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                {orcamento.clienteNome || 'Cliente nao informado'}
              </h2>
            </div>
            <span
              className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.22em]"
              style={{
                backgroundColor: `${orcamento.corDestaque}15`,
                color: orcamento.corDestaque,
              }}
            >
              {orcamento.status}
            </span>
          </div>

          <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Contato</p>
              <p className="mt-2">{orcamento.clienteContato || '-'}</p>
              <p>{orcamento.clienteEmail || '-'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Documento / Local</p>
              <p className="mt-2">{orcamento.clienteDocumento || '-'}</p>
              <p>{orcamento.clienteCidade || '-'}</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-sm font-bold text-white" style={{ backgroundColor: orcamento.corDestaque }}>
                  <th className="px-4 py-3">Qtd.</th>
                  <th className="px-4 py-3">Descricao</th>
                  <th className="px-4 py-3 text-right">Valor unit.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                      Adicione itens no editor para montar o orcamento.
                    </td>
                  </tr>
                )}
                {itens.map((item) => (
                  <tr key={`${item.id || item.ordem}-${item.descricao}`} className="border-t border-slate-200 text-sm">
                    <td className="px-4 py-4 font-bold text-slate-700">{normalizarQuantidade(item.quantidade)}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{item.descricao}</p>
                      {item.descricaoDetalhada?.trim() && (
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {item.descricaoDetalhada}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">{formatarMoeda(item.valorUnitario)}</td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900">
                      {formatarMoeda(calcularItemTotal(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orcamento.observacoes?.trim() && (
            <section className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Observacoes do orcamento</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                {orcamento.observacoes}
              </p>
            </section>
          )}
        </section>
      </div>

      <footer className="border-t border-slate-200 px-8 py-6 text-sm text-slate-600">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr_1fr]">
          <section className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Resumo</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <strong className="text-slate-900">{formatarMoeda(resumo.subtotal)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Desconto a vista ({orcamento.descontoVistaPercentual || 0}%)</span>
                <strong className="text-emerald-700">- {formatarMoeda(resumo.descontoVistaValor)}</strong>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base">
                <span className="font-bold text-slate-900">Total final</span>
                <strong className="text-xl" style={{ color: orcamento.corDestaque }}>
                  {formatarMoeda(resumo.totalFinal)}
                </strong>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)] px-5 py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-700">Pagamento a vista</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {orcamento.descontoVistaObservacao || 'Sem observacao para pagamento a vista.'}
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {resumo.parcelasSemJuros.map((parcela) => (
                <div key={parcela.quantidade} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>{parcela.quantidade}x sem juros</span>
                  <strong>{formatarMoeda(parcela.valorParcela)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] px-5 py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-700">Cartao de credito</p>
            <div className="space-y-2 text-sm text-slate-700">
              {resumo.parcelasComJuros.map((parcela) => (
                <div key={parcela.quantidade} className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3">
                  <span>{parcela.quantidade}x com juros</span>
                  <strong>{formatarMoeda(parcela.valorParcela)}</strong>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {orcamento.parcelamentoObservacao || 'Juros automaticos de 3,99% ao mes do 7x ao 12x.'}
            </p>
          </section>
        </div>
        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p>
            Orcamento valido por <strong>{orcamento.validadeDias || 15} dias</strong>, ate{' '}
            <strong>{formatarData(dataValidade.toISOString())}</strong>.
          </p>
          <p>Produzido pela equipe Infotche.</p>
        </div>
      </footer>
    </article>
  );
}
