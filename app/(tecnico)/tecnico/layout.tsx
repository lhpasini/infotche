import '../../globals.css';

export default function TecnicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-slate-100 text-slate-900">{children}</div>;
}
