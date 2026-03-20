'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '../../lib/prisma';

export async function getChamados() {
  try {
    return await prisma.chamado.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  } catch (error) {
    console.error('Erro ao buscar chamados:', error);
    return [];
  }
}

export async function createChamado(data: any) {
  try {
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
        abertoPor: data.abertoPor,
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
        abertoPor: data.abertoPor,
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
  options?: { fechadoEm?: string | null }
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
