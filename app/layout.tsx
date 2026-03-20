import './globals.css';

export const metadata = {
  title: 'Infotche - Painel de Gestao',
  description: 'Sistema de gestao de atendimentos e clientes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
