import { ThemeProvider, TooltipProvider, cn } from '@seedcord/ui';
import { Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import { preconnect } from 'react-dom';

import './globals.css';

import { Navbar } from '#components/header/Navbar';
import { HotkeyProvider } from '#components/providers/HotkeyProvider';
import { MotionProvider } from '#components/providers/MotionProvider';
import { CommandPalette } from '#components/search/command-palette';
import { FOREGROUND_HEX } from '#lib/entityColors';
import { OG_IMAGE_H, OG_IMAGE_W, OG_SITE_NAME, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#lib/site';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

// code keeps tailwind's ui-monospace default. a webfont mono at 12px sits a pixel high in the chips
const display = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: 'seedcord docs', template: '%s · seedcord' },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    openGraph: {
        type: 'website',
        siteName: OG_SITE_NAME,
        url: SITE_URL,
        locale: 'en_US',
        title: 'seedcord docs',
        description: SITE_DESCRIPTION,
        images: [{ url: '/og', width: OG_IMAGE_W, height: OG_IMAGE_H, alt: 'seedcord docs' }]
    },
    twitter: {
        card: 'summary_large_image',
        title: 'seedcord docs',
        description: SITE_DESCRIPTION,
        images: ['/og']
    }
};

// default embed stripe for pages without their own tone (root, overview, 404)
export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: FOREGROUND_HEX.light },
        { media: '(prefers-color-scheme: dark)', color: FOREGROUND_HEX.dark }
    ]
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
    // the R2-backed CDN serves the README banner, the page's LCP image
    preconnect('https://cdn.seedcord.org');

    return (
        <html lang="en" suppressHydrationWarning>
            <body
                suppressHydrationWarning
                className={cn(display.variable, 'antialiased')}
                data-new-gr-c-s-check-loaded=""
                data-gr-ext-installed=""
            >
                <script
                    type="application/ld+json"
                    // escape < so the JSON can't break out of the script tag
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
                />
                <Script id="strip-grammarly-attributes" strategy="beforeInteractive">
                    {`
                        (function () {
                            var ATTRIBUTES = ['data-new-gr-c-s-check-loaded', 'data-gr-ext-installed'];
                            var selector = ATTRIBUTES.map(function (attr) {
                                return '[' + attr + ']';
                            }).join(',');

                            function stripAttributes() {
                                if (!selector) {
                                    return;
                                }

                                var nodes = document.querySelectorAll(selector);

                                Array.prototype.forEach.call(nodes, function (node) {
                                    ATTRIBUTES.forEach(function (attr) {
                                        if (node.hasAttribute && node.hasAttribute(attr)) {
                                            node.removeAttribute(attr);
                                        }
                                    });
                                });
                            }

                            // justified: Grammarly re-injects its attributes asynchronously after the initial strip, the deferred pass catches the second wave before hydration matches the DOM.
                            function runCleanup() {
                                stripAttributes();
                                setTimeout(stripAttributes, 0);
                            }

                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', runCleanup, { once: true });
                            } else {
                                runCleanup();
                            }
                        })();
                    `}
                </Script>
                <ThemeProvider>
                    <MotionProvider>
                        <TooltipProvider>
                            <HotkeyProvider>
                                <CommandPalette />
                                <a
                                    href="#main-content"
                                    className={cn(
                                        'fixed top-4 left-6 z-60 -translate-y-20 transform rounded-full bg-(--rind) px-4 py-2 text-sm font-semibold text-black transition focus-visible:translate-y-0'
                                    )}
                                >
                                    Skip to content
                                </a>
                                <div className={cn('flex min-h-screen flex-col')}>
                                    <Navbar />
                                    <div className={cn('flex-1 pt-(--nav-h)')}>{children}</div>
                                </div>
                            </HotkeyProvider>
                        </TooltipProvider>
                    </MotionProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}

export default RootLayout;
