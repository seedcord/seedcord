'use client';

import { Dropdown, cn, useMobilePanelContainer } from '@seedcord/ui';
import { useState } from 'react';

import { DocsSidebar } from './DocsSidebar';

import type { GuideTab, SidebarsByTab } from '#lib/nav';
import type { DropdownOption } from '@seedcord/ui';
import type { ReactElement } from 'react';

export interface MobileNavProps {
    tabs: readonly GuideTab[];
    activeHref: string;
    sidebars: SidebarsByTab;
    pathname: string;
    onNavigate: () => void;
}

export function MobileNav({ tabs, activeHref, sidebars, pathname, onNavigate }: MobileNavProps): ReactElement {
    const panelContainer = useMobilePanelContainer();
    const [picked, setPicked] = useState<string | undefined>(undefined);
    const browsing = picked ?? activeHref;
    const options: readonly DropdownOption[] = tabs.map((tab) => ({ value: tab.href, label: tab.label }));
    const sections = sidebars[browsing] ?? [];

    return (
        <>
            <Dropdown
                aria-label="Section"
                placeholderLabel="Section"
                value={browsing}
                options={options}
                onChange={setPicked}
                container={panelContainer}
                // without this a long list squashes the trigger to 24px against the panel's 80vh cap
                className={cn('shrink-0')}
            />
            <DocsSidebar
                sections={sections}
                activeHref={pathname}
                className={cn('nice-scroll mt-5 min-h-0 overflow-y-auto overscroll-contain')}
                onNavigate={onNavigate}
            />
        </>
    );
}
