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

export async function buscarHistoricoEquipamentosCompleto(termo: string) {
  const sessao = await getAuthSession();
  const busca = termo.trim();

  if (!sessao || !busca) {
    return { registros: [], legado: [] };
  }

  const [registros, legado] = await Promise.all([
    prisma.atendimentoEquipamento.findMany({
      where: {
        OR: [
          { clienteNome: { contains: busca, mode: 'insensitive' } },
          {
            itens: {
              some: {
                OR: [
                  { macAddress: { contains: busca, mode: 'insensitive' } },
                  { serialNumber: { contains: busca, mode: 'insensitive' } },
                  { codigoEquipamento: { contains: busca, mode: 'insensitive' } },
                  { marca: { contains: busca, mode: 'insensitive' } },
                  { modelo: { contains: busca, mode: 'insensitive' } },
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
    }),
    prisma.arquivoMortoWhatsappMensagem.findMany({
      where: {
        OR: [
          { autor: { contains: busca, mode: 'insensitive' } },
          { conteudo: { contains: busca, mode: 'insensitive' } },
          { arquivoNome: { contains: busca, mode: 'insensitive' } },
          { mensagemBruta: { contains: busca, mode: 'insensitive' } },
        ],
      },
      include: {
        importacao: true,
      },
      orderBy: [{ dataMensagem: 'desc' }, { criadoEm: 'desc' }],
      take: 80,
    }),
  ]);

  return { registros, legado };
}

export async function getResumoArquivoMortoWhatsapp() {
  const sessao = await getAuthSession();

  if (!sessao) {
    return null;
  }

  const [totalMensagens, totalImportacoes, ultimaImportacao, totalComAnexo, totalComMidiaVinculada] = await Promise.all([
    prisma.arquivoMortoWhatsappMensagem.count(),
    prisma.importacaoArquivoMortoWhatsapp.count(),
    prisma.importacaoArquivoMortoWhatsapp.findFirst({
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.arquivoMortoWhatsappMensagem.count({
      where: {
        arquivoNome: { not: null },
      },
    }),
    prisma.arquivoMortoWhatsappMensagem.count({
      where: {
        arquivoUrl: { not: null },
      },
    }),
  ]);

  return {
    totalMensagens,
    totalImportacoes,
    ultimaImportacao,
    totalComAnexo,
    totalComMidiaVinculada,
  };
}

export async function getUltimosArquivoMortoWhatsapp(limit = 80) {
  const sessao = await getAuthSession();

  if (!sessao) {
    return [];
  }

  return prisma.arquivoMortoWhatsappMensagem.findMany({
    include: {
      importacao: true,
    },
    orderBy: [{ dataMensagem: 'desc' }, { criadoEm: 'desc' }],
    take: limit,
  });
}

export async function buscarArquivoMortoWhatsapp(termo: string, limit = 120) {
  const sessao = await getAuthSession();
  const busca = termo.trim();

  if (!sessao || !busca) {
    return [];
  }

  return prisma.arquivoMortoWhatsappMensagem.findMany({
    where: {
      OR: [
        { autor: { contains: busca, mode: 'insensitive' } },
        { conteudo: { contains: busca, mode: 'insensitive' } },
        { arquivoNome: { contains: busca, mode: 'insensitive' } },
        { mensagemBruta: { contains: busca, mode: 'insensitive' } },
      ],
    },
    include: {
      importacao: true,
    },
    orderBy: [{ dataMensagem: 'desc' }, { criadoEm: 'desc' }],
    take: limit,
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
