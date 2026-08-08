import { cn } from '@seedcord/ui';
import { Hanken_Grotesk, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

import './globals.css';

import { ConsoleGreeting } from '@components/ConsoleGreeting';
import { DEFAULT_OG_IMAGE, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@lib/site';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const sans = Hanken_Grotesk({ variable: '--font-sans', subsets: ['latin'], display: 'swap' });
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
    themeColor: '#f8f6e8'
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    codeRepository: REPO_URL,
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Node.js',
    license: 'https://www.apache.org/licenses/LICENSE-2.0',
    author: { '@type': 'Person', name: 'Dhruv', url: 'https://github.com/materwelonDhruv' }
};

interface RootLayoutProps {
    children: ReactNode;
}

function RootLayout({ children }: RootLayoutProps): ReactNode {
    return (
        <html lang="en">
            <body
                // this avoids a false mismatch warning because browser extensions mutate body attributes before hydration
                suppressHydrationWarning
                className={cn(sans.variable, display.variable, monoCode.variable, 'antialiased')}
            >
                <script
                    type="application/ld+json"
                    // escape < so the JSON can't break out of the script tag
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
                />
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
