import '@mantine/core/styles.layer.css';
import '@mantine/notifications/styles.layer.css';
import '@mantine/carousel/styles.layer.css';
import '@mantine/charts/styles.layer.css';
import 'mantine-datatable/styles.layer.css';
import '@/app/global.css'

import { ColorSchemeScript } from '@mantine/core';
import type { Metadata, Viewport } from "next";
import { getSiteUrl } from './util/siteUrl';
import Providers from './providers';
import { EnvScript, PublicEnvScript } from 'next-runtime-env';
import { getLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import ForceLogin from './components/authentication/ForceLogin';

const SITE_NAME = "DuckVOD";
const SITE_DESCRIPTION = "DuckVOD archiviert Twitch-VODs und Livestreams der DuckSquad Community – mit gerendertem Echtzeit-Chat, der sich auch außerhalb von DuckVOD ansehen lässt. Verpasste Quaks? Hier kannst du alles nachwatscheln.";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  const locale = await getLocale();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${SITE_NAME} – Twitch-VOD- und Livestream-Archiv mit Chat`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
      "DuckVOD",
      "DuckSquad",
      "Twitch VOD",
      "Twitch Archiv",
      "Livestream Archiv",
      "Stream verpasst",
      "Twitch Chat Replay",
      "VOD mit Chat",
    ],
    authors: [{ name: "DuckSquad Community" }],
    creator: "DuckSquad Community",
    publisher: "DuckSquad Community",
    category: "entertainment",
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${SITE_NAME} – Twitch-VOD- und Livestream-Archiv mit Chat`,
      description: SITE_DESCRIPTION,
      locale: locale === "de" ? "de_DE" : locale === "uk" ? "uk_UA" : "en_US",
      images: [{ url: "/android-chrome-512x512.png", width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary",
      title: `${SITE_NAME} – Twitch-VOD- und Livestream-Archiv mit Chat`,
      description: SITE_DESCRIPTION,
      images: ["/android-chrome-512x512.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    icons: {
      icon: [
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0c15" },
    { media: "(prefers-color-scheme: light)", color: "#f6f5fb" },
  ],
};

// structured data so search engines understand what the site is
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  publisher: { "@type": "Organization", name: "DuckSquad Community" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const locale = await getLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <PublicEnvScript />
        <EnvScript
          env={{
            NEXT_PUBLIC_SHOW_SSO_LOGIN_BUTTON: process.env.SHOW_SSO_LOGIN_BUTTON,
            NEXT_PUBLIC_FORCE_SSO_AUTH: process.env.FORCE_SSO_AUTH,
            NEXT_PUBLIC_REQUIRE_LOGIN: process.env.REQUIRE_LOGIN,
            NEXT_PUBLIC_API_URL: process.env.API_URL,
            NEXT_PUBLIC_CDN_URL: process.env.CDN_URL,
            NEXT_PUBLIC_SHOW_LOCALE_BUTTON: process.env.SHOW_LOCALE_BUTTON,
            NEXT_PUBLIC_DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
            NEXT_PUBLIC_FORCE_LOGIN: process.env.FORCE_LOGIN,
          }}
        />
        <ColorSchemeScript defaultColorScheme='dark' />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>

        <NextIntlClientProvider>
          <Providers>
            {/* ForceLogin prevents rendering the rest of the page if login is required */}
            <ForceLogin>{children}</ForceLogin>
          </Providers>
        </NextIntlClientProvider>

      </body>
    </html>
  );
}
