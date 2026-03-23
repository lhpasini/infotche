import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { prisma } from '../../../../../../lib/prisma';
import { getAuthSession } from '../../../../../../lib/auth-session';
import { uploadBufferToDrive } from '../../../../../../lib/google-drive';

type FechamentoPayload = {
  relatoTexto?: string;
  transcricaoAudio?: string;
};

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

function inferirTipoMidia(mimeType: string) {
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  return 'IMAGEM';
}

function sanitizeFilename(value: string) {
  return value
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120);
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
        protocolo: true,
        nomeCliente: true,
        tecnico: true,
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

    const formData = await request.formData();
    const payloadRaw = formData.get('payload');

    if (typeof payloadRaw !== 'string') {
      return NextResponse.json({ error: 'Payload invalido.' }, { status: 400 });
    }

    const payload = JSON.parse(payloadRaw) as FechamentoPayload;
    const relatoTexto = payload.relatoTexto?.trim() || '';
    const transcricaoAudio = payload.transcricaoAudio?.trim() || '';

    if (!relatoTexto && !transcricaoAudio) {
      return NextResponse.json(
        { error: 'Informe um relato em texto ou grave um audio antes de finalizar.' },
        { status: 400 }
      );
    }

    const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
    const mediasCriadas = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const tipo = inferirTipoMidia(file.type || '');
      const filename = sanitizeFilename(
        `chamado-${chamado.protocolo}-${tipo.toLowerCase()}-${Date.now()}-${file.name || 'arquivo'}`
      );
      const upload = await uploadBufferToDrive({
        buffer: Buffer.from(bytes),
        filename,
        mimeType: file.type || 'application/octet-stream',
      });

      mediasCriadas.push({
        tipo,
        nomeArquivo: file.name || filename,
        mimeType: file.type || 'application/octet-stream',
        arquivoUrl: upload.url,
        driveFileId: upload.fileId,
        transcricao: tipo === 'AUDIO' ? transcricaoAudio || null : null,
      });
    }

    await prisma.chamado.update({
      where: { id },
      data: {
        status: 'concluidos',
        resolucao: relatoTexto || transcricaoAudio || undefined,
        fechamentoTecnicoTexto: relatoTexto || null,
        fechamentoTecnicoTranscricao: transcricaoAudio || null,
        fechamentoTecnicoPor: sessao.nome,
        fechamentoTecnicoEm: new Date(),
        fechadoEm: new Date(),
        midiasFechamento: mediasCriadas.length > 0 ? { create: mediasCriadas } : undefined,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/tecnico');
    revalidatePath('/tecnico/chamados');
    revalidatePath(`/tecnico/chamados/${id}`);

    return NextResponse.json({
      success: true,
      upload: {
        totalArquivos: mediasCriadas.length,
      },
    });
  } catch (error) {
    console.error('Erro ao finalizar chamado pelo tecnico:', error);
    const message =
      error instanceof Error ? error.message : 'Nao foi possivel finalizar o chamado.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
