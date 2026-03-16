import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed (Modo Direto) ---');

  try {
    // 1. Limpa a tabela usando SQL puro (evita erro de prepared statement)
    console.log('Limpando categorias...');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Categoria" RESTART IDENTITY CASCADE;`);

    // 2. Insere as categorias uma a uma com SQL puro
    const categorias = [
      'Instalação Fibra',
      'Troca de Endereços',
      'Cabeamento de Rede',
      'Orçamento de Cabeamento',
      'Orçamento de Câmeras',
      'Instalação de Sistema de Câmeras',
      'Chamado Lentidão',
      'Fibra Rompida'
    ];

    console.log('Inserindo categorias...');
    for (const nome of categorias) {
      // Usamos Raw para garantir que o driver não tente criar statements complexos
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Categoria" (id, nome, ativa) VALUES ('${crypto.randomUUID()}', '${nome}', true);`
      );
    }

    console.log('✅ Categorias criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });