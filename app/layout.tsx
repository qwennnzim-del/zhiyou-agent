import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import { Providers } from './providers';

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Zhiyou AI | Asisten AI Cerdas oleh M Fariz Alfauzi - SEO & AI Engineer',
  description: 'Zhiyou AI adalah asisten kecerdasan buatan serbaguna buatan M Fariz Alfauzi, seorang AI Engineer dan SEO Engineer ahli. Fitur unggulan meliputi Chat AI, Deep Research, Image Generation (Pembuatan Gambar), Image Search, dan Guided Learning. Dikembangkan di Zent Technology GH, Karawang, Indonesia.',
  keywords: ['M Fariz Alfauzi', 'SEO Engineer', 'AI Engineer', 'Zhiyou AI', 'Asisten AI', 'Chatbot AI Indonesia', 'Pembuatan Gambar AI', 'Deep Research AI', 'Guided Learning AI', 'Zent Technology GH'],
  authors: [{ name: 'M Fariz Alfauzi', url: 'https://zent.technology' }],
  creator: 'M Fariz Alfauzi',
  publisher: 'Zent Technology GH',
  metadataBase: new URL('https://zhiyou-ai.vercel.app/'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Zhiyou AI | Asisten AI Cerdas oleh M Fariz Alfauzi - SEO & AI Engineer',
    description: 'Zhiyou AI adalah platform AI multifungsi karya M Fariz Alfauzi (AI Engineer & SEO Engineer). Menawarkan fitur Chat Cerdas, Pembuatan Gambar AI, Riset Mendalam (Deep Research), dan Pembelajaran Terpandu (Guided Learning).',
    siteName: 'Zhiyou AI by M Fariz Alfauzi',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zhiyou AI | Asisten AI Cerdas oleh M Fariz Alfauzi',
    description: 'Platform AI inovatif ciptaan M Fariz Alfauzi (AI Engineer & SEO Engineer). Fitur: Chat AI, Deep Research, Image Generation, & Guided Learning.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zhiyou AI',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="U1n-y8RlFf7-B3gJQgjQpM1v4HOPrBhhoXKxGjI86pA" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Zhiyou AI",
              "url": "https://zhiyou-ai.vercel.app/",
              "description": "Zhiyou AI adalah asisten kecerdasan buatan multifungsi yang menyediakan fitur Chat AI, Riset Mendalam (Deep Research), Pembuatan Gambar, dan Pembelajaran Terpandu. Dirancang oleh M Fariz Alfauzi.",
              "applicationCategory": "ProductivityApplication",
              "author": {
                "@type": "Person",
                "name": "M Fariz Alfauzi",
                "jobTitle": "SEO Engineer & AI Engineer",
                "url": "https://zent.technology"
              },
              "creator": {
                "@type": "Person",
                "name": "M Fariz Alfauzi",
                "jobTitle": "SEO Engineer & AI Engineer",
                "worksFor": {
                  "@type": "Organization",
                  "name": "Zent Technology GH"
                }
              }
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
