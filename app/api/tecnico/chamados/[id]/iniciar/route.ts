import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { prisma } from '../../../../../../lib/prisma';
import { getAuthSession } from '../../../../../../lib/auth-session';

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

function tecnicoCorresponde(tecnicoChamado: string | null | undefined, nomeSessao: string) {
  if (!tecnicoChamado) return false;

  const tecnicoNormalizado = normalizarNome(tecnicoChamado);
  const nomeNormalizado = normalizarNome(nomeSessao);

  if (
    tecnicoNormalizado === nomeNormalizado ||
    tecnicoNormalizado.includes(nomeNormalizado) ||
    nomeNormalizado.includes(tecnicoNormalizado)
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessao = await getAuthSession();

    if (!sessao) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
    }

    const { id } = await context.params;

    const chamado = await prisma.chamado.findUnique({
      where: { id },
      select: {
        id: true,
        tecnico: true,
        status: true,
      },
    });

    if (!chamado) {
      return NextResponse.json({ error: 'Chamado nao encontrado.' }, { status: 404 });
    }

    const acessoAdmin = sessao.role === 'ADMIN';
    const mesmoTecnico = tecnicoCorresponde(chamado.tecnico, sessao.nome);

    if (!acessoAdmin && !mesmoTecnico) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    await prisma.chamado.update({
      where: { id },
      data: {
        status: 'andamento',
      },
    });

    revalidatePath('/admin');
    revalidatePath('/tecnico');
    revalidatePath('/tecnico/chamados');
    revalidatePath(`/tecnico/chamados/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao iniciar chamado tecnico:', error);
    return NextResponse.json({ error: 'Nao foi possivel iniciar o chamado.' }, { status: 500 });
  }
}
