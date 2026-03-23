'use server';

import { prisma } from '../../lib/prisma';
import { getAuthSession } from '../../lib/auth-session';

const DEFAULT_TIPOS_ATENDIMENTO_EQUIPAMENTO = [
  'Nova instalacao',
  'Troca de equipamento',
  'Troca de endereco',
  'Cancelamento / devolucao',
];

async function ensureTiposAtendimentoEquipamento() {
  const total = await prisma.tipoAtendimentoEquipamento.count();

  if (total > 0) {
    return;
  }

  await prisma.tipoAtendimentoEquipamento.createMany({
    data: DEFAULT_TIPOS_ATENDIMENTO_EQUIPAMENTO.map((nome, index) => ({
      nome,
      ordem: index,
      ativo: true,
    })),
  });
}

export async function getResumoTecnico() {
  const sessao = await getAuthSession();

  if (!sessao) {
    return { sessao: null, recentes: [] };
  }

  const recentes = await prisma.atendimentoEquipamento.findMany({
    where: {
      tecnicoId: sessao.id,
    },
    include: {
      itens: true,
      tecnico: true,
    },
    orderBy: { criadoEm: 'desc' },
    take: 5,
  });

  return { sessao, recentes };
}

export async function getRegistroEquipamentoTecnicoById(id: string) {
  const sessao = await getAuthSession();

  if (!sessao) {
    return null;
  }

  const registro = await prisma.atendimentoEquipamento.findUnique({
    where: { id },
    include: {
      tecnico: true,
      itens: true,
    },
  });

  if (!registro) {
    return null;
  }

  const podeVer = sessao.role === 'ADMIN' || registro.tecnicoId === sessao.id;

  if (!podeVer) {
    return null;
  }

  return { sessao, registro };
}

export async function getTiposAtendimentoEquipamento() {
  const sessao = await getAuthSession();

  if (!sessao) {
    return [];
  }

  await ensureTiposAtendimentoEquipamento();

  return prisma.tipoAtendimentoEquipamento.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
  });
}

export async function getTiposAtendimentoEquipamentoAdmin() {
  const sessao = await getAuthSession();

  if (!sessao || sessao.role !== 'ADMIN') {
    return [];
  }

  await ensureTiposAtendimentoEquipamento();

  return prisma.tipoAtendimentoEquipamento.findMany({
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
  });
}

export async function upsertTipoAtendimentoEquipamento(id: string | null, data: { nome: string; ativo: boolean; ordem: number }) {
  const sessao = await getAuthSession();

  if (!sessao || sessao.role !== 'ADMIN') {
    return { sucesso: false, erro: 'Acesso negado.' };
  }

  const nome = data.nome.trim();

  if (!nome) {
    return { sucesso: false, erro: 'Informe o nome do tipo de atendimento.' };
  }

  try {
    if (id) {
      await prisma.tipoAtendimentoEquipamento.update({
        where: { id },
        data: {
          nome,
          ativo: data.ativo,
          ordem: data.ordem,
        },
      });
    } else {
      await prisma.tipoAtendimentoEquipamento.create({
        data: {
          nome,
          ativo: data.ativo,
          ordem: data.ordem,
        },
      });
    }

    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao salvar tipo de atendimento de equipamento:', error);
    return { sucesso: false, erro: 'Não foi possível salvar o tipo de atendimento.' };
  }
}

export async function deleteTipoAtendimentoEquipamento(id: string) {
  const sessao = await getAuthSession();

  if (!sessao || sessao.role !== 'ADMIN') {
    return { sucesso: false, erro: 'Acesso negado.' };
  }

  try {
    const tipo = await prisma.tipoAtendimentoEquipamento.findUnique({
      where: { id },
    });

    if (!tipo) {
      return { sucesso: false, erro: 'Tipo de atendimento não encontrado.' };
    }

    const emUso = await prisma.atendimentoEquipamento.count({
      where: { tipoAtendimento: tipo.nome },
    });

    if (emUso > 0) {
      return { sucesso: false, erro: 'Este tipo já foi usado em registros e não pode ser apagado. Edite ou desative em vez disso.' };
    }

    await prisma.tipoAtendimentoEquipamento.delete({
      where: { id },
    });

    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao apagar tipo de atendimento de equipamento:', error);
    return { sucesso: false, erro: 'Não foi possível apagar o tipo de atendimento.' };
  }
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

type ArquivoMortoWhatsappFiltroInput = {
  termo?: string;
  dataInicio?: string;
  dataFim?: string;
  autor?: string;
  limit?: number;
};

export async function filtrarArquivoMortoWhatsappAdmin(filtros: ArquivoMortoWhatsappFiltroInput) {
  const sessao = await getAuthSession();

  if (!sessao) {
    return [];
  }

  const termo = filtros.termo?.trim();
  const autor = filtros.autor?.trim();
  const limit = filtros.limit && filtros.limit > 0 ? filtros.limit : 300;
  const andConditions: Array<Record<string, unknown>> = [];

  if (filtros.dataInicio) {
    andConditions.push({
      dataMensagem: {
        gte: new Date(`${filtros.dataInicio}T00:00:00`),
      },
    });
  }

  if (filtros.dataFim) {
    andConditions.push({
      dataMensagem: {
        lte: new Date(`${filtros.dataFim}T23:59:59`),
      },
    });
  }

  if (autor) {
    andConditions.push({
      autor: {
        equals: autor,
        mode: 'insensitive',
      },
    });
  }

  if (termo) {
    andConditions.push({
      OR: [
        { autor: { contains: termo, mode: 'insensitive' } },
        { conteudo: { contains: termo, mode: 'insensitive' } },
        { arquivoNome: { contains: termo, mode: 'insensitive' } },
        { mensagemBruta: { contains: termo, mode: 'insensitive' } },
      ],
    });
  }

  return prisma.arquivoMortoWhatsappMensagem.findMany({
    where: andConditions.length > 0 ? { AND: andConditions } : undefined,
    include: {
      importacao: true,
    },
    orderBy: [{ dataMensagem: 'desc' }, { criadoEm: 'desc' }],
    take: limit,
  });
}

export async function getAutoresArquivoMortoWhatsappAdmin() {
  const sessao = await getAuthSession();

  if (!sessao) {
    return [];
  }

  const autores = await prisma.arquivoMortoWhatsappMensagem.findMany({
    where: {
      autor: {
        not: null,
      },
    },
    select: {
      autor: true,
    },
    distinct: ['autor'],
    orderBy: {
      autor: 'asc',
    },
  });

  return autores.map((item) => item.autor).filter(Boolean);
}

export async function getRegistrosEquipamentosAdmin() {
  const sessao = await getAuthSession();

  if (!sessao) {
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

type EquipamentoAdminItemInput = {
  tipoEquipamento: string;
  marca?: string | null;
  modelo?: string | null;
  codigoEquipamento?: string | null;
  macAddress?: string | null;
  serialNumber?: string | null;
  usuarioAcesso?: string | null;
  senhaAcesso?: string | null;
  imagemUrl?: string | null;
  driveFileId?: string | null;
  ocrTextoBruto?: string | null;
  observacao?: string | null;
};

type EquipamentoAdminUpdateInput = {
  clienteNome: string;
  tipoAtendimento: string;
  itens: EquipamentoAdminItemInput[];
};

export async function updateRegistroEquipamentoAdmin(id: string, data: EquipamentoAdminUpdateInput) {
  const sessao = await getAuthSession();

  if (!sessao) {
    return { sucesso: false, erro: 'Acesso negado.' };
  }

  const clienteNome = data.clienteNome.trim();
  const tipoAtendimento = data.tipoAtendimento.trim();
  const itens = data.itens
    .map((item) => ({
      tipoEquipamento: item.tipoEquipamento.trim(),
      marca: item.marca?.trim() || null,
      modelo: item.modelo?.trim() || null,
      codigoEquipamento: item.codigoEquipamento?.trim() || null,
      macAddress: item.macAddress?.trim() || null,
      serialNumber: item.serialNumber?.trim() || null,
      usuarioAcesso: item.usuarioAcesso?.trim() || null,
      senhaAcesso: item.senhaAcesso?.trim() || null,
      imagemUrl: item.imagemUrl?.trim() || null,
      driveFileId: item.driveFileId?.trim() || null,
      ocrTextoBruto: item.ocrTextoBruto?.trim() || null,
      observacao: item.observacao?.trim() || null,
    }))
    .filter((item) => item.tipoEquipamento);

  if (!clienteNome || !tipoAtendimento || itens.length === 0) {
    return { sucesso: false, erro: 'Preencha cliente, tipo de atendimento e ao menos um item.' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const registro = await tx.atendimentoEquipamento.findUnique({
        where: { id },
        select: { tecnicoId: true },
      });

      if (!registro) {
        throw new Error('REGISTRO_NAO_ENCONTRADO');
      }

      const podeEditar = sessao.role === 'ADMIN' || registro.tecnicoId === sessao.id;

      if (!podeEditar) {
        throw new Error('ACESSO_NEGADO');
      }

      await tx.atendimentoEquipamento.update({
        where: { id },
        data: {
          clienteNome,
          tipoAtendimento,
          alteradoPor: sessao.nome,
          alteradoEm: new Date(),
        },
      });

      await tx.atendimentoEquipamentoItem.deleteMany({
        where: { atendimentoId: id },
      });

      await tx.atendimentoEquipamentoItem.createMany({
        data: itens.map((item) => ({
          atendimentoId: id,
          ...item,
        })),
      });
    });

    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao atualizar registro de equipamento:', error);
    if (error instanceof Error && error.message === 'ACESSO_NEGADO') {
      return { sucesso: false, erro: 'Voce so pode editar registros criados por voce.' };
    }
    if (error instanceof Error && error.message === 'REGISTRO_NAO_ENCONTRADO') {
      return { sucesso: false, erro: 'Registro de equipamento nao encontrado.' };
    }
    return { sucesso: false, erro: 'Nao foi possivel atualizar o registro.' };
  }
}

export async function deleteRegistroEquipamentoAdmin(id: string) {
  const sessao = await getAuthSession();

  if (!sessao || sessao.role !== 'ADMIN') {
    return { sucesso: false, erro: 'Acesso negado.' };
  }

  try {
    await prisma.atendimentoEquipamento.delete({
      where: { id },
    });

    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao remover registro de equipamento:', error);
    return { sucesso: false, erro: 'Não foi possível remover o registro.' };
  }
}
