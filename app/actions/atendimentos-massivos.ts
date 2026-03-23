'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '../../lib/prisma';
import { getAuthSession } from '../../lib/auth-session';

function parseDateTimeLocal(value: string | null | undefined) {
  if (!value) return null;

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  const localDateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (localDateTimeMatch) {
    const [, year, month, day, hours, minutes] = localDateTimeMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      0,
      0
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

type ClienteAfetadoPayload = {
  clienteId?: string | null;
  conexaoId?: string | null;
  nomeCliente: string;
  rua?: string | null;
  tecnicoResponsavel?: string | null;
  chamadoEm?: string | null;
  normalizado?: boolean;
  normalizadoEm?: string | null;
};

type AtendimentoMassivoPayload = {
  abertoEm?: string | null;
  problema: string;
  latitude?: number | null;
  longitude?: number | null;
  observacoesEquipe?: string | null;
  textoWhatsapp?: string | null;
  encerramentoInfo?: string | null;
  finalizado?: boolean;
  clientesAfetados: ClienteAfetadoPayload[];
};

export async function getAtendimentosMassivosAdmin() {
  try {
    return await prisma.atendimentoMassivo.findMany({
      orderBy: { abertoEm: 'desc' },
      include: {
        criadoPor: {
          select: { id: true, nome: true },
        },
        clientesAfetados: {
          orderBy: { ordem: 'asc' },
        },
      },
    });
  } catch (error) {
    console.error('Erro ao buscar atendimentos massivos:', error);
    return [];
  }
}

export async function upsertAtendimentoMassivoAdmin(
  id: string | null,
  payload: AtendimentoMassivoPayload
) {
  try {
    const sessao = await getAuthSession();

    const clientesAfetados = (payload.clientesAfetados || [])
      .map((item, index) => ({
        clienteId: item.clienteId || null,
        conexaoId: item.conexaoId || null,
        nomeCliente: item.nomeCliente?.trim() || '',
        rua: item.rua?.trim() || null,
        tecnicoResponsavel: item.tecnicoResponsavel?.trim() || null,
        chamadoEm: parseDateTimeLocal(item.chamadoEm),
        normalizado: Boolean(item.normalizado),
        normalizadoEm: item.normalizado ? parseDateTimeLocal(item.normalizadoEm) || new Date() : null,
        ordem: index,
      }))
      .filter((item) => item.nomeCliente);

    if (!payload.problema?.trim()) {
      return { sucesso: false, erro: 'Informe o problema massivo.' };
    }

    if (clientesAfetados.length === 0) {
      return { sucesso: false, erro: 'Adicione ao menos um cliente afetado.' };
    }

    const data = {
      abertoEm: parseDateTimeLocal(payload.abertoEm) || new Date(),
      problema: payload.problema.trim(),
      latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
      longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
      observacoesEquipe: payload.observacoesEquipe?.trim() || null,
      textoWhatsapp: payload.textoWhatsapp?.trim() || null,
      encerramentoInfo: payload.encerramentoInfo?.trim() || null,
      status: payload.finalizado ? 'FINALIZADO' : 'ABERTO',
      finalizadoEm: payload.finalizado ? new Date() : null,
      ...(id
        ? {}
        : {
            criadoPorId: sessao?.id || null,
          }),
    };

    if (id) {
      await prisma.atendimentoMassivo.update({
        where: { id },
        data: {
          ...data,
          clientesAfetados: {
            deleteMany: {},
            create: clientesAfetados,
          },
        },
      });
    } else {
      await prisma.atendimentoMassivo.create({
        data: {
          ...data,
          clientesAfetados: {
            create: clientesAfetados,
          },
        },
      });
    }

    revalidatePath('/admin');
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao salvar atendimento massivo:', error);
    return { sucesso: false, erro: 'Nao foi possivel salvar o atendimento massivo.' };
  }
}
