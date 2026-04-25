import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";
import { SITE_URL } from "@/lib/siteConfig";

const inter = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KEZA — Cash ou Miles ?",
  description: "Compare the real cost of every option — cash, miles or transfer — on any flight, anywhere in the world. | Comparez cash vs miles sur chaque vol, partout dans le monde.",
  manifest: "/manifest.json",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "KEZA — Cash ou Miles ?",
    description: "Comparez le vrai coût de chaque vol : cash, miles ou transfert. Trouvez la meilleure option en 1 clic.",
    url: SITE_URL,
    siteName: "KEZA",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KEZA — Cash ou Miles ?",
    description: "Cash, miles ou transfert ? KEZA compare en temps réel et vous dit quoi choisir.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KEZA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#3b82f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://plausible.io" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("keza_theme");if(!t)t="dark";if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark")}else{document.documentElement.setAttribute("data-theme","light")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        {/* WebSite structured data — enables Google sitelinks search box */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "KEZA",
              url: SITE_URL,
              description: "Comparez cash vs miles sur chaque vol — trouvez la meilleure option en 1 clic.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE_URL}/?from={from}&to={to}`,
                },
                "query-input": ["required name=from", "required name=to"],
              },
            }),
          }}
        />
        {children}
        <SpeedInsights />
        <Script
          async
          src="https://plausible.io/js/pa--f94oxZFO8yrXtN46QpIJ.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init();`}
        </Script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
