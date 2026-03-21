import { redirect } from 'next/navigation';
import { getAuthSession } from '../../../../lib/auth-session';
import {
  listarClientesParaOrcamento,
  listarOrcamentos,
  listarProdutosCatalogo,
} from '../../../actions/orcamentos';
import { OrcamentosWorkspace } from './OrcamentosWorkspace';

export default async function OrcamentosPage() {
  const sessao = await getAuthSession();

  if (!sessao) {
    redirect('/login');
  }

  if (sessao.role !== 'ADMIN') {
    redirect('/admin');
  }

  const [lista, clientes, produtos] = await Promise.all([
    listarOrcamentos(),
    listarClientesParaOrcamento(),
    listarProdutosCatalogo(),
  ]);

  return (
    <OrcamentosWorkspace
      listaInicial={lista}
      clientesIniciais={clientes}
      produtosIniciais={produtos}
    />
  );
}
