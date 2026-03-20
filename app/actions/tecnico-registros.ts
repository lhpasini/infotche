'use server';

import { prisma } from '../../lib/prisma';
import { getAuthSession } from '../../lib/auth-session';

export async function getResumoTecnico() {
  const sessao = await getAuthSession();

  if (!sessao) {
    return { sessao: null, recentes: [] };
  }

  const recentes = await prisma.atendimentoEquipamento.findMany({
    where: { tecnicoId: sessao.id },
    include: { itens: true },
    orderBy: { criadoEm: 'desc' },
    take: 5,
  });

  return { sessao, recentes };
}

export async function buscarHistoricoEquipamentos(termo: string) {
  const sessao = await getAuthSession();

  if (!sessao || !termo.trim()) {
    return [];
  }

  return prisma.atendimentoEquipamento.findMany({
    where: {
      OR: [
        { clienteNome: { contains: termo, mode: 'insensitive' } },
        {
          itens: {
            some: {
              OR: [
                { macAddress: { contains: termo, mode: 'insensitive' } },
                { serialNumber: { contains: termo, mode: 'insensitive' } },
                { codigoEquipamento: { contains: termo, mode: 'insensitive' } },
                { marca: { contains: termo, mode: 'insensitive' } },
                { modelo: { contains: termo, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    },
    include: {
      tecnico: true,
      itens: true,
    },
    orderBy: { criadoEm: 'desc' },
    take: 50,
  });
}

export async function getRegistrosEquipamentosAdmin() {
  const sessao = await getAuthSession();

  if (!sessao || sessao.role !== 'ADMIN') {
    return [];
  }

  return prisma.atendimentoEquipamento.findMany({
    include: {
      tecnico: true,
      itens: true,
    },
    orderBy: { criadoEm: 'desc' },
    take: 300,
  });
}
