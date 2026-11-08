import { BRAND_COLORS } from '@seedcord/brand';
import { AgentLinks, cn, HOME_URL, MotionProvider, seedcordJsonLd, SkipLink } from '@seedcord/ui';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';

import './globals.css';

import { ConsoleGreeting } from '#components/ConsoleGreeting';
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#lib/site';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const display = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });
const monoCode = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], display: 'swap' });

const TITLE = 'seedcord, a TypeScript framework for Discord bots, typed end to end';

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
        { media: '(prefers-color-scheme: light)', color: BRAND_COLORS.seedDark },
        { media: '(prefers-color-scheme: dark)', color: BRAND_COLORS.pith }
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
                <AgentLinks site="home" />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
                <SkipLink />
                <ConsoleGreeting />
                <MotionProvider>{children}</MotionProvider>
            </body>
        </html>
    );
}

export default RootLayout;
