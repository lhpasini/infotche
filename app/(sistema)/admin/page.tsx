'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Importações do Banco de Dados
import { getCategorias, upsertCategoria, deleteCategoria } from '../../actions/categorias';
import { getClientes, createCliente, updateCliente, deleteCliente, addConexao, updateConexao, deleteConexao } from '../../actions/clientes';

// --- Tipagens ---
type Conexao = { id: string; contratoMhnet: string | null; endereco: string; bairro: string | null; pppoe: string | null; senhaPpoe: string | null; };
type Cliente = { id: string; nome: string; cpfCnpj: string | null; email: string | null; whatsapp: string | null; status: string; conexoes: Conexao[]; };
type Categoria = { id: string; nome: string; };
type Ticket = { 
  id: string; clientDbId: string; clientName: string; clientWhats: string; enderecoCompleto: string; 
  technician: string; categoria: string; motivo: string; pppoe: string; senhaPpoe: string; contratoMhnet: string;
  obs: string; time: string; timestamp: number; priority: 'Alta' | 'Média' | 'Baixa'; status: 'novos' | 'agendados' | 'andamento' | 'concluidos'; 
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clientes' | 'categorias' | 'relatorios' | 'historico'>('dashboard');
  
  // Modais e Estados de Controle
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null); 
  
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isConexaoModalOpen, setIsConexaoModalOpen] = useState(false);
  const [editingConexao, setEditingConexao] = useState<Conexao | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Estados dos Campos do Modal de Chamado
  const [tempClientId, setTempClientId] = useState("");
  const [tempConexaoId, setTempConexaoId] = useState("");
  const [tempPppoe, setTempPppoe] = useState("");
  const [tempSenha, setTempSenha] = useState("");
  const [tempContrato, setTempContrato] = useState("");

  // --- Estados de Filtro e Busca Global ---
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);

  // --- Estados vindos do Banco de Dados ---
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Carregar Dados
  useEffect(() => {
    async function loadData() {
      const cats = await getCategorias();
      const clis = await getClientes();
      setCategorias(cats as Categoria[]);
      setClientes(clis as Cliente[]);
      setLoading(false);
    }
    loadData();
  }, []);

  // --- LÓGICA DE FILTRAGEM DOS ATENDIMENTOS ---
  const ticketsFiltrados = tickets.filter(t => {
    if (buscaGlobal.trim() !== "") {
      const termo = buscaGlobal.toLowerCase();
      return (
        t.clientName.toLowerCase().includes(termo) ||
        (t.pppoe && t.pppoe.toLowerCase().includes(termo)) ||
        (t.enderecoCompleto && t.enderecoCompleto.toLowerCase().includes(termo)) ||
        t.id.toLowerCase().includes(termo) ||
        t.motivo.toLowerCase().includes(termo)
      );
    }
    const tDate = new Date(t.timestamp);
    const inicio = new Date(dataInicio + "T00:00:00");
    const fim = new Date(dataFim + "T23:59:59");
    return tDate >= inicio && tDate <= fim;
  });

  // --- Funções de Categoria ---
  const handleSaveCat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await upsertCategoria(editingCat?.id || null, formData.get('nomeCat') as string);
    setCategorias(await getCategorias() as Categoria[]);
    setIsCatModalOpen(false);
    setEditingCat(null);
  };
  const handleDeleteCat = async (id: string) => {
    if(confirm('Deseja excluir esta categoria do banco?')) {
      await deleteCategoria(id);
      setCategorias(categorias.filter(c => c.id !== id));
    }
  };

  // --- Funções de Cliente e Conexão ---
  const handleSaveCliente = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dadosCliente = { nome: formData.get('nome') as string, cpfCnpj: formData.get('cpfCnpj') as string, whatsapp: formData.get('whatsapp') as string, email: formData.get('email') as string };

    if (editingCliente) {
      await updateCliente(editingCliente.id, dadosCliente);
      alert("Dados pessoais atualizados com sucesso!");
    } else {
      const dadosConexao = { endereco: formData.get('endereco') as string, bairro: formData.get('bairro') as string, contratoMhnet: formData.get('contratoMhnet') as string, pppoe: formData.get('pppoe') as string, senhaPpoe: formData.get('senhaPpoe') as string };
      await createCliente(dadosCliente, dadosConexao);
      setIsClientModalOpen(false); 
    }
    setClientes(await getClientes() as Cliente[]);
  };

  const handleDeleteCliente = async (id: string) => {
    if(confirm('ATENÇÃO: Apagar este cliente também apagará todas as conexões dele. Deseja continuar?')) {
      await deleteCliente(id);
      setClientes(clientes.filter(c => c.id !== id));
    }
  };

  const handleSaveConexao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCliente) return;
    const formData = new FormData(e.currentTarget);
    const dadosConexao = { endereco: formData.get('endereco') as string, bairro: formData.get('bairro') as string, contratoMhnet: formData.get('contratoMhnet') as string, pppoe: formData.get('pppoe') as string, senhaPpoe: formData.get('senhaPpoe') as string };

    if (editingConexao) await updateConexao(editingConexao.id, dadosConexao);
    else await addConexao(editingCliente.id, dadosConexao);
    
    const atualizados = await getClientes() as Cliente[];
    setClientes(atualizados);
    
    const clienteAtualizado = atualizados.find(c => c.id === editingCliente.id);
    if (clienteAtualizado) setEditingCliente(clienteAtualizado);
    
    setIsConexaoModalOpen(false);
    setEditingConexao(null);
  };

  const handleDeleteConexao = async (conexaoId: string) => {
    if(confirm('Deseja excluir esta conexão?')) {
      await deleteConexao(conexaoId);
      const atualizados = await getClientes() as Cliente[];
      setClientes(atualizados);
      if (editingCliente) setEditingCliente(atualizados.find(c => c.id === editingCliente.id) || null);
    }
  };

  // --- Funções Kanban / Chamados ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move"; 
    e.dataTransfer.setData('text/plain', id); 
    setDraggedTicketId(id);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: Ticket['status']) => {
    e.preventDefault();
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
    setTempConexaoId(""); 
    
    if (id && id !== 'avulso') {
      const cli = clientes.find(c => c.id === id);
      if (cli && cli.conexoes.length === 1) {
        const con = cli.conexoes[0];
        setTempConexaoId(con.id);
        setTempPppoe(con.pppoe || "");
        setTempSenha(con.senhaPpoe || "");
        setTempContrato(con.contratoMhnet || "");
      } else {
        setTempPppoe(""); setTempSenha(""); setTempContrato("");
      }
    } else {
      setTempPppoe(""); setTempSenha(""); setTempContrato("");
    }
  };

  const handleConexaoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const conId = e.target.value;
    setTempConexaoId(conId);
    const cli = clientes.find(c => c.id === tempClientId);
    const con = cli?.conexoes.find(c => c.id === conId);
    
    if (con) {
      setTempPppoe(con.pppoe || "");
      setTempSenha(con.senhaPpoe || "");
      setTempContrato(con.contratoMhnet || "");
    } else {
      setTempPppoe(""); setTempSenha(""); setTempContrato("");
    }
  };

  const handleSaveTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = formData.get('clientDbId') as string;
    const isAvulso = clientId === "avulso";
    const cliente = isAvulso ? null : clientes.find(c => c.id === clientId);

    const conexaoSelecionada = cliente?.conexoes.find(c => c.id === tempConexaoId);
    const enderecoCompleto = isAvulso 
      ? (formData.get('enderecoAvulso') as string) 
      : (conexaoSelecionada ? `${conexaoSelecionada.endereco} - ${conexaoSelecionada.bairro || ''}` : '');

    const ticketData: Ticket = {
      id: editingTicket ? editingTicket.id : `#${Math.floor(1000 + Math.random() * 9000)}`,
      clientDbId: clientId,
      clientName: isAvulso ? (formData.get('nomeAvulso') as string) : (cliente?.nome || 'Avulso'),
      clientWhats: isAvulso ? (formData.get('whatsAvulso') as string) : (cliente?.whatsapp || ''),
      enderecoCompleto: enderecoCompleto,
      technician: formData.get('technician') as string,
      categoria: formData.get('categoria') as string,
      motivo: formData.get('motivo') as string,
      pppoe: tempPppoe, 
      senhaPpoe: tempSenha,
      contratoMhnet: tempContrato,
      obs: formData.get('obs') as string,
      priority: formData.get('priority') as 'Alta' | 'Média' | 'Baixa',
      time: editingTicket ? editingTicket.time : new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      timestamp: editingTicket ? editingTicket.timestamp : Date.now(),
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
    
    const cli = clientes.find(c => c.id === t.clientDbId);
    if (cli) {
      const con = cli.conexoes.find(c => c.pppoe === t.pppoe || (c.endereco && t.enderecoCompleto.includes(c.endereco)));
      if (con) setTempConexaoId(con.id);
      else setTempConexaoId("");
    }
    
    setIsTicketModalOpen(true);
  };

  return (
    <div className="app-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .app-container { display: flex; height: 100vh; background: #eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
        .sidebar { width: 140px; background: #fff; border-right: 1px solid #dce3e8; padding-top: 20px; flex-shrink: 0; display: block; overflow-y: auto; }
        .logo-container { width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 30px; }
        .logo-img { width: 80px; height: auto; object-fit: contain; margin-bottom: 5px; }
        .logo-subtext { font-size: 9px; color: #7f8c8d; font-weight: bold; text-transform: uppercase; text-align: center; }
        .nav-links { width: 100%; display: block; }
        .nav-item { display: flex; flex-direction: column; align-items: center; width: 100%; padding: 12px 0; color: #7f8c8d; font-size: 11px; font-weight: 600; cursor: pointer; border-left: 4px solid transparent; transition: 0.2s; margin-bottom: 5px; }
        .nav-item:hover { color: #3498db; background: #f9fbfc; }
        .nav-item.active { color: #3498db; background: #f0f7ff; border-left-color: #3498db; }
        .nav-icon { font-size: 18px; margin-bottom: 4px; }
        
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 60px; background: #fff; border-bottom: 1px solid #dce3e8; display: flex; align-items: center; padding: 0 30px; gap: 20px; flex-shrink: 0; }
        .search-input { background: #f4f7f9; border: 1px solid #dfe6ed; padding: 8px 15px; border-radius: 6px; font-size: 12px; width: 280px; transition: 0.2s; }
        .search-input:focus { outline: none; border-color: #3498db; background: #fff; box-shadow: 0 0 0 3px rgba(52,152,219,0.1); }
        
        .board-header { padding: 20px 30px; display: flex; align-items: center; }
        .board-header h1 { font-size: 20px; color: #2c3e50; font-weight: 800; }
        
        .kanban { display: flex; gap: 15px; padding: 0 30px 25px; overflow-x: auto; flex: 1; align-items: flex-start; }
        .column { background: #dce3e8; width: 320px; border-radius: 8px; flex-shrink: 0; display: flex; flex-direction: column; max-height: 100%; }
        .col-title { padding: 12px 15px; color: white; font-weight: bold; font-size: 11px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; }
        .bg-blue { background: #3498db; } .bg-orange { background: #f39c12; } .bg-cyan { background: #1abc9c; } .bg-green { background: #2ecc71; }
        
        .kanban-card { background: white; margin: 10px; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; border-left: 4px solid transparent; display: flex; flex-direction: column; gap: 6px; }
        .card-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 2px; }
        .prot-badge { font-size: 10px; font-weight: bold; color: #7f8c8d; background: #f4f7f9; padding: 2px 6px; border-radius: 4px; }
        .card-actions button { background: none; border: none; cursor: pointer; font-size: 13px; opacity: 0.6; margin-left: 5px; }
        .card-actions button:hover { opacity: 1; }
        .card-client { font-size: 14px; font-weight: 800; color: #2c3e50; }
        .card-whats { font-size: 11px; color: #27ae60; font-weight: bold; }
        .card-cat { font-size: 11px; font-weight: 700; color: #3498db; text-transform: uppercase; }
        .card-desc { font-size: 12px; color: #4a5568; line-height: 1.3; background: #f8fafc; padding: 6px; border-radius: 4px; }
        .card-footer { display: flex; justify-content: space-between; font-size: 10px; color: #95a5a6; font-weight: bold; margin-top: 4px; }
        .card-details { background: #f8fafc; border-top: 1px solid #edf2f7; padding: 10px; font-size: 11px; color: #4a5568; margin-top: 8px; border-radius: 4px; }
        .detail-line { margin-bottom: 4px; display: flex; justify-content: space-between; }
        
        .btn-new { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; transition: 0.2s; }
        .btn-new:hover { opacity: 0.9; }
        .btn-green { background: #27ae60; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; overflow-y: auto; }
        .modal-box { background: white; padding: 25px; border-radius: 8px; width: 600px; max-height: 95vh; overflow-y: auto; position: relative; }
        .btn-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 20px; font-weight: bold; color: #bdc3c7; cursor: pointer; transition: 0.2s; }
        .btn-close:hover { color: #e74c3c; }

        .field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        .field label { font-size: 10px; font-weight: bold; color: #7f8c8d; text-transform: uppercase; }
        .field input, .field select, .field textarea { padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px; overflow: hidden; }
        .data-table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; color: #7f8c8d; border-bottom: 2px solid #eef2f5; }
        .data-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
      `}} />

      <aside className="sidebar">
        <div className="logo-container">
          <img src="/logo-admin.png" alt="Infotchê" className="logo-img" />
          <span className="logo-subtext">Infotchê / Mhnet</span>
        </div>
        <div className="nav-links">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><span className="nav-icon">📊</span>Dashboard</div>
          <div className={`nav-item ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')}><span className="nav-icon">🗂️</span>Atendimentos</div>
          <div className={`nav-item ${activeTab === 'clientes' ? 'active' : ''}`} onClick={() => setActiveTab('clientes')}><span className="nav-icon">👥</span>Clientes</div>
          <div className={`nav-item ${activeTab === 'categorias' ? 'active' : ''}`} onClick={() => setActiveTab('categorias')}><span className="nav-icon">🏷️</span>Categorias</div>
          <div className={`nav-item ${activeTab === 'relatorios' ? 'active' : ''}`} onClick={() => setActiveTab('relatorios')}><span className="nav-icon">📈</span>Relatórios</div>
        </div>
      </aside>

      <div className="main">
        <header className="top-nav">
          <input 
            className="search-input" 
            placeholder="🔍 Buscar cliente, rua, pppoe, chamado..." 
            value={buscaGlobal}
            onChange={(e) => {
              setBuscaGlobal(e.target.value);
              if (e.target.value.trim() !== "" && activeTab !== 'historico') {
                setActiveTab('historico');
              }
            }}
          />
          <div style={{flex:1}}></div>
          <button onClick={() => router.push('/login')} style={{background:'none', border:'none', color:'#95a5a6', fontWeight:'bold', cursor:'pointer'}}>SAIR</button>
        </header>

        {/* --- ABA DASHBOARD (KANBAN) --- */}
        {activeTab === 'dashboard' && (
          <>
            <div className="board-header" style={{ justifyContent: 'flex-start', gap: '15px' }}>
              <h1>Gestão Atendimentos</h1>
              <button className="btn-new" onClick={() => { 
                setEditingTicket(null); setTempClientId(""); setTempConexaoId(""); setTempPppoe(""); setTempSenha(""); setTempContrato(""); setIsTicketModalOpen(true); 
              }}>+ NOVO CHAMADO</button>
              
              <button className="btn-new btn-green" onClick={() => { setEditingCliente(null); setIsClientModalOpen(true); }}>
                + NOVO CLIENTE
              </button>
            </div>
            
            <main className="kanban">
              {['novos', 'agendados', 'andamento', 'concluidos'].map(status => (
                <div 
                  key={status} 
                  className="column" 
                  onDragOver={handleDragOver} 
                  onDragEnter={handleDragEnter}
                  onDrop={(e) => handleDrop(e, status as any)}
                >
                  <div className={`col-title ${status === 'novos' ? 'bg-blue' : status === 'agendados' ? 'bg-orange' : status === 'andamento' ? 'bg-cyan' : 'bg-green'}`}>
                    <span>{status.toUpperCase()}</span>
                    <span>{ticketsFiltrados.filter(t => t.status === status).length}</span>
                  </div>
                  <div style={{overflowY:'auto', flex:1}}>
                    {ticketsFiltrados.filter(t => t.status === status).map(t => (
                      <div 
                        key={t.id} 
                        className="kanban-card" 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, t.id)} 
                        onClick={() => setExpandedTicketId(expandedTicketId === t.id ? null : t.id)}
                      >
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
                        
                        {/* AQUI ESTÁ A SUA MORDOMIA DE VOLTA! */}
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

        {/* --- NOVA ABA DE HISTÓRICO DE ATENDIMENTOS --- */}
        {activeTab === 'historico' && (
          <div style={{padding: '30px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto'}}>
            <div className="board-header" style={{padding: 0, justifyContent: 'space-between', marginBottom: '20px'}}>
              <div>
                <h1>Lista de Atendimentos</h1>
                <p style={{fontSize: '12px', color: '#7f8c8d', marginTop: '5px'}}>
                  {buscaGlobal ? `Exibindo resultados para: "${buscaGlobal}" (Filtro de datas ignorado)` : 'Exibindo chamados baseados no filtro de datas.'}
                </p>
              </div>
              
              <div style={{display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px 15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#2c3e50'}}>Período:</label>
                <input 
                  type="date" 
                  value={dataInicio} 
                  onChange={e => setDataInicio(e.target.value)} 
                  disabled={buscaGlobal.trim() !== ""}
                  style={{padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', opacity: buscaGlobal ? 0.5 : 1}} 
                />
                <span style={{color: '#7f8c8d', fontSize: '12px'}}>até</span>
                <input 
                  type="date" 
                  value={dataFim} 
                  onChange={e => setDataFim(e.target.value)} 
                  disabled={buscaGlobal.trim() !== ""}
                  style={{padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', opacity: buscaGlobal ? 0.5 : 1}} 
                />
              </div>
            </div>

            {ticketsFiltrados.length === 0 ? (
              <p style={{textAlign: 'center', marginTop: '50px', color: '#7f8c8d'}}>Nenhum atendimento encontrado para estes filtros.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PROTOCOLO</th>
                    <th>DATA</th>
                    <th>CLIENTE / LOCAL</th>
                    <th>CATEGORIA / MOTIVO</th>
                    <th>STATUS</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsFiltrados.map(t => (
                    <tr key={t.id}>
                      <td style={{fontWeight: 'bold', color: '#3498db'}}>{t.id}</td>
                      <td style={{fontSize: '12px'}}>{t.time}</td>
                      <td>
                        <span style={{fontWeight: 'bold', display: 'block'}}>{t.clientName}</span>
                        <span style={{fontSize: '11px', color: '#7f8c8d'}}>{t.pppoe || t.enderecoCompleto}</span>
                      </td>
                      <td>
                        <span style={{fontSize: '11px', background: '#eef2f5', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>{t.categoria}</span>
                        <div style={{fontSize: '12px', marginTop: '4px'}}>{t.motivo}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', color: 'white',
                          background: t.status === 'novos' ? '#3498db' : t.status === 'agendados' ? '#f39c12' : t.status === 'andamento' ? '#1abc9c' : '#2ecc71'
                        }}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => openEditModal(t)} style={{cursor:'pointer', background:'none', border:'none', marginRight: '10px'}} title="Ver Detalhes">🔍</button>
                        <button onClick={() => handleDeleteTicket(t.id)} style={{cursor:'pointer', background:'none', border:'none'}} title="Apagar Chamado">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* --- ABA DE CLIENTES --- */}
        {activeTab === 'clientes' && (
          <div style={{padding: '30px'}}>
            <div className="board-header" style={{padding: 0, justifyContent: 'space-between', marginBottom: '20px'}}>
              <h1>Carteira de Clientes</h1>
              <button className="btn-new btn-green" onClick={() => { setEditingCliente(null); setIsClientModalOpen(true); }}>+ NOVO CLIENTE</button>
            </div>
            {loading ? <p>Carregando clientes...</p> : clientes.length === 0 ? <p>Nenhum cliente cadastrado ainda.</p> : (
              <table className="data-table">
                <thead><tr><th>NOME</th><th>CONTATO</th><th>CONTRATOS</th><th>AÇÕES</th></tr></thead>
                <tbody>
                  {clientes.map(cli => (
                    <tr key={cli.id}>
                      <td style={{fontWeight: 'bold'}}>{cli.nome}</td>
                      <td>{cli.whatsapp || cli.email || 'S/ Contato'}</td>
                      <td>
                        <span style={{fontSize:'11px', background:'#eef2f5', padding:'4px', borderRadius:'4px', fontWeight:'bold'}}>
                          {cli.conexoes.length} {cli.conexoes.length === 1 ? 'Instalação' : 'Instalações'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => { setEditingCliente(cli); setIsClientModalOpen(true); }} style={{marginRight: '10px', cursor:'pointer', background:'none', border:'none'}} title="Editar Cliente">✏️</button>
                        <button onClick={() => handleDeleteCliente(cli.id)} style={{cursor:'pointer', background:'none', border:'none'}} title="Apagar Cliente">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* --- ABA DE CATEGORIAS --- */}
        {activeTab === 'categorias' && (
          <div style={{padding: '30px'}}>
            <div className="board-header" style={{padding: 0, justifyContent: 'space-between', marginBottom: '20px'}}>
              <h1>Categorias de Serviço</h1>
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
                        <button onClick={() => { setEditingCat(cat); setIsCatModalOpen(true); }} style={{marginRight: '10px', cursor:'pointer', background:'none', border:'none'}}>✏️</button>
                        <button onClick={() => handleDeleteCat(cat.id)} style={{cursor:'pointer', background:'none', border:'none'}}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL DE CLIENTE (CRIAR E EDITAR) --- */}
      {isClientModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{width: '700px'}}>
            <button type="button" className="btn-close" onClick={() => setIsClientModalOpen(false)}>✖</button>
            
            <h2>{editingCliente ? `Editar Cliente: ${editingCliente.nome}` : 'Cadastrar Novo Cliente'}</h2>
            
            <form onSubmit={handleSaveCliente}>
              <h3 style={{fontSize:'13px', color:'#3498db', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'15px', marginBottom:'10px'}}>Dados Pessoais</h3>
              <div className="field-group">
                <div className="field" style={{gridColumn: 'span 2'}}><label>Nome Completo / Empresa *</label><input name="nome" required defaultValue={editingCliente?.nome} /></div>
                <div className="field"><label>CPF / CNPJ</label><input name="cpfCnpj" defaultValue={editingCliente?.cpfCnpj || ''} /></div>
                <div className="field"><label>WhatsApp</label><input name="whatsapp" defaultValue={editingCliente?.whatsapp || ''} /></div>
                <div className="field" style={{gridColumn: 'span 2'}}><label>Email</label><input type="email" name="email" defaultValue={editingCliente?.email || ''} /></div>
              </div>

              {!editingCliente && (
                <>
                  <h3 style={{fontSize:'13px', color:'#3498db', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'20px', marginBottom:'10px'}}>Dados da Conexão (Mhnet)</h3>
                  <div className="field-group">
                    <div className="field" style={{gridColumn: 'span 2'}}><label>Endereço de Instalação *</label><input name="endereco" required /></div>
                    <div className="field"><label>Bairro</label><input name="bairro" /></div>
                    <div className="field"><label>Nº Contrato Mhnet</label><input name="contratoMhnet" /></div>
                    <div className="field"><label>Login PPPoE</label><input name="pppoe" /></div>
                    <div className="field"><label>Senha PPPoE</label><input name="senhaPpoe" /></div>
                  </div>
                </>
              )}

              <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'15px'}}>
                {!editingCliente && <button type="button" onClick={() => setIsClientModalOpen(false)} style={{padding:'8px 15px', border:'none', borderRadius:'4px', cursor:'pointer'}}>Cancelar</button>}
                <button type="submit" className="btn-new">{editingCliente ? 'Atualizar Dados Pessoais' : 'Salvar Cliente'}</button>
              </div>
            </form>

            {editingCliente && (
              <>
                <div style={{marginTop: '30px', borderTop: '2px dashed #ddd', paddingTop: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <h3 style={{fontSize:'14px', color:'#2c3e50', margin:0}}>Endereços / Conexões</h3>
                    <button className="btn-new" style={{padding: '6px 12px', fontSize: '11px'}} onClick={() => { setEditingConexao(null); setIsConexaoModalOpen(true); }}>
                      + ADICIONAR CONEXÃO
                    </button>
                  </div>
                  
                  {editingCliente.conexoes.length === 0 ? (
                    <p style={{fontSize:'12px', color:'#7f8c8d'}}>Nenhuma conexão cadastrada para este cliente.</p>
                  ) : (
                    <table className="data-table" style={{marginTop: 0}}>
                      <thead><tr><th>ENDEREÇO</th><th>PPPoE / CONTRATO</th><th>AÇÕES</th></tr></thead>
                      <tbody>
                        {editingCliente.conexoes.map(con => (
                          <tr key={con.id}>
                            <td><span style={{fontWeight:'bold', fontSize:'12px'}}>{con.endereco}</span><br/><span style={{fontSize:'11px', color:'#7f8c8d'}}>{con.bairro}</span></td>
                            <td style={{fontSize:'12px'}}>{con.pppoe || 'S/ PPPoE'} <br/> <span style={{color:'#95a5a6'}}>Contrato: {con.contratoMhnet || 'N/A'}</span></td>
                            <td>
                              <button onClick={() => { setEditingConexao(con); setIsConexaoModalOpen(true); }} style={{cursor:'pointer', background:'none', border:'none', marginRight: '8px'}} title="Editar Conexão">✏️</button>
                              <button onClick={() => handleDeleteConexao(con.id)} style={{cursor:'pointer', background:'none', border:'none'}} title="Apagar Conexão">🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', justifyContent: 'center'}}>
                  <button type="button" className="btn-new btn-green" style={{width: '100%', fontSize: '14px', padding: '12px'}} onClick={() => setIsClientModalOpen(false)}>
                    Tudo Certo! Concluir e Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- MINI MODAL: ADICIONAR / EDITAR CONEXÃO --- */}
      {isConexaoModalOpen && (
        <div className="modal-overlay" style={{zIndex: 2000}}>
          <div className="modal-box" style={{width: '500px'}}>
            <button type="button" className="btn-close" onClick={() => { setIsConexaoModalOpen(false); setEditingConexao(null); }}>✖</button>
            <h2>{editingConexao ? 'Editar Conexão' : `Nova Conexão para ${editingCliente?.nome}`}</h2>
            <form onSubmit={handleSaveConexao}>
              <div className="field-group">
                <div className="field" style={{gridColumn: 'span 2'}}><label>Endereço de Instalação *</label><input name="endereco" required defaultValue={editingConexao?.endereco || ''} /></div>
                <div className="field"><label>Bairro</label><input name="bairro" defaultValue={editingConexao?.bairro || ''} /></div>
                <div className="field"><label>Nº Contrato Mhnet</label><input name="contratoMhnet" defaultValue={editingConexao?.contratoMhnet || ''} /></div>
                <div className="field"><label>Login PPPoE</label><input name="pppoe" defaultValue={editingConexao?.pppoe || ''} /></div>
                <div className="field"><label>Senha PPPoE</label><input name="senhaPpoe" defaultValue={editingConexao?.senhaPpoe || ''} /></div>
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px'}}>
                <button type="button" onClick={() => { setIsConexaoModalOpen(false); setEditingConexao(null); }} style={{padding:'8px 15px', border:'none', borderRadius:'4px', cursor:'pointer'}}>Cancelar</button>
                <button type="submit" className="btn-new">Salvar Conexão</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATEGORIA (Z-INDEX ALTO PARA ABRIR POR CIMA DO CHAMADO SE NECESSÁRIO) */}
      {isCatModalOpen && (
        <div className="modal-overlay" style={{zIndex: 3000}}>
          <div className="modal-box" style={{width: '400px'}}>
            <button type="button" className="btn-close" onClick={() => setIsCatModalOpen(false)}>✖</button>
            <h2>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</h2>
            <form onSubmit={handleSaveCat}>
              <div className="field" style={{margin: '20px 0'}}>
                <label>Nome da Categoria</label>
                <input name="nomeCat" defaultValue={editingCat?.nome} required />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                <button type="button" onClick={() => setIsCatModalOpen(false)} style={{padding:'8px 15px', border:'none', borderRadius:'4px', cursor:'pointer'}}>Cancelar</button>
                <button type="submit" className="btn-new">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CHAMADO (REFINADO CONFORME PEDIDO) --- */}
      {isTicketModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button type="button" className="btn-close" onClick={() => setIsTicketModalOpen(false)}>✖</button>
            <h2>{editingTicket ? `Editar Chamado ${editingTicket.id}` : 'Abertura de Chamado'}</h2>
            <form onSubmit={handleSaveTicket}>
              <div className="field-group">
                
                <div className="field" style={{gridColumn: 'span 2'}}>
                  <label>Selecionar Cliente</label>
                  <select name="clientDbId" required value={tempClientId} onChange={handleClientChange}>
                    <option value="">-- Selecione o Cliente --</option>
                    <option value="avulso" style={{fontWeight:'bold', color:'#3498db'}}>+ NOVO / AVULSO</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                {tempClientId === "avulso" && (
                  <div style={{gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    <div className="field"><label>Nome</label><input name="nomeAvulso" required /></div>
                    <div className="field"><label>WhatsApp</label><input name="whatsAvulso" /></div>
                    <div className="field" style={{gridColumn: 'span 2'}}><label>Endereço</label><input name="enderecoAvulso" /></div>
                  </div>
                )}

                {/* Exibe o seletor de Instalação e o botão "+ Nova Instalação" se um cliente for escolhido */}
                {tempClientId !== "" && tempClientId !== "avulso" && (
                  <div className="field" style={{gridColumn: 'span 2'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <label>Qual endereço / Instalação?</label>
                      <button 
                        type="button" 
                        onClick={() => { 
                          const cli = clientes.find(c => c.id === tempClientId);
                          if(cli) {
                            setEditingCliente(cli); 
                            setEditingConexao(null); 
                            setIsConexaoModalOpen(true); 
                          }
                        }} 
                        style={{background:'none', border:'none', color:'#3498db', fontSize:'11px', fontWeight:'bold', cursor:'pointer'}}
                      >
                        + Nova Instalação
                      </button>
                    </div>
                    <select value={tempConexaoId} onChange={handleConexaoChange} required>
                      <option value="">-- Selecione a Instalação --</option>
                      {clientes.find(c => c.id === tempClientId)?.conexoes.map(con => (
                        <option key={con.id} value={con.id}>{con.endereco} {con.pppoe ? `(${con.pppoe})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field" style={{gridColumn: 'span 2'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <label>Categoria</label>
                    <button type="button" onClick={() => { setIsCatModalOpen(true); setEditingCat(null); }} style={{background:'none', border:'none', color:'#3498db', fontSize:'11px', fontWeight:'bold', cursor:'pointer'}}>+ Nova Categoria</button>
                  </div>
                  <select name="categoria" required defaultValue={editingTicket?.categoria || ""}>
                    <option value="">-- Selecione --</option>
                    {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                  </select>
                </div>
                
                <div className="field" style={{gridColumn: 'span 2'}}>
                  <label>Descrição do problema</label>
                  <input name="motivo" required defaultValue={editingTicket?.motivo} />
                </div>

                {/* Campos liberados para preenchimento ou edição rápida */}
                <div className="field"><label>PPPoE</label><input name="pppoe" value={tempPppoe} onChange={e => setTempPppoe(e.target.value)} /></div>
                <div className="field"><label>Senha PPPoE</label><input name="senhaPpoe" value={tempSenha} onChange={e => setTempSenha(e.target.value)} /></div>
                <div className="field"><label>Contrato Mhnet</label><input name="contratoMhnet" value={tempContrato} onChange={e => setTempContrato(e.target.value)} /></div>
                
                <div className="field" style={{gridColumn: 'span 2'}}><label>Observações</label><textarea name="obs" defaultValue={editingTicket?.obs} style={{height: '60px'}} /></div>
              </div>
              
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <button type="button" onClick={() => setIsTicketModalOpen(false)} style={{padding:'8px 15px', border:'none', borderRadius:'4px', cursor:'pointer'}}>Cancelar</button>
                <button type="submit" className="btn-new">Salvar Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}