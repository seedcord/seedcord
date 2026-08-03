'use client';

import { useEffect } from 'react';

import { logConsoleGreeting } from '@lib/consoleGreeting';

import type { ReactNode } from 'react';

export function ConsoleGreeting(): ReactNode {
    useEffect(() => {
        logConsoleGreeting();
    }, []);
    return null;
}
