import type { Metadata } from "next";
import Link from 'next/link';
import "../globals.css";

export const metadata: Metadata = {
  title: "Infotche - Tecnologia em Conectividade",
  description: "Fibra óptica de ultravelocidade em Santa Bárbara do Sul",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="fundo-site">
        {/* CABEÇALHO GLOBAL DO SITE - Agora com a classe header-site isolada */}
        <header className="header-site">
          <div className="logo-container">
            <Link href="/">
              <img src="/logo.png" alt="Infotche" className="logo-image" />
            </Link>
          </div>

          <nav>
            <Link href="/">Home</Link>
            <Link href="/#servicos">Serviços</Link>
            <Link href="/#contato">Contato</Link>
            <Link href="/webmail"><span className="icon-mail">✉</span> Webmail</Link>
          </nav>

          <div className="cta-container">
            <a href="https://wa.me/5555996767778" target="_blank" rel="noopener noreferrer" className="btn-orcamento">
              Orçamento WhatsApp
            </a>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        {children}
      </body>
    </html>
  );
}