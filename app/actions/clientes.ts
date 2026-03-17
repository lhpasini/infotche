'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export type DadosCliente = { nome: string; cpfCnpj?: string; whatsapp?: string; email?: string; };
export type DadosConexao = { endereco: string; bairro?: string; contratoMhnet?: string; pppoe?: string; senhaPpoe?: string; };

// 1. Buscar todos os clientes
export async function getClientes() {
  try {
    return await prisma.cliente.findMany({
      include: { conexoes: true }, 
      orderBy: { nome: 'asc' }
    });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return [];
  }
}

// 2. Criar Cliente e sua Primeira Conexão simultaneamente
export async function createCliente(dadosCliente: DadosCliente, dadosConexao: DadosConexao) {
  try {
    await prisma.cliente.create({
      data: {
        nome: dadosCliente.nome,
        cpfCnpj: dadosCliente.cpfCnpj || null,
        whatsapp: dadosCliente.whatsapp || null,
        email: dadosCliente.email || null,
        conexoes: {
          create: {
            endereco: dadosConexao.endereco,
            bairro: dadosConexao.bairro || null,
            contratoMhnet: dadosConexao.contratoMhnet || null,
            pppoe: dadosConexao.pppoe || null,
            senhaPpoe: dadosConexao.senhaPpoe || null
          }
        }
      }
    });
    revalidatePath('/admin');
  } catch (error) { console.error("Erro ao criar cliente:", error); }
}

// 3. Atualizar Dados Pessoais do Cliente
export async function updateCliente(id: string, dadosCliente: DadosCliente) {
  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        nome: dadosCliente.nome,
        cpfCnpj: dadosCliente.cpfCnpj || null,
        whatsapp: dadosCliente.whatsapp || null,
        email: dadosCliente.email || null,
        cidade: dados.cidade // <-- ESTA LINHA É A QUE FALTA
      }
    });
    revalidatePath('/admin');
  } catch (error) { console.error("Erro ao atualizar cliente:", error); }
}

// 4. Excluir Cliente (apaga conexões junto)
export async function deleteCliente(id: string) {
  try {
    await prisma.cliente.delete({ where: { id } });
    revalidatePath('/admin');
  } catch (error) { console.error("Erro ao deletar cliente:", error); }
}

// 5. Adicionar Nova Conexão a um Cliente Existente
export async function addConexao(clienteId: string, dadosConexao: DadosConexao) {
  try {
    await prisma.conexao.create({
      data: {
        clienteId: clienteId,
        endereco: dadosConexao.endereco,
        bairro: dadosConexao.bairro || null,
        contratoMhnet: dadosConexao.contratoMhnet || null,
        pppoe: dadosConexao.pppoe || null,
        senhaPpoe: dadosConexao.senhaPpoe || null
      }
    });
    revalidatePath('/admin');
  } catch (error) { console.error("Erro ao adicionar conexão:", error); }
}

// 6. Atualizar uma Conexão Específica
export async function updateConexao(id: string, dadosConexao: DadosConexao) {
  try {
    await prisma.conexao.update({
      where: { id },
      data: {
        endereco: dadosConexao.endereco,
        bairro: dadosConexao.bairro || null,
        contratoMhnet: dadosConexao.contratoMhnet || null,
        pppoe: dadosConexao.pppoe || null,
        senhaPpoe: dadosConexao.senhaPpoe || null
      }
    });
    revalidatePath('/admin');
  } catch (error) { console.error("Erro ao atualizar conexão:", error); }
}

// 7. Remover uma Conexão Específica
export async function deleteConexao(id: string) {
  try {
    await prisma.conexao.delete({ where: { id } });
    revalidatePath('/admin');
  } catch (error) { console.error("Erro ao deletar conexão:", error); }
}