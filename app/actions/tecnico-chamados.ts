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

function primeiroToken(nome: string) {
  return normalizarNome(nome).split(/\s+/).filter(Boolean)[0] || '';
}

function distanciaLevenshtein(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, (_, rowIndex) =>
    Array.from({ length: a.length + 1 }, (_, colIndex) => (rowIndex === 0 ? colIndex : colIndex === 0 ? rowIndex : 0))
  );

  for (let row = 1; row <= b.length; row += 1) {
    for (let col = 1; col <= a.length; col += 1) {
      const cost = a[col - 1] === b[row - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

function tecnicoCorresponde(tecnicoChamado: string | null | undefined, nomeSessao: string, loginSessao?: string) {
  if (!tecnicoChamado) return false;

  const tecnicoNormalizado = normalizarNome(tecnicoChamado);
  const nomeNormalizado = normalizarNome(nomeSessao);
  const loginNormalizado = loginSessao ? normalizarNome(loginSessao) : '';

  if (
    tecnicoNormalizado === nomeNormalizado ||
    tecnicoNormalizado === loginNormalizado ||
    tecnicoNormalizado.includes(nomeNormalizado) ||
    nomeNormalizado.includes(tecnicoNormalizado) ||
    (loginNormalizado && tecnicoNormalizado.includes(loginNormalizado))
  ) {
    return true;
  }

  const tokenTecnico = primeiroToken(tecnicoChamado);
  const tokenSessao = primeiroToken(nomeSessao);

  if (!tokenTecnico || !tokenSessao) {
    return false;
  }

  return distanciaLevenshtein(tokenTecnico, tokenSessao) <= 1;
}

export async function getResumoChamadosTecnico() {
  const sessao = await getAuthSession();

  if (!sessao) {
    return { sessao: null, total: 0, agendados: 0, andamento: 0 };
  }

  const chamados = await prisma.chamado.findMany({
    where: {
      status: {
        in: ['agendados', 'andamento'],
      },
    },
    select: {
      tecnico: true,
      status: true,
    },
  });

  const chamadosDoTecnico = chamados.filter((item) => tecnicoCorresponde(item.tecnico, sessao.nome));
  const agendados = chamadosDoTecnico.filter((item) => item.status === 'agendados').length;
  const andamento = chamadosDoTecnico.filter((item) => item.status === 'andamento').length;

  return {
    sessao,
    total: chamadosDoTecnico.length,
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

  return {
    sessao,
    chamados: chamados.filter((item) => tecnicoCorresponde(item.tecnico, sessao.nome)),
  };
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
  const mesmoTecnico = tecnicoCorresponde(chamado.tecnico, sessao.nome);

  if (!acessoAdmin && !mesmoTecnico) {
    return null;
  }

  return { sessao, chamado };
}
