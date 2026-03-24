'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRegistroEquipamentoTecnicoById, getTiposAtendimentoEquipamento } from '../../../actions/tecnico-registros';
import { parseEquipmentText } from '../../../../lib/equipment-ocr';

type DraftItem = {
  tempId: string;
  persistedItemId: string | null;
  tipoEquipamento: string;
  marca: string;
  modelo: string;
  codigoEquipamento: string;
  macAddress: string;
  serialNumber: string;
  usuarioAcesso: string;
  senhaAcesso: string;
  observacao: string;
  ocrTextoBruto: string;
  imageFile: File | null;
  imagePreview: string;
  imagemUrlSalva: string;
  driveFileIdSalvo: string;
};

type ImageEditorState = {
  originalFile: File;
  previewUrl: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

const SERVICE_TYPES = [
  'Nova instalacao',
  'Troca de equipamento',
  'Troca de endereco',
  'Cancelamento / devolucao',
];

function createTempId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyItem(): DraftItem {
  return {
    tempId: createTempId(),
    persistedItemId: null,
    tipoEquipamento: 'ONT',
    marca: '',
    modelo: '',
    codigoEquipamento: '',
    macAddress: '',
    serialNumber: '',
    usuarioAcesso: '',
    senhaAcesso: '',
    observacao: '',
    ocrTextoBruto: '',
    imageFile: null,
    imagePreview: '',
    imagemUrlSalva: '',
    driveFileIdSalvo: '',
  };
}

function normalizeMacInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function createDraftItemFromRegistro(item: {
  id: string;
  tipoEquipamento: string;
  marca: string | null;
  modelo: string | null;
  codigoEquipamento: string | null;
  macAddress: string | null;
  serialNumber: string | null;
  usuarioAcesso: string | null;
  senhaAcesso: string | null;
  observacao: string | null;
  ocrTextoBruto: string | null;
  imagemUrl: string | null;
  driveFileId: string | null;
}): DraftItem {
  return {
    tempId: item.id,
    persistedItemId: item.id,
    tipoEquipamento: item.tipoEquipamento,
    marca: item.marca || '',
    modelo: item.modelo || '',
    codigoEquipamento: item.codigoEquipamento || '',
    macAddress: item.macAddress || '',
    serialNumber: item.serialNumber || '',
    usuarioAcesso: item.usuarioAcesso || '',
    senhaAcesso: item.senhaAcesso || '',
    observacao: item.observacao || '',
    ocrTextoBruto: item.ocrTextoBruto || '',
    imageFile: null,
    imagePreview: item.imagemUrl || '',
    imagemUrlSalva: item.imagemUrl || '',
    driveFileIdSalvo: item.driveFileId || '',
  };
}

async function loadImageFromUrl(url: string) {
  const image = new Image();
  image.decoding = 'async';

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem para OCR.'));
    image.src = url;
  });
}

