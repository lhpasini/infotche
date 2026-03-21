'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useMemo, useState } from 'react';
import {
  criarRascunhoOrcamento,
  salvarClienteOrcamento,
  salvarOrcamento,
} from '../../../actions/orcamentos';
import {
  calcularResumo,
  criarOrcamentoVazio,
  FONTES_DISPONIVEIS,
  formatarData,
  formatarMoeda,
  type OrcamentoEditorData,
  type ProdutoCatalogoInput,
} from '../../../../lib/orcamentos';
import { OrcamentoPreview } from './components/OrcamentoPreview';

type OrcamentoListaItem = {
  id?: string;
  numero?: number;
  titulo: string;
  clienteNome: string;
  status: string;
  atualizadoEm?: string;
  totalFinal?: number;
};

type ClienteBuscaItem = {
  id: string;
  nome: string;
  cpfCnpj: string;
  whatsapp: string;
  email: string;
  cidade: string;
  enderecoPrincipal: string;
};

type OrcamentosWorkspaceProps = {
  orcamentoInicial?: OrcamentoEditorData | null;
  listaInicial: OrcamentoListaItem[];
  clientesIniciais: ClienteBuscaItem[];
  produtosIniciais: ProdutoCatalogoInput[];
};

function buildMailto(orcamento: OrcamentoEditorData) {
  const resumo = calcularResumo(orcamento);
  const assunto = `Orcamento Infotche - ${orcamento.clienteNome || 'Cliente'}`;
  const corpo = [
    `Ola, ${orcamento.clienteNome || 'cliente'}!`,
    '',
    `Segue a proposta "${orcamento.titulo || 'Proposta Comercial'}".`,
    `Valor total: ${formatarMoeda(resumo.totalFinal)}.`,
    '',
    'Se precisar, podemos ajustar itens, quantidade e forma de pagamento.',
    '',
    'Equipe Infotche',
  ].join('\n');

  return `mailto:${orcamento.clienteEmail || ''}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

const CATEGORIAS_TEMPLATE = ['Todos', 'Computadores', 'Notebooks', 'Impressoras', 'Redes'];

export function OrcamentosWorkspace({
  orcamentoInicial,
  listaInicial,
  clientesIniciais,
  produtosIniciais,
}: OrcamentosWorkspaceProps) {
  const router = useRouter();
  const [orcamento, setOrcamento] = useState<OrcamentoEditorData>(
    orcamentoInicial || criarOrcamentoVazio(),
  );
  const [lista] = useState(listaInicial);
  const [clientes] = useState(clientesIniciais);
  const [produtos] = useState(produtosIniciais);
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [categoriaProduto, setCategoriaProduto] = useState('Todos');
  const [mostrarSoRecorrentes, setMostrarSoRecorrentes] = useState(true);
  const [clienteForm, setClienteForm] = useState({
    nome: '',
    cpfCnpj: '',
    whatsapp: '',
    email: '',
    cidade: '',
  });
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  const resumo = calcularResumo(orcamento);

  const clientesFiltrados = useMemo(() => {
    const termo = filtroCliente.trim().toLowerCase();
    if (!termo) return clientes.slice(0, 8);
    return clientes
      .filter((cliente) =>
        [cliente.nome, cliente.cpfCnpj, cliente.whatsapp, cliente.email]
          .join(' ')
          .toLowerCase()
          .includes(termo),
      )
      .slice(0, 8);
  }, [clientes, filtroCliente]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((produto) => {
      if (!produto.ativo) return false;
      if (mostrarSoRecorrentes && !produto.recorrente) return false;
      if (categoriaProduto !== 'Todos' && produto.categoria !== categoriaProduto) return false;
      return true;
    });
  }, [categoriaProduto, mostrarSoRecorrentes, produtos]);

  function updateField<K extends keyof OrcamentoEditorData>(
    field: K,
    value: OrcamentoEditorData[K],
  ) {
    setOrcamento((atual) => ({
      ...atual,
      [field]: value,
    }));
  }

  function updateItem(
    index: number,
    field: 'quantidade' | 'descricao' | 'descricaoDetalhada' | 'valorUnitario',
    value: string,
  ) {
    setOrcamento((atual) => ({
      ...atual,
      itens: atual.itens.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === 'descricao' || field === 'descricaoDetalhada') {
          return { ...item, [field]: value };
        }

        return {
          ...item,
          [field]: Number(value) || 0,
        };
      }),
    }));
  }

  function addItem() {
    setOrcamento((atual) => ({
      ...atual,
      itens: [
        ...atual.itens,
        {
          ordem: atual.itens.length,
          quantidade: 1,
          descricao: '',
          descricaoDetalhada: '',
          valorUnitario: 0,
        },
      ],
    }));
  }

  function removeItem(index: number) {
    setOrcamento((atual) => ({
      ...atual,
      itens:
        atual.itens.length === 1
          ? atual.itens
          : atual.itens
              .filter((_, itemIndex) => itemIndex !== index)
              .map((item, ordem) => ({
                ...item,
                ordem,
              })),
    }));
  }

  function aplicarCliente(cliente: ClienteBuscaItem) {
    setOrcamento((atual) => ({
      ...atual,
      clienteNome: cliente.nome,
      clienteDocumento: cliente.cpfCnpj,
      clienteContato: cliente.whatsapp,
      clienteEmail: cliente.email,
      clienteEndereco: cliente.enderecoPrincipal,
      clienteCidade: cliente.cidade,
    }));
    setFiltroCliente(cliente.nome);
  }

  function adicionarProduto(produto: ProdutoCatalogoInput) {
    setOrcamento((atual) => ({
      ...atual,
      itens: [
        ...atual.itens,
        {
          ordem: atual.itens.length,
          quantidade: 1,
          descricao: produto.descricaoCurta,
          descricaoDetalhada: produto.descricaoDetalhada,
          valorUnitario: produto.precoBase,
        },
      ],
    }));
  }

  async function handleSave(status?: string) {
    setSalvando(true);
    setMensagem('');

    const resposta = await salvarOrcamento({
      ...orcamento,
      status: status || orcamento.status,
    });

    setSalvando(false);

    if (resposta?.sucesso && resposta.id) {
      setMensagem('Orcamento salvo com sucesso.');
      startTransition(() => {
        router.push(`/admin/orcamentos/${resposta.id}`);
        router.refresh();
      });
      return;
    }

    setMensagem('Nao foi possivel salvar o orcamento.');
  }

  async function handleNovoRascunho() {
    const id = await criarRascunhoOrcamento();
    startTransition(() => {
      router.push(`/admin/orcamentos/${id}`);
      router.refresh();
    });
  }

  async function handleSalvarCliente() {
    setSalvandoCliente(true);
    const resposta = await salvarClienteOrcamento(clienteForm);
    setSalvandoCliente(false);

    if (!resposta.sucesso) {
      setMensagem(resposta.erro || 'Nao foi possivel salvar o cliente.');
      return;
    }

    setMensagem('Cliente salvo. Recarregando base de clientes...');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4f8_45%,#e2e8f0_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1860px] flex-col gap-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-[linear-gradient(135deg,#07111f_0%,#0f172a_45%,#153e75_100%)] px-6 py-7 text-white shadow-[0_30px_70px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-sky-200">Admin / Orcamentos</p>
              <h1 className="mt-3 text-4xl font-black leading-tight">Editor comercial com base de clientes e produtos</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
                Use clientes ja cadastrados, cadastre produtos recorrentes e monte orcamentos mais rapido com um clique.
                O preview fica mais limpo e as condicoes de pagamento agora aparecem no rodape do documento.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15">
                Voltar ao admin
              </Link>
              <button type="button" onClick={handleNovoRascunho} className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:translate-y-[-1px]">
                Novo orcamento
              </button>
            </div>
          </div>
        </section>
        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1.45fr)_minmax(0,1.12fr)]">
          <aside className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Menu</p>
              <div className="mt-4 grid gap-3">
                <Link href="/admin/orcamentos" className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">Orcamentos</Link>
                <Link href="/admin/orcamentos/clientes" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Cadastro de clientes</Link>
                <Link href="/admin/orcamentos/produtos" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">Cadastro de produtos</Link>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Base salva</p>
                <h2 className="mt-2 text-xl font-black text-slate-900">Orcamentos</h2>
              </div>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{lista.length}</span>
            </div>

            <div className="mt-5 space-y-3">
              {lista.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm leading-6 text-slate-500">
                  Nenhum orcamento salvo ainda. Clique em "Novo orcamento" para iniciar um rascunho persistido.
                </div>
              )}

              {lista.map((item) => {
                const ativo = item.id && item.id === orcamento.id;

                return (
                  <Link
                    key={item.id || item.titulo}
                    href={item.id ? `/admin/orcamentos/${item.id}` : '/admin/orcamentos'}
                    className={`block rounded-[24px] border px-4 py-4 transition ${ativo ? 'border-sky-200 bg-sky-50 shadow-[0_14px_28px_rgba(14,165,233,0.14)]' : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">#{String(item.numero || 0).padStart(4, '0')}</p>
                        <h3 className="mt-2 text-sm font-black text-slate-900">{item.titulo}</h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">{item.status}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">{item.clienteNome}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.atualizadoEm ? `Atualizado em ${formatarData(item.atualizadoEm)}` : 'Sem data'}</p>
                    <p className="mt-1 text-xs font-bold text-sky-700">{typeof item.totalFinal === 'number' ? formatarMoeda(item.totalFinal) : ''}</p>
                  </Link>
                );
              })}
            </div>
          </aside>

          <section className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Editor</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{orcamento.id ? `Orcamento #${String(orcamento.numero || 0).padStart(4, '0')}` : 'Novo rascunho local'}</h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => handleSave('RASCUNHO')} disabled={salvando} className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60">
                    {salvando ? 'Salvando...' : 'Salvar rascunho'}
                  </button>
                  <button type="button" onClick={() => handleSave('ENVIADO')} disabled={salvando} className="rounded-full bg-sky-600 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60">
                    Salvar como enviado
                  </button>
                  {orcamento.id && (
                    <Link href={`/admin/orcamentos/${orcamento.id}/imprimir`} target="_blank" className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-100">
                      Gerar PDF
                    </Link>
                  )}
                  <a href={buildMailto(orcamento)} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 transition hover:bg-amber-100">
                    Preparar e-mail
                  </a>
                </div>
              </div>

              {mensagem && <p className="text-sm font-semibold text-emerald-700">{mensagem}</p>}
            </div>

            <div className="mt-5 space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Cliente</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">Buscar no cadastro ou preencher manualmente</h3>
                  </div>
                  <button type="button" onClick={handleSalvarCliente} disabled={salvandoCliente || !clienteForm.nome.trim()} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                    {salvandoCliente ? 'Salvando cliente...' : 'Salvar cliente no cadastro'}
                  </button>
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Buscar cliente existente
                    <input value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} placeholder="Digite nome, documento, telefone ou e-mail..." className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                  </label>

                  {clientesFiltrados.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {clientesFiltrados.map((cliente) => (
                        <button key={cliente.id} type="button" onClick={() => aplicarCliente(cliente)} className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50">
                          <p className="text-sm font-black text-slate-900">{cliente.nome}</p>
                          <p className="mt-2 text-xs text-slate-500">{cliente.cpfCnpj || 'Sem documento'}</p>
                          <p className="mt-1 text-xs text-slate-500">{cliente.whatsapp || cliente.email || 'Sem contato'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Cliente
                    <input value={orcamento.clienteNome} onChange={(e) => { updateField('clienteNome', e.target.value); setClienteForm((atual) => ({ ...atual, nome: e.target.value })); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Documento
                    <input value={orcamento.clienteDocumento} onChange={(e) => { updateField('clienteDocumento', e.target.value); setClienteForm((atual) => ({ ...atual, cpfCnpj: e.target.value })); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Contato
                    <input value={orcamento.clienteContato} onChange={(e) => { updateField('clienteContato', e.target.value); setClienteForm((atual) => ({ ...atual, whatsapp: e.target.value })); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    E-mail
                    <input value={orcamento.clienteEmail} onChange={(e) => { updateField('clienteEmail', e.target.value); setClienteForm((atual) => ({ ...atual, email: e.target.value })); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-600 md:col-span-2">
                    Endereco / referencia
                    <input value={orcamento.clienteEndereco} onChange={(e) => updateField('clienteEndereco', e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Cidade
                    <input value={orcamento.clienteCidade} onChange={(e) => { updateField('clienteCidade', e.target.value); setClienteForm((atual) => ({ ...atual, cidade: e.target.value })); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-2 text-sm font-semibold text-slate-600">
                      Validade
                      <input type="number" min={1} value={orcamento.validadeDias} onChange={(e) => updateField('validadeDias', Number(e.target.value) || 1)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-600">
                      Fonte titulo
                      <select value={orcamento.fonteTitulo} onChange={(e) => updateField('fonteTitulo', e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300">
                        {FONTES_DISPONIVEIS.map((fonte) => <option key={fonte} value={fonte}>{fonte}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-600">
                      Fonte corpo
                      <select value={orcamento.fonteCorpo} onChange={(e) => updateField('fonteCorpo', e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300">
                        {FONTES_DISPONIVEIS.map((fonte) => <option key={fonte} value={fonte}>{fonte}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Templates e recorrentes</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">Clique para adicionar ao orcamento</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS_TEMPLATE.map((categoria) => (
                      <button key={categoria} type="button" onClick={() => setCategoriaProduto(categoria)} className={`rounded-full px-4 py-2 text-sm font-black transition ${categoriaProduto === categoria ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                        {categoria}
                      </button>
                    ))}
                    <button type="button" onClick={() => setMostrarSoRecorrentes((valor) => !valor)} className={`rounded-full px-4 py-2 text-sm font-black transition ${mostrarSoRecorrentes ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                      {mostrarSoRecorrentes ? 'Somente recorrentes' : 'Mostrar todos'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {produtosFiltrados.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">Nenhum produto cadastrado nesta categoria ainda.</div>
                  )}
                  {produtosFiltrados.map((produto) => (
                    <button key={produto.id || produto.nome} type="button" onClick={() => adicionarProduto(produto)} className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{produto.categoria}</p>
                          <h4 className="mt-2 text-base font-black text-slate-900">{produto.nome}</h4>
                        </div>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{formatarMoeda(produto.precoBase)}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{produto.descricaoCurta}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_180px]">
                <label className="grid gap-2 text-sm font-semibold text-slate-600">
                  Cor de destaque
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <input type="color" value={orcamento.corDestaque} onChange={(e) => updateField('corDestaque', e.target.value)} className="h-10 w-14 rounded-lg border-0 bg-transparent" />
                    <span className="text-sm text-slate-500">{orcamento.corDestaque}</span>
                  </div>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-600">
                  Desconto a vista (%)
                  <input type="number" min={0} step="0.01" value={orcamento.descontoVistaPercentual} onChange={(e) => updateField('descontoVistaPercentual', Number(e.target.value) || 0)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-600">
                  Parcela minima
                  <input type="number" min={1} step="0.01" value={orcamento.parcelaMinima} onChange={(e) => updateField('parcelaMinima', Number(e.target.value) || 150)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-300" />
                </label>
              </div>

              <div className="rounded-[30px] border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Itens</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">Tabela de composicao</h3>
                  </div>
                  <button type="button" onClick={addItem} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-700">
                    Adicionar item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Qtd.</th>
                        <th className="px-4 py-3">Produto / servico</th>
                        <th className="px-4 py-3">Detalhamento</th>
                        <th className="px-4 py-3">Unitario</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamento.itens.map((item, index) => {
                        const quantidadeExibida = item.quantidade || 0;
                        const total = (item.quantidade > 0 ? item.quantidade : 1) * item.valorUnitario;

                        return (
                          <tr key={`${item.id || 'novo'}-${index}`} className="border-t border-slate-200 align-top">
                            <td className="px-4 py-3">
                              <input type="number" min={0} step="0.01" value={quantidadeExibida} onChange={(e) => updateItem(index, 'quantidade', e.target.value)} className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:bg-white" />
                              <p className="mt-2 text-xs text-slate-400">Se zerar, assume 1 unidade.</p>
                            </td>
                            <td className="px-4 py-3">
                              <textarea value={item.descricao} onChange={(e) => updateItem(index, 'descricao', e.target.value)} className="min-h-[92px] min-w-[320px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white" placeholder="Nome do produto, servico ou pacote..." />
                            </td>
                            <td className="px-4 py-3">
                              <textarea value={item.descricaoDetalhada || ''} onChange={(e) => updateItem(index, 'descricaoDetalhada', e.target.value)} className="min-h-[92px] min-w-[380px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white" placeholder="Especificacoes detalhadas, configuracao, observacoes tecnicas..." />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" min={0} step="0.01" value={item.valorUnitario} onChange={(e) => updateItem(index, 'valorUnitario', e.target.value)} className="w-32 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:bg-white" />
                            </td>
                            <td className="px-4 py-3 text-sm font-black text-slate-900">{formatarMoeda(total)}</td>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => removeItem(index)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100">
                                Remover
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-600">
                  Observacao logo abaixo dos itens
                  <textarea value={orcamento.observacoes} onChange={(e) => updateField('observacoes', e.target.value)} className="min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-300 focus:bg-white" placeholder="Campo opcional. Se ficar vazio, nao aparece no documento." />
                </label>
                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Desconto a vista
                    <textarea value={orcamento.descontoVistaObservacao} onChange={(e) => updateField('descontoVistaObservacao', e.target.value)} className="min-h-[72px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-300 focus:bg-white" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Observacoes do parcelamento
                    <textarea value={orcamento.parcelamentoObservacao} onChange={(e) => updateField('parcelamentoObservacao', e.target.value)} className="min-h-[72px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-300 focus:bg-white" />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-5 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Subtotal</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{formatarMoeda(resumo.subtotal)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Desconto a vista</p>
                  <p className="mt-2 text-2xl font-black text-emerald-700">{formatarMoeda(resumo.descontoVistaValor)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Total final</p>
                  <p className="mt-2 text-2xl font-black text-sky-700">{formatarMoeda(resumo.totalFinal)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Preview</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Documento final</h2>
              </div>
              {orcamento.id && (
                <Link href={`/admin/orcamentos/${orcamento.id}/imprimir`} target="_blank" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                  Abrir tela limpa
                </Link>
              )}
            </div>

            <OrcamentoPreview orcamento={orcamento} />
          </section>
        </section>
      </div>
    </main>
  );
}
