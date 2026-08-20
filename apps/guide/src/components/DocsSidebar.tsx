'use client';

import { cn, isActiveHref, tw } from '@seedcord/ui';
import Link from 'next/link';

import type { ReactElement } from 'react';

export interface SidebarLink {
    label: string;
    href: string;
}

export interface SidebarSection {
    label?: string | undefined;
    links: readonly SidebarLink[];
}

export interface DocsSidebarProps {
    sections: readonly SidebarSection[];
    activeHref?: string | undefined;
    onNavigate?: (() => void) | undefined;
    className?: string | undefined;
}

const sectionLabelClassName = tw`mb-2 px-3 text-xs font-semibold tracking-widest text-(--text-faint) uppercase`;

const linkClassName = cn(
    tw`block rounded-md px-3 py-2 text-sm`,
    tw`transition-colors duration-100 ease-out`,
    tw`hover:bg-(--bg-accent-a-transparent-moderate) hover:text-(--text)`,
    tw`focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-outline-b)`
);

export function DocsSidebar({ sections, activeHref, onNavigate, className }: DocsSidebarProps): ReactElement {
    return (
        <nav aria-label="Section pages" className={cn(className)}>
            {sections.map((section, index) => (
                <div
                    key={section.label ?? 'top'}
                    className={cn('pb-1', index > 0 && 'mt-4 border-t border-(--border) pt-4')}
                >
                    {section.label ? <p className={cn(sectionLabelClassName)}>{section.label}</p> : null}
                    {section.links.map((link) => {
                        const active = activeHref !== undefined && isActiveHref(activeHref, link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={active ? 'page' : undefined}
                                {...(onNavigate ? { onClick: onNavigate } : {})}
                                className={cn(
                                    linkClassName,
                                    active
                                        ? 'bg-(--bg-light-moderate) font-medium text-(--text)'
                                        : 'text-(--text-muted)'
                                )}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}
