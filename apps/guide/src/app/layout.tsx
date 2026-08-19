import { BRAND } from '@seedcord/ui/palette';
import { cn } from '@seedcord/ui';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';

import './globals.css';

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#lib/site';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const display = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });
const monoCode = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME, template: '%s · seedcord guide' },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    // flip this once the guide has real pages
    robots: { index: false, follow: false }
};

export const viewport: Viewport = {
    themeColor: BRAND.pith
};

interface RootLayoutProps {
    children: ReactNode;
}

function RootLayout({ children }: RootLayoutProps): ReactNode {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                // this avoids a false mismatch warning because browser extensions mutate body attributes before hydration
                suppressHydrationWarning
                className={cn(display.variable, monoCode.variable, 'antialiased', 'flex min-h-screen flex-col')}
            >
                <RootProvider theme={{ attribute: 'data-theme', storageKey: 'theme' }}>{children}</RootProvider>
            </body>
        </html>
    );
}

export default RootLayout;
