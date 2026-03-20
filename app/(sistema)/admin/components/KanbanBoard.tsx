'use client';

import React, { useState } from 'react';

type Ticket = {
  id: string;
  protocolo: string;
  clienteId: string | null;
  conexaoId: string | null;
  nomeCliente: string;
  whatsCliente: string | null;
  enderecoCompleto: string;
  cidadeCliente: string | null;
  tecnico: string | null;
  categoria: string;
  motivo: string;
  pppoe: string | null;
  senhaPpoe: string | null;
  contratoMhnet: string | null;
  obs: string | null;
  abertoPor: string | null;
  resolucao: string | null;
  prioridade: string;
  criadoEm: any;
  fechadoEm?: any;
  atualizadoEm?: any;
  status: string;
};

interface Props {
  tickets: Ticket[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
}

export function KanbanBoard({
  tickets,
  expandedId,
  setExpandedId,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDrop,
  onEdit,
  onDelete,
}: Props) {
  const colunas = ['novos', 'agendados', 'andamento', 'concluidos'];
  const [ordemFila, setOrdemFila] = useState('prioridade');

  const formatDateTime = (value: any) => {
    if (!value) return '';
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopy = (e: React.MouseEvent, t: Ticket) => {
    e.stopPropagation();
    navigator.clipboard.writeText(
      `PROTOCOLO: ${t.protocolo}\nCLIENTE: ${t.nomeCliente}\nCONTATO: ${t.whatsCliente || 'N/A'}\nCIDADE: ${t.cidadeCliente || 'N/A'}\nENDERECO: ${t.enderecoCompleto}\nPPPoE: ${t.pppoe || 'N/A'}\nSENHA: ${t.senhaPpoe || 'N/A'}\nCODIGO CONEXAO: ${t.contratoMhnet || 'N/A'}\nCATEGORIA: ${t.categoria}\nDETALHES: ${t.motivo}\nOBS: ${t.obs || 'Nenhuma'}`
    );
    alert('Copiado para o tecnico!');
  };

  const getPesoPrioridade = (pri: string) => {
    if (pri === 'Urgente') return 4;
    if (pri === 'Alta') return 3;
    if (pri === 'Média' || pri === 'MÃ©dia') return 2;
    if (pri === 'Baixa (Orçamento)' || pri === 'Baixa (OrÃ§amento)') return 1;
    return 0;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', padding: '0 30px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #dce3e8',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase' }}>
            Organizar fila por:
          </span>
          <select
            value={ordemFila}
            onChange={(e) => setOrdemFila(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '12px', fontWeight: 'bold', color: '#2c3e50', cursor: 'pointer', background: 'transparent' }}
          >
            <option value="prioridade">Prioridade</option>
            <option value="velhos">Mais antigos</option>
            <option value="recentes">Mais recentes</option>
          </select>
        </div>
      </div>

      <main className="kanban">
        {colunas.map((st) => {
          let ticketsDaColuna = tickets.filter((t) => t.status === st);
          const totalReal = ticketsDaColuna.length;

          if (st === 'concluidos') {
            ticketsDaColuna.sort(
              (a, b) =>
                new Date(b.fechadoEm || b.atualizadoEm || b.criadoEm).getTime() -
                new Date(a.fechadoEm || a.atualizadoEm || a.criadoEm).getTime()
            );
            ticketsDaColuna = ticketsDaColuna.slice(0, 5);
          } else if (ordemFila === 'prioridade') {
            ticketsDaColuna.sort((a, b) => {
              const pesoA = getPesoPrioridade(a.prioridade);
              const pesoB = getPesoPrioridade(b.prioridade);
              if (pesoA !== pesoB) return pesoB - pesoA;
              return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
            });
          } else if (ordemFila === 'velhos') {
            ticketsDaColuna.sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());
          } else if (ordemFila === 'recentes') {
            ticketsDaColuna.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
          }

          return (
            <div key={st} className="column" onDragOver={onDragOver} onDragEnter={onDragEnter} onDrop={(e) => onDrop(e, st)}>
              <div className={`col-title ${st === 'novos' ? 'bg-blue' : st === 'agendados' ? 'bg-orange' : st === 'andamento' ? 'bg-cyan' : 'bg-green'}`}>
                <span>{st.toUpperCase()}</span>
                <span>{st === 'concluidos' && totalReal > 5 ? '5 Exibidos' : totalReal}</span>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {ticketsDaColuna.map((t) => (
                  <div
                    key={t.id}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => onDragStart(e, t.id)}
                    onClick={() => onEdit(t)}
                    style={{
                      background:
                        t.status === 'concluidos'
                          ? '#eef1f4'
                          : t.cidadeCliente === 'Santa Bárbara do Sul' || t.cidadeCliente === 'Santa BÃ¡rbara do Sul'
                            ? '#e8f5e9'
                            : t.cidadeCliente === 'Saldanha Marinho'
                              ? '#fffde7'
                              : t.cidadeCliente === 'Panambi'
                                ? '#e3f2fd'
                                : 'white',
                      borderLeft: t.categoria === 'Mhnet / Link Loss' ? '8px solid #e74c3c' : '4px solid transparent',
                      marginBottom: '10px',
                      transition: '0.3s',
                    }}
                  >
                    <div className="card-top">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="prot-badge">{t.protocolo}</span>
                          <span style={{ fontSize: '10px', color: '#5f6c7b', fontWeight: 700 }}>
                            Aberto em {formatDateTime(t.criadoEm)}
                          </span>
                        </div>
                        {t.status === 'concluidos' && t.fechadoEm && (
                          <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700 }}>
                            Encerrado em {formatDateTime(t.fechadoEm)}
                          </span>
                        )}
                      </div>
                      <div className="card-actions">
                        <button onClick={(e) => handleCopy(e, t)} title="Copiar resumo tecnico">Copiar</button>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} title="Editar chamado">Editar</button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} title="Excluir">Apagar</button>
                      </div>
                    </div>

                    <div className="card-client" style={{ marginBottom: '2px' }}>{t.nomeCliente}</div>

                    {t.cidadeCliente && (
                      <div style={{ fontSize: '10px', color: '#2c3e50', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>
                        {t.cidadeCliente}
                      </div>
                    )}

                    <span className="card-whats">Contato: {t.whatsCliente || 'Sem Whats'}</span>

                    <span
                      className="card-cat"
                      style={{ color: t.categoria === 'Mhnet / Link Loss' ? '#e74c3c' : '#3498db', fontWeight: t.categoria === 'Mhnet / Link Loss' ? 'bold' : 'normal' }}
                    >
                      {t.categoria}
                    </span>

                    <div className="card-desc">{t.motivo}</div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expandedId === t.id ? null : t.id);
                      }}
                      style={{
                        marginTop: '8px',
                        padding: 0,
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {expandedId === t.id ? 'Fechar resumo' : 'Abrir resumo'}
                    </button>

                    <div className="card-footer" style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                      <span>Tecnico: {t.tecnico || 'S/ Tec'}</span>
                      <span style={{ color: t.prioridade === 'Urgente' ? '#e74c3c' : t.prioridade === 'Alta' ? '#e67e22' : '#95a5a6', fontWeight: 'bold' }}>
                        {t.prioridade === 'Urgente'
                          ? 'URGENTE'
                          : t.prioridade === 'Alta'
                            ? 'ALTA'
                            : new Date(t.criadoEm).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {expandedId === t.id && (
                      <div className="card-details">
                        <div className="detail-line"><strong>Endereco:</strong> <span>{t.enderecoCompleto}</span></div>
                        <div className="detail-line"><strong>PPPoE:</strong> <span>{t.pppoe}</span> / <span>{t.senhaPpoe}</span></div>
                        <div className="detail-line"><strong>Cod.:</strong> <span>{t.contratoMhnet}</span></div>
                        {t.obs && <div style={{ color: '#e67e22', marginTop: '8px', fontWeight: 'bold' }}>Obs: {t.obs}</div>}
                        <button
                          style={{ marginTop: '10px', width: '100%', padding: '8px', cursor: 'pointer', fontWeight: 'bold', background: '#e2e8f0', border: 'none', borderRadius: '4px', color: '#2c3e50' }}
                          onClick={(e) => handleCopy(e, t)}
                        >
                          COPIAR RESUMO TECNICO
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
