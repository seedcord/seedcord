import { BRAND } from '@seedcord/ui/palette';
import { MotionProvider, ThemeProvider, cn } from '@seedcord/ui';
import { Space_Grotesk } from 'next/font/google';

import './globals.css';

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#lib/site';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const display = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });

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
                className={cn(display.variable, 'antialiased', 'flex min-h-screen flex-col')}
            >
                <ThemeProvider>
                    {/* the reference site's own skip link, class for class */}
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
