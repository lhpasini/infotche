'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
// Importação das Server Actions para conexão com o banco
import { getCategorias, upsertCategoria, deleteCategoria } from '@/app/actions/categorias';

// --- Tipagens ---
type Conexao = { id: string; contratoMhnet: string; endereco: string; bairro: string; pppoe: string; senhaPpoe: string; };
type Cliente = { dbId: string; nome: string; cpf: string; email: string; whatsapp: string; conexoes: Conexao[]; status: 'Ativo' | 'Inativo'; };
type Categoria = { id: string; nome: string; };
type Ticket = { 
  id: string; clientDbId: string; clientName: string; clientWhats: string; enderecoCompleto: string; 
  technician: string; categoria: string; motivo: string; pppoe: string; senhaPpoe: string; contratoMhnet: string;
  obs: string; time: string; priority: 'Alta' | 'Média' | 'Baixa'; status: 'novos' | 'agendados' | 'andamento' | 'concluidos'; 
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clientes' | 'categorias' | 'relatorios'>('dashboard');
  
  // Modais e Estados de Controle
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false); // Modal para gerenciar categorias
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Estados dos Campos Inteligentes do Modal
  const [tempClientId, setTempClientId] = useState("");
  const [tempPppoe, setTempPppoe] = useState("");
  const [tempSenha, setTempSenha] = useState("");
  const [tempContrato, setTempContrato] = useState("");

  // --- Estados vindos do Banco de Dados ---
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Efeito para carregar categorias do banco ao abrir a página
  useEffect(() => {
    async function loadData() {
      const data = await getCategorias();
      setCategorias(data as Categoria[]);
      setLoading(false);
    }
    loadData();
  }, []);

  // --- Dados de Clientes (Ainda em memória até o próximo passo do banco) ---
  const [clientes] = useState<Cliente[]>([
    { 
      dbId: 'cli_1', nome: 'João da Silva', cpf: '000.000.000-00', email: 'joao@email.com', whatsapp: '55 99967-6777', status: 'Ativo',
      conexoes: [{ id: 'con_1', contratoMhnet: '8855', endereco: 'Rua das Flores, 123', bairro: 'Centro', pppoe: 'joao_mhnet', senhaPpoe: '123456' }]
    }
  ]);

  const [tickets, setTickets] = useState<Ticket[]>([]);

  // --- Funções de Categoria (Integração com Banco) ---
  const handleSaveCat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nomeCat') as string;
    
    await upsertCategoria(editingCat?.id || null, nome);
    const atualizadas = await getCategorias();
    setCategorias(atualizadas as Categoria[]);
    setIsCatModalOpen(false);
    setEditingCat(null);
  };

  const handleDeleteCat = async (id: string) => {
    if(confirm('Deseja excluir esta categoria do banco?')) {
      await deleteCategoria(id);
      setCategorias(categorias.filter(c => c.id !== id));
    }
  };

  // --- Funções Kanban ---
  const onDragStart = (id: string) => setDraggedTicketId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (newStatus: Ticket['status']) => {
    if (!draggedTicketId) return;
    setTickets(prev => prev.map(t => t.id === draggedTicketId ? { ...t, status: newStatus } : t));
    setDraggedTicketId(null);
  };

  const handleDeleteTicket = (id: string) => {
    if(confirm('Tem certeza que deseja apagar este chamado?')) {
      setTickets(tickets.filter(t => t.id !== id));
    }
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setTempClientId(id);
    if (id && id !== 'avulso') {
      const cli = clientes.find(c => c.dbId === id);
      const con = cli?.conexoes[0];
      setTempPppoe(con?.pppoe || "");
      setTempSenha(con?.senhaPpoe || "");
      setTempContrato(con?.contratoMhnet || "");
    } else {
      setTempPppoe(""); setTempSenha(""); setTempContrato("");
    }
  };

  const handleSaveTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = formData.get('clientDbId') as string;
    const isAvulso = clientId === "avulso";
    const cliente = isAvulso ? null : clientes.find(c => c.dbId === clientId);

    const ticketData: Ticket = {
      id: editingTicket ? editingTicket.id : `#${Math.floor(1000 + Math.random() * 9000)}`,
      clientDbId: clientId,
      clientName: isAvulso ? (formData.get('nomeAvulso') as string) : (cliente?.nome || 'Avulso'),
      clientWhats: isAvulso ? (formData.get('whatsAvulso') as string) : (cliente?.whatsapp || ''),
      enderecoCompleto: isAvulso ? (formData.get('enderecoAvulso') as string) : (cliente?.conexoes[0] ? `${cliente.conexoes[0].endereco} - ${cliente.conexoes[0].bairro}` : ''),
      technician: formData.get('technician') as string,
      categoria: formData.get('categoria') as string,
      motivo: formData.get('motivo') as string,
      pppoe: formData.get('pppoe') as string,
      senhaPpoe: formData.get('senhaPpoe') as string,
      contratoMhnet: formData.get('contratoMhnet') as string,
      obs: formData.get('obs') as string,
      priority: formData.get('priority') as 'Alta' | 'Média' | 'Baixa',
      time: editingTicket ? editingTicket.time : new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      status: editingTicket ? editingTicket.status : 'novos'
    };

    setTickets(prev => editingTicket ? prev.map(t => t.id === editingTicket.id ? ticketData : t) : [ticketData, ...prev]);
    setIsTicketModalOpen(false);
    setEditingTicket(null);
  };

  const openEditModal = (t: Ticket) => {
    setEditingTicket(t);
    setTempClientId(t.clientDbId);
    setTempPppoe(t.pppoe);
    setTempSenha(t.senhaPpoe);
    setTempContrato(t.contratoMhnet);
    setIsTicketModalOpen(true);
  };

  return (
    <div className="app-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .app-container { display: flex; height: 100vh; background: #eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
        .sidebar { width: 140px; background: #fff; border-right: 1px solid #dce3e8; display: flex; flex-direction: column; align-items: center; padding-top: 15px; flex-shrink: 0; }
        .logo-container { width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; }
        .logo-img { width: 80px; height: auto; object-fit: contain; margin-bottom: 5px; }
        .logo-subtext { font-size: 9px; color: #7f8c8d; font-weight: bold; text-transform: uppercase; text-align: center; }
        .nav-links { width: 100%; display: flex; flex-direction: column; }
        .nav-item { display: flex; flex-direction: column; align-items: center; width: 100%; padding: 12px 0; color: #7f8c8d; font-size: 11px; font-weight: 600; cursor: pointer; border-left: 4px solid transparent; transition: 0.2s; }
        .nav-item:hover { color: #3498db; background: #f9fbfc; }
        .nav-item.active { color: #3498db; background: #f0f7ff; border-left-color: #3498db; }
        .nav-icon { font-size: 18px; margin-bottom: 4px; }
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 60px; background: #fff; border-bottom: 1px solid #dce3e8; display: flex; align-items: center; padding: 0 30px; gap: 20px; }
        .search-input { background: #f4f7f9; border: 1px solid #dfe6ed; padding: 8px 15px; border-radius: 6px; font-size: 12px; width: 220px; }
        .board-header { padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; }
        .board-header h1 { font-size: 20px; color: #2c3e50; font-weight: 800; }
        .kanban { display: flex; gap: 15px; padding: 0 30px 25px; overflow-x: auto; flex: 1; align-items: flex-start; }
        .column { background: #dce3e8; width: 320px; border-radius: 8px; flex-shrink: 0; display: flex; flex-direction: column; max-height: 100%; }
        .col-title { padding: 12px 15px; color: white; font-weight: bold; font-size: 11px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; }
        .bg-blue { background: #3498db; } .bg-orange { background: #f39c12; } .bg-cyan { background: #1abc9c; } .bg-green { background: #2ecc71; }
        .kanban-card { background: white; margin: 10px; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; border-left: 4px solid transparent; display: flex; flex-direction: column; gap: 6px; }
        .card-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 2px; }
        .prot-badge { font-size: 10px; font-weight: bold; color: #7f8c8d; background: #f4f7f9; padding: 2px 6px; border-radius: 4px; }
        .card-client { font-size: 14px; font-weight: 800; color: #2c3e50; }
        .card-whats { font-size: 11px; color: #27ae60; font-weight: bold; }
        .card-cat { font-size: 11px; font-weight: 700; color: #3498db; text-transform: uppercase; }
        .card-desc { font-size: 12px; color: #4a5568; line-height: 1.3; background: #f8fafc; padding: 6px; border-radius: 4px; }
        .card-footer { display: flex; justify-content: space-between; font-size: 10px; color: #95a5a6; font-weight: bold; margin-top: 4px; }
        .card-details { background: #f8fafc; border-top: 1px solid #edf2f7; padding: 10px; font-size: 11px; color: #4a5568; margin-top: 8px; border-radius: 4px; }
        .detail-line { margin-bottom: 4px; display: flex; justify-content: space-between; }
        .btn-new { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; overflow-y: auto; }
        .modal-box { background: white; padding: 25px; border-radius: 8px; width: 600px; max-height: 95vh; overflow-y: auto; }
        .field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        .field label { font-size: 10px; font-weight: bold; color: #7f8c8d; text-transform: uppercase; }
        .field input, .field select, .field textarea { padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px; overflow: hidden; }
        .data-table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; color: #7f8c8d; border-bottom: 2px solid #eef2f5; }
        .data-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
      `}} />

      <aside className="sidebar">
        <div className="logo-container"><img src="/logo-admin.png" alt="Infotchê" className="logo-img" /><span className="logo-subtext">Infotchê / Mhnet</span></div>
        <div className="nav-links">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><span className="nav-icon">📊</span>Dashboard</div>
          <div className={`nav-item ${activeTab === 'clientes' ? 'active' : ''}`} onClick={() => setActiveTab('clientes')}><span className="nav-icon">👥</span>Clientes</div>
          <div className={`nav-item ${activeTab === 'categorias' ? 'active' : ''}`} onClick={() => setActiveTab('categorias')}><span className="nav-icon">🏷️</span>Categorias</div>
          <div className={`nav-item ${activeTab === 'relatorios' ? 'active' : ''}`} onClick={() => setActiveTab('relatorios')}><span className="nav-icon">📈</span>Relatórios</div>
        </div>
      </aside>

      <div className="main">
        <header className="top-nav">
          <input className="search-input" placeholder="🔍 Buscar cliente..." />
          <div style={{flex:1}}></div>
          <button onClick={() => router.push('/login')} style={{background:'none', border:'none', color:'#95a5a6', fontWeight:'bold', cursor:'pointer'}}>SAIR</button>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <div className="board-header"><h1>Gestão Atendimentos</h1><button className="btn-new" onClick={() => setIsTicketModalOpen(true)}>+ NOVO CHAMADO</button></div>
            <main className="kanban">
              {['novos', 'agendados', 'andamento', 'concluidos'].map(status => (
                <div key={status} className="column" onDragOver={onDragOver} onDrop={() => onDrop(status as any)}>
                  <div className={`col-title ${status === 'novos' ? 'bg-blue' : status === 'agendados' ? 'bg-orange' : status === 'andamento' ? 'bg-cyan' : 'bg-green'}`}>
                    <span>{status.toUpperCase()}</span>
                    <span>{tickets.filter(t => t.status === status).length}</span>
                  </div>
                  <div style={{overflowY:'auto', flex:1}}>
                    {tickets.filter(t => t.status === status).map(t => (
                      <div key={t.id} className="kanban-card" draggable onDragStart={() => onDragStart(t.id)} onClick={() => setExpandedTicketId(expandedTicketId === t.id ? null : t.id)}>
                        <div className="card-top">
                          <span className="prot-badge">{t.id}</span>
                          <div className="card-actions">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(t); }}>✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTicket(t.id); }}>🗑️</button>
                          </div>
                        </div>
                        <span className="card-client">{t.clientName}</span>
                        <span className="card-whats">📱 {t.clientWhats || 'Sem Whats'}</span>
                        <span className="card-cat">🏷️ {t.categoria}</span>
                        <div className="card-desc">📝 {t.motivo}</div>
                        <div className="card-footer"><span>👷 {t.technician || 'S/ Tec'}</span><span>🕒 {t.time}</span></div>
                        
                        {expandedTicketId === t.id && (
                          <div className="card-details">
                            <div className="detail-line"><strong>📍 Endereço:</strong> <span>{t.enderecoCompleto}</span></div>
                            <div className="detail-line"><strong>🔐 PPPoE:</strong> <span>{t.pppoe}</span></div>
                            <div className="detail-line"><strong>🔑 Senha:</strong> <span>{t.senhaPpoe}</span></div>
                            <div className="detail-line"><strong>📄 Contrato:</strong> <span>{t.contratoMhnet}</span></div>
                            {t.obs && <div style={{color:'#e67e22', marginTop:'8px', fontWeight:'bold'}}>⚠️ Obs: {t.obs}</div>}
                            <button style={{marginTop:'10px', width:'100%', padding:'8px', cursor:'pointer', fontWeight:'bold', background:'#e2e8f0', border:'none', borderRadius:'4px', color:'#2c3e50'}} onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(`PROTOCOLO: ${t.id}\nCLIENTE: ${t.clientName}\nWHATS: ${t.clientWhats}\nENDEREÇO: ${t.enderecoCompleto}\nPPPoE: ${t.pppoe}\nSENHA: ${t.senhaPpoe}\nCONTRATO: ${t.contratoMhnet}\nSERVIÇO: ${t.categoria}\nMOTIVO: ${t.motivo}\nOBS: ${t.obs}`);
                              alert('Copiado para o técnico!');
                            }}>📋 COPIAR RESUMO TÉCNICO</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </main>
          </>
        )}

        {activeTab === 'categorias' && (
          <div style={{padding: '30px'}}>
            <div className="board-header" style={{padding: 0}}>
              <h1>Categorias de Serviço (Banco)</h1>
              <button className="btn-new" onClick={() => { setEditingCat(null); setIsCatModalOpen(true); }}>+ NOVA CATEGORIA</button>
            </div>
            {loading ? <p>Carregando categorias...</p> : (
              <table className="data-table">
                <thead><tr><th>NOME</th><th>AÇÕES</th></tr></thead>
                <tbody>
                  {categorias.map(cat => (
                    <tr key={cat.id}>
                      <td style={{fontWeight: 'bold'}}>{cat.nome}</td>
                      <td>
                        <button onClick={() => { setEditingCat(cat); setIsCatModalOpen(true); }} style={{marginRight: '10px', cursor:'pointer'}}>✏️</button>
                        <button onClick={() => handleDeleteCat(cat.id)} style={{cursor:'pointer'}}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL CATEGORIA */}
      {isCatModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{width: '400px'}}>
            <h2>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</h2>
            <form onSubmit={handleSaveCat}>
              <div className="field" style={{margin: '20px 0'}}>
                <label>Nome da Categoria</label>
                <input name="nomeCat" defaultValue={editingCat?.nome} required />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                <button type="button" onClick={() => setIsCatModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-new">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHAMADO - COM CATEGORIAS DO BANCO */}
      {isTicketModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>{editingTicket ? `Editar Chamado ${editingTicket.id}` : 'Abertura de Chamado'}</h2>
            <form onSubmit={handleSaveTicket}>
              <div className="field-group">
                <div className="field" style={{gridColumn: 'span 2'}}>
                  <label>1. Selecionar Cliente</label>
                  <select name="clientDbId" required value={tempClientId} onChange={handleClientChange}>
                    <option value="">-- Selecione o Cliente --</option>
                    <option value="avulso" style={{fontWeight:'bold', color:'#3498db'}}>+ NOVO / AVULSO</option>
                    {clientes.map(c => <option key={c.dbId} value={c.dbId}>{c.nome}</option>)}
                  </select>
                </div>
                {tempClientId === "avulso" && (
                  <div style={{gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    <div className="field"><label>Nome</label><input name="nomeAvulso" required /></div>
                    <div className="field"><label>WhatsApp</label><input name="whatsAvulso" /></div>
                    <div className="field" style={{gridColumn: 'span 2'}}><label>Endereço</label><input name="enderecoAvulso" /></div>
                  </div>
                )}
                <div className="field" style={{gridColumn: 'span 2'}}>
                  <label>2. Categoria (Vindo do Banco)</label>
                  <select name="categoria" required defaultValue={editingTicket?.categoria || ""}>
                    <option value="">-- Selecione --</option>
                    {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                  </select>
                </div>
                <div className="field" style={{gridColumn: 'span 2'}}><label>3. Motivo</label><input name="motivo" required defaultValue={editingTicket?.motivo} /></div>
                <div className="field"><label>PPPoE</label><input name="pppoe" value={tempPppoe} readOnly /></div>
                <div className="field"><label>Contrato</label><input name="contratoMhnet" value={tempContrato} readOnly /></div>
                <div className="field" style={{gridColumn: 'span 2'}}><label>Observações</label><textarea name="obs" defaultValue={editingTicket?.obs} style={{height: '60px'}} /></div>
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <button type="button" onClick={() => setIsTicketModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-new">Salvar Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}