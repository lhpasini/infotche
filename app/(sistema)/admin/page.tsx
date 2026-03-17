'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getCategorias, upsertCategoria, deleteCategoria } from '../../actions/categorias';
import { getClientes, createCliente, updateCliente, deleteCliente, addConexao, updateConexao, deleteConexao } from '../../actions/clientes';
import { getChamados, createChamado, updateChamadoStatus, updateChamado, deleteChamado } from '../../actions/chamados';
import { importarHistoricoLegado, buscarHistoricoLegado, getUltimosLegado, limparHistoricoLegado } from '../../actions/legado';
import { fazerLogout, getSessao } from '../../actions/auth';
import { getUsuarios, upsertUsuario, deleteUsuario, atualizarMeuPerfil } from '../../actions/usuarios';
import { TabelaClientes } from './components/TabelaClientes';
import { KanbanBoard } from './components/KanbanBoard';

type Conexao = { id: string; contratoMhnet: string | null; endereco: string; bairro: string | null; pppoe: string | null; senhaPpoe: string | null; };
type Cliente = { id: string; nome: string; cpfCnpj: string | null; email: string | null; whatsapp: string | null; status: string; conexoes: Conexao[]; cidade: string | null; };
type Categoria = { id: string; nome: string; };
type Ticket = { 
  id: string; protocolo: string; clienteId: string | null; conexaoId: string | null; nomeCliente: string; whatsCliente: string | null; enderecoCompleto: string; cidadeCliente: string | null; 
  tecnico: string | null; categoria: string; motivo: string; pppoe: string | null; senhaPpoe: string | null; contratoMhnet: string | null;
  obs: string | null; abertoPor: string | null; resolucao: string | null; prioridade: string; criadoEm: any; atualizadoEm?: any; status: string; 
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clientes' | 'categorias' | 'relatorios' | 'historico' | 'usuarios'>('dashboard');
  
  const [usuarioLogado, setUsuarioLogado] = useState<{id: string, nome: string, role: string} | null>(null);
  const isAdmin = usuarioLogado?.role === 'ADMIN'; 

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null); 
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isConexaoModalOpen, setIsConexaoModalOpen] = useState(false);
  const [editingConexao, setEditingConexao] = useState<Conexao | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const [clientSearch, setClientSearch] = useState("");
  const [tempClientId, setTempClientId] = useState("");
  const [tempConexaoId, setTempConexaoId] = useState("");
  const [tempPppoe, setTempPppoe] = useState("");
  const [tempSenha, setTempSenha] = useState("");
  const [tempContrato, setTempContrato] = useState("");

  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [dataInicio, setDataInicio] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);

  const [relStatus, setRelStatus] = useState<'todos' | 'abertos' | 'concluidos'>('todos');
  const [relCats, setRelCats] = useState<string[]>([]);
  const [relTecs, setRelTecs] = useState<string[]>([]);

  // ESTADOS DO ARQUIVO MORTO
  const [abaHistorico, setAbaHistorico] = useState<'sistema' | 'legado'>('sistema');
  const [legadoBusca, setLegadoBusca] = useState("");
  const [legadoResultados, setLegadoResultados] = useState<any[]>([]);
  const [legadoLimit, setLegadoLimit] = useState<number | 'todos'>(100);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedLegadoId, setExpandedLegadoId] = useState<string | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  type Usuario = { id: string; nome: string; login: string; role: string; senha?: string; };
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    const [cats, clis, tks, usrs, sessao] = await Promise.all([ getCategorias(), getClientes(), getChamados(), getUsuarios(), getSessao() ]);
    setCategorias(cats as Categoria[]); setClientes(clis as Cliente[]); setTickets(tks as any[]); setUsuarios(usrs as Usuario[]); setUsuarioLogado(sessao);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const carregarUltimosLegado = async (limite: number | 'todos') => {
    const ultimos = await getUltimosLegado(limite);
    setLegadoResultados(ultimos);
  };

  useEffect(() => {
    if (activeTab === 'historico' && abaHistorico === 'legado' && legadoBusca === '') {
      carregarUltimosLegado(legadoLimit);
    }
  }, [activeTab, abaHistorico, legadoLimit]);

  const ticketsFiltrados = tickets.filter(t => {
    if (buscaGlobal.trim() !== "") {
      const termo = buscaGlobal.toLowerCase();
      return (t.nomeCliente.toLowerCase().includes(termo) || t.pppoe?.toLowerCase().includes(termo) || t.enderecoCompleto?.toLowerCase().includes(termo) || t.protocolo.toLowerCase().includes(termo));
    }
    const tDate = new Date(t.criadoEm);
    return tDate >= new Date(dataInicio + "T00:00:00") && tDate <= new Date(dataFim + "T23:59:59");
  });

  const todosTecnicos = Array.from(new Set(ticketsFiltrados.map(t => t.tecnico || 'Sem Técnico')));
  
  const ticketsRelatorio = ticketsFiltrados.filter(t => {
    if (relStatus === 'abertos' && t.status === 'concluidos') return false;
    if (relStatus === 'concluidos' && t.status !== 'concluidos') return false;
    if (relCats.length > 0 && !relCats.includes(t.categoria)) return false;
    if (relTecs.length > 0 && !relTecs.includes(t.tecnico || 'Sem Técnico')) return false;
    return true;
  });

  const chamadosPorCategoria = ticketsRelatorio.reduce((acc, t) => { acc[t.categoria] = (acc[t.categoria] || 0) + 1; return acc; }, {} as Record<string, number>);
  const chamadosPorTecnico = ticketsRelatorio.reduce((acc, t) => { const tec = t.tecnico || 'Sem Técnico'; acc[tec] = (acc[tec] || 0) + 1; return acc; }, {} as Record<string, number>);
  const chamadosPorPrioridade = ticketsRelatorio.reduce((acc, t) => { acc[t.prioridade || 'Média'] = (acc[t.prioridade || 'Média'] || 0) + 1; return acc; }, {} as Record<string, number>);

  const slaBuckets = { '< 12h': 0, '12h - 24h': 0, '24h - 36h': 0, '36h - 48h': 0, '> 48h': 0 };
  let slaTotalHoras = 0;
  let slaContador = 0;

  ticketsRelatorio.filter(t => t.status === 'concluidos').forEach(t => {
    const dataCriacao = new Date(t.criadoEm).getTime();
    const dataAtualizacao = t.atualizadoEm ? new Date(t.atualizadoEm).getTime() : new Date().getTime();
    const horas = (dataAtualizacao - dataCriacao) / 3600000; 
    
    slaTotalHoras += horas;
    slaContador++;
    
    if (horas <= 12) slaBuckets['< 12h']++;
    else if (horas <= 24) slaBuckets['12h - 24h']++;
    else if (horas <= 36) slaBuckets['24h - 36h']++;
    else if (horas <= 48) slaBuckets['36h - 48h']++;
    else slaBuckets['> 48h']++;
  });

  const slaMedio = slaContador > 0 ? (slaTotalHoras / slaContador).toFixed(1) : '0';
  const slaMax = Math.max(...Object.values(slaBuckets), 1); 

  const generatePieChart = (data: Record<string, number>) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return 'conic-gradient(#eee 0% 100%)';
    const colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#34495e', '#1abc9c'];
    let start = 0;
    return 'conic-gradient(' + Object.values(data).map((val, i) => {
      const perc = (val / total) * 100;
      const slice = `${colors[i % colors.length]} ${start}% ${start + perc}%`;
      start += perc;
      return slice;
    }).join(', ') + ')';
  };

  const togglePill = (val: string, arr: string[], setter: any) => {
    if (arr.includes(val)) setter(arr.filter(item => item !== val));
    else setter([...arr, val]);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData('text/plain', id); setDraggedTicketId(id); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedTicketId) return;
    setTickets(prev => prev.map(t => t.id === draggedTicketId ? { ...t, status: newStatus } : t));
    await updateChamadoStatus(draggedTicketId, newStatus);
    setDraggedTicketId(null);
  };

  const openEditTicket = (t: Ticket) => {
    setEditingTicket(t); setClientSearch(t.nomeCliente); setTempClientId(t.clienteId || "");
    setTempConexaoId(t.conexaoId || ""); setTempPppoe(t.pppoe || ""); setTempSenha(t.senhaPpoe || "");
    setTempContrato(t.contratoMhnet || ""); setIsTicketModalOpen(true);
  };

  const handleSaveTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isAvulso = !tempClientId;
    const cliente = isAvulso ? null : clientes.find(c => c.id === tempClientId);
    const con = cliente?.conexoes.find(c => c.id === tempConexaoId);

    const ticketData = {
      protocolo: editingTicket ? editingTicket.protocolo : `#${Math.floor(1000 + Math.random() * 9000)}`,
      clienteId: isAvulso ? null : tempClientId, conexaoId: isAvulso ? null : tempConexaoId,
      nomeCliente: isAvulso ? clientSearch : (cliente?.nome || ''), whatsCliente: isAvulso ? '' : (cliente?.whatsapp || ''),
      cidadeCliente: isAvulso ? '' : (cliente?.cidade || ''),
      enderecoCompleto: isAvulso ? '' : (con ? `${con.endereco} - ${con.bairro || ''}` : ''),
      categoria: formData.get('categoria') as string, motivo: formData.get('motivo') as string, 
      pppoe: formData.get('pppoe') as string, senhaPpoe: formData.get('senhaPpoe') as string,
      contratoMhnet: formData.get('contratoMhnet') as string, obs: formData.get('obs') as string,
      tecnico: formData.get('tecnico') as string, abertoPor: formData.get('abertoPor') as string,
      resolucao: formData.get('resolucao') as string, prioridade: formData.get('prioridade') as string
    };

    if (editingTicket) await updateChamado(editingTicket.id, ticketData);
    else await createChamado(ticketData);
    
    await loadData(); setIsTicketModalOpen(false);
  };

  const handleSaveCliente = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dadosCliente = { nome: formData.get('nome') as string, cpfCnpj: formData.get('cpfCnpj') as string, whatsapp: formData.get('whatsapp') as string, email: formData.get('email') as string, cidade: formData.get('cidade') as string };
    if (editingCliente) await updateCliente(editingCliente.id, dadosCliente);
    else {
      const dadosConexao = { endereco: formData.get('endereco') as string, bairro: formData.get('bairro') as string, contratoMhnet: formData.get('contratoMhnet') as string, pppoe: formData.get('pppoe') as string, senhaPpoe: formData.get('senhaPpoe') as string };
      await createCliente(dadosCliente, dadosConexao); setIsClientModalOpen(false); 
    }
    await loadData();
  };

  const handleSaveConexao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!editingCliente) return;
    const formData = new FormData(e.currentTarget);
    const dC = { endereco: formData.get('endereco') as string, bairro: formData.get('bairro') as string, contratoMhnet: formData.get('contratoMhnet') as string, pppoe: formData.get('pppoe') as string, senhaPpoe: formData.get('senhaPpoe') as string };
    if (editingConexao) await updateConexao(editingConexao.id, dC);
    else await addConexao(editingCliente.id, dC);
    await loadData();
    const cli = (await getClientes()).find(c => c.id === editingCliente.id);
    if (cli) setEditingCliente(cli as any); setIsConexaoModalOpen(false); setEditingConexao(null);
  };

  // --- FUNÇÕES DO ARQUIVO MORTO ---
  const handlePesquisaLegado = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (legadoBusca.trim() === '') { carregarUltimosLegado(legadoLimit); return; }
    if (legadoBusca.length < 3) return alert('Digite pelo menos 3 letras para buscar no passado.');
    const resultados = await buscarHistoricoLegado(legadoBusca);
    setLegadoResultados(resultados);
  };

  const handleLimparLegado = async () => {
    if (confirm('ATENÇÃO: Isso vai apagar TODOS os registros do Arquivo Morto para você importar um arquivo novo. Tem certeza?')) {
      await limparHistoricoLegado();
      setLegadoResultados([]);
      alert('Arquivo Morto limpo com sucesso! Pode importar o novo arquivo.');
    }
  };

  const handleUploadLegado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const linhas = text.split('\n').filter(l => l.trim().length > 0);
      const payload = [];

      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        
        // 1. Extração Inteligente de Data
        const regexData = /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/;
        const matchData = linha.match(regexData);
        let dataEncontrada = matchData ? matchData[0] : 'Sem Data';
        
        // 2. Extração Inteligente de Resumo (Baseado nos "Pipes" | do seu sistema)
        let resumoEncontrado = 'Importado de Planilha Antiga';
        if (linha.includes('|')) {
            const partes = linha.split('|').map(p => p.trim()).filter(p => p.length > 0);
            if (partes.length >= 2) {
                // Geralmente o problema relatado cai na segunda ou terceira parte útil após o nome
                resumoEncontrado = partes[1].substring(0, 100); 
            }
        } else {
            const colunas = linha.split(',');
            if (colunas.length >= 3) resumoEncontrado = colunas[2].replace(/"/g, '').substring(0, 100);
        }

        // O Nome ainda puxa da primeira vírgula (padrão Excel)
        const colunas = linha.split(',');
        const nome = colunas[0] ? colunas[0].replace(/"/g, '').trim() : 'Sem Nome';

        payload.push({
          cliente_nome: nome,
          resumo: resumoEncontrado,
          detalhes_brutos: linha,
          data_referencia: dataEncontrada
        });
      }

      let salvos = 0;
      for (let i = 0; i < payload.length; i += 500) {
        const lote = payload.slice(i, i + 500);
        await importarHistoricoLegado(lote);
        salvos += lote.length;
      }

      alert(`✅ Sucesso! ${salvos} registros antigos foram importados para o Arquivo Morto.`);
      setIsImporting(false);
      carregarUltimosLegado(legadoLimit); 
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .app-container { display: flex; height: 100vh; background: #eef2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
        .sidebar { width: 140px; background: #fff; border-right: 1px solid #dce3e8; padding-top: 20px; flex-shrink: 0; }
        .logo-container { width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 30px; }
        .logo-img { width: 80px; height: auto; margin-bottom: 5px; }
        .logo-subtext { font-size: 9px; color: #7f8c8d; font-weight: bold; text-transform: uppercase; }
        .nav-links { width: 100%; }
        .nav-item { display: flex; flex-direction: column; align-items: center; width: 100%; padding: 12px 0; color: #7f8c8d; font-size: 11px; font-weight: 600; cursor: pointer; border-left: 4px solid transparent; transition: 0.2s; }
        .nav-item.active { color: #3498db; background: #f0f7ff; border-left-color: #3498db; }
        .nav-icon { font-size: 18px; margin-bottom: 4px; }
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 60px; background: #fff; border-bottom: 1px solid #dce3e8; display: flex; align-items: center; padding: 0 30px; gap: 20px; }
        .search-input { background: #f4f7f9; border: 1px solid #dfe6ed; padding: 8px 15px; border-radius: 6px; font-size: 12px; width: 280px; }
        .board-header { padding: 20px 30px; display: flex; align-items: center; gap: 15px; }
        .board-header h1 { font-size: 20px; color: #2c3e50; font-weight: 800; }
        .kanban { display: flex; gap: 15px; padding: 0 30px 25px; overflow-x: auto; flex: 1; }
        
        /* ATUALIZAÇÃO DA LARGURA DA COLUNA AQUI (DE 320 PARA 360) */
        .column { background: #dce3e8; width: 360px; border-radius: 8px; flex-shrink: 0; display: flex; flex-direction: column; }
        
        .col-title { padding: 12px 15px; color: white; font-weight: bold; font-size: 11px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; }
        .bg-blue { background: #3498db; } .bg-orange { background: #f39c12; } .bg-cyan { background: #1abc9c; } .bg-green { background: #2ecc71; }
        .kanban-card { background: white; margin: 10px; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; border-left: 4px solid transparent; }
        .card-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 2px; }
        .prot-badge { font-size: 10px; font-weight: bold; color: #7f8c8d; background: #f4f7f9; padding: 2px 6px; border-radius: 4px; }
        .card-actions button { margin-left: 3px; font-size: 13px; background: none; border: none; cursor: pointer; }
        .card-client { font-size: 14px; font-weight: 800; color: #2c3e50; }
        .card-whats { font-size: 11px; color: #27ae60; font-weight: bold; }
        .card-cat { font-size: 11px; font-weight: 700; color: #3498db; text-transform: uppercase; }
        .card-desc { font-size: 12px; color: #4a5568; line-height: 1.3; background: #f8fafc; padding: 6px; border-radius: 4px; }
        .card-footer { display: flex; justify-content: space-between; font-size: 10px; color: #95a5a6; font-weight: bold; margin-top: 4px; }
        .card-details { background: #f8fafc; border-top: 1px solid #edf2f7; padding: 10px; font-size: 11px; color: #4a5568; margin-top: 8px; border-radius: 4px; }
        .btn-new { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; }
        .btn-green { background: #27ae60; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
        .modal-box { background: white; padding: 25px; border-radius: 8px; width: 600px; max-height: 95vh; overflow-y: auto; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .btn-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 20px; font-weight: bold; color: #bdc3c7; cursor: pointer; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px; overflow: hidden; }
        .data-table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; color: #7f8c8d; border-bottom: 2px solid #eef2f5; }
        .data-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        .field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        .field label { font-size: 10px; font-weight: bold; color: #7f8c8d; text-transform: uppercase; }
        .field input, .field select, .field textarea { padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
        
        .filter-panel { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .filter-row { display: flex; gap: 15px; margin-bottom: 15px; align-items: flex-start; }
        .filter-label { font-size: 11px; font-weight: bold; color: #7f8c8d; width: 100px; padding-top: 5px; }
        .pill-container { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
        .pill { background: #f4f7f9; color: #7f8c8d; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; cursor: pointer; border: 1px solid #dfe6ed; transition: 0.2s; }
        .pill.active { background: #3498db; color: #fff; border-color: #3498db; }
        
        .report-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
        .report-card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #3498db; display: flex; justify-content: space-between; align-items: center; }
        .report-card h3 { font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin: 0 0 5px; }
        .report-card .value { font-size: 28px; font-weight: 800; color: #2c3e50; }
        
        .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .chart-box { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .chart-box h3 { font-size: 14px; color: #2c3e50; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; display: flex; justify-content: space-between; }
        .pie-container { display: flex; align-items: center; gap: 30px; }
        .pie { width: 120px; height: 120px; border-radius: 50%; border: 2px solid #eee; flex-shrink: 0; }
        .pie-legend { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .legend-item { display: flex; justify-content: space-between; font-size: 11px; color: #4a5568; }
        .legend-color { width: 10px; height: 10px; border-radius: 2px; display: inline-block; margin-right: 6px; }
        
        .bar-chart-container { display: flex; flex-direction: column; gap: 10px; }
        .bar-item { display: flex; align-items: center; gap: 10px; font-size: 11px; color: #4a5568; font-weight: bold; }
        .bar-label { width: 60px; text-align: right; }
        .bar-track { flex: 1; height: 12px; background: #eef2f5; border-radius: 6px; overflow: hidden; }
        .bar-fill { height: 100%; background: #3498db; transition: width 0.5s; }
        .bar-value { width: 30px; }
        
        .btn-tab { padding: 8px 15px; border: none; background: #dce3e8; color: #7f8c8d; font-weight: bold; cursor: pointer; border-radius: 4px; font-size: 12px; transition: 0.2s; }
        .btn-tab.active { background: #3498db; color: #fff; }
      `}} />

      <aside className="sidebar">
        <div className="logo-container"><img src="/logo-admin.png" className="logo-img" /><span className="logo-subtext">Infotchê</span></div>
        <div className="nav-links">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><span className="nav-icon">📊</span>Dashboard</div>
          <div className={`nav-item ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')}><span className="nav-icon">🗂️</span>Atendimentos</div>
          <div className={`nav-item ${activeTab === 'clientes' ? 'active' : ''}`} onClick={() => setActiveTab('clientes')}><span className="nav-icon">👥</span>Clientes</div>
          <div className={`nav-item ${activeTab === 'categorias' ? 'active' : ''}`} onClick={() => setActiveTab('categorias')}><span className="nav-icon">🏷️</span>Categorias</div>
          {isAdmin && <div className={`nav-item ${activeTab === 'relatorios' ? 'active' : ''}`} onClick={() => setActiveTab('relatorios')}><span className="nav-icon">📈</span>Relatórios</div>}
          {isAdmin && <div className={`nav-item ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveTab('usuarios')}><span className="nav-icon">🔐</span>Usuários</div>}
        </div>
      </aside>

      <div className="main">
        <header className="top-nav">
          <input className="search-input" placeholder="🔍 Buscar cliente, pppoe, rua..." value={buscaGlobal} onChange={(e) => { setBuscaGlobal(e.target.value); if(e.target.value && activeTab !== 'historico') setActiveTab('historico'); }} />
          <div style={{flex:1}}></div>
          {usuarioLogado && (
            <div 
              onClick={() => setIsPerfilModalOpen(true)}
              style={{display:'flex', alignItems:'center', gap:'10px', marginRight:'20px', paddingRight:'20px', borderRight:'1px solid #dce3e8', cursor:'pointer'}}
              title="Editar Meu Perfil"
            >
              <div style={{width:'32px', height:'32px', borderRadius:'50%', background:'#3498db', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'14px'}}>
                {usuarioLogado.nome.charAt(0).toUpperCase()}
              </div>
              <div style={{display:'flex', flexDirection:'column'}}>
                <span style={{fontSize:'12px', fontWeight:'bold', color:'#2c3e50'}}>{usuarioLogado.nome}</span>
                <span style={{fontSize:'10px', color:'#3498db', fontWeight:'bold'}}>✏️ Editar Perfil</span>
              </div>
            </div>
          )}
          <button onClick={async () => { await fazerLogout(); router.push('/login'); }} style={{background:'none', border:'none', color:'#e74c3c', cursor:'pointer', fontWeight:'bold'}}>SAIR</button>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <div className="board-header">
              <h1>Gestão Atendimentos</h1>
              <button className="btn-new" onClick={() => { setEditingTicket(null); setClientSearch(""); setTempClientId(""); setTempConexaoId(""); setTempPppoe(""); setTempSenha(""); setTempContrato(""); setIsTicketModalOpen(true); }}>+ NOVO CHAMADO</button>
              <button className="btn-new btn-green" onClick={() => { setEditingCliente(null); setIsClientModalOpen(true); }}>+ NOVO CLIENTE</button>
            </div>
            <KanbanBoard tickets={ticketsFiltrados} expandedId={expandedTicketId} setExpandedId={setExpandedTicketId} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnter={(e) => e.preventDefault()} onDrop={handleDrop} onEdit={openEditTicket} onDelete={async (id) => { if(confirm('Excluir chamado?')) { await deleteChamado(id); loadData(); } }} />
          </>
        )}

        {/* --- ABA USUÁRIOS --- */}
        {activeTab === 'usuarios' && isAdmin && (
          <div style={{padding:'30px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h1>Controle de Acesso</h1>
              <button className="btn-new" onClick={() => { setEditingUsuario(null); setIsUserModalOpen(true); }}>+ NOVO USUÁRIO</button>
            </div>
            <table className="data-table">
              <thead><tr><th>NOME</th><th>LOGIN</th><th>PERMISSÃO</th><th>AÇÕES</th></tr></thead>
              <tbody>
                {usuarios.map(usr => (
                  <tr key={usr.id}>
                    <td><strong>{usr.nome}</strong></td>
                    <td>{usr.login}</td>
                    <td><span style={{padding:'4px 8px', borderRadius:'4px', color:'#fff', fontSize:'11px', fontWeight:'bold', background: usr.role === 'ADMIN' ? '#e74c3c' : '#3498db'}}>{usr.role}</span></td>
                    <td>
                      <button onClick={() => { setEditingUsuario(usr); setIsUserModalOpen(true); }} style={{marginRight:'10px', background:'none', border:'none', cursor:'pointer'}}>✏️</button>
                      {usr.login !== 'admin' && (
                        <button onClick={async () => { if(confirm('Remover acesso?')) { await deleteUsuario(usr.id); loadData(); } }} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'relatorios' && isAdmin && (
          <div style={{padding:'30px', overflowY:'auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h1>Relatórios e Estatísticas</h1>
            </div>

            <div className="filter-panel">
              <div className="filter-row">
                <div className="filter-label">Período:</div>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{padding:'6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'12px'}} />
                  <span>até</span>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{padding:'6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'12px'}} />
                </div>
              </div>
              <div className="filter-row">
                <div className="filter-label">Status:</div>
                <div className="pill-container">
                  {['todos', 'abertos', 'concluidos'].map(st => (
                    <div key={st} className={`pill ${relStatus === st ? 'active' : ''}`} onClick={() => setRelStatus(st as any)}>{st.toUpperCase()}</div>
                  ))}
                </div>
              </div>
              <div className="filter-row">
                <div className="filter-label">Categorias:</div>
                <div className="pill-container">
                  {categorias.map(c => (
                    <div key={c.id} className={`pill ${relCats.includes(c.nome) ? 'active' : ''}`} onClick={() => togglePill(c.nome, relCats, setRelCats)}>{c.nome}</div>
                  ))}
                </div>
              </div>
              <div className="filter-row">
                <div className="filter-label">Técnicos:</div>
                <div className="pill-container">
                  {todosTecnicos.map(tec => (
                    <div key={tec} className={`pill ${relTecs.includes(tec) ? 'active' : ''}`} onClick={() => togglePill(tec, relTecs, setRelTecs)}>{tec}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="report-grid">
              <div className="report-card" style={{borderLeftColor: '#3498db'}}>
                <div><h3>Filtrados</h3><div className="value">{ticketsRelatorio.length}</div></div>
                <span style={{fontSize:'30px'}}>📋</span>
              </div>
              <div className="report-card" style={{borderLeftColor: '#2ecc71'}}>
                <div><h3>Concluídos (SLA)</h3><div className="value">{slaContador}</div></div>
                <span style={{fontSize:'30px'}}>✅</span>
              </div>
              <div className="report-card" style={{borderLeftColor: '#9b59b6'}}>
                <div><h3>Tempo Médio</h3><div className="value">{slaMedio}h</div></div>
                <span style={{fontSize:'30px'}}>⏱️</span>
              </div>
            </div>

            <div className="chart-row">
              <div className="chart-box">
                <h3>Divisão por Categoria</h3>
                <div className="pie-container">
                  <div className="pie" style={{ background: generatePieChart(chamadosPorCategoria) }}></div>
                  <div className="pie-legend">
                    {Object.entries(chamadosPorCategoria).sort((a,b)=>b[1]-a[1]).map(([cat, val], i) => (
                      <div key={cat} className="legend-item">
                        <span><span className="legend-color" style={{background: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#34495e', '#1abc9c'][i % 7]}}></span>{cat}</span>
                        <strong>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="chart-box">
                <h3>SLA: Tempo de Resolução (Em Horas) <span style={{fontSize:'10px', color:'#7f8c8d', fontWeight:'normal'}}>Apenas Concluídos</span></h3>
                <div className="bar-chart-container">
                  {Object.entries(slaBuckets).map(([label, val]) => (
                    <div key={label} className="bar-item">
                      <div className="bar-label">{label}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${slaMax === 0 ? 0 : (val / slaMax) * 100}%`, background: label === '> 48h' ? '#e74c3c' : '#3498db' }}></div>
                      </div>
                      <div className="bar-value">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="chart-row">
              <div className="chart-box">
                <h3>Técnicos Responsáveis</h3>
                <div className="pie-container">
                  <div className="pie" style={{ background: generatePieChart(chamadosPorTecnico) }}></div>
                  <div className="pie-legend">
                    {Object.entries(chamadosPorTecnico).sort((a,b)=>b[1]-a[1]).map(([tec, val], i) => (
                      <div key={tec} className="legend-item">
                        <span><span className="legend-color" style={{background: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#34495e', '#1abc9c'][i % 7]}}></span>{tec}</span>
                        <strong>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="chart-box">
                <h3>Análise de Prioridades (Filtro de Orçamentos)</h3>
                <div className="pie-container">
                  <div className="pie" style={{ background: generatePieChart(chamadosPorPrioridade) }}></div>
                  <div className="pie-legend">
                    {Object.entries(chamadosPorPrioridade).map(([pri, val], i) => (
                      <div key={pri} className="legend-item">
                        <span><span className="legend-color" style={{background: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#34495e', '#1abc9c'][i % 7]}}></span>{pri}</span>
                        <strong>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-box">
              <h3>Listagem de Chamados Filtrados</h3>
              <table className="data-table">
                <thead><tr><th>PROTOCOLO</th><th>CLIENTE</th><th>CATEGORIA</th><th>PRIORIDADE</th><th>STATUS</th></tr></thead>
                <tbody>
                  {ticketsRelatorio.map(t => (
                    <tr key={t.id}>
                      <td style={{fontWeight:'bold', color:'#3498db'}}>{t.protocolo}</td>
                      <td><strong>{t.nomeCliente}</strong></td>
                      <td>{t.categoria}</td>
                      <td><span style={{fontSize:'10px', background: t.prioridade === 'Baixa (Orçamento)' ? '#f39c12' : '#eee', color: t.prioridade === 'Baixa (Orçamento)' ? '#fff' : '#333', padding:'2px 6px', borderRadius:'4px'}}>{t.prioridade || 'Média'}</span></td>
                      <td>{t.status.toUpperCase()}</td>
                    </tr>
                  ))}
                  {ticketsRelatorio.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', color:'#999'}}>Nenhum chamado encontrado nestes filtros.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA ATENDIMENTOS E ARQUIVO MORTO --- */}
        {activeTab === 'historico' && (
          <div style={{padding:'30px', overflowY:'auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <div style={{display:'flex', gap:'10px'}}>
                <button className={`btn-tab ${abaHistorico === 'sistema' ? 'active' : ''}`} onClick={() => setAbaHistorico('sistema')}>📋 Chamados do Sistema</button>
                <button className={`btn-tab ${abaHistorico === 'legado' ? 'active' : ''}`} onClick={() => setAbaHistorico('legado')}>🗄️ Arquivo Morto (Antigos)</button>
              </div>

              {abaHistorico === 'sistema' ? (
                <div style={{display:'flex', gap:'10px', alignItems:'center', background:'#fff', padding:'10px', borderRadius:'8px'}}>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{fontSize:'12px', border:'1px solid #ddd'}} />
                  <span>até</span>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{fontSize:'12px', border:'1px solid #ddd'}} />
                </div>
              ) : (
                isAdmin && (
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    {isImporting && <span style={{fontSize:'12px', color:'#f39c12', fontWeight:'bold'}}>Importando... Pode levar 1 minuto.</span>}
                    <label className="btn-new btn-green" style={{cursor:'pointer', margin:0}}>
                      {isImporting ? '⏳ AGUARDE...' : '📥 IMPORTAR ARQUIVO CSV'}
                      <input type="file" accept=".csv" style={{display:'none'}} onChange={handleUploadLegado} disabled={isImporting} />
                    </label>
                  </div>
                )
              )}
            </div>

            {/* TABELA SISTEMA NOVO */}
            {abaHistorico === 'sistema' && (
              <table className="data-table">
                <thead><tr><th>PROTOCOLO</th><th>CLIENTE</th><th>CATEGORIA</th><th>STATUS</th><th>AÇÕES</th></tr></thead>
                <tbody>
                  {ticketsFiltrados.map(t => (
                    <tr key={t.id}>
                      <td style={{fontWeight:'bold', color:'#3498db'}}>{t.protocolo}</td>
                      <td><strong>{t.nomeCliente}</strong></td>
                      <td>{t.categoria}</td>
                      <td><span style={{padding:'4px 8px', borderRadius:'4px', color:'#fff', fontSize:'11px', fontWeight:'bold', background: t.status === 'novos' ? '#3498db' : t.status === 'agendados' ? '#f39c12' : t.status === 'andamento' ? '#1abc9c' : '#2ecc71'}}>{t.status.toUpperCase()}</span></td>
                      <td><button onClick={async () => { if(confirm('Apagar?')) { await deleteChamado(t.id); loadData(); } }} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button></td>
                    </tr>
                  ))}
                  {ticketsFiltrados.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', color:'#999'}}>Nenhum chamado no período.</td></tr>}
                </tbody>
              </table>
            )}

            {/* TABELA ARQUIVO MORTO COM DROPDOWN DE LIMITE */}
            {abaHistorico === 'legado' && (
              <div className="chart-box">
                <div style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
                  <form onSubmit={handlePesquisaLegado} style={{display:'flex', gap:'10px', flex: 1}}>
                    <input type="text" className="search-input" style={{flex:1}} placeholder="Busque por Nome do Cliente no Arquivo Morto..." value={legadoBusca} onChange={e => setLegadoBusca(e.target.value)} />
                    <button type="submit" className="btn-new">🔍 BUSCAR NO PASSADO</button>
                  </form>
                  
                  <div style={{display:'flex', alignItems:'center', gap:'10px', background:'#f4f7f9', padding:'0 15px', borderRadius:'6px', border:'1px solid #dfe6ed'}}>
                    <span style={{fontSize:'11px', fontWeight:'bold', color:'#7f8c8d'}}>Exibir:</span>
                    <select 
                      value={legadoLimit} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setLegadoLimit(val === 'todos' ? 'todos' : Number(val));
                        setLegadoBusca(''); 
                      }}
                      style={{border:'none', outline:'none', background:'transparent', fontSize:'12px', fontWeight:'bold', color:'#2c3e50', cursor:'pointer'}}
                    >
                      <option value={100}>Últimos 100</option>
                      <option value={500}>Últimos 500</option>
                      <option value={1000}>Últimos 1000</option>
                      <option value="todos">Todos (Lento)</option>
                    </select>
                  </div>
                </div>

                <table className="data-table">
                  <thead><tr><th>CLIENTE (LEGADO)</th><th>DATA</th><th>RESUMO</th><th>AÇÃO</th></tr></thead>
                  <tbody>
                    {legadoResultados.map(leg => (
                      <React.Fragment key={leg.id}>
                        <tr>
                          <td><strong>{leg.cliente_nome}</strong></td>
                          <td>{leg.data_referencia ? (leg.data_referencia.includes('-') ? leg.data_referencia.split('-').reverse().join('/') : leg.data_referencia) : 'N/A'}</td>
                          <td><span style={{background:'#f0f3f4', padding:'3px 6px', borderRadius:'4px', fontSize:'11px'}}>{leg.resumo}</span></td>
                          <td><button onClick={() => setExpandedLegadoId(expandedLegadoId === leg.id ? null : leg.id)} style={{fontSize:'12px', background:'none', border:'none', color:'#3498db', cursor:'pointer', fontWeight:'bold'}}>
                            {expandedLegadoId === leg.id ? 'Ocultar' : 'Ver Linha Original'}
                          </button></td>
                        </tr>
                        {expandedLegadoId === leg.id && (
                          <tr>
                            <td colSpan={4} style={{background:'#f8fafc', padding:'15px', fontFamily:'monospace', fontSize:'11px', color:'#555', wordBreak:'break-all'}}>
                              <strong>DADOS BRUTOS (Planilha Antiga):</strong><br/>{leg.detalhes_brutos}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {legadoResultados.length === 0 && <tr><td colSpan={4} style={{textAlign:'center', color:'#999', padding:'30px'}}>Nenhum resultado encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- OUTRAS ABAS (Clientes, Categorias) MANTIDAS INTACTAS --- */}
        {activeTab === 'clientes' && (
          <div style={{padding:'30px', overflowY:'auto'}}>
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h1>Carteira de Clientes</h1>
              <button className="btn-new btn-green" onClick={() => { setEditingCliente(null); setIsClientModalOpen(true); }}>+ NOVO CLIENTE</button>
            </div>
            <TabelaClientes clientes={clientes} onEdit={(cli) => { setEditingCliente(cli); setIsClientModalOpen(true); }} onDelete={async (id) => { if(confirm('Apagar cliente?')) { await deleteCliente(id); loadData(); } }} />
          </div>
        )}

        {activeTab === 'categorias' && (
          <div style={{padding:'30px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h1>Categorias</h1>
              <button className="btn-new" onClick={() => { setEditingCat(null); setIsCatModalOpen(true); }}>+ NOVA CATEGORIA</button>
            </div>
            <table className="data-table">
              <thead><tr><th>NOME</th><th>AÇÕES</th></tr></thead>
              <tbody>
                {categorias.map(cat => (
                  <tr key={cat.id}>
                    <td><strong>{cat.nome}</strong></td>
                    <td>
                      <button onClick={() => { setEditingCat(cat); setIsCatModalOpen(true); }} style={{marginRight:'10px', background:'none', border:'none', cursor:'pointer'}}>✏️</button>
                      <button onClick={async () => { if(confirm('Apagar?')) { await deleteCategoria(cat.id); loadData(); } }} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL DE CHAMADO --- */}
      {isTicketModalOpen && (
        <div className="modal-overlay" style={{zIndex: 1000}}>
          <div className="modal-box">
            <button type="button" className="btn-close" onClick={() => setIsTicketModalOpen(false)}>✖</button>
            <h2>{editingTicket ? `Editar Chamado ${editingTicket.protocolo}` : 'Abertura de Chamado'}</h2>
            <form onSubmit={handleSaveTicket}>
              <div className="field-group">
                
                <div className="field" style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label>1. Buscar ou Novo Cliente *</label>
                  <input 
                    value={clientSearch} 
                    onChange={(e) => { 
                      setClientSearch(e.target.value); 
                      setTempClientId(""); 
                      const drop = document.getElementById('dropdown-cliente');
                      if (drop) drop.style.display = 'block';
                    }} 
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' || e.key === 'Escape') {
                        const drop = document.getElementById('dropdown-cliente');
                        if (drop) drop.style.display = 'none';
                      }
                    }}
                    placeholder="Digite o nome (Tecle TAB para ocultar sugestões)..." 
                    required 
                    autoComplete="off" 
                  />
                  {clientSearch && !tempClientId && !editingTicket && (
                    <div id="dropdown-cliente" style={{ position: 'absolute', top: '55px', left: 0, right: 0, background: '#fff', border: '1px solid #dce3e8', borderRadius: '4px', zIndex: 1500, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                      {clientes.filter(c => c.nome.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                        <div key={c.id} onClick={() => { setTempClientId(c.id); setClientSearch(c.nome); }} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                          <strong>{c.nome}</strong> <span style={{ fontSize: '10px', color: '#7f8c8d' }}>{c.whatsapp ? `(${c.whatsapp})` : ''}</span>
                        </div>
                      ))}
                      <div onClick={() => { setEditingCliente(null); setIsClientModalOpen(true); }} style={{ padding: '10px', background: '#f0f7ff', color: '#3498db', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}>
                        + Cadastrar como novo: "{clientSearch}"
                      </div>
                    </div>
                  )}
                </div>

                {tempClientId && (
                  <div className="field" style={{gridColumn:'span 2'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <label>2. Instalação / Endereço</label>
                      <button type="button" onClick={() => { setEditingCliente(clientes.find(c => c.id === tempClientId) || null); setIsConexaoModalOpen(true); }} style={{fontSize:'10px', color:'#3498db', background:'none', border:'none', cursor:'pointer', fontWeight:'bold'}}>+ Nova Instalação</button>
                    </div>
                    <select value={tempConexaoId} onChange={(e) => { const cId = e.target.value; setTempConexaoId(cId); const con = clientes.find(cli => cli.id === tempClientId)?.conexoes.find(cx => cx.id === cId); if(con){ setTempPppoe(con.pppoe || ""); setTempSenha(con.senhaPpoe || ""); setTempContrato(con.contratoMhnet || ""); } }}>
                      <option value="">-- Selecione o Endereço --</option>
                      {clientes.find(c => c.id === tempClientId)?.conexoes.map(cx => <option key={cx.id} value={cx.id}>{cx.endereco}</option>)}
                    </select>
                  </div>
                )}

                <div className="field" style={{gridColumn:'span 2'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <label>3. Categoria *</label>
                    <button type="button" onClick={() => { setEditingCat(null); setIsCatModalOpen(true); }} style={{fontSize:'10px', color:'#3498db', background:'none', border:'none', cursor:'pointer', fontWeight:'bold'}}>+ Nova Categoria</button>
                  </div>
                  <select name="categoria" required defaultValue={editingTicket?.categoria || ""}>
                    <option value="">-- Selecione --</option>
                    {categorias.map(ct => <option key={ct.id} value={ct.nome}>{ct.nome}</option>)}
                  </select>
                </div>

                <div className="field" style={{gridColumn:'span 2'}}><label>Detalhes do Chamado *</label><input name="motivo" required defaultValue={editingTicket?.motivo || ""} placeholder="Descreva o problema inicial..." /></div>
                
                <div className="field" style={{gridColumn:'span 2'}}>
                  <label>Prioridade (Atenção ao SLA) *</label>
                  <select name="prioridade" required defaultValue={editingTicket?.prioridade || "Média"}>
                    <option value="Baixa (Orçamento)">Baixa (Orçamentos / Esperando Cliente)</option>
                    <option value="Média">Média (Padrão)</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente (Cabo Rompido / Empresa)</option>
                  </select>
                </div>

                <div className="field"><label>PPPoE</label><input name="pppoe" value={tempPppoe} onChange={e => setTempPppoe(e.target.value)} /></div>
                <div className="field"><label>Senha PPPoE</label><input name="senhaPpoe" value={tempSenha} onChange={e => setTempSenha(e.target.value)} /></div>
                <div className="field" style={{gridColumn:'span 2'}}><label>Código da Conexão (Mhnet)</label><input name="contratoMhnet" value={tempContrato} onChange={e => setTempContrato(e.target.value)} /></div>
                
                <div className="field"><label>Aberto por</label><input name="abertoPor" defaultValue={editingTicket?.abertoPor || "Admin"} /></div>
                <div className="field"><label>Técnico Responsável</label><input name="tecnico" defaultValue={editingTicket?.tecnico || ""} placeholder="Opcional" /></div>

                <div className="field" style={{gridColumn:'span 2'}}><label>Observações</label><textarea name="obs" defaultValue={editingTicket?.obs || ""} style={{height:'40px'}} /></div>
                <div className="field" style={{gridColumn:'span 2'}}><label>Fechamento da Ordem</label><textarea name="resolucao" defaultValue={editingTicket?.resolucao || ""} style={{height:'40px'}} placeholder="Preencher após a conclusão..." /></div>
              </div>
              <button type="submit" className="btn-new btn-green" style={{width:'100%', marginTop:'10px'}}>{editingTicket ? 'Atualizar Chamado' : 'Salvar e Abrir Chamado'}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CLIENTE (Z-INDEX 2000) --- */}
      {isClientModalOpen && (
        <div className="modal-overlay" style={{zIndex: 2000}}>
          <div className="modal-box" style={{width:'700px'}}>
            <button type="button" className="btn-close" onClick={() => setIsClientModalOpen(false)}>✖</button>
            <h2>{editingCliente ? 'Atualizar Cliente' : 'Cadastro Completo de Cliente'}</h2>
            <form onSubmit={handleSaveCliente}>
              <h3 style={{fontSize:'13px', color:'#3498db', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'15px'}}>Dados Pessoais</h3>
              <div className="field-group">
                <div className="field" style={{gridColumn:'span 2'}}><label>Nome Completo *</label><input name="nome" required defaultValue={editingCliente?.nome || clientSearch} /></div>
                <div className="field"><label>WhatsApp</label><input name="whatsapp" defaultValue={editingCliente?.whatsapp || ''} /></div>
                <div className="field"><label>CPF/CNPJ</label><input name="cpfCnpj" defaultValue={editingCliente?.cpfCnpj || ''} /></div>
                <div className="field"><label>Email</label><input type="email" name="email" defaultValue={editingCliente?.email || ''} /></div>
                <div className="field"><label>Cidade</label><input name="cidade" defaultValue={editingCliente?.cidade || ''} placeholder="Ex: Santa Bárbara do Sul" /></div>
              </div>
              {!editingCliente && (
                <>
                  <h3 style={{fontSize:'13px', color:'#3498db', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'15px'}}>Dados da Conexão</h3>
                  <div className="field-group">
                    <div className="field" style={{gridColumn:'span 2'}}><label>Endereço Completo *</label><input name="endereco" required /></div>
                    <div className="field"><label>Bairro</label><input name="bairro" /></div>
                    <div className="field"><label>Código Mhnet</label><input name="contratoMhnet" /></div>
                    <div className="field"><label>PPPoE</label><input name="pppoe" /></div>
                    <div className="field"><label>Senha PPPoE</label><input name="senhaPpoe" /></div>
                  </div>
                </>
              )}
              <button type="submit" className="btn-new" style={{width:'100%', marginTop:'10px'}}>{editingCliente ? 'Atualizar Cliente' : 'Salvar Novo Cliente'}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CONEXÃO E CATEGORIA INTACTOS --- */}
      {isConexaoModalOpen && (
        <div className="modal-overlay" style={{zIndex:3000}}>
          <div className="modal-box" style={{width:'500px'}}>
            <button type="button" className="btn-close" onClick={() => setIsConexaoModalOpen(false)}>✖</button>
            <h2>Nova Instalação para {editingCliente?.nome}</h2>
            <form onSubmit={handleSaveConexao}>
              <div className="field-group">
                <div className="field" style={{gridColumn:'span 2'}}><label>Endereço *</label><input name="endereco" required defaultValue={editingConexao?.endereco} /></div>
                <div className="field"><label>Bairro</label><input name="bairro" defaultValue={editingConexao?.bairro || ''} /></div>
                <div className="field"><label>Cód. Contrato</label><input name="contratoMhnet" defaultValue={editingConexao?.contratoMhnet || ''} /></div>
                <div className="field"><label>PPPoE</label><input name="pppoe" defaultValue={editingConexao?.pppoe || ''} /></div>
                <div className="field"><label>Senha</label><input name="senhaPpoe" defaultValue={editingConexao?.senhaPpoe || ''} /></div>
              </div>
              <button type="submit" className="btn-new" style={{width:'100%', marginTop:'10px'}}>Salvar Conexão</button>
            </form>
          </div>
        </div>
      )}

      {isCatModalOpen && (
        <div className="modal-overlay" style={{zIndex:4000}}>
          <div className="modal-box" style={{width:'400px'}}>
            <button type="button" className="btn-close" onClick={() => setIsCatModalOpen(false)}>✖</button>
            <h2>Nova Categoria</h2>
            <form onSubmit={async (e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); await upsertCategoria(editingCat?.id || null, formData.get('nomeCat') as string); loadData(); setIsCatModalOpen(false); }}>
              <div className="field" style={{margin:'20px 0'}}><label>Nome Categoria *</label><input name="nomeCat" required defaultValue={editingCat?.nome} /></div>
              <button type="submit" className="btn-new" style={{width:'100%'}}>Salvar Categoria</button>
            </form>
          </div>
        </div>
      )}
      {/* --- MODAL USUÁRIO (Z-INDEX 5000) --- */}
      {isUserModalOpen && (
        <div className="modal-overlay" style={{zIndex:5000}}>
          <div className="modal-box" style={{width:'400px'}}>
            <button type="button" className="btn-close" onClick={() => setIsUserModalOpen(false)}>✖</button>
            <h2>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              const formData = new FormData(e.currentTarget); 
              const data = {
                nome: formData.get('nome') as string, login: formData.get('login') as string,
                senha: formData.get('senha') as string, role: formData.get('role') as string
              };
              await upsertUsuario(editingUsuario?.id || null, data); 
              loadData(); setIsUserModalOpen(false); 
            }}>
              <div className="field-group" style={{gridTemplateColumns: '1fr'}}>
                <div className="field"><label>Nome Completo *</label><input name="nome" required defaultValue={editingUsuario?.nome} /></div>
                <div className="field"><label>Login de Acesso *</label><input name="login" required defaultValue={editingUsuario?.login} disabled={editingUsuario?.login === 'admin'} /></div>
                <div className="field">
                  <label>Senha {editingUsuario ? '(Deixe em branco para não alterar)' : '*'}</label>
                  <input type="password" name="senha" required={!editingUsuario} />
                </div>
                <div className="field">
                  <label>Permissão *</label>
                  <select name="role" required defaultValue={editingUsuario?.role || 'TECNICO'} disabled={editingUsuario?.login === 'admin'}>
                    <option value="TECNICO">Técnico (Apenas Kanban, Clientes, Legado)</option>
                    <option value="ADMIN">Administrador (Acesso Total)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-new" style={{width:'100%', marginTop:'15px'}}>Salvar Usuário</button>
            </form>
          </div>
        </div>
      )}
    {/* --- MODAL MEU PERFIL (Z-INDEX 6000) --- */}
      {isPerfilModalOpen && usuarioLogado && (
        <div className="modal-overlay" style={{zIndex:6000}}>
          <div className="modal-box" style={{width:'400px'}}>
            <button type="button" className="btn-close" onClick={() => setIsPerfilModalOpen(false)}>✖</button>
            <h2>Meu Perfil</h2>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              const formData = new FormData(e.currentTarget); 
              await atualizarMeuPerfil(usuarioLogado.id, formData.get('nome') as string, formData.get('senha') as string);
              loadData(); 
              setIsPerfilModalOpen(false); 
              alert('Perfil atualizado com sucesso!');
            }}>
              <div className="field-group" style={{gridTemplateColumns: '1fr'}}>
                <div className="field"><label>Seu Nome *</label><input name="nome" required defaultValue={usuarioLogado.nome} /></div>
                <div className="field">
                  <label>Nova Senha (Deixe em branco para manter a atual)</label>
                  <input type="password" name="senha" />
                </div>
              </div>
              <button type="submit" className="btn-new" style={{width:'100%', marginTop:'15px'}}>Atualizar Meus Dados</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}