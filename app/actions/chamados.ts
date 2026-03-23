'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '../../lib/prisma';
import { getAuthSession } from '../../lib/auth-session';

function parseDateOnlyAsLocalDate(value: string | null | undefined) {
  if (!value) return null;

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function getChamados() {
  try {
    return await prisma.chamado.findMany({
      include: {
        midiasFechamento: {
          orderBy: { criadoEm: 'desc' },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });
  } catch (error) {
    console.error('Erro ao buscar chamados:', error);
    return [];
  }
}

export async function createChamado(data: any) {
  try {
    const sessao = await getAuthSession();

    await prisma.chamado.create({
      data: {
        protocolo: data.protocolo,
        clienteId: data.clienteId || null,
        conexaoId: data.conexaoId || null,
        nomeCliente: data.nomeCliente,
        whatsCliente: data.whatsCliente,
        enderecoCompleto: data.enderecoCompleto,
        categoria: data.categoria,
        motivo: data.motivo,
        pppoe: data.pppoe,
        senhaPpoe: data.senhaPpoe,
        contratoMhnet: data.contratoMhnet,
        obs: data.obs,
        tecnico: data.tecnico,
        abertoPor: sessao?.nome || data.abertoPor || 'Admin',
        agendamentoData: parseDateOnlyAsLocalDate(data.agendamentoData),
        agendamentoHora: data.agendamentoHora || null,
        resolucao: data.resolucao,
        prioridade: data.prioridade,
        status: data.status || 'novos',
        fechadoEm: data.fechadoEm ? new Date(data.fechadoEm) : null,
      },
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error('Erro ao criar chamado:', error);
  }
}

export async function updateChamado(id: string, data: any) {
  try {
    await prisma.chamado.update({
      where: { id },
      data: {
        clienteId: data.clienteId || null,
        conexaoId: data.conexaoId || null,
        nomeCliente: data.nomeCliente,
        whatsCliente: data.whatsCliente,
        enderecoCompleto: data.enderecoCompleto,
        categoria: data.categoria,
        motivo: data.motivo,
        pppoe: data.pppoe,
        senhaPpoe: data.senhaPpoe,
        contratoMhnet: data.contratoMhnet,
        obs: data.obs,
        tecnico: data.tecnico,
        abertoPor: typeof data.abertoPor === 'undefined' ? undefined : data.abertoPor,
        agendamentoData:
          typeof data.agendamentoData === 'undefined'
            ? undefined
            : data.agendamentoData
              ? parseDateOnlyAsLocalDate(data.agendamentoData)
              : null,
        agendamentoHora:
          typeof data.agendamentoHora === 'undefined'
            ? undefined
            : data.agendamentoHora || null,
        resolucao: data.resolucao,
        prioridade: data.prioridade,
        status: data.status,
        fechadoEm:
          typeof data.fechadoEm === 'undefined'
            ? undefined
            : data.fechadoEm
              ? new Date(data.fechadoEm)
              : null,
      },
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error('Erro ao atualizar chamado:', error);
  }
}

export async function updateChamadoStatus(
  id: string,
  novoStatus: string,
  options?: { fechadoEm?: string | null; agendamentoData?: string | null; agendamentoHora?: string | null }
) {
  try {
    const chamadoAtual = await prisma.chamado.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!chamadoAtual) {
      return;
    }

    const saindoDeConcluido = chamadoAtual.status === 'concluidos' && novoStatus !== 'concluidos';
    const entrandoEmConcluido = chamadoAtual.status !== 'concluidos' && novoStatus === 'concluidos';

    await prisma.chamado.update({
      where: { id },
      data: {
        status: novoStatus,
        agendamentoData:
          novoStatus === 'agendados'
            ? options?.agendamentoData
              ? parseDateOnlyAsLocalDate(options.agendamentoData)
              : undefined
            : null,
        agendamentoHora:
          novoStatus === 'agendados'
            ? options?.agendamentoHora || null
            : null,
        fechadoEm: saindoDeConcluido
          ? null
          : entrandoEmConcluido
            ? options?.fechadoEm
              ? new Date(options.fechadoEm)
              : new Date()
            : undefined,
      },
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
}

export async function deleteChamado(id: string) {
  try {
    await prisma.chamado.delete({ where: { id } });
    revalidatePath('/admin');
  } catch (error) {
    console.error('Erro ao deletar chamado:', error);
  }
}