async function buildEnhancedImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromUrl(objectUrl);
    const canvas = document.createElement('canvas');
    const scale = 2;

    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    context.filter = 'grayscale(1) contrast(1.35) brightness(1.08)';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const average = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      const boosted = average > 176 ? 255 : average < 118 ? 0 : Math.min(255, average * 1.08);

      pixels[index] = boosted;
      pixels[index + 1] = boosted;
      pixels[index + 2] = boosted;
    }

    context.putImageData(imageData, 0, 0);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function buildRotatedEnhancedImages(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromUrl(objectUrl);
    const variants: Blob[] = [];

    for (const angle of [90, 270]) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        continue;
      }

      canvas.width = image.height * 2;
      canvas.height = image.width * 2;

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((angle * Math.PI) / 180);
      context.filter = 'grayscale(1) contrast(1.35) brightness(1.08)';
      context.drawImage(image, -image.width, -image.height, image.width * 2, image.height * 2);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      for (let index = 0; index < pixels.length; index += 4) {
        const average = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
        const boosted = average > 176 ? 255 : average < 118 ? 0 : Math.min(255, average * 1.08);

        pixels[index] = boosted;
        pixels[index + 1] = boosted;
        pixels[index + 2] = boosted;
      }

      context.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png', 1);
      });

      if (blob) {
        variants.push(blob);
      }
    }

    return variants;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderEditedImage(editor: ImageEditorState) {
  const image = await loadImageFromUrl(editor.previewUrl);
  const previewWidth = 280;
  const previewHeight = 210;
  const outputWidth = 1600;
  const outputHeight = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Nao foi possivel preparar a imagem ajustada.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.save();

  const baseScale = Math.max(outputWidth / image.width, outputHeight / image.height);
  const translateX = (editor.offsetX / previewWidth) * outputWidth;
  const translateY = (editor.offsetY / previewHeight) * outputHeight;

  context.translate(outputWidth / 2 + translateX, outputHeight / 2 + translateY);
  context.rotate((editor.rotation * Math.PI) / 180);
  context.scale(baseScale * editor.scale, baseScale * editor.scale);
  context.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
  context.restore();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/jpeg', 0.95);
  });

  if (!blob) {
    throw new Error('Nao foi possivel salvar a imagem ajustada.');
  }

  const extension = editor.originalFile.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const fileName = editor.originalFile.name.replace(/\.[^.]+$/, '') || `etiqueta-${Date.now()}`;

  return new File([blob], `${fileName}-ajustada.${extension}`, {
    type: blob.type || 'image/jpeg',
    lastModified: Date.now(),
  });
}

function mergeOcrTexts(primaryText: string, secondaryText: string) {
  if (!secondaryText.trim()) {
    return primaryText;
  }

  if (!primaryText.trim()) {
    return secondaryText;
  }

  const lines = [...primaryText.split('\n'), ...secondaryText.split('\n')]
    .map((line) => line.trim())
    .filter(Boolean);

  return Array.from(new Set(lines)).join('\n');
}

function NovoRegistroTecnicoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registroIdEmEdicao = searchParams.get('reabrir');
  const [serviceTypes, setServiceTypes] = useState<string[]>(SERVICE_TYPES);
  const [clienteNome, setClienteNome] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState(SERVICE_TYPES[0]);
  const [draftItem, setDraftItem] = useState<DraftItem>(createEmptyItem);
  const [itens, setItens] = useState<DraftItem[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [imageEditor, setImageEditor] = useState<ImageEditorState | null>(null);
  const [carregandoRegistro, setCarregandoRegistro] = useState(false);

  const canSaveCurrentItem =
    !ocrLoading &&
    Boolean(
      draftItem.imageFile ||
      draftItem.macAddress.trim() ||
      draftItem.serialNumber.trim() ||
      draftItem.codigoEquipamento.trim() ||
      draftItem.modelo.trim(),
    );

  const canFinishRegistration =
    !ocrLoading &&
    !submitting &&
    clienteNome.trim().length > 0 &&
    itens.length > 0;
  const currentFilledFields = [
    draftItem.marca,
    draftItem.modelo,
    draftItem.codigoEquipamento,
    draftItem.macAddress,
    draftItem.serialNumber,
    draftItem.usuarioAcesso,
    draftItem.senhaAcesso,
  ].filter((value) => value.trim()).length;

  useEffect(() => {
    async function loadTipos() {
      const tipos = await getTiposAtendimentoEquipamento();
      const nomes = (tipos as { nome: string }[]).map((item) => item.nome).filter(Boolean);

      if (nomes.length > 0) {
        setServiceTypes(nomes);
        setTipoAtendimento((current) => (current ? current : nomes[0]));
      }
    }

    loadTipos();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRegistroEmEdicao() {
      if (!registroIdEmEdicao) {
        setCarregandoRegistro(false);
        return;
      }

      setCarregandoRegistro(true);

      try {
        const data = await getRegistroEquipamentoTecnicoById(registroIdEmEdicao);

        if (cancelled) {
          return;
        }

        if (!data?.registro) {
          setErro('Nao foi possivel reabrir esse atendimento para edicao.');
          return;
        }

        setClienteNome(data.registro.clienteNome);
        setTipoAtendimento(data.registro.tipoAtendimento);
        setItens(data.registro.itens.map((item) => createDraftItemFromRegistro(item)));
        setDraftItem(createEmptyItem());
        setMensagem('Atendimento reaberto. Ajuste os dados e finalize novamente para salvar.');
        setErro('');
      } catch (cause) {
        if (cancelled) {
          return;
        }

        const message = cause instanceof Error ? cause.message : 'Falha ao abrir o atendimento.';
        setErro(message);
      } finally {
        if (!cancelled) {
          setCarregandoRegistro(false);
        }
      }
    }

    void loadRegistroEmEdicao();

    return () => {
      cancelled = true;
    };
  }, [registroIdEmEdicao]);

  function updateDraft(field: keyof DraftItem, value: string | File | null) {
    setDraftItem((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setDraftItem(createEmptyItem());
  }

  async function processImageFile(file: File, preview: string) {
    setErro('');
    setMensagem('');
    setOcrLoading(true);

      setDraftItem((current) => ({
        ...current,
        persistedItemId: null,
        imageFile: file,
        imagePreview: preview,
        imagemUrlSalva: '',
        driveFileIdSalvo: '',
        ocrTextoBruto: '',
      }));

    try {
      const { recognize } = await import('tesseract.js');
      const primaryResult = await recognize(file, 'eng');
      const enhancedImage = await buildEnhancedImage(file);
      const secondaryResult = enhancedImage ? await recognize(enhancedImage, 'eng') : null;
      let mergedText = mergeOcrTexts(
        primaryResult.data.text || '',
        secondaryResult?.data.text || '',
      );
      let data = parseEquipmentText(mergedText);

      if (!data.macAddress || !data.serialNumber) {
        const rotatedImages = await buildRotatedEnhancedImages(file);

        for (const rotatedImage of rotatedImages) {
          const rotatedResult = await recognize(rotatedImage, 'eng');
          mergedText = mergeOcrTexts(mergedText, rotatedResult.data.text || '');
        }

        data = parseEquipmentText(mergedText);
      }

      setDraftItem((current) => ({
        ...current,
        persistedItemId: current.persistedItemId,
        imageFile: file,
        imagePreview: preview,
        imagemUrlSalva: '',
        driveFileIdSalvo: '',
        tipoEquipamento: data.tipoEquipamento || current.tipoEquipamento,
        marca: data.marca || current.marca,
        modelo: data.modelo || current.modelo,
        codigoEquipamento: data.codigoEquipamento || current.codigoEquipamento,
        macAddress: data.macAddress || current.macAddress,
        serialNumber: data.serialNumber || current.serialNumber,
        usuarioAcesso: data.usuarioAcesso || current.usuarioAcesso,
        senhaAcesso: data.senhaAcesso || current.senhaAcesso,
        ocrTextoBruto: data.rawText || '',
      }));

      const foundFields = [
        data.modelo,
        data.codigoEquipamento,
        data.macAddress,
        data.serialNumber,
        data.usuarioAcesso,
        data.senhaAcesso,
      ].filter(Boolean).length;

      setMensagem(
        foundFields > 0
          ? 'Leitura da etiqueta concluida. Revise os campos antes de salvar.'
          : 'A foto foi carregada, mas a leitura automatica veio fraca. Voce pode preencher manualmente e salvar mesmo assim.',
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Falha ao processar OCR.';
      setErro(message);
    } finally {
      setOcrLoading(false);
    }
  }

  function openImageEditor(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setImageEditor({
      originalFile: file,
      previewUrl,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    });
  }

  function closeImageEditor() {
    setImageEditor((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
  }

  async function confirmImageEditor() {
    if (!imageEditor) {
      return;
    }

    try {
      const adjustedFile = await renderEditedImage(imageEditor);
      const adjustedPreview = URL.createObjectURL(adjustedFile);
      closeImageEditor();
      await processImageFile(adjustedFile, adjustedPreview);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Falha ao ajustar a imagem.';
      setErro(message);
    }
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErro('');
    setMensagem('');
    openImageEditor(file);
    event.target.value = '';
  }

  function saveCurrentItem() {
    if (!draftItem.imageFile && !draftItem.macAddress && !draftItem.serialNumber && !draftItem.codigoEquipamento && !draftItem.modelo) {
      setErro('Adicione uma foto ou informe pelo menos MAC, serial, codigo ou modelo antes de salvar.');
      return;
    }

    const isLikelyDuplicate = itens.some((item) => {
      const sameMac =
        draftItem.macAddress.trim() &&
        item.macAddress.trim() &&
        item.macAddress.trim() === draftItem.macAddress.trim();
      const sameSerial =
        draftItem.serialNumber.trim() &&
        item.serialNumber.trim() &&
        item.serialNumber.trim() === draftItem.serialNumber.trim();
      const sameCode =
        draftItem.codigoEquipamento.trim() &&
        item.codigoEquipamento.trim() &&
        item.codigoEquipamento.trim() === draftItem.codigoEquipamento.trim();

      return Boolean(sameMac || sameSerial || sameCode);
    });

    if (isLikelyDuplicate) {
      setErro('Este equipamento parece ja ter sido salvo neste atendimento. Revise antes de adicionar novamente.');
      return;
    }

    setItens((current) => [...current, draftItem]);
    setMensagem('Item salvo na lista do atendimento.');
    setErro('');
    resetDraft();
  }

  function removeSavedItem(tempId: string) {
    setItens((current) => current.filter((item) => item.tempId !== tempId));
  }

  function editSavedItem(tempId: string) {
    setItens((current) => {
      const item = current.find((entry) => entry.tempId === tempId);

      if (!item) {
        return current;
      }

      setDraftItem({
        ...item,
        imageFile: null,
      });
      setMensagem('Item carregado para edicao. Ajuste os campos e salve novamente.');
      setErro('');

      return current.filter((entry) => entry.tempId !== tempId);
    });
  }

  async function finishRegistration() {
    if (!clienteNome.trim()) {
      setErro('Informe o nome do cliente.');
      return;
    }

    if (itens.length === 0) {
      setErro('Salve pelo menos um equipamento antes de finalizar.');
      return;
    }

    setSubmitting(true);
    setErro('');
    setMensagem('');

    const payload = {
      id: registroIdEmEdicao,
      clienteNome,
      tipoAtendimento,
      itens: itens.map((item) => ({
        tempId: item.tempId,
        persistedItemId: item.persistedItemId,
        tipoEquipamento: item.tipoEquipamento,
        marca: item.marca,
        modelo: item.modelo,
        codigoEquipamento: item.codigoEquipamento,
        macAddress: item.macAddress,
        serialNumber: item.serialNumber,
        usuarioAcesso: item.usuarioAcesso,
        senhaAcesso: item.senhaAcesso,
        observacao: item.observacao,
        ocrTextoBruto: item.ocrTextoBruto,
        existingImageUrl: item.imagemUrlSalva,
        existingDriveFileId: item.driveFileIdSalvo,
      })),
    };

    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));

    itens.forEach((item) => {
      if (item.imageFile) {
        formData.append(item.tempId, item.imageFile);
      }
    });

    try {
      const response = await fetch('/api/tecnico/atendimentos', {
        method: registroIdEmEdicao ? 'PUT' : 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao finalizar o registro.');
      }

      const uploaded = Number(data.upload?.imagesUploaded || 0);
      const received = Number(data.upload?.imagesReceived || 0);

      if (registroIdEmEdicao) {
        router.push(`/tecnico/registros/${registroIdEmEdicao}`);
        router.refresh();
        return;
      }

      setClienteNome('');
      setTipoAtendimento(serviceTypes[0] || SERVICE_TYPES[0]);
      setItens([]);
      resetDraft();
      setMensagem(
        received > 0
          ? `Registro concluido com sucesso. Atendimento salvo no banco e ${uploaded} foto(s) enviada(s) ao Google Drive.`
          : 'Registro concluido com sucesso. Atendimento salvo no banco.',
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Falha ao finalizar o registro.';
      setErro(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef3f8_55%,#e8edf3_100%)] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {registroIdEmEdicao ? 'Reabrir atendimento' : 'Novo atendimento'}
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">
              {registroIdEmEdicao ? 'Editar registro salvo' : 'Registrar equipamentos'}
            </h1>
          </div>
          <Link href="/tecnico" className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
            Voltar
          </Link>
        </div>

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Cliente</p>
            <p className="mt-2 text-sm font-black text-slate-900">{clienteNome.trim() ? 'Pronto' : 'Pendente'}</p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Item atual</p>
            <p className="mt-2 text-sm font-black text-slate-900">{currentFilledFields} campo(s)</p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Salvos</p>
            <p className="mt-2 text-sm font-black text-slate-900">{itens.length} item(ns)</p>
          </div>
        </section>

        {registroIdEmEdicao && (
          <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800 shadow-sm">
            {carregandoRegistro
              ? 'Carregando atendimento salvo para edicao...'
              : 'Modo reabertura ativo. Ao finalizar, o registro existente sera atualizado.'}
          </section>
        )}

        {(mensagem || erro) && (
          <div className={`rounded-[24px] border px-4 py-4 text-sm font-semibold shadow-sm ${erro ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {erro || mensagem}
          </div>
        )}

        <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-lg font-black uppercase tracking-[0.02em] text-slate-900">Dados do atendimento</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Nome do cliente</span>
              <input
                value={clienteNome}
                onChange={(event) => setClienteNome(event.target.value)}
                placeholder="Ex: Joao Pedro Martins"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Tipo de atendimento</span>
              <select
                value={tipoAtendimento}
                onChange={(event) => setTipoAtendimento(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
              >
                {serviceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-4">
            <h2 className="text-lg font-black uppercase tracking-[0.02em] text-slate-900">Equipamento</h2>
            <p className="mt-1 text-sm text-slate-500">Use a camera para ler a etiqueta e revise os dados antes de salvar.</p>
          </div>

          <input
            id="tecnico-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleImageChange}
          />

          <input
            id="tecnico-gallery-input"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageChange}
          />

          <div className="space-y-3">
            <label
              htmlFor="tecnico-camera-input"
              aria-disabled={ocrLoading}
              className={`flex w-full flex-col items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#082f49_0%,#0f172a_100%)] px-5 py-6 text-white shadow-[0_18px_30px_rgba(15,23,42,0.2)] transition ${ocrLoading ? 'pointer-events-none cursor-not-allowed opacity-70' : 'cursor-pointer hover:translate-y-[-1px]'}`}
            >
              <span className="text-sm font-black uppercase tracking-[0.3em] text-sky-200">Camera</span>
              <span className="mt-3 text-xl font-black">{ocrLoading ? 'Lendo etiqueta...' : 'Tirar foto agora'}</span>
              <span className="mt-1 text-sm text-slate-300">Abre a camera do aparelho para capturar a etiqueta na hora.</span>
            </label>

            <label
              htmlFor="tecnico-gallery-input"
              aria-disabled={ocrLoading}
              className={`flex w-full flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 text-slate-900 shadow-sm transition ${ocrLoading ? 'pointer-events-none cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-sky-300 hover:bg-white'}`}
            >
              <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">Galeria</span>
              <span className="mt-2 text-lg font-black">{ocrLoading ? 'Processando imagem...' : 'Escolher imagem do celular'}</span>
              <span className="mt-1 text-sm text-slate-500">Use uma foto que ja esteja salva no aparelho.</span>
            </label>
          </div>

          {draftItem.imagePreview && (
            <div className="mt-4">
              <img
                src={draftItem.imagePreview}
                alt="Previa da etiqueta"
                className="h-44 w-full rounded-[24px] object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (draftItem.imageFile) {
                    openImageEditor(draftItem.imageFile);
                  }
                }}
                className="mt-3 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700"
              >
                Ajustar foto
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Status da imagem</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {draftItem.imageFile ? 'Imagem carregada' : 'Aguardando imagem'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Status do OCR</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {ocrLoading ? 'Processando...' : draftItem.ocrTextoBruto ? 'Leitura concluida' : 'Ainda nao lido'}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">Resumo do item atual</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {[draftItem.tipoEquipamento, draftItem.marca, draftItem.modelo].filter(Boolean).join(' / ') || 'Ainda sem dados principais.'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              MAC: {draftItem.macAddress || '---'} | Serial: {draftItem.serialNumber || '---'}
            </p>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Tipo de equipamento</span>
              <select
                value={draftItem.tipoEquipamento}
                onChange={(event) => updateDraft('tipoEquipamento', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
              >
                <option value="ONT">ONT</option>
                <option value="ONU">ONU</option>
                <option value="Roteador Wi-Fi">Roteador Wi-Fi</option>
                <option value="Mesh">Mesh</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Marca</span>
                <input
                  value={draftItem.marca}
                  onChange={(event) => updateDraft('marca', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Modelo</span>
                <input
                  value={draftItem.modelo}
                  onChange={(event) => updateDraft('modelo', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Codigo do equipamento</span>
              <input
                value={draftItem.codigoEquipamento}
                onChange={(event) => updateDraft('codigoEquipamento', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">MAC Address</span>
              <input
                value={draftItem.macAddress}
                onChange={(event) => updateDraft('macAddress', normalizeMacInput(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-base outline-none transition focus:border-sky-500 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Serial Number</span>
              <input
                value={draftItem.serialNumber}
                onChange={(event) => updateDraft('serialNumber', event.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-base outline-none transition focus:border-sky-500 focus:bg-white"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Usuario</span>
                <input
                  value={draftItem.usuarioAcesso}
                  onChange={(event) => updateDraft('usuarioAcesso', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Senha</span>
                <input
                  value={draftItem.senhaAcesso}
                  onChange={(event) => updateDraft('senhaAcesso', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Observacoes</span>
              <textarea
                value={draftItem.observacao}
                onChange={(event) => updateDraft('observacao', event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
              />
            </label>
          </div>

          {draftItem.ocrTextoBruto && (
            <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Texto lido da etiqueta</p>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-slate-600">{draftItem.ocrTextoBruto}</pre>
            </div>
          )}
        </section>

        {itens.length > 0 && (
          <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Itens salvos</h2>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{itens.length}</span>
            </div>
            <div className="space-y-3">
              {itens.map((item, index) => (
                <div key={item.tempId} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">Item {index + 1} - {item.tipoEquipamento}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {[item.marca || 'Sem marca', item.modelo].filter(Boolean).join(' - ')}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        MAC: {item.macAddress || '---'} | Serial: {item.serialNumber || '---'}
                      </p>
                      {item.imagePreview && (
                        <img
                          src={item.imagePreview}
                          alt={`Etiqueta do item ${index + 1}`}
                          className="mt-3 h-24 w-full rounded-2xl object-cover"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => editSavedItem(item.tempId)}
                      className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedItem(item.tempId)}
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {erro && (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 shadow-sm">
            {erro}
          </div>
        )}

        <div className="space-y-3 pb-8">
          <button
            type="button"
            onClick={saveCurrentItem}
            disabled={!canSaveCurrentItem}
            className="w-full rounded-[24px] border-2 border-slate-900 bg-white px-5 py-4 text-lg font-black text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          >
            {ocrLoading ? 'Aguardando leitura...' : 'Salvar este item'}
          </button>
          <button
            type="button"
            onClick={resetDraft}
            disabled={ocrLoading}
            className="w-full rounded-[24px] bg-slate-900 px-5 py-4 text-lg font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Adicionar mais itens (+)
          </button>
          <button
            type="button"
            onClick={finishRegistration}
            disabled={!canFinishRegistration || carregandoRegistro}
            className="w-full rounded-[24px] bg-[linear-gradient(135deg,#0ea5e9_0%,#2563eb_100%)] px-5 py-4 text-lg font-black text-white shadow-[0_18px_30px_rgba(2,132,199,0.28)] transition hover:translate-y-[-1px] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? (registroIdEmEdicao ? 'Salvando alteracoes...' : 'Finalizando...')
              : (registroIdEmEdicao ? 'Salvar alteracoes do atendimento ->' : 'Finalizar cadastro completo ->')}
          </button>
        </div>
      </div>

      {imageEditor && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm [overscroll-behavior:contain]">
          <div className="mx-auto flex max-w-md flex-col rounded-[28px] border border-white/15 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.35)] max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ajuste da foto</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Recortar etiqueta</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Posicione a etiqueta, aproxime com zoom e gire se precisar. O OCR vai usar essa imagem ajustada.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImageEditor}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-black text-slate-500"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 rounded-[28px] bg-slate-100 p-4">
              <div className="relative mx-auto h-[210px] w-[280px] overflow-hidden rounded-[24px] border-2 border-dashed border-sky-300 bg-slate-200 shadow-inner">
                <img
                  src={imageEditor.previewUrl}
                  alt="Ajuste da etiqueta"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    transform: `translate(${imageEditor.offsetX}px, ${imageEditor.offsetY}px) scale(${imageEditor.scale}) rotate(${imageEditor.rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
              <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Area que sera usada na leitura
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={imageEditor.scale}
                  onChange={(event) =>
                    setImageEditor((current) => current ? { ...current, scale: Number(event.target.value) } : current)
                  }
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Mover na horizontal</span>
                <input
                  type="range"
                  min="-140"
                  max="140"
                  step="1"
                  value={imageEditor.offsetX}
                  onChange={(event) =>
                    setImageEditor((current) => current ? { ...current, offsetX: Number(event.target.value) } : current)
                  }
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Mover na vertical</span>
                <input
                  type="range"
                  min="-140"
                  max="140"
                  step="1"
                  value={imageEditor.offsetY}
                  onChange={(event) =>
                    setImageEditor((current) => current ? { ...current, offsetY: Number(event.target.value) } : current)
                  }
                  className="w-full"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Rotacao</span>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 90, 180, 270].map((angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() =>
                        setImageEditor((current) => current ? { ...current, rotation: angle } : current)
                      }
                      className={`rounded-2xl px-3 py-3 text-sm font-black transition ${
                        imageEditor.rotation === angle
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeImageEditor}
                className="rounded-[20px] border border-slate-200 px-4 py-4 text-base font-black text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmImageEditor()}
                className="rounded-[20px] bg-[linear-gradient(135deg,#0ea5e9_0%,#2563eb_100%)] px-4 py-4 text-base font-black text-white shadow-[0_18px_30px_rgba(2,132,199,0.28)]"
              >
                Usar esta foto
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function NovoRegistroTecnicoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef3f8_55%,#e8edf3_100%)] px-4 py-6">
          <div className="mx-auto flex max-w-md flex-col gap-4">
            <section className="rounded-[28px] border border-white/70 bg-white/95 p-5 text-sm font-semibold text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              Preparando formulario tecnico...
            </section>
          </div>
        </main>
      }
    >
      <NovoRegistroTecnicoContent />
    </Suspense>
  );
}
