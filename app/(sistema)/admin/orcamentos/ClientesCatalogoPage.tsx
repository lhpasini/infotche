'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { salvarClienteOrcamento } from '../../../actions/orcamentos';

type ClienteItem = {
  id: string;
  nome: string;
  cpfCnpj: string;
  whatsapp: string;
  email: string;
  cidade: string;
  enderecoPrincipal: string;
};

type ClientesCatalogoPageProps = {
  clientes: ClienteItem[];
};

export function ClientesCatalogoPage({ clientes }: ClientesCatalogoPageProps) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState({
    nome: '',
    cpfCnpj: '',
    whatsapp: '',
    email: '',
    cidade: '',
  });
  const [mensagem, setMensagem] = useState('');

  const filtrados = clientes.filter((cliente) =>
    [cliente.nome, cliente.cpfCnpj, cliente.whatsapp, cliente.email]
      .join(' ')
      .toLowerCase()
      .includes(busca.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[30px] bg-[linear-gradient(135deg,#07111f_0%,#0f172a_45%,#153e75_100%)] px-6 py-7 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Orcamentos / Clientes</p>
              <h1 className="mt-3 text-3xl font-black">Cadastro de clientes</h1>
            </div>
            <Link href="/admin/orcamentos" className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900">
              Voltar aos orcamentos
            </Link>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Novo cliente</p>
            <div className="mt-4 grid gap-4">
              {(['nome', 'cpfCnpj', 'whatsapp', 'email', 'cidade'] as const).map((campo) => (
                <label key={campo} className="grid gap-2 text-sm font-semibold text-slate-600">
                  {campo}
                  <input
                    value={form[campo]}
                    onChange={(e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={async () => {
                  const resposta = await salvarClienteOrcamento(form);
                  setMensagem(resposta.sucesso ? 'Cliente salvo com sucesso.' : resposta.erro || 'Erro ao salvar cliente.');
                  if (resposta.sucesso) {
                    setForm({ nome: '', cpfCnpj: '', whatsapp: '', email: '', cidade: '' });
                    router.refresh();
                  }
                }}
                className="rounded-full bg-slate-900 px-4 py-3 text-sm font-black text-white"
              >
                Salvar cliente
              </button>
              {mensagem && <p className="text-sm font-semibold text-emerald-700">{mensagem}</p>}
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Base atual</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Clientes cadastrados</h2>
              </div>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente..."
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-5 grid gap-3">
              {filtrados.map((cliente) => (
                <div key={cliente.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-base font-black text-slate-900">{cliente.nome}</p>
                  <p className="mt-2 text-sm text-slate-600">{cliente.cpfCnpj || 'Sem documento'}</p>
                  <p className="mt-1 text-sm text-slate-600">{cliente.whatsapp || cliente.email || 'Sem contato'}</p>
                  <p className="mt-1 text-sm text-slate-500">{cliente.cidade || cliente.enderecoPrincipal || '-'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
