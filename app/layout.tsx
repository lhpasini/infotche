import type { Metadata } from "next";
import Link from 'next/link';
import "./globals.css";

export const metadata: Metadata = {
  title: "Infotche - Tecnologia em Conectividade",
  description: "Fibra óptica de ultravelocidade em Santa Bárbara do Sul",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        {/* CABEÇALHO GLOBAL: Aparece em todas as páginas automaticamente */}
        <header>
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

        {/* Aqui é onde o conteúdo das outras páginas é injetado */}
        {children}
      </body>
    </html>
  );
}