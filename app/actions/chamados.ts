'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getChamados() {
  try {
    return await prisma.chamado.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  } catch (error) {
    console.error("Erro ao buscar chamados:", error);
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
        status: 'novos',
      }
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error("Erro ao criar chamado:", error);
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
      }
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error("Erro ao atualizar chamado:", error);
  }
}

export async function updateChamadoStatus(id: string, novoStatus: string) {
  try {
    await prisma.chamado.update({
      where: { id },
      data: { status: novoStatus }
    });
    revalidatePath('/admin');
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
  }
}

export async function deleteChamado(id: string) {
  try {
    await prisma.chamado.delete({ where: { id } });
    revalidatePath('/admin');
  } catch (error) {
    console.error("Erro ao deletar chamado:", error);
  }
}