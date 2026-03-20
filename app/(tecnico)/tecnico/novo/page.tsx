'use client';

import Link from 'next/link';
import { useState } from 'react';
import { parseEquipmentText } from '../../../../lib/equipment-ocr';

type DraftItem = {
  tempId: string;
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

export default function NovoRegistroTecnicoPage() {
  const [clienteNome, setClienteNome] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState(SERVICE_TYPES[0]);
  const [draftItem, setDraftItem] = useState<DraftItem>(createEmptyItem);
  const [itens, setItens] = useState<DraftItem[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

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

  function updateDraft(field: keyof DraftItem, value: string | File | null) {
    setDraftItem((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setDraftItem(createEmptyItem());
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErro('');
    setMensagem('');
    setOcrLoading(true);

    const preview = URL.createObjectURL(file);
    setDraftItem((current) => ({
      ...current,
      imageFile: file,
      imagePreview: preview,
      ocrTextoBruto: '',
    }));

    try {
      const { recognize } = await import('tesseract.js');
      const primaryResult = await recognize(file, 'eng');
      const enhancedImage = await buildEnhancedImage(file);
      const secondaryResult = enhancedImage ? await recognize(enhancedImage, 'eng') : null;
      const mergedText = mergeOcrTexts(
        primaryResult.data.text || '',
        secondaryResult?.data.text || '',
      );
      const data = parseEquipmentText(mergedText);

      setDraftItem((current) => ({
        ...current,
        imageFile: file,
        imagePreview: preview,
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
      event.target.value = '';
    }
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
      clienteNome,
      tipoAtendimento,
      itens: itens.map((item) => ({
        tempId: item.tempId,
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
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao finalizar o registro.');
      }

      const uploaded = Number(data.upload?.imagesUploaded || 0);
      const received = Number(data.upload?.imagesReceived || 0);

      setClienteNome('');
      setTipoAtendimento(SERVICE_TYPES[0]);
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Novo atendimento</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Registrar equipamentos</h1>
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
                {SERVICE_TYPES.map((type) => (
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

          <label
            htmlFor="tecnico-camera-input"
            aria-disabled={ocrLoading}
            className={`flex w-full flex-col items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#082f49_0%,#0f172a_100%)] px-5 py-6 text-white shadow-[0_18px_30px_rgba(15,23,42,0.2)] transition ${ocrLoading ? 'pointer-events-none cursor-not-allowed opacity-70' : 'cursor-pointer hover:translate-y-[-1px]'}`}
          >
            <span className="text-sm font-black uppercase tracking-[0.3em] text-sky-200">Camera</span>
            <span className="mt-3 text-xl font-black">{ocrLoading ? 'Lendo etiqueta...' : 'Ler etiqueta com camera ou arquivo'}</span>
            <span className="mt-1 text-sm text-slate-300">Voce pode tirar uma foto na hora ou escolher uma imagem do aparelho.</span>
          </label>

          {draftItem.imagePreview && (
            <img
              src={draftItem.imagePreview}
              alt="Previa da etiqueta"
              className="mt-4 h-44 w-full rounded-[24px] object-cover shadow-sm"
            />
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
                onChange={(event) => updateDraft('macAddress', event.target.value.toUpperCase())}
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
            disabled={!canFinishRegistration}
            className="w-full rounded-[24px] bg-[linear-gradient(135deg,#0ea5e9_0%,#2563eb_100%)] px-5 py-4 text-lg font-black text-white shadow-[0_18px_30px_rgba(2,132,199,0.28)] transition hover:translate-y-[-1px] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Finalizando...' : 'Finalizar cadastro completo ->'}
          </button>
        </div>
      </div>
    </main>
  );
}
