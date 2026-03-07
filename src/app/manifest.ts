import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Klondike Solitaire',
    short_name: 'Solitaire',
    description: 'Classic Klondike Solitaire card game',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d7a3e',
    theme_color: '#0d7a3e',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
