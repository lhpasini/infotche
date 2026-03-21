import { redirect } from 'next/navigation';
import { getAuthSession } from '../../../../../lib/auth-session';
import { listarProdutosCatalogo } from '../../../../actions/orcamentos';
import { ProdutosCatalogoPage } from '../ProdutosCatalogoPage';

export default async function OrcamentosProdutosPage() {
  const sessao = await getAuthSession();

  if (!sessao) {
    redirect('/login');
  }

  if (sessao.role !== 'ADMIN') {
    redirect('/admin');
  }

  const produtos = await listarProdutosCatalogo();

  return <ProdutosCatalogoPage produtos={produtos} />;
}
