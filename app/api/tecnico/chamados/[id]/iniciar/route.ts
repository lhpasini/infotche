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
    const mesmoTecnico =
      chamado.tecnico && normalizarNome(chamado.tecnico) === normalizarNome(sessao.nome);

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
