import { redirect } from 'next/navigation';
import { getAuthSession } from '../../../../../lib/auth-session';
import { listarClientesParaOrcamento } from '../../../../actions/orcamentos';
import { ClientesCatalogoPage } from '../ClientesCatalogoPage';

export default async function OrcamentosClientesPage() {
  const sessao = await getAuthSession();

  if (!sessao) {
    redirect('/login');
  }

  if (sessao.role !== 'ADMIN') {
    redirect('/admin');
  }

  const clientes = await listarClientesParaOrcamento();

  return <ClientesCatalogoPage clientes={clientes} />;
}
