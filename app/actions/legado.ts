'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export async function importarHistoricoLegado(linhas: any[]) {
  try {
    await prisma.historicoLegado.createMany({
      data: linhas,
      skipDuplicates: true,
    });
    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao importar legado:", error);
    return { sucesso: false, erro: "Falha na importação" };
  }
}

export async function buscarHistoricoLegado(termo: string) {
  if (!termo || termo.length < 3) return [];
  
  try {
    return await prisma.historicoLegado.findMany({
      where: {
        OR: [
          { cliente_nome: { contains: termo, mode: 'insensitive' } },
          { detalhes_brutos: { contains: termo, mode: 'insensitive' } }
        ]
      },
      take: 100, // Limita a 100 resultados para a busca ser instantânea
      orderBy: { criadoEm: 'desc' }
    });
  } catch (error) {
    console.error("Erro ao buscar legado:", error);
    return [];
  }
}