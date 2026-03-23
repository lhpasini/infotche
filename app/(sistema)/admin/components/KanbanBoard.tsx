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
  agendamentoData?: any;
  agendamentoHora?: string | null;
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
  onView?: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
}

const ICONS = {
  copy: '\u{1F4CB}',
  edit: '\u{270F}\u{FE0F}',
  delete: '\u{1F5D1}\u{FE0F}',
  location: '\u{1F4CD}',
  phone: '\u{1F4F1}',
  category: '\u{1F3F7}\u{FE0F}',
  note: '\u{1F4DD}',
  technician: '\u{1F477}',
  lock: '\u{1F510}',
  document: '\u{1F4C4}',
  urgent: '\u{1F6A8}',
  high: '\u{1F7E0}',
  low: '\u{1F7E1}',
  medium: '\u{1F7E2}',
  recent: '\u{1F195}',
  oldest: '\u{23F3}',
  priority: '\u{1F525}',
  warning: '\u{26A0}\u{FE0F}',
};

type AgendamentoGroup = {
  key: string;
  label: string;
  sortWeight: number;
  tickets: Ticket[];
};

export function KanbanBoard({
  tickets,
  expandedId,
  setExpandedId,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDrop,
  onEdit,
  onView,
  onDelete,
}: Props) {
  const colunas = ['novos', 'agendados', 'andamento', 'concluidos'];
  const [ordemFila, setOrdemFila] = useState('prioridade');

  const parseLocalDate = (value: any) => {
    if (!value) return null;

    if (value instanceof Date) {
      const clonedDate = new Date(value);
      if (Number.isNaN(clonedDate.getTime())) return null;
      return clonedDate;
    }

    if (typeof value === 'string') {
      const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const normalizeDate = (value: any) => {
    const date = parseLocalDate(value);
    if (!date) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

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

  const getAgendamentoGroupLabel = (value: any) => {
    const date = normalizeDate(value);
    if (!date) return 'Sem data';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    if (date.getTime() === hoje.getTime()) return 'Hoje';
    if (date.getTime() === amanha.getTime()) return 'Amanha';

    const diaSemana = date.toLocaleDateString('pt-BR', {
      weekday: 'long',
    });
    const dataFormatada = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return `${dataFormatada} - ${diaSemana}`;
  };

  const getAgendamentoGroupKey = (value: any) => {
    const date = normalizeDate(value);
    if (!date) return 'sem-data';
    return date.toISOString().slice(0, 10);
  };

  const getAgendamentoSortWeight = (value: any) => {
    const date = normalizeDate(value);
    if (!date) return Number.MAX_SAFE_INTEGER;
    return date.getTime();
  };

  const getHoraSortWeight = (hora: string | null | undefined) => {
    if (!hora) return Number.MAX_SAFE_INTEGER;
    const [hours, minutes] = hora.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER;
    return hours * 60 + minutes;
  };

  const handleCopy = (e: React.MouseEvent, t: Ticket) => {
    e.stopPropagation();
    navigator.clipboard.writeText(
      `PROTOCOLO: ${t.protocolo}\nCLIENTE: ${t.nomeCliente}\nCONTATO: ${t.whatsCliente || 'N/A'}\nCIDADE: ${t.cidadeCliente || 'N/A'}\nENDERECO: ${t.enderecoCompleto}\nPPPOE: ${t.pppoe || 'N/A'}\nSENHA: ${t.senhaPpoe || 'N/A'}\nCODIGO CONEXAO: ${t.contratoMhnet || 'N/A'}\nCATEGORIA: ${t.categoria}\nDETALHES: ${t.motivo}\nOBS: ${t.obs || 'Nenhuma'}`
    );
    alert('Copiado para o tecnico!');
  };

  const getPesoPrioridade = (pri: string) => {
    if (pri === 'Urgente') return 4;
    if (pri === 'Alta') return 3;
    if (pri === 'MÃƒÂ©dia' || pri === 'MÃƒÆ’Ã‚Â©dia') return 2;
    if (pri === 'Baixa (OrÃƒÂ§amento)' || pri === 'Baixa (OrÃƒÆ’Ã‚Â§amento)') return 1;
    return 0;
  };

  const getPriorityMeta = (prioridade: string) => {
    if (prioridade === 'Urgente') {
      return { label: `${ICONS.urgent} URGENTE`, color: '#e74c3c' };
    }

    if (prioridade === 'Alta') {
      return { label: `${ICONS.high} ALTA`, color: '#e67e22' };
    }

    if (prioridade === 'Baixa (OrÃƒÂ§amento)' || prioridade === 'Baixa (OrÃƒÆ’Ã‚Â§amento)') {
      return { label: `${ICONS.low} BAIXA`, color: '#c59a00' };
    }

    return { label: `${ICONS.medium} MEDIA`, color: '#16a34a' };
  };
  const normalizeText = (value: string | null | undefined) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();


  const getCityBackground = (ticket: Ticket) => {
    if (ticket.status === 'concluidos') return '#eef1f4';

    const cidade = normalizeText(ticket.cidadeCliente);

    if (cidade === 'santa barbara do sul') return '#e8f5e9';
    if (cidade === 'saldanha marinho') return '#fffde7';
    if (cidade === 'panambi') return '#e3f2fd';

    return 'white';
  };

  const renderTicketCard = (ticket: Ticket) => {
    const priorityMeta = getPriorityMeta(ticket.prioridade);

    return (
      <div
        key={ticket.id}
        className="kanban-card"
        draggable
        onDragStart={(e) => onDragStart(e, ticket.id)}
        onClick={() => onEdit(ticket)}
        style={{
          background: getCityBackground(ticket),
          borderLeft: ticket.categoria === 'Mhnet / Link Loss' ? '8px solid #e74c3c' : '4px solid transparent',
          marginBottom: '10px',
          transition: '0.3s',
        }}
      >
        <div className="card-top">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="prot-badge">{ticket.protocolo}</span>
              <span style={{ fontSize: '10px', color: '#5f6c7b', fontWeight: 700 }}>
                {formatDateTime(ticket.criadoEm)}
              </span>
            </div>
            {ticket.status === 'concluidos' && ticket.fechadoEm && (
              <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700 }}>
                Encerrado em {formatDateTime(ticket.fechadoEm)}
              </span>
            )}
            {ticket.status === 'agendados' && ticket.agendamentoData && (
              <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700 }}>
                Agendado para {normalizeDate(ticket.agendamentoData)?.toLocaleDateString('pt-BR') || ''}
                {ticket.agendamentoHora ? ` as ${ticket.agendamentoHora}` : ''}
              </span>
            )}
          </div>

          <div className="card-actions">
            <button onClick={(e) => handleCopy(e, ticket)} title="Copiar resumo tecnico">{ICONS.copy}</button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(ticket); }} title="Editar chamado">{ICONS.edit}</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); }} title="Excluir">{ICONS.delete}</button>
          </div>
        </div>

        <div className="card-client" style={{ marginBottom: '2px' }}>{ticket.nomeCliente}</div>

        {ticket.cidadeCliente && (
          <div style={{ fontSize: '10px', color: '#2c3e50', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>
            {ICONS.location} {ticket.cidadeCliente}
          </div>
        )}

        <span className="card-whats">{ICONS.phone} {ticket.whatsCliente || 'Sem Whats'}</span>

        <span
          className="card-cat"
          style={{ color: ticket.categoria === 'Mhnet / Link Loss' ? '#e74c3c' : '#3498db', fontWeight: ticket.categoria === 'Mhnet / Link Loss' ? 'bold' : 'normal' }}
        >
          {ICONS.category} {ticket.categoria}
        </span>

        <div className="card-desc">{ICONS.note} {ticket.motivo}</div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId(expandedId === ticket.id ? null : ticket.id);
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
          {expandedId === ticket.id ? 'Fechar resumo' : 'Abrir resumo'}
        </button>

        <div className="card-footer" style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '4px' }}>
          <span>{ICONS.technician} {ticket.tecnico || 'S/ Tec'}</span>
          <span style={{ color: priorityMeta.color, fontWeight: 'bold' }}>
            {priorityMeta.label}
          </span>
        </div>

        {ticket.status === 'concluidos' && onView && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(ticket);
            }}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '8px 10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#1e3a8a',
              fontSize: '11px',
            }}
          >
            Visualizar atendimento
          </button>
        )}

        {expandedId === ticket.id && (
          <div className="card-details">
            <div className="detail-line"><strong>{ICONS.location} End.:</strong> <span>{ticket.enderecoCompleto}</span></div>
            <div className="detail-line"><strong>{ICONS.lock} PPPoE:</strong> <span>{ticket.pppoe}</span> / <span>{ticket.senhaPpoe}</span></div>
            <div className="detail-line"><strong>{ICONS.document} Cod.:</strong> <span>{ticket.contratoMhnet}</span></div>
            {ticket.obs && <div style={{ color: '#e67e22', marginTop: '8px', fontWeight: 'bold' }}>{ICONS.warning} Obs: {ticket.obs}</div>}
            <button
              style={{ marginTop: '10px', width: '100%', padding: '8px', cursor: 'pointer', fontWeight: 'bold', background: '#e2e8f0', border: 'none', borderRadius: '4px', color: '#2c3e50' }}
              onClick={(e) => handleCopy(e, ticket)}
            >
              {ICONS.copy} COPIAR RESUMO TECNICO
            </button>
          </div>
        )}
      </div>
    );
  };

  const buildAgendamentoGroups = (ticketsDaColuna: Ticket[]): AgendamentoGroup[] =>
    Array.from(
      ticketsDaColuna.reduce((acc, ticket) => {
        const key = getAgendamentoGroupKey(ticket.agendamentoData);

        if (!acc.has(key)) {
          acc.set(key, {
            key,
            label: getAgendamentoGroupLabel(ticket.agendamentoData),
            sortWeight: getAgendamentoSortWeight(ticket.agendamentoData),
            tickets: [],
          });
        }

        acc.get(key)!.tickets.push(ticket);
        return acc;
      }, new Map<string, AgendamentoGroup>())
    )
      .map(([, grupo]) => ({
        ...grupo,
        tickets: grupo.tickets.sort((a, b) => {
          const horaA = getHoraSortWeight(a.agendamentoHora);
          const horaB = getHoraSortWeight(b.agendamentoHora);

          if (horaA !== horaB) return horaA - horaB;
          return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
        }),
      }))
      .sort((a, b) => a.sortWeight - b.sortWeight);

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
            <option value="prioridade">{`${ICONS.priority} Prioridade`}</option>
            <option value="velhos">{`${ICONS.oldest} Mais antigos`}</option>
            <option value="recentes">{`${ICONS.recent} Mais recentes`}</option>
          </select>
        </div>
      </div>

      <main className="kanban">
        {colunas.map((status) => {
          let ticketsDaColuna = tickets.filter((ticket) => ticket.status === status);
          const totalReal = ticketsDaColuna.length;

          if (status === 'concluidos') {
            ticketsDaColuna.sort(
              (a, b) =>
                new Date(b.fechadoEm || b.atualizadoEm || b.criadoEm).getTime() -
                new Date(a.fechadoEm || a.atualizadoEm || a.criadoEm).getTime()
            );
            ticketsDaColuna = ticketsDaColuna.slice(0, 5);
          } else if (status !== 'agendados' && ordemFila === 'prioridade') {
            ticketsDaColuna.sort((a, b) => {
              const pesoA = getPesoPrioridade(a.prioridade);
              const pesoB = getPesoPrioridade(b.prioridade);
              if (pesoA !== pesoB) return pesoB - pesoA;
              return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
            });
          } else if (status !== 'agendados' && ordemFila === 'velhos') {
            ticketsDaColuna.sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());
          } else if (status !== 'agendados') {
            ticketsDaColuna.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
          }

          const gruposAgendados = status === 'agendados' ? buildAgendamentoGroups(ticketsDaColuna) : [];

          return (
            <div key={status} className="column" onDragOver={onDragOver} onDragEnter={onDragEnter} onDrop={(e) => onDrop(e, status)}>
              <div className={`col-title ${status === 'novos' ? 'bg-blue' : status === 'agendados' ? 'bg-orange' : status === 'andamento' ? 'bg-cyan' : 'bg-green'}`}>
                <span>{status.toUpperCase()}</span>
                <span>{status === 'concluidos' && totalReal > 5 ? '5 Exibidos' : totalReal}</span>
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {status === 'agendados'
                  ? gruposAgendados.map((grupo) => (
                      <div key={grupo.key}>
                        <div
                          style={{
                            margin: '0 10px 10px',
                            padding: '8px 10px',
                            background: '#fff7ed',
                            border: '1px solid #fdba74',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#9a3412',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {grupo.label} ({grupo.tickets.length})
                        </div>
                        {grupo.tickets.map((ticket) => renderTicketCard(ticket))}
                      </div>
                    ))
                  : ticketsDaColuna.map((ticket) => renderTicketCard(ticket))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
