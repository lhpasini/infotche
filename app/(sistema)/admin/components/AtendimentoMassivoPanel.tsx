'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { upsertAtendimentoMassivoAdmin } from '../../../actions/atendimentos-massivos';

type Cliente = {
  id: string;
  nome: string;
  cidade: string | null;
  conexoes: Array<{
    id: string;
    endereco: string;
    bairro: string | null;
  }>;
};

type UsuarioSessao = {
  id: string;
  nome: string;
  role: string;
} | null;

type AtendimentoMassivoItem = {
  id: string;
  clienteId: string | null;
  conexaoId: string | null;
  nomeCliente: string;
  rua: string | null;
  tecnicoResponsavel: string | null;
  chamadoEm: any;
  normalizado: boolean;
  normalizadoEm: any;
  ordem: number;
};

type AtendimentoMassivo = {
  id: string;
  abertoEm: any;
  problema: string;
  latitude: number | null;
  longitude: number | null;
  observacoesEquipe: string | null;
  textoWhatsapp: string | null;
  encerramentoInfo: string | null;
  status: string;
  finalizadoEm: any;
  criadoPor: { id: string; nome: string } | null;
  clientesAfetados: AtendimentoMassivoItem[];
  criadoEm: any;
  atualizadoEm: any;
};

type DraftItem = {
  tempId: string;
  clienteId: string | null;
  conexaoId: string | null;
  nomeCliente: string;
  rua: string;
  tecnicoResponsavel: string;
  chamadoEm: string;
  normalizado: boolean;
  normalizadoEm: string;
};

type DraftAtendimentoMassivo = {
  id: string | null;
  abertoEm: string;
  problema: string;
  latitude: number | null;
  longitude: number | null;
  observacoesEquipe: string;
  textoWhatsapp: string;
  encerramentoInfo: string;
  status: string;
  finalizadoEm: string;
  clientesAfetados: DraftItem[];
};

interface Props {
  registros: AtendimentoMassivo[];
  clientes: Cliente[];
  usuarioLogado: UsuarioSessao;
  onRefresh: () => Promise<void>;
}

const MAP_DEFAULT_CENTER: [number, number] = [-28.367752, -53.251977];

const createDraftItem = (): DraftItem => ({
  tempId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  clienteId: null,
  conexaoId: null,
  nomeCliente: '',
  rua: '',
  tecnicoResponsavel: '',
  chamadoEm: '',
  normalizado: false,
  normalizadoEm: '',
});

const toDateTimeLocalValue = (value: any) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTime = (value: any) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const mapRegistroToDraft = (registro: AtendimentoMassivo): DraftAtendimentoMassivo => ({
  id: registro.id,
  abertoEm: toDateTimeLocalValue(registro.abertoEm),
  problema: registro.problema || '',
  latitude: registro.latitude ?? null,
  longitude: registro.longitude ?? null,
  observacoesEquipe: registro.observacoesEquipe || '',
  textoWhatsapp: registro.textoWhatsapp || '',
  encerramentoInfo: registro.encerramentoInfo || '',
  status: registro.status || 'ABERTO',
  finalizadoEm: toDateTimeLocalValue(registro.finalizadoEm),
  clientesAfetados:
    registro.clientesAfetados.length > 0
      ? registro.clientesAfetados.map((item) => ({
          tempId: item.id,
          clienteId: item.clienteId,
          conexaoId: item.conexaoId,
          nomeCliente: item.nomeCliente || '',
          rua: item.rua || '',
          tecnicoResponsavel: item.tecnicoResponsavel || '',
          chamadoEm: toDateTimeLocalValue(item.chamadoEm),
          normalizado: Boolean(item.normalizado),
          normalizadoEm: toDateTimeLocalValue(item.normalizadoEm),
        }))
      : [createDraftItem()],
});

