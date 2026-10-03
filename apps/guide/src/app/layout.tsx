import { APPLE_ICON_SIZE, FAVICON_SIZE } from '@seedcord/ui/MaterwelonFavicon';
import { BRAND } from '@seedcord/ui/palette';
import { AgentLinks, GUIDE, MotionProvider, ThemeProvider, cn, seedcordJsonLd } from '@seedcord/ui';
import { Space_Grotesk } from 'next/font/google';

import './globals.css';

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#lib/site';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const display = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });

const ICON = { type: 'image/png', sizes: `${FAVICON_SIZE.width}x${FAVICON_SIZE.height}` };
const APPLE_ICON = { type: 'image/png', sizes: `${APPLE_ICON_SIZE.width}x${APPLE_ICON_SIZE.height}` };

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME, template: '%s · seedcord guide' },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    // next 16.3.8 leaves basePath off icon urls in metadata and off a file-based icon under turbopack
    icons: {
        icon: [{ url: `${GUIDE.path}/icon`, ...ICON }],
        apple: [{ url: `${GUIDE.path}/apple-icon`, ...APPLE_ICON }]
    }
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: BRAND.seedDark },
        { media: '(prefers-color-scheme: dark)', color: BRAND.pith }
    ]
};

const jsonLd = seedcordJsonLd({ name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION });

interface RootLayoutProps {
    children: ReactNode;
}

function RootLayout({ children }: RootLayoutProps): ReactNode {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                // extensions mutate body attributes before react hydrates
                suppressHydrationWarning
                className={cn(display.variable, 'antialiased', 'flex min-h-screen flex-col')}
            >
                <AgentLinks site="guide" />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
                <ThemeProvider>
                    {/* apps/docs repeats this class string, change both */}
                    <a
                        href="#main-content"
                        className={cn(
                            'fixed top-4 left-6 z-60 -translate-y-20 transform rounded-full bg-(--rind) px-4 py-2 text-sm font-semibold text-black transition focus-visible:translate-y-0'
                        )}
                    >
                        Skip to content
                    </a>
                    <MotionProvider>{children}</MotionProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}

export default RootLayout;
