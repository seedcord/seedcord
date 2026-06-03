import { TooltipProvider, cn } from '@seedcord/ui';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import './globals.css';

import { Navbar } from '@components/header/Navbar';
import { HotkeyProvider } from '@components/providers/HotkeyProvider';
import { MotionProvider } from '@components/providers/MotionProvider';
import { ThemeProvider } from '@components/providers/ThemeProvider';
import { CommandPalette } from '@components/search/command-palette';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin']
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin']
});

export const metadata: Metadata = {
    title: 'seedcord',
    description: 'Api documentation for the Seedcord Bot Framework for Discord.js',
    icons: {
        icon: '/icon.svg'
    }
};

interface RootLayoutProps {
    children: ReactNode;
}

function RootLayout({ children }: RootLayoutProps): ReactNode {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                suppressHydrationWarning
                className={cn(`${geistSans.variable} ${geistMono.variable} antialiased`)}
                data-new-gr-c-s-check-loaded=""
                data-gr-ext-installed=""
            >
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
                                        'fixed top-4 left-6 z-60 -translate-y-20 transform rounded-full bg-(--accent-b) px-4 py-2 text-sm font-semibold text-black transition focus-visible:translate-y-0'
                                    )}
                                >
                                    Skip to content
                                </a>
                                <div className={cn('flex min-h-screen flex-col')}>
                                    <Navbar />
                                    <div className={cn('flex-1')}>{children}</div>
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
