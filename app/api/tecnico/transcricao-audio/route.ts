import { NextResponse } from 'next/server';

async function transcreverAudioComOpenAI(file: File) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Configure OPENAI_API_KEY para habilitar a transcricao de audio.');
  }

  const form = new FormData();
  form.append('model', 'whisper-1');
  form.append('language', 'pt');
  form.append('response_format', 'json');
  form.append('file', file, file.name || 'audio.webm');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Falha ao transcrever o audio.');
  }

  const data = (await response.json()) as { text?: string };
  return data.text?.trim() || '';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo de audio invalido.' }, { status: 400 });
    }

    const texto = await transcreverAudioComOpenAI(file);

    if (!texto) {
      return NextResponse.json({ error: 'Nao foi possivel transcrever o audio.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, text: texto });
  } catch (error) {
    console.error('Erro ao transcrever audio enviado:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nao foi possivel transcrever o audio.',
      },
      { status: 500 }
    );
  }
}