export function AtendimentoMassivoPanel({
  registros,
  clientes,
  usuarioLogado,
  onRefresh,
}: Props) {
  const tecnicosDisponiveis = ['Renan Vargas', 'GILSON DA COSTA', 'João Maia', 'Luiz Pasini', 'Pedro Zenatti'];
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const previewMapRef = useRef<HTMLDivElement | null>(null);
  const previewLeafletMapRef = useRef<any>(null);
  const previewLeafletMarkerRef = useRef<any>(null);
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [draft, setDraft] = useState<DraftAtendimentoMassivo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [isWhatsappPreviewOpen, setIsWhatsappPreviewOpen] = useState(false);

  const clientesPorNome = useMemo(() => {
    const mapa = new Map<string, Cliente>();
    clientes.forEach((cliente) => {
      mapa.set(cliente.nome.toLowerCase(), cliente);
    });
    return mapa;
  }, [clientes]);

  const abrirNovoAtendimento = () => {
    setDraft({
      id: null,
      abertoEm: toDateTimeLocalValue(new Date()),
      problema: '',
      latitude: null,
      longitude: null,
      observacoesEquipe: '',
      textoWhatsapp:
        'Oi! Estamos com uma instabilidade massiva na região e nossa equipe já está atuando. Assim que tivermos previsão de normalização, avisamos por aqui.',
      encerramentoInfo: '',
      status: 'ABERTO',
      finalizadoEm: '',
      clientesAfetados: [createDraftItem()],
    });
  };

  useEffect(() => {
    if (!draft) {
      abrirNovoAtendimento();
    }
  }, [draft]);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      if (!mapRef.current || !draft) return;

      const L = await import('leaflet');
      if (cancelled || !mapRef.current) return;

      if (!leafletMapRef.current) {
        leafletMapRef.current = L.map(mapRef.current).setView(
          draft.latitude && draft.longitude ? [draft.latitude, draft.longitude] : MAP_DEFAULT_CENTER,
          draft.latitude && draft.longitude ? 15 : 12
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(leafletMapRef.current);

        leafletMapRef.current.on('click', (event: any) => {
          setDraft((current) =>
            current
              ? {
                  ...current,
                  latitude: Number(event.latlng.lat.toFixed(6)),
                  longitude: Number(event.latlng.lng.toFixed(6)),
                }
              : current
          );
        });
      }

      const map = leafletMapRef.current;
      if (!map) return;

      if (draft.latitude != null && draft.longitude != null) {
        const latLng = L.latLng(draft.latitude, draft.longitude);

        if (!leafletMarkerRef.current) {
          leafletMarkerRef.current = L.circleMarker(latLng, {
            radius: 9,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.9,
            weight: 2,
          }).addTo(map);
        } else {
          leafletMarkerRef.current.setLatLng(latLng);
        }

        map.setView(latLng, Math.max(map.getZoom(), 15));
      } else if (leafletMarkerRef.current) {
        leafletMarkerRef.current.remove();
        leafletMarkerRef.current = null;
      }

      setTimeout(() => {
        if (!cancelled && leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 60);
    }

    setupMap();

    return () => {
      cancelled = true;
    };
  }, [draft?.id, draft?.latitude, draft?.longitude]);

  useEffect(() => {
    let cancelled = false;

    async function setupPreviewMap() {
      if (!isWhatsappPreviewOpen || !previewMapRef.current || !draft?.latitude || !draft?.longitude) return;

      const L = await import('leaflet');
      if (cancelled || !previewMapRef.current) return;

      const latLng: [number, number] = [draft.latitude, draft.longitude];

      if (!previewLeafletMapRef.current) {
        previewLeafletMapRef.current = L.map(previewMapRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView(latLng, 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(previewLeafletMapRef.current);
      } else {
        previewLeafletMapRef.current.setView(latLng, 15);
      }

      if (!previewLeafletMarkerRef.current) {
        previewLeafletMarkerRef.current = L.circleMarker(latLng, {
          radius: 10,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(previewLeafletMapRef.current);
      } else {
        previewLeafletMarkerRef.current.setLatLng(latLng);
      }

      setTimeout(() => {
        if (!cancelled && previewLeafletMapRef.current) {
          previewLeafletMapRef.current.invalidateSize();
        }
      }, 80);
    }

    setupPreviewMap();

    return () => {
      cancelled = true;
    };
  }, [isWhatsappPreviewOpen, draft?.latitude, draft?.longitude]);

  const registrosFiltrados = registros.filter((registro) => {
    const termo = busca.trim().toLowerCase();
    const abertoEm = new Date(registro.abertoEm);

    if (dataInicio && abertoEm < new Date(`${dataInicio}T00:00:00`)) return false;
    if (dataFim && abertoEm > new Date(`${dataFim}T23:59:59`)) return false;

    if (!termo) return true;

    const nomesClientes = registro.clientesAfetados
      .map((item) => `${item.nomeCliente} ${item.rua || ''}`.toLowerCase())
      .join(' ');

    return (
      registro.problema.toLowerCase().includes(termo) ||
      nomesClientes.includes(termo) ||
      registro.criadoPor?.nome?.toLowerCase().includes(termo)
    );
  });

  const atualizarItem = (tempId: string, patch: Partial<DraftItem>) => {
    setDraft((atual) => {
      if (!atual) return atual;

      return {
        ...atual,
        clientesAfetados: atual.clientesAfetados.map((item) =>
          item.tempId === tempId ? { ...item, ...patch } : item
        ),
      };
    });
  };

  const handleNomeClienteChange = (tempId: string, value: string) => {
    const cliente = clientesPorNome.get(value.trim().toLowerCase());

    setDraft((atual) => {
      if (!atual) return atual;

      return {
        ...atual,
        clientesAfetados: atual.clientesAfetados.map((item) => {
          if (item.tempId !== tempId) return item;

          const chamadoEm =
            item.chamadoEm || (value.trim() ? toDateTimeLocalValue(new Date()) : '');

          return {
            ...item,
            nomeCliente: value,
            clienteId: cliente?.id || null,
            conexaoId: cliente?.conexoes?.[0]?.id || null,
            rua: cliente?.conexoes?.[0]?.endereco || '',
            chamadoEm,
          };
        }),
      };
    });
  };

  const handleConexaoChange = (tempId: string, clienteId: string | null, conexaoId: string | null) => {
    const cliente = clientes.find((item) => item.id === clienteId);
    const conexao = cliente?.conexoes.find((item) => item.id === conexaoId);
    atualizarItem(tempId, {
      conexaoId,
      rua: conexao?.endereco || '',
    });
  };

  const handleToggleNormalizado = (tempId: string, checked: boolean) => {
    atualizarItem(tempId, {
      normalizado: checked,
      normalizadoEm: checked ? toDateTimeLocalValue(new Date()) : '',
    });
  };

  const adicionarLinha = () => {
    setDraft((atual) => {
      if (!atual) return atual;
      return {
        ...atual,
        clientesAfetados: [...atual.clientesAfetados, createDraftItem()],
      };
    });
  };

  const removerLinha = (tempId: string) => {
    setDraft((atual) => {
      if (!atual) return atual;

      const restantes = atual.clientesAfetados.filter((item) => item.tempId !== tempId);
      return {
        ...atual,
        clientesAfetados: restantes.length > 0 ? restantes : [createDraftItem()],
      };
    });
  };

  const salvar = async (finalizar = false) => {
    if (!draft) return;
    setSalvando(true);

    const resposta = await upsertAtendimentoMassivoAdmin(draft.id, {
      abertoEm: draft.abertoEm,
      problema: draft.problema,
      latitude: draft.latitude,
      longitude: draft.longitude,
      observacoesEquipe: draft.observacoesEquipe,
      textoWhatsapp: draft.textoWhatsapp,
      encerramentoInfo: draft.encerramentoInfo,
      finalizado: finalizar,
      clientesAfetados: draft.clientesAfetados.map((item) => ({
        clienteId: item.clienteId,
        conexaoId: item.conexaoId,
        nomeCliente: item.nomeCliente,
        rua: item.rua,
        tecnicoResponsavel: item.tecnicoResponsavel,
        chamadoEm: item.chamadoEm || null,
        normalizado: item.normalizado,
        normalizadoEm: item.normalizado ? item.normalizadoEm || toDateTimeLocalValue(new Date()) : null,
      })),
    });

    setSalvando(false);

    if (!resposta.sucesso) {
      alert(resposta.erro || 'Nao foi possivel salvar o atendimento massivo.');
      return;
    }

    await onRefresh();
    alert(finalizar ? 'Atendimento massivo finalizado com sucesso.' : 'Atendimento massivo salvo com sucesso.');
  };

  return (
    <div style={{ padding: '30px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Atendimento Massivo</h1>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#7f8c8d' }}>
            Abra ocorrencias massivas, acompanhe clientes afetados e registre normalizacoes em tempo real.
          </p>
        </div>
        <button className="btn-new" onClick={abrirNovoAtendimento}>
          + ABRIR ATENDIMENTO
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' }}>
        <div className="chart-box">
          <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
            <input
              className="search-input"
              placeholder="Buscar por problema, cliente ou rua..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={{ padding: '12px 14px', border: '1px solid #dce3e8', borderRadius: '8px', fontSize: '12px' }} />
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={{ padding: '12px 14px', border: '1px solid #dce3e8', borderRadius: '8px', fontSize: '12px' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {registrosFiltrados.length === 0 && (
              <div style={{ color: '#7f8c8d', fontSize: '13px' }}>
                Nenhum atendimento massivo encontrado.
              </div>
            )}

            {registrosFiltrados.map((registro) => (
              <button
                key={registro.id}
                type="button"
                onClick={() => setDraft(mapRegistroToDraft(registro))}
                style={{
                  textAlign: 'left',
                  border: draft?.id === registro.id ? '2px solid #3498db' : '1px solid #e5e7eb',
                  background: draft?.id === registro.id ? '#eff6ff' : '#fff',
                  borderRadius: '12px',
                  padding: '14px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <strong style={{ color: '#2c3e50', fontSize: '14px' }}>
                    {formatDateTime(registro.abertoEm)}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#7f8c8d' }}>
                    {registro.status === 'FINALIZADO' ? 'Finalizado' : 'Aberto'} · {registro.clientesAfetados.length} cliente(s)
                  </span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#374151', fontWeight: 700 }}>
                  {registro.problema}
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  {registro.clientesAfetados.slice(0, 3).map((item) => item.nomeCliente).join(', ')}
                  {registro.clientesAfetados.length > 3 ? '...' : ''}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="chart-box">
          {draft && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '18px', alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div className="field">
                    <label>Data e hora da abertura</label>
                    <input value={draft.abertoEm} readOnly type="datetime-local" />
                  </div>

                  <div className="field">
                    <label>Descreva o problema massivo</label>
                    <input
                      value={draft.problema}
                      onChange={(e) => setDraft({ ...draft, problema: e.target.value })}
                      placeholder="Ex.: Rompimento de fibra na regiao central"
                    />
                  </div>

                  <div style={{ border: '1px solid #dce3e8', borderRadius: '14px', overflow: 'hidden', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ponto do problema</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                          Clique no mapa para marcar o local da ocorrência.
                        </div>
                      </div>
                      {draft.latitude != null && draft.longitude != null && (
                        <button
                          type="button"
                          onClick={() => setDraft({ ...draft, latitude: null, longitude: null })}
                          style={{ border: 'none', background: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Limpar ponto
                        </button>
                      )}
                    </div>
                    <div ref={mapRef} style={{ height: '250px', width: '100%' }} />
                    <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#475569' }}>
                      {draft.latitude != null && draft.longitude != null
                        ? `Latitude: ${draft.latitude} | Longitude: ${draft.longitude}`
                        : 'Nenhum ponto marcado ainda.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '14px' }}>
                  <div className="field">
                    <label>Anotações da equipe</label>
                    <textarea
                      value={draft.observacoesEquipe}
                      onChange={(e) => setDraft({ ...draft, observacoesEquipe: e.target.value })}
                      style={{ minHeight: '88px' }}
                      placeholder="Previsão, recados internos, atualizações técnicas..."
                    />
                  </div>

                  <div className="field">
                    <label>Texto pre-definido para WhatsApp</label>
                    <textarea
                      value={draft.textoWhatsapp}
                      onChange={(e) => setDraft({ ...draft, textoWhatsapp: e.target.value })}
                      style={{ minHeight: '88px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn-new"
                        style={{ fontSize: '12px', padding: '10px 12px' }}
                        onClick={() => setIsWhatsappPreviewOpen(true)}
                      >
                        Gerar prévia para WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label>Informações do fim do atendimento</label>
                    <textarea
                      value={draft.encerramentoInfo}
                      onChange={(e) => setDraft({ ...draft, encerramentoInfo: e.target.value })}
                      style={{ minHeight: '88px' }}
                      placeholder="Descreva como o atendimento foi encerrado, causa raiz e retorno final."
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#2c3e50' }}>Clientes afetados</h3>
                  <button type="button" className="btn-new btn-green" onClick={adicionarLinha}>
                    + ADICIONAR LINHA
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                  <table className="data-table" style={{ minWidth: '1040px', margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '24%' }}>Nome do cliente</th>
                        <th style={{ width: '22%' }}>Rua / plano</th>
                        <th style={{ width: '16%' }}>Técnico</th>
                        <th style={{ width: '18%' }}>Data e hora do chamado</th>
                        <th style={{ width: '10%' }}>Normalizou?</th>
                        <th style={{ width: '18%' }}>Retornou em</th>
                        <th style={{ width: '70px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.clientesAfetados.map((item) => (
                        <tr key={item.tempId}>
                          <td>
                            <input
                              list="clientes-massivo-lista"
                              value={item.nomeCliente}
                              onChange={(e) => handleNomeClienteChange(item.tempId, e.target.value)}
                              placeholder="Digite ou selecione do cadastro"
                            />
                          </td>
                          <td>
                            {item.clienteId && (clientes.find((cliente) => cliente.id === item.clienteId)?.conexoes.length || 0) > 1 ? (
                              <select
                                value={item.conexaoId || ''}
                                onChange={(e) => handleConexaoChange(item.tempId, item.clienteId, e.target.value || null)}
                              >
                                <option value="">Selecione o plano/endereco</option>
                                {clientes
                                  .find((cliente) => cliente.id === item.clienteId)
                                  ?.conexoes.map((conexao) => (
                                    <option key={conexao.id} value={conexao.id}>
                                      {conexao.endereco}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <input
                                value={item.rua}
                                onChange={(e) => atualizarItem(item.tempId, { rua: e.target.value })}
                                placeholder="Rua / local afetado"
                              />
                            )}
                          </td>
                          <td>
                            <input
                              list="tecnicos-massivo-lista"
                              value={item.tecnicoResponsavel}
                              onChange={(e) => atualizarItem(item.tempId, { tecnicoResponsavel: e.target.value })}
                              placeholder="Quem atendeu"
                            />
                          </td>
                          <td>
                            <input
                              type="datetime-local"
                              value={item.chamadoEm}
                              onChange={(e) => atualizarItem(item.tempId, { chamadoEm: e.target.value })}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={item.normalizado}
                              onChange={(e) => handleToggleNormalizado(item.tempId, e.target.checked)}
                            />
                          </td>
                          <td>
                            <input value={item.normalizadoEm} readOnly type="datetime-local" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removerLinha(item.tempId)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                              title="Remover linha"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <datalist id="clientes-massivo-lista">
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.nome} />
                  ))}
                </datalist>
                <datalist id="tecnicos-massivo-lista">
                  {tecnicosDisponiveis.map((tecnico) => (
                    <option key={tecnico} value={tecnico} />
                  ))}
                </datalist>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                  Operador atual: <strong>{usuarioLogado?.nome || '-'}</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn-new" onClick={() => void salvar(false)} disabled={salvando}>
                    {salvando ? 'SALVANDO...' : 'SALVAR ATENDIMENTO MASSIVO'}
                  </button>
                  <button className="btn-new btn-green" onClick={() => void salvar(true)} disabled={salvando}>
                    {salvando ? 'FINALIZANDO...' : 'FINALIZAR ATENDIMENTO'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isWhatsappPreviewOpen && draft && (
        <div className="modal-overlay" style={{ zIndex: 9000 }}>
          <div className="modal-box" style={{ width: '920px', maxWidth: '92vw' }}>
            <button
              type="button"
              className="btn-close"
              onClick={() => setIsWhatsappPreviewOpen(false)}
            >
              ×
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
              <img
                src="/logo-admin.png"
                alt="Infotche"
                style={{ height: '78px', width: 'auto', objectFit: 'contain' }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.05fr 1fr',
                gap: '18px',
                marginTop: '18px',
                background: '#f8fafc',
                borderRadius: '18px',
                padding: '18px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  minHeight: '320px',
                }}
              >
                {draft.latitude != null && draft.longitude != null ? (
                  <>
                    <div ref={previewMapRef} style={{ width: '100%', height: '280px' }} />
                    <div style={{ padding: '12px 14px', fontSize: '12px', color: '#475569', borderTop: '1px solid #e2e8f0' }}>
                      Ponto do problema: {draft.latitude}, {draft.longitude}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '24px', display: 'grid', placeItems: 'center', height: '100%', color: '#64748b', textAlign: 'center' }}>
                    Marque um ponto no mapa do atendimento para gerar a miniatura aqui.
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  padding: '18px',
                  minHeight: '320px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Comunicado
                  </div>
                  <h3 style={{ margin: '10px 0 8px', color: '#0f172a', fontSize: '18px' }}>
                    {draft.problema || 'Atendimento massivo em andamento'}
                  </h3>
                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: '#1e293b',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {draft.textoWhatsapp || 'Sem texto definido para WhatsApp.'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {draft.abertoEm ? `Aberto em ${draft.abertoEm.replace('T', ' ')}` : ''}
                  </div>
                  <button
                    type="button"
                    className="btn-new btn-green"
                    onClick={() => {
                      navigator.clipboard.writeText(draft.textoWhatsapp || '');
                      alert('Texto copiado para a área de transferência.');
                    }}
                  >
                    Copiar texto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

