import type { Metadata } from "next";
// Voltamos 1 nível para achar o globals.css dentro da pasta app
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
    <div className="sistema-layout">
      {children}
    </div>
  );
}