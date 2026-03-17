export const metadata = {
  title: 'Infotchê - Painel de Gestão',
  description: 'Sistema de gestão de atendimentos e clientes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, boxSizing: 'border-box', background: '#eef2f5' }}>
        {children}
      </body>
    </html>
  );
}