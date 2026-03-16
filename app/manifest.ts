import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zhiyou AI Assistant',
    short_name: 'Zhiyou',
    description: 'Zhiyou AI Assistant powered by Gemini',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon-512.svg?v=4',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icon192?v=4',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon?v=4',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon?v=4',
        sizes: '180x180',
        type: 'image/png',
      }
    ],
  }
}
