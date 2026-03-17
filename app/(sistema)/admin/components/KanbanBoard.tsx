'use client';

type Ticket = { 
  id: string; protocolo: string; clienteId: string | null; conexaoId: string | null; nomeCliente: string; whatsCliente: string | null; enderecoCompleto: string; cidadeCliente: string | null;
  tecnico: string | null; categoria: string; motivo: string; pppoe: string | null; senhaPpoe: string | null; contratoMhnet: string | null;
  obs: string | null; abertoPor: string | null; resolucao: string | null; prioridade: string; criadoEm: any; atualizadoEm?: any; status: string; 
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

export function KanbanBoard({ tickets, expandedId, setExpandedId, onDragStart, onDragOver, onDragEnter, onDrop, onEdit, onDelete }: Props) {
  const colunas = ['novos', 'agendados', 'andamento', 'concluidos'];

  const handleCopy = (e: React.MouseEvent, t: Ticket) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`PROTOCOLO: ${t.protocolo}\nCLIENTE: ${t.nomeCliente}\nCONTATO: ${t.whatsCliente || 'N/A'}\nCIDADE: ${t.cidadeCliente || 'N/A'}\nENDEREÇO: ${t.enderecoCompleto}\nPPPoE: ${t.pppoe || 'N/A'}\nSENHA: ${t.senhaPpoe || 'N/A'}\nCÓDIGO CONEXÃO: ${t.contratoMhnet || 'N/A'}\nCATEGORIA: ${t.categoria}\nDETALHES: ${t.motivo}\nOBS: ${t.obs || 'Nenhuma'}`);
    alert('Copiado para o técnico!');
  };

  return (
    <main className="kanban">
      {colunas.map(st => (
        <div key={st} className="column" onDragOver={onDragOver} onDragEnter={onDragEnter} onDrop={(e) => onDrop(e, st)}>
          <div className={`col-title ${st === 'novos' ? 'bg-blue' : st === 'agendados' ? 'bg-orange' : st === 'andamento' ? 'bg-cyan' : 'bg-green'}`}>
            <span>{st.toUpperCase()}</span>
            <span>{tickets.filter(t => t.status === st).length}</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {tickets.filter(t => t.status === st).map(t => (
              <div 
                key={t.id} 
                className="kanban-card" 
                draggable 
                onDragStart={(e) => onDragStart(e, t.id)} 
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                style={{ 
                  // CORES DE FUNDO POR CIDADE (Tons Pastéis)
                  background: t.cidadeCliente === 'Santa Bárbara do Sul' ? '#e8f5e9' : // Verde Claro
                             t.cidadeCliente === 'Saldanha Marinho' ? '#fffde7' :    // Amarelo Claro
                             t.cidadeCliente === 'Panambi' ? '#e3f2fd' :             // Azul Claro
                             'white',
                  // DESTAQUE LATERAL PARA LINK LOSS
                  borderLeft: t.categoria === 'Mhnet / Link Loss' ? '8px solid #e74c3c' : '4px solid transparent',
                  marginBottom: '10px',
                  transition: '0.3s'
                }}
              >
                <div className="card-top">
                  <span className="prot-badge">{t.protocolo}</span>
                  <div className="card-actions">
                    <button onClick={(e) => handleCopy(e, t)} title="Copiar Resumo Técnico">📋</button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} title="Editar Chamado">✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} title="Excluir">🗑️</button>
                  </div>
                </div>
                
                <div className="card-client" style={{marginBottom: '2px'}}>{t.nomeCliente}</div>
                
                {/* CIDADE EM DESTAQUE LOGO ABAIXO DO NOME */}
                {t.cidadeCliente && (
                  <div style={{ fontSize: '10px', color: '#2c3e50', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>
                    📍 {t.cidadeCliente}
                  </div>
                )}

                <span className="card-whats">📱 {t.whatsCliente || 'Sem Whats'}</span>
                
                {/* CATEGORIA COM COR DINÂMICA SE FOR LINK LOSS */}
                <span className="card-cat" style={{ color: t.categoria === 'Mhnet / Link Loss' ? '#e74c3c' : '#3498db', fontWeight: t.categoria === 'Mhnet / Link Loss' ? 'bold' : 'normal' }}>
                  🏷️ {t.categoria}
                </span>

                <div className="card-desc">📝 {t.motivo}</div>
                <div className="card-footer"><span>👷 {t.tecnico || 'S/ Tec'}</span><span>🕒 {new Date(t.criadoEm).toLocaleDateString('pt-BR')}</span></div>
                
                {expandedId === t.id && (
                  <div className="card-details">
                    <div className="detail-line"><strong>📍 End. :</strong> <span>{t.enderecoCompleto}</span></div>
                    <div className="detail-line"><strong>🔐 PPPoE:</strong> <span>{t.pppoe}</span> / <span>{t.senhaPpoe}</span></div>
                    <div className="detail-line"><strong>📄 Cód. :</strong> <span>{t.contratoMhnet}</span></div>
                    {t.obs && <div style={{ color: '#e67e22', marginTop: '8px', fontWeight: 'bold' }}>⚠️ Obs: {t.obs}</div>}
                    <button style={{ marginTop: '10px', width: '100%', padding: '8px', cursor: 'pointer', fontWeight: 'bold', background: '#e2e8f0', border: 'none', borderRadius: '4px', color: '#2c3e50' }} onClick={(e) => handleCopy(e, t)}>
                      📋 COPIAR RESUMO TÉCNICO
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}