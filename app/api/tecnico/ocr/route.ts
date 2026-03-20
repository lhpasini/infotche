import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';
import { parseEquipmentText } from '../../../../lib/equipment-ocr';
import { getAuthSession } from '../../../../lib/auth-session';

export async function POST(request: Request) {
  try {
    const sessao = await getAuthSession();

    if (!sessao) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Imagem não enviada.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { data } = await Tesseract.recognize(buffer, 'eng');

    return NextResponse.json(parseEquipmentText(data.text || ''));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha ao processar a imagem.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
