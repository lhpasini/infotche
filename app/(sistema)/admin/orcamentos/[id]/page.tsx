import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '../../../../../lib/auth-session';
import {
  buscarOrcamentoPorId,
  listarClientesParaOrcamento,
  listarOrcamentos,
  listarProdutosCatalogo,
} from '../../../../actions/orcamentos';
import { OrcamentosWorkspace } from '../OrcamentosWorkspace';

type OrcamentoDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrcamentoDetalhePage({
  params,
}: OrcamentoDetalhePageProps) {
  const sessao = await getAuthSession();

  if (!sessao) {
    redirect('/login');
  }

  if (sessao.role !== 'ADMIN') {
    redirect('/admin');
  }

  const { id } = await params;
  const [lista, orcamento, clientes, produtos] = await Promise.all([
    listarOrcamentos(),
    buscarOrcamentoPorId(id),
    listarClientesParaOrcamento(),
    listarProdutosCatalogo(),
  ]);

  if (!orcamento) {
    notFound();
  }

  return (
    <OrcamentosWorkspace
      listaInicial={lista}
      orcamentoInicial={orcamento}
      clientesIniciais={clientes}
      produtosIniciais={produtos}
    />
  );
}
