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
    const mesmoTecnico =
      chamado.tecnico && normalizarNome(chamado.tecnico) === normalizarNome(sessao.nome);

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
