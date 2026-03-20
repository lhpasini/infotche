import type { Metadata, Viewport } from 'next';

import '../../globals.css';
import { PwaRegistrar } from './PwaRegistrar';

export const metadata: Metadata = {
  title: 'Infotche Tecnico',
  description: 'Modulo mobile para tecnicos registrarem equipamentos em campo.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Infotche Tecnico',
  },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/tecnico-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/tecnico-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#082f49',
};

export default function TecnicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-100 text-slate-900">
      <PwaRegistrar />
      {children}
    </div>
  );
}
