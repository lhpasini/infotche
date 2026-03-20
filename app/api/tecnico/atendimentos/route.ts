import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getAuthSession } from '../../../../lib/auth-session';
import { uploadBufferToDrive } from '../../../../lib/google-drive';

type ItemPayload = {
  tempId: string;
  tipoEquipamento: string;
  marca?: string;
  modelo?: string;
  codigoEquipamento?: string;
  macAddress?: string;
  serialNumber?: string;
  usuarioAcesso?: string;
  senhaAcesso?: string;
  observacao?: string;
  ocrTextoBruto?: string;
};

type AtendimentoPayload = {
  clienteNome: string;
  tipoAtendimento: string;
  itens: ItemPayload[];
};

export async function POST(request: Request) {
  try {
    const sessao = await getAuthSession();

    if (!sessao) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const formData = await request.formData();
    const payloadRaw = formData.get('payload');

    if (typeof payloadRaw !== 'string') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const payload = JSON.parse(payloadRaw) as AtendimentoPayload;

    if (!payload.clienteNome || !payload.tipoAtendimento || payload.itens.length === 0) {
      return NextResponse.json({ error: 'Dados obrigatórios não informados.' }, { status: 400 });
    }

    let imagesReceived = 0;
    let imagesUploaded = 0;

    const itens = await Promise.all(
      payload.itens.map(async (item) => {
        const image = formData.get(item.tempId);
        let imagemUrl: string | undefined;
        let driveFileId: string | undefined;

        if (image instanceof File) {
          imagesReceived += 1;
          const bytes = await image.arrayBuffer();
          const filename = `${payload.clienteNome}-${item.serialNumber || item.macAddress || item.tempId}-${Date.now()}.jpg`
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '');
          try {
            const upload = await uploadBufferToDrive({
              buffer: Buffer.from(bytes),
              filename,
              mimeType: image.type || 'image/jpeg',
            });

            imagemUrl = upload.url;
            driveFileId = upload.fileId;
            imagesUploaded += 1;
          } catch (cause) {
            const message = cause instanceof Error ? cause.message : 'Falha ao enviar imagem para o Google Drive.';
            throw new Error(`Nao foi possivel enviar a foto do equipamento para o Google Drive. ${message}`);
          }
        }

        return {
          tipoEquipamento: item.tipoEquipamento,
          marca: item.marca || null,
          modelo: item.modelo || null,
          codigoEquipamento: item.codigoEquipamento || null,
          macAddress: item.macAddress || null,
          serialNumber: item.serialNumber || null,
          usuarioAcesso: item.usuarioAcesso || null,
          senhaAcesso: item.senhaAcesso || null,
          observacao: item.observacao || null,
          ocrTextoBruto: item.ocrTextoBruto || null,
          imagemUrl: imagemUrl || null,
          driveFileId: driveFileId || null,
        };
      }),
    );

    const atendimento = await prisma.atendimentoEquipamento.create({
      data: {
        tecnicoId: sessao.id,
        clienteNome: payload.clienteNome,
        tipoAtendimento: payload.tipoAtendimento,
        itens: {
          create: itens,
        },
      },
      include: { itens: true },
    });

    return NextResponse.json({
      success: true,
      atendimento,
      upload: {
        imagesReceived,
        imagesUploaded,
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha ao salvar o atendimento.';
    console.error('Falha ao finalizar atendimento tecnico:', cause);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
