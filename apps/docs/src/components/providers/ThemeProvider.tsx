'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

import type { ReactElement, ReactNode } from 'react';

interface ThemeProviderProps {
    children: ReactNode;
}

function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
    return (
        <NextThemesProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="theme">
            {children}
        </NextThemesProvider>
    );
}

export default ThemeProvider;
