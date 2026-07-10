'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

import type { ReactElement, ReactNode } from 'react';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
    return (
        <NextThemesProvider
            attribute="data-theme"
            defaultTheme="light"
            enableSystem
            storageKey="theme"
            disableTransitionOnChange
        >
            {children}
        </NextThemesProvider>
    );
}
