import { cn } from '@seedcord/ui';
import { Hanken_Grotesk, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const sans = Hanken_Grotesk({ variable: '--font-sans', subsets: ['latin'], display: 'swap' });
const display = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });
const monoCode = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
    title: 'seedcord — a typed framework for Discord bots',
    description:
        'A TypeScript framework for Discord bots. Generated slash-option types, a typed customId codec, composable gates, and hot reload.'
};

interface RootLayoutProps {
    children: ReactNode;
}

function RootLayout({ children }: RootLayoutProps): ReactNode {
    return (
        <html lang="en">
            <body className={cn(sans.variable, display.variable, monoCode.variable, 'antialiased')}>{children}</body>
        </html>
    );
}

export default RootLayout;
