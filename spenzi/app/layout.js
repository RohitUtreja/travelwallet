import './globals.css'
import Providers from './providers'
import { appHeight } from '@/lib/appHeight'

export const metadata = {
  title: 'FamilyWallet',
  description: 'Shared household spending, beautifully simple',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'FamilyWallet' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
  themeColor: '#12100e',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          // sets --app-h before first paint so the layout never flashes at the wrong height
          dangerouslySetInnerHTML={{ __html: `try{document.documentElement.style.setProperty('--app-h',(${appHeight.toString()})()+'px')}catch(e){}` }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function (e) { console.warn('SW registration failed:', e) }) }) }`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
