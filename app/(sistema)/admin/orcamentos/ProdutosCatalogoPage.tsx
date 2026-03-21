'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  removerProdutoCatalogo,
  salvarProdutoCatalogo,
} from '../../../actions/orcamentos';
import type { ProdutoCatalogoInput } from '../../../../lib/orcamentos';

type ProdutosCatalogoPageProps = {
  produtos: ProdutoCatalogoInput[];
};

const produtoVazio: ProdutoCatalogoInput = {
  categoria: 'Computadores',
  nome: '',
  descricaoCurta: '',
  descricaoDetalhada: '',
  precoBase: 0,
  ativo: true,
  recorrente: true,
  ordem: 0,
};

export function ProdutosCatalogoPage({ produtos }: ProdutosCatalogoPageProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProdutoCatalogoInput>(produtoVazio);
  const [mensagem, setMensagem] = useState('');

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[30px] bg-[linear-gradient(135deg,#07111f_0%,#0f172a_45%,#153e75_100%)] px-6 py-7 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Orcamentos / Produtos</p>
              <h1 className="mt-3 text-3xl font-black">Cadastro de produtos recorrentes</h1>
            </div>
            <Link href="/admin/orcamentos" className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900">
              Voltar aos orcamentos
            </Link>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Novo produto</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Categoria
                <input value={form.categoria} onChange={(e) => setForm((atual) => ({ ...atual, categoria: e.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Nome
                <input value={form.nome} onChange={(e) => setForm((atual) => ({ ...atual, nome: e.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Descricao curta
                <textarea value={form.descricaoCurta} onChange={(e) => setForm((atual) => ({ ...atual, descricaoCurta: e.target.value }))} className="min-h-[80px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Descricao detalhada
                <textarea value={form.descricaoDetalhada} onChange={(e) => setForm((atual) => ({ ...atual, descricaoDetalhada: e.target.value }))} className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Preco base
                <input type="number" step="0.01" value={form.precoBase} onChange={(e) => setForm((atual) => ({ ...atual, precoBase: Number(e.target.value) || 0 }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
              </label>
              <button
                type="button"
                onClick={async () => {
                  const resposta = await salvarProdutoCatalogo(form);
                  setMensagem(resposta.sucesso ? 'Produto salvo com sucesso.' : resposta.erro || 'Erro ao salvar produto.');
                  if (resposta.sucesso) {
                    setForm(produtoVazio);
                    router.refresh();
                  }
                }}
                className="rounded-full bg-slate-900 px-4 py-3 text-sm font-black text-white"
              >
                Salvar produto
              </button>
              {mensagem && <p className="text-sm font-semibold text-emerald-700">{mensagem}</p>}
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Catalogo atual</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Produtos cadastrados</h2>
            <div className="mt-5 grid gap-3">
              {produtos.map((produto) => (
                <div key={produto.id || produto.nome} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{produto.nome}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{produto.categoria}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (produto.id) {
                          await removerProdutoCatalogo(produto.id);
                          setMensagem('Produto removido com sucesso.');
                          router.refresh();
                        }
                      }}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                    >
                      Remover
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{produto.descricaoCurta}</p>
                  <p className="mt-2 text-sm font-bold text-sky-700">R$ {produto.precoBase.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
