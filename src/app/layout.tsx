import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { SITE } from '@/shared/constants/site';
import { Providers } from '@/app/providers';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // `metadataBase` is what makes relative OG/twitter image paths resolve to
  // absolute URLs — without it they silently break once shared.
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    // Pages set only their own title; the suffix is applied here.
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang={SITE.locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
