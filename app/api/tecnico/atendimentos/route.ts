import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getAuthSession } from '../../../../lib/auth-session';
import { uploadBufferToDrive } from '../../../../lib/google-drive';

type ItemPayload = {
  tempId: string;
  persistedItemId?: string;
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
  existingImageUrl?: string;
  existingDriveFileId?: string;
};

type AtendimentoPayload = {
  id?: string;
  clienteNome: string;
  tipoAtendimento: string;
  itens: ItemPayload[];
};

function normalizeMacAddress(value: string | undefined) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

async function buildItensComUpload(payload: AtendimentoPayload, formData: FormData) {
  let imagesReceived = 0;
  let imagesUploaded = 0;

  const itens = await Promise.all(
    payload.itens.map(async (item) => {
      const image = formData.get(item.tempId);
      let imagemUrl = item.existingImageUrl || undefined;
      let driveFileId = item.existingDriveFileId || undefined;

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
          macAddress: normalizeMacAddress(item.macAddress) || null,
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

  return {
    itens,
    upload: {
      imagesReceived,
      imagesUploaded,
    },
  };
}

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

    const { itens, upload } = await buildItensComUpload(payload, formData);

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
      upload,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha ao salvar o atendimento.';
    console.error('Falha ao finalizar atendimento tecnico:', cause);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sessao = await getAuthSession();

    if (!sessao) {
      return NextResponse.json({ error: 'NÃ£o autenticado.' }, { status: 401 });
    }

    const formData = await request.formData();
    const payloadRaw = formData.get('payload');

    if (typeof payloadRaw !== 'string') {
      return NextResponse.json({ error: 'Payload invÃ¡lido.' }, { status: 400 });
    }

    const payload = JSON.parse(payloadRaw) as AtendimentoPayload;

    if (!payload.id) {
      return NextResponse.json({ error: 'Registro nÃ£o informado.' }, { status: 400 });
    }

    if (!payload.clienteNome || !payload.tipoAtendimento || payload.itens.length === 0) {
      return NextResponse.json({ error: 'Dados obrigatÃ³rios nÃ£o informados.' }, { status: 400 });
    }

    const registro = await prisma.atendimentoEquipamento.findUnique({
      where: { id: payload.id },
      select: { id: true, tecnicoId: true },
    });

    if (!registro) {
      return NextResponse.json({ error: 'Registro nÃ£o encontrado.' }, { status: 404 });
    }

    const podeEditar = sessao.role === 'ADMIN' || registro.tecnicoId === sessao.id;

    if (!podeEditar) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { itens, upload } = await buildItensComUpload(payload, formData);

    const atendimento = await prisma.$transaction(async (tx) => {
      await tx.atendimentoEquipamento.update({
        where: { id: payload.id },
        data: {
          clienteNome: payload.clienteNome,
          tipoAtendimento: payload.tipoAtendimento,
          alteradoPor: sessao.nome,
          alteradoEm: new Date(),
        },
      });

      await tx.atendimentoEquipamentoItem.deleteMany({
        where: { atendimentoId: payload.id },
      });

      await tx.atendimentoEquipamentoItem.createMany({
        data: itens.map((item) => ({
          atendimentoId: payload.id!,
          ...item,
        })),
      });

      return tx.atendimentoEquipamento.findUnique({
        where: { id: payload.id },
        include: { itens: true },
      });
    });

    return NextResponse.json({
      success: true,
      atendimento,
      upload,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha ao atualizar o atendimento.';
    console.error('Falha ao atualizar atendimento tecnico:', cause);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
