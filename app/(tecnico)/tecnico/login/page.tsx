'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fazerLogin } from '../../../actions/auth';

export default function TecnicoLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro('');

    const result = await fazerLogin(login, senha);

    if (result.sucesso) {
      router.push('/tecnico');
      return;
    }

    setErro(result.erro || 'Falha ao entrar.');
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Infotchê / Mhnet</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Acesso do técnico</h1>
          <p className="mt-2 text-sm text-slate-600">Entre para registrar e consultar equipamentos em campo.</p>
        </div>

        {erro && (
          <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Usuário</span>
            <input
              type="text"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
              placeholder="Seu login"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none transition focus:border-sky-500 focus:bg-white"
              placeholder="Sua senha"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-600 px-4 py-4 text-base font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
