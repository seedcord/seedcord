'use client';

import React from 'react';

import type { MemberAccessLevel } from '@lib/memberAccess';

export interface DocsUISnapshot {
    selectedPackage?: string | undefined;
    selectedVersion?: string | undefined;
    memberAccessLevel?: MemberAccessLevel | undefined;
}

export const DocsUIContext = React.createContext<DocsUISnapshot | undefined>(undefined);

function DocsUIProvider({ value, children }: { value: DocsUISnapshot; children: React.ReactNode }): React.ReactElement {
    return <DocsUIContext.Provider value={value}>{children}</DocsUIContext.Provider>;
}

export default DocsUIProvider;
