'use server';

import { prisma } from '../../lib/prisma';
import { getAuthSession } from '../../lib/auth-session';

function normalizarNome(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export async function getResumoChamadosTecnico() {
  const sessao = await getAuthSession();

  if (!sessao) {
    return { sessao: null, total: 0, agendados: 0, andamento: 0 };
  }

  const chamados = await prisma.chamado.findMany({
    where: {
      tecnico: {
        equals: sessao.nome,
        mode: 'insensitive',
      },
      status: {
        in: ['agendados', 'andamento'],
      },
    },
    select: {
      status: true,
    },
  });

  const agendados = chamados.filter((item) => item.status === 'agendados').length;
  const andamento = chamados.filter((item) => item.status === 'andamento').length;

  return {
    sessao,
    total: chamados.length,
    agendados,
    andamento,
  };
}

export async function getMeusChamadosTecnico() {
  const sessao = await getAuthSession();

  if (!sessao) {
    return { sessao: null, chamados: [] };
  }

  const chamados = await prisma.chamado.findMany({
    where: {
      tecnico: {
        equals: sessao.nome,
        mode: 'insensitive',
      },
      status: {
        in: ['agendados', 'andamento'],
      },
    },
    orderBy: [
      { agendamentoData: 'asc' },
      { agendamentoHora: 'asc' },
      { criadoEm: 'desc' },
    ],
    include: {
      midiasFechamento: {
        orderBy: { criadoEm: 'desc' },
      },
    },
  });

  return { sessao, chamados };
}

export async function getChamadoTecnicoById(id: string) {
  const sessao = await getAuthSession();

  if (!sessao) {
    return null;
  }

  const chamado = await prisma.chamado.findUnique({
    where: { id },
    include: {
      midiasFechamento: {
        orderBy: { criadoEm: 'desc' },
      },
    },
  });

  if (!chamado) {
    return null;
  }

  const acessoAdmin = sessao.role === 'ADMIN';
  const mesmoTecnico =
    chamado.tecnico && normalizarNome(chamado.tecnico) === normalizarNome(sessao.nome);

  if (!acessoAdmin && !mesmoTecnico) {
    return null;
  }

  return { sessao, chamado };
}
