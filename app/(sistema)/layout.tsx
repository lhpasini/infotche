import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin - Infotchê",
};

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="sistema-layout">
          {children}
        </div>
      </body>
    </html>
  );
}