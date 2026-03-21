'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../lib/prisma';
import { getAuthSession } from '../../lib/auth-session';
import {
  calcularItemTotal,
  calcularResumo,
  criarOrcamentoVazio,
  type ProdutoCatalogoInput,
  type OrcamentoEditorData,
} from '../../lib/orcamentos';

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function serializeOrcamento(orcamento: any): OrcamentoEditorData {
  return {
    id: orcamento.id,
    numero: orcamento.numero,
    titulo: orcamento.titulo,
    clienteNome: orcamento.clienteNome,
    clienteDocumento: orcamento.clienteDocumento || '',
    clienteContato: orcamento.clienteContato || '',
    clienteEmail: orcamento.clienteEmail || '',
    clienteEndereco: orcamento.clienteEndereco || '',
    clienteCidade: orcamento.clienteCidade || '',
    status: orcamento.status,
    fonteTitulo: orcamento.fonteTitulo,
    fonteCorpo: orcamento.fonteCorpo,
    corDestaque: orcamento.corDestaque,
    validadeDias: orcamento.validadeDias,
    descontoVistaPercentual: toNumber(orcamento.descontoVistaPercentual),
    descontoVistaObservacao: orcamento.descontoVistaObservacao || '',
    parcelamentoObservacao: orcamento.parcelamentoObservacao || '',
    parcelaMinima: toNumber(orcamento.parcelaMinima),
    maxParcelas: orcamento.maxParcelas,
    observacoes: orcamento.observacoes || '',
    notaInterna: orcamento.notaInterna || '',
    criadoEm: orcamento.criadoEm?.toISOString(),
    atualizadoEm: orcamento.atualizadoEm?.toISOString(),
    itens: orcamento.itens.map((item: any) => ({
      id: item.id,
      ordem: item.ordem,
      quantidade: toNumber(item.quantidade),
      descricao: item.descricao,
      descricaoDetalhada: item.descricaoDetalhada || '',
      valorUnitario: toNumber(item.valorUnitario),
    })),
  };
}

async function requireAdmin() {
  const sessao = await getAuthSession();

  if (!sessao || sessao.role !== 'ADMIN') {
    throw new Error('Acesso negado.');
  }

  return sessao;
}

export async function listarOrcamentos() {
  await requireAdmin();

  const orcamentos = await prisma.orcamento.findMany({
    orderBy: { atualizadoEm: 'desc' },
    include: {
      criadoPor: {
        select: { nome: true },
      },
      itens: {
        orderBy: { ordem: 'asc' },
      },
    },
    take: 100,
  });

  return orcamentos.map((orcamento) => {
    const data = serializeOrcamento(orcamento);
    const resumo = calcularResumo(data);

    return {
      ...data,
      subtotal: resumo.subtotal,
      totalFinal: resumo.totalFinal,
      criadoPorNome: orcamento.criadoPor.nome,
    };
  });
}

export async function listarClientesParaOrcamento() {
  await requireAdmin();

  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
      whatsapp: true,
      email: true,
      cidade: true,
      conexoes: {
        orderBy: { endereco: 'asc' },
        select: {
          endereco: true,
          bairro: true,
        },
      },
    },
    take: 300,
  });

  return clientes.map((cliente) => ({
    id: cliente.id,
    nome: cliente.nome,
    cpfCnpj: cliente.cpfCnpj || '',
    whatsapp: cliente.whatsapp || '',
    email: cliente.email || '',
    cidade: cliente.cidade || '',
    enderecoPrincipal: cliente.conexoes[0]
      ? [cliente.conexoes[0].endereco, cliente.conexoes[0].bairro].filter(Boolean).join(' - ')
      : '',
  }));
}

export async function salvarClienteOrcamento(payload: {
  id?: string;
  nome: string;
  cpfCnpj?: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
}) {
  await requireAdmin();

  if (!payload.nome.trim()) {
    return { sucesso: false, erro: 'Informe o nome do cliente.' };
  }

  const cliente = payload.id
    ? await prisma.cliente.update({
        where: { id: payload.id },
        data: {
          nome: payload.nome.trim(),
          cpfCnpj: payload.cpfCnpj?.trim() || null,
          whatsapp: payload.whatsapp?.trim() || null,
          email: payload.email?.trim() || null,
          cidade: payload.cidade?.trim() || null,
        },
      })
    : await prisma.cliente.create({
        data: {
          nome: payload.nome.trim(),
          cpfCnpj: payload.cpfCnpj?.trim() || null,
          whatsapp: payload.whatsapp?.trim() || null,
          email: payload.email?.trim() || null,
          cidade: payload.cidade?.trim() || null,
        },
      });

  revalidatePath('/admin');
  revalidatePath('/admin/orcamentos');
  revalidatePath('/admin/orcamentos/clientes');

  return { sucesso: true, clienteId: cliente.id };
}

function serializeProduto(produto: any): ProdutoCatalogoInput {
  return {
    id: produto.id,
    categoria: produto.categoria,
    nome: produto.nome,
    descricaoCurta: produto.descricaoCurta,
    descricaoDetalhada: produto.descricaoDetalhada || '',
    precoBase: toNumber(produto.precoBase),
    ativo: produto.ativo,
    recorrente: produto.recorrente,
    ordem: produto.ordem,
  };
}

async function garantirProdutosPadrao() {
  const total = await prisma.produtoCatalogo.count();

  if (total > 0) {
    return;
  }

  await prisma.produtoCatalogo.createMany({
    data: [
      {
        categoria: 'Computadores',
        nome: 'Computador Escritorio Ryzen 5',
        descricaoCurta: 'Computador Ryzen 5 com SSD NVMe e 16GB de memoria.',
        descricaoDetalhada: 'Processador Ryzen 5\nMemoria 16GB DDR4\nSSD NVMe 500GB\nGabinete com fonte\nAcompanha mouse e teclado',
        precoBase: 3299,
        recorrente: true,
        ordem: 1,
      },
      {
        categoria: 'Computadores',
        nome: 'Computador Escritorio Intel i5',
        descricaoCurta: 'Computador Intel Core i5 para uso comercial e residencial.',
        descricaoDetalhada: 'Processador Intel Core i5\nMemoria 16GB DDR4\nSSD 480GB\nVideo integrado\nMouse e teclado inclusos',
        precoBase: 3499,
        recorrente: true,
        ordem: 2,
      },
      {
        categoria: 'Notebooks',
        nome: 'Notebook Intel Celeron',
        descricaoCurta: 'Notebook de entrada para internet, estudos e tarefas leves.',
        descricaoDetalhada: 'Tela 15,6 polegadas\nIntel Celeron\nMemoria 4GB\nSSD 120GB\nWindows 11',
        precoBase: 2199,
        recorrente: true,
        ordem: 1,
      },
      {
        categoria: 'Notebooks',
        nome: 'Notebook Core i5',
        descricaoCurta: 'Notebook intermediario para trabalho e produtividade.',
        descricaoDetalhada: 'Tela Full HD 15,6 polegadas\nIntel Core i5\nMemoria 8GB\nSSD 256GB\nWindows 11',
        precoBase: 3999,
        recorrente: true,
        ordem: 2,
      },
    ],
  });
}

export async function listarProdutosCatalogo() {
  await requireAdmin();
  await garantirProdutosPadrao();

  const produtos = await prisma.produtoCatalogo.findMany({
    orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
  });

  return produtos.map(serializeProduto);
}

export async function salvarProdutoCatalogo(payload: ProdutoCatalogoInput) {
  await requireAdmin();

  if (!payload.nome.trim()) {
    return { sucesso: false, erro: 'Informe o nome do produto.' };
  }

  const produto = payload.id
    ? await prisma.produtoCatalogo.update({
        where: { id: payload.id },
        data: {
          categoria: payload.categoria.trim() || 'Geral',
          nome: payload.nome.trim(),
          descricaoCurta: payload.descricaoCurta.trim() || payload.nome.trim(),
          descricaoDetalhada: payload.descricaoDetalhada.trim() || null,
          precoBase: toNumber(payload.precoBase),
          ativo: payload.ativo,
          recorrente: payload.recorrente,
          ordem: Math.max(0, payload.ordem || 0),
        },
      })
    : await prisma.produtoCatalogo.create({
        data: {
          categoria: payload.categoria.trim() || 'Geral',
          nome: payload.nome.trim(),
          descricaoCurta: payload.descricaoCurta.trim() || payload.nome.trim(),
          descricaoDetalhada: payload.descricaoDetalhada.trim() || null,
          precoBase: toNumber(payload.precoBase),
          ativo: payload.ativo,
          recorrente: payload.recorrente,
          ordem: Math.max(0, payload.ordem || 0),
        },
      });

  revalidatePath('/admin/orcamentos');
  revalidatePath('/admin/orcamentos/produtos');

  return { sucesso: true, produtoId: produto.id };
}

export async function removerProdutoCatalogo(id: string) {
  await requireAdmin();

  await prisma.produtoCatalogo.delete({
    where: { id },
  });

  revalidatePath('/admin/orcamentos');
  revalidatePath('/admin/orcamentos/produtos');

  return { sucesso: true };
}

export async function buscarOrcamentoPorId(id: string) {
  await requireAdmin();

  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      itens: {
        orderBy: { ordem: 'asc' },
      },
    },
  });

  if (!orcamento) {
    return null;
  }

  return serializeOrcamento(orcamento);
}

export async function criarRascunhoOrcamento() {
  const sessao = await requireAdmin();
  const inicial = criarOrcamentoVazio();
  const resumo = calcularResumo(inicial);

  const criado = await prisma.orcamento.create({
    data: {
      titulo: inicial.titulo,
      clienteNome: 'Cliente nao informado',
      clienteDocumento: inicial.clienteDocumento,
      clienteContato: inicial.clienteContato,
      clienteEmail: inicial.clienteEmail,
      clienteEndereco: inicial.clienteEndereco,
      clienteCidade: inicial.clienteCidade,
      status: inicial.status,
      fonteTitulo: inicial.fonteTitulo,
      fonteCorpo: inicial.fonteCorpo,
      corDestaque: inicial.corDestaque,
      validadeDias: inicial.validadeDias,
      descontoVistaPercentual: inicial.descontoVistaPercentual,
      descontoVistaObservacao: inicial.descontoVistaObservacao,
      parcelamentoObservacao: inicial.parcelamentoObservacao,
      parcelaMinima: inicial.parcelaMinima,
      maxParcelas: inicial.maxParcelas,
      observacoes: inicial.observacoes,
      notaInterna: inicial.notaInterna,
      subtotal: resumo.subtotal,
      descontoVistaValor: resumo.descontoVistaValor,
      totalFinal: resumo.totalFinal,
      criadoPorId: sessao.id,
      itens: {
        create: inicial.itens.map((item) => ({
          ordem: item.ordem,
          quantidade: item.quantidade,
          descricao: item.descricao || 'Novo item',
          descricaoDetalhada: item.descricaoDetalhada || null,
          valorUnitario: item.valorUnitario,
          total: calcularItemTotal(item),
        })),
      },
    },
  });

  revalidatePath('/admin/orcamentos');

  return criado.id;
}

export async function salvarOrcamento(payload: OrcamentoEditorData) {
  const sessao = await requireAdmin();
  const itensValidos = payload.itens
    .map((item, index) => ({
      ...item,
      ordem: index,
      descricao: item.descricao.trim(),
    }))
    .filter((item) => item.descricao || item.valorUnitario || item.quantidade);

  const dados = {
    titulo: payload.titulo.trim() || 'Proposta Comercial',
    clienteNome: payload.clienteNome.trim() || 'Cliente nao informado',
    clienteDocumento: payload.clienteDocumento.trim() || null,
    clienteContato: payload.clienteContato.trim() || null,
    clienteEmail: payload.clienteEmail.trim() || null,
    clienteEndereco: payload.clienteEndereco.trim() || null,
    clienteCidade: payload.clienteCidade.trim() || null,
    status: payload.status || 'RASCUNHO',
    fonteTitulo: payload.fonteTitulo || 'Georgia',
    fonteCorpo: payload.fonteCorpo || 'Arial',
    corDestaque: payload.corDestaque || '#1d4ed8',
    validadeDias: Math.max(1, payload.validadeDias || 15),
    descontoVistaPercentual: toNumber(payload.descontoVistaPercentual),
    descontoVistaObservacao: payload.descontoVistaObservacao.trim() || null,
    parcelamentoObservacao: payload.parcelamentoObservacao.trim() || null,
    parcelaMinima: Math.max(1, toNumber(payload.parcelaMinima) || 150),
    maxParcelas: Math.max(1, Math.trunc(payload.maxParcelas || 12)),
    observacoes: payload.observacoes.trim() || null,
    notaInterna: payload.notaInterna.trim() || null,
  };

  const resumo = calcularResumo({
    ...payload,
    ...dados,
    clienteDocumento: dados.clienteDocumento || '',
    clienteContato: dados.clienteContato || '',
    clienteEmail: dados.clienteEmail || '',
    clienteEndereco: dados.clienteEndereco || '',
    clienteCidade: dados.clienteCidade || '',
    descontoVistaObservacao: dados.descontoVistaObservacao || '',
    parcelamentoObservacao: dados.parcelamentoObservacao || '',
    observacoes: dados.observacoes || '',
    notaInterna: dados.notaInterna || '',
    itens: itensValidos,
  });

  const registro = await prisma.orcamento.upsert({
    where: { id: payload.id || '' },
    create: {
      ...dados,
      subtotal: resumo.subtotal,
      descontoVistaValor: resumo.descontoVistaValor,
      totalFinal: resumo.totalFinal,
      criadoPorId: sessao.id,
      itens: {
        create: (itensValidos.length ? itensValidos : criarOrcamentoVazio().itens).map((item, index) => ({
          ordem: index,
          quantidade: item.quantidade,
          descricao: item.descricao || 'Novo item',
          descricaoDetalhada: item.descricaoDetalhada || null,
          valorUnitario: item.valorUnitario,
          total: calcularItemTotal(item),
        })),
      },
    },
    update: {
      ...dados,
      subtotal: resumo.subtotal,
      descontoVistaValor: resumo.descontoVistaValor,
      totalFinal: resumo.totalFinal,
      itens: {
        deleteMany: {},
        create: (itensValidos.length ? itensValidos : criarOrcamentoVazio().itens).map((item, index) => ({
          ordem: index,
          quantidade: item.quantidade,
          descricao: item.descricao || 'Novo item',
          descricaoDetalhada: item.descricaoDetalhada || null,
          valorUnitario: item.valorUnitario,
          total: calcularItemTotal(item),
        })),
      },
    },
    include: {
      itens: {
        orderBy: { ordem: 'asc' },
      },
    },
  });

  revalidatePath('/admin/orcamentos');
  revalidatePath(`/admin/orcamentos/${registro.id}`);

  return {
    sucesso: true,
    id: registro.id,
  };
}
