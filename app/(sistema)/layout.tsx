import type { Metadata } from "next";
import "@/app/globals.css"; 

export const metadata: Metadata = {
  title: "Admin - Infotche",
};

export default function SistemaLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="bg-[#f3f4f6] m-0 p-0 overflow-hidden text-gray-800 font-sans">
        {children}
      </body>
    </html>
  );
}