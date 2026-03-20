import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Infotche Tecnico',
    short_name: 'Infotche',
    description: 'Registro mobile de equipamentos e historico tecnico da Infotche.',
    start_url: '/tecnico',
    scope: '/tecnico',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#eef6ff',
    theme_color: '#082f49',
    lang: 'pt-BR',
    icons: [
      {
        src: '/tecnico-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/tecnico-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
