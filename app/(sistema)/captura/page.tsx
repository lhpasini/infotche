"use client";

import { useState } from "react";

export default function CapturaEquipamentoPage() {
  const [formData, setFormData] = useState({
    clienteNome: "",
    tipoAtendimento: "Nova instalação",
    tipoEquipamento: "ONT",
    nomeModelo: "",
    mac: "",
    serial: "",
    observacao: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Dados prontos para envio:", formData);
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12 font-sans">
      {/* Cabeçalho */}
      <div className="bg-slate-900 text-white pt-12 pb-6 px-6 rounded-b-3xl shadow-md">
        <h1 className="text-2xl font-bold tracking-wide">Registro de Estoque</h1>
        <p className="text-slate-400 text-sm mt-1">Movimentação de equipamentos em campo</p>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* CARTÃO 1: Dados do Cliente */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">
              Dados do Atendimento
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clienteNome"
                  required
                  value={formData.clienteNome}
                  onChange={handleChange}
                  placeholder="Ex: João da Silva"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Atendimento <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipoAtendimento"
                  required
                  value={formData.tipoAtendimento}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  <option value="Nova instalação">Nova instalação</option>
                  <option value="Troca de equipamento">Troca de equipamento</option>
                  <option value="Retirada">Retirada</option>
                  <option value="Manutenção">Manutenção</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARTÃO 2: Dados do Equipamento */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">
              Identificação do Equipamento
            </h2>

            {/* Botão de Câmera em Destaque */}
            <button
              type="button"
              className="w-full mb-6 py-4 flex flex-col items-center justify-center gap-2 bg-blue-50 border-2 border-dashed border-blue-300 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <svg width="32" height="32" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span className="font-semibold text-sm">Ler Etiqueta com a Câmera</span>
              <span className="text-xs text-blue-500 font-normal">Preenchimento automático</span>
            </button>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                  <select
                    name="tipoEquipamento"
                    value={formData.tipoEquipamento}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ONT">ONT</option>
                    <option value="ONU">ONU</option>
                    <option value="Roteador Wi-Fi">Roteador Wi-Fi</option>
                    <option value="Mesh">Mesh</option>
                  </select>
                </div>
                
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-slate-500">
                    Modelo <span className="text-xs font-normal text-slate-400">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    name="nomeModelo"
                    value={formData.nomeModelo}
                    onChange={handleChange}
                    placeholder="Ex: WS7001"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  MAC Address <span className="text-xs font-normal text-slate-400">(Opcional)</span>
                </label>
                <input
                  type="text"
                  name="mac"
                  value={formData.mac}
                  onChange={handleChange}
                  placeholder="Ex: D8:40:08:C3:3B:31"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Serial Number (S/N) <span className="text-xs font-normal text-slate-400">(Opcional)</span>
                </label>
                <input
                  type="text"
                  name="serial"
                  value={formData.serial}
                  onChange={handleChange}
                  placeholder="Ex: 48575443B231FEB4"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* CARTÃO 3: Observações */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observações <span className="text-xs font-normal text-slate-400">(Opcional)</span>
            </label>
            <textarea
              name="observacao"
              rows={2}
              value={formData.observacao}
              onChange={handleChange}
              placeholder="Detalhes sobre a instalação, condições do equipamento..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Botão Flutuante/Fixo de Envio */}
          <div className="pt-4 pb-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                "Registrando..."
              ) : (
                <>
                  <svg width="20" height="20" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Salvar Registro
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}