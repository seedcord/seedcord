import { BRAND } from '@seedcord/ui/palette';
import { cn, HOME_URL, seedcordJsonLd } from '@seedcord/ui';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';

import './globals.css';

import { ConsoleGreeting } from '#components/ConsoleGreeting';
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#lib/site';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const display = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });
const monoCode = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], display: 'swap' });

const TITLE = 'seedcord, a typed framework for Discord bots';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: TITLE, template: '%s · seedcord' },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    alternates: { canonical: '/' },
    openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        url: SITE_URL,
        locale: 'en_US',
        title: TITLE,
        description: SITE_DESCRIPTION,
        images: [DEFAULT_OG_IMAGE]
    },
    twitter: {
        card: 'summary_large_image',
        title: TITLE,
        description: SITE_DESCRIPTION,
        images: [DEFAULT_OG_IMAGE]
    }
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: BRAND.seedDark },
        { media: '(prefers-color-scheme: dark)', color: BRAND.pith }
    ]
};

const jsonLd = seedcordJsonLd({ name: SITE_NAME, url: HOME_URL, description: SITE_DESCRIPTION });

interface RootLayoutProps {
    children: ReactNode;
}

function RootLayout({ children }: RootLayoutProps): ReactNode {
    return (
        <html lang="en">
            <body
                // extensions mutate body attributes before react hydrates
                suppressHydrationWarning
                className={cn(display.variable, monoCode.variable, 'antialiased')}
            >
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
                <a
                    href="#main-content"
                    className={cn(
                        'sr-only rounded-sm bg-(--seed-dark) px-4 py-2 font-semibold text-(--pith) focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100'
                    )}
                >
                    Skip to content
                </a>
                <ConsoleGreeting />
                {children}
            </body>
        </html>
    );
}

export default RootLayout;
