'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import DriveMediaPreview from '../../../../../components/DriveMediaPreview';

type MidiaResumo = {
  id: string;
  tipo: string;
  arquivoUrl: string;
  nomeArquivo: string | null;
  driveFileId?: string | null;
  mimeType?: string | null;
};

type Props = {
  chamadoId: string;
  status: string;
  fechamentoTecnicoTexto: string | null;
  fechamentoTecnicoTranscricao: string | null;
  midias: MidiaResumo[];
};

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
  tipo: 'audio' | 'image' | 'video';
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function inferPendingType(file: File): PendingFile['tipo'] {
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'image';
}

function formatTipo(tipo: string) {
  if (tipo === 'AUDIO') return 'Audio';
  if (tipo === 'VIDEO') return 'Video';
  return 'Imagem';
}

export default function FechamentoChamadoTecnicoCard(props: Props) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const transcricaoBufferRef = useRef('');

  const [relatoTexto, setRelatoTexto] = useState(props.fechamentoTecnicoTexto || '');
  const [transcricaoAudio, setTranscricaoAudio] = useState(props.fechamentoTecnicoTranscricao || '');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [transcribingPendingId, setTranscribingPendingId] = useState<string | null>(null);

  useEffect(() => {
    const ctor =
      typeof window !== 'undefined'
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : null;
    setSpeechSupported(Boolean(ctor));
  }, []);

  function appendFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const next = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      tipo: inferPendingType(file),
    }));

    setPendingFiles((current) => [...current, ...next]);
  }

  function appendSingleFile(file: File) {
    setPendingFiles((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        tipo: inferPendingType(file),
      },
    ]);
  }

  function removePendingFile(id: string) {
    setPendingFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function transcreverArquivoPendente(id: string) {
    const target = pendingFiles.find((item) => item.id === id && item.tipo === 'audio');

    if (!target) {
      setErro('Selecione um audio valido para transcrever.');
      return;
    }

    setTranscribingPendingId(id);
    setErro('');
    setMensagem('');

    try {
      const formData = new FormData();
      formData.append('file', target.file);

      const response = await fetch('/api/tecnico/transcricao-audio', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel transcrever o audio.');
      }

      const texto = (data.text || '').trim();
      setTranscricaoAudio((current) => (current ? `${current}\n\n${texto}`.trim() : texto));
      setMensagem('Audio transcrito e preenchido no fechamento.');
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao transcrever o audio.');
    } finally {
      setTranscribingPendingId(null);
    }
  }

  async function iniciarAtendimento() {
    setStarting(true);
    setErro('');
    setMensagem('');

    try {
      const response = await fetch(`/api/tecnico/chamados/${props.chamadoId}/iniciar`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel iniciar o atendimento.');
      }
      setMensagem('Chamado marcado como em andamento.');
      router.refresh();
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao iniciar atendimento.');
    } finally {
      setStarting(false);
    }
  }

  async function startRecording() {
    setErro('');
    setMensagem('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `relato-${Date.now()}.webm`, {
          type: blob.type || 'audio/webm',
        });
        appendSingleFile(file);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      transcricaoBufferRef.current = '';
      setRecording(true);

      const SpeechRecognition = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as SpeechRecognitionCtor | undefined;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.continuous = true;
        recognition.onresult = (event) => {
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            if (!result.isFinal) {
              continue;
            }
            const transcript = result[0]?.transcript?.trim();
            if (!transcript) {
              continue;
            }
            transcricaoBufferRef.current = `${transcricaoBufferRef.current} ${transcript}`.trim();
          }
          setTranscricaoAudio(transcricaoBufferRef.current);
        };
        recognition.onerror = () => {};
        recognition.onend = () => {
          speechRecognitionRef.current = null;
        };
        recognition.start();
        speechRecognitionRef.current = recognition;
      }
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Nao foi possivel iniciar a gravacao.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    speechRecognitionRef.current?.stop?.();
    setRecording(false);
    setMensagem('Audio anexado ao fechamento.');
  }

  async function finalizarChamado() {
    setSubmitting(true);
    setErro('');
    setMensagem('');

    try {
      const temMidia = pendingFiles.length > 0;
      const textoNormalizado = relatoTexto.trim();
      const transcricaoNormalizada = transcricaoAudio.trim();

      if (!textoNormalizado && !transcricaoNormalizada && !temMidia) {
        throw new Error('Informe um relato em texto, grave um audio ou anexe midia antes de finalizar.');
      }

      const payload = {
        relatoTexto: textoNormalizado,
        transcricaoAudio: transcricaoNormalizada,
      };
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      pendingFiles.forEach((item) => {
        formData.append('files', item.file);
      });

      const response = await fetch(`/api/tecnico/chamados/${props.chamadoId}/fechamento`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel finalizar o chamado.');
      }

      setMensagem(
        data.upload?.totalArquivos
          ? `Chamado concluido com sucesso. ${data.upload.totalArquivos} arquivo(s) enviados para o Drive.`
          : 'Chamado concluido com sucesso.'
      );
      setTimeout(() => {
        router.push('/tecnico/chamados');
        router.refresh();
      }, 600);
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao finalizar chamado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Fechamento tecnico</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Encerrar atendimento no celular</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
            props.status === 'concluidos' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {props.status === 'concluidos' ? 'Concluido' : 'Aberto'}
        </span>
      </div>

      {(mensagem || erro) && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-4 text-sm font-semibold ${
            erro ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {erro || mensagem}
        </div>
      )}

      {props.status !== 'andamento' && props.status !== 'concluidos' && (
        <button
          type="button"
          onClick={iniciarAtendimento}
          disabled={starting}
          className="mt-4 w-full rounded-[22px] bg-amber-500 px-5 py-4 text-base font-black text-white transition hover:bg-amber-600 disabled:opacity-70"
        >
          {starting ? 'Iniciando...' : 'Marcar como em andamento'}
        </button>
      )}

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Relato do atendimento</span>
          <textarea
            rows={5}
            value={relatoTexto}
            onChange={(event) => setRelatoTexto(event.target.value)}
            placeholder="Descreva o que foi feito, testes executados e resultado final."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
          />
        </label>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Audio do tecnico</p>
              <p className="mt-2 text-sm text-slate-600">
                Grave um relato rapido. Se o navegador suportar, a transcricao entra automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`rounded-full px-4 py-2 text-sm font-black text-white ${
                recording ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {recording ? 'Parar gravacao' : 'Gravar audio'}
            </button>
          </div>

          {!speechSupported && (
            <p className="mt-3 text-xs text-amber-700">
              A transcricao automatica depende do navegador do aparelho. O audio continua sendo salvo normalmente.
            </p>
          )}
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Transcricao do audio</span>
          <textarea
            rows={4}
            value={transcricaoAudio}
            onChange={(event) => setTranscricaoAudio(event.target.value)}
            placeholder="A transcricao aparece aqui quando o navegador suportar a leitura de voz."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
          />
        </label>

        <div className="grid grid-cols-1 gap-3">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => appendFiles(event.target.files)}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => appendFiles(event.target.files)}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(event) => appendFiles(event.target.files)}
          />

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="rounded-[22px] bg-[linear-gradient(135deg,#082f49_0%,#0f172a_100%)] px-5 py-4 text-left text-white shadow-sm"
          >
            <span className="block text-sm font-black uppercase tracking-[0.24em] text-sky-200">Fotos</span>
            <span className="mt-2 block text-lg font-black">Tirar foto agora</span>
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-left text-slate-900 shadow-sm"
          >
            <span className="block text-sm font-black uppercase tracking-[0.24em] text-slate-500">Galeria</span>
            <span className="mt-2 block text-lg font-black">Escolher fotos do aparelho</span>
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-left text-slate-900 shadow-sm"
          >
            <span className="block text-sm font-black uppercase tracking-[0.24em] text-slate-500">Video</span>
            <span className="mt-2 block text-lg font-black">Adicionar video</span>
          </button>
        </div>

        {(pendingFiles.length > 0 || props.midias.length > 0) && (
          <div className="space-y-3">
            {pendingFiles.length > 0 && (
              <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Arquivos prontos para enviar</p>
                <div className="mt-3 space-y-2">
                  {pendingFiles.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">
                      <span>{item.file.name}</span>
                      <div className="flex items-center gap-2">
                        {item.tipo === 'audio' && (
                          <button
                            type="button"
                            onClick={() => transcreverArquivoPendente(item.id)}
                            disabled={transcribingPendingId === item.id}
                            className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 disabled:opacity-60"
                          >
                            {transcribingPendingId === item.id ? 'Transcrevendo...' : 'Transcrever'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removePendingFile(item.id)}
                          className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {props.midias.length > 0 && (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Arquivos ja salvos</p>
                <div className="mt-3 space-y-2">
                  {props.midias.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span>{item.nomeArquivo || formatTipo(item.tipo)}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                          {formatTipo(item.tipo)}
                        </span>
                      </div>
                      <DriveMediaPreview
                        fileId={item.driveFileId}
                        url={item.arquivoUrl}
                        mimeType={item.mimeType}
                        tipo={item.tipo}
                        nomeArquivo={item.nomeArquivo}
                        heightClassName="h-40"
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={finalizarChamado}
          disabled={submitting || props.status === 'concluidos'}
          className="w-full rounded-[24px] bg-[linear-gradient(135deg,#16a34a_0%,#15803d_100%)] px-5 py-4 text-lg font-black text-white shadow-[0_18px_30px_rgba(22,163,74,0.28)] transition hover:translate-y-[-1px] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {props.status === 'concluidos'
            ? 'Chamado ja concluido'
            : submitting
              ? 'Finalizando...'
              : 'Finalizar atendimento'}
        </button>
      </div>
    </section>
  );
}
