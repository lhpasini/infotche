import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '../../../../../../lib/auth-session';
import { buscarOrcamentoPorId } from '../../../../../actions/orcamentos';
import { OrcamentoPreview } from '../../components/OrcamentoPreview';
import { PrintButton } from '../../components/PrintButton';

type OrcamentoImpressaoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrcamentoImpressaoPage({
  params,
}: OrcamentoImpressaoPageProps) {
  const sessao = await getAuthSession();

  if (!sessao) {
    redirect('/login');
  }

  if (sessao.role !== 'ADMIN') {
    redirect('/admin');
  }

  const { id } = await params;
  const orcamento = await buscarOrcamentoPorId(id);

  if (!orcamento) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between print:hidden">
        <Link
          href={`/admin/orcamentos/${id}`}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
        >
          Voltar ao editor
        </Link>
        <PrintButton />
      </div>

      <OrcamentoPreview orcamento={orcamento} modo="impressao" />
    </main>
  );
}
