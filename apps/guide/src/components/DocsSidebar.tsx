'use client';

import {
    Disclosure,
    DisclosureChevron,
    DisclosurePanel,
    DisclosureTrigger,
    cn,
    isActiveHref,
    tw,
    useDisclosure
} from '@seedcord/ui';
import Link from 'next/link';
import { Fragment, useEffect } from 'react';

import type { ReactElement } from 'react';
import type { Except } from 'type-fest';

export interface SidebarLink {
    label: string;
    href: string;
}

// pages that a tab lists before its first separator
interface LeadSection {
    kind: 'lead';
    links: readonly SidebarLink[];
}

interface SidebarGroup {
    kind: 'group';
    label: string;
    storageKey: string;
    defaultOpen: boolean;
    links: readonly SidebarLink[];
}

export type SidebarSection = LeadSection | SidebarGroup;

export interface DocsSidebarProps {
    sections: readonly SidebarSection[];
    activeHref: string;
    onNavigate?: (() => void) | undefined;
    className?: string | undefined;
}

const rowClassName = cn(
    tw`rounded-md px-3 py-2 text-sm`,
    tw`transition-colors duration-100 ease-out`,
    tw`hover:bg-(--bg-accent-a-transparent-moderate) hover:text-(--text)`,
    tw`focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-outline-b)`
);

const linkClassName = cn(rowClassName, 'block');
const groupTriggerClassName = cn(rowClassName, 'justify-between font-medium text-(--text)');

interface LinksProps {
    links: readonly SidebarLink[];
    activeHref: string;
    onNavigate: (() => void) | undefined;
}

function Links({ links, activeHref, onNavigate }: LinksProps): ReactElement[] {
    return links.map((link) => {
        const active = isActiveHref(activeHref, link.href);
        return (
            <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                {...(onNavigate ? { onClick: onNavigate } : {})}
                className={cn(
                    linkClassName,
                    active ? 'bg-(--bg-light-moderate) font-medium text-(--text)' : 'text-(--text-muted)'
                )}
            >
                {link.label}
            </Link>
        );
    });
}

function OpenWhenActive({ active }: { active: boolean }): null {
    const { setOpen } = useDisclosure();
    useEffect(() => {
        if (active) setOpen(true);
    }, [active, setOpen]);
    return null;
}

interface GroupProps extends Except<LinksProps, 'links'> {
    group: SidebarGroup;
}

function Group({ group, activeHref, onNavigate }: GroupProps): ReactElement {
    const holdsActive = group.links.some((link) => isActiveHref(activeHref, link.href));

    return (
        <Disclosure defaultOpen={group.defaultOpen || holdsActive} storageKey={group.storageKey}>
            <OpenWhenActive active={holdsActive} />
            <DisclosureTrigger className={cn(groupTriggerClassName)}>
                {group.label}
                <DisclosureChevron />
            </DisclosureTrigger>
            <DisclosurePanel>
                <div className={cn('ms-3 border-s border-(--border) ps-2')}>
                    <Links links={group.links} activeHref={activeHref} onNavigate={onNavigate} />
                </div>
            </DisclosurePanel>
        </Disclosure>
    );
}

export function DocsSidebar({ sections, activeHref, onNavigate, className }: DocsSidebarProps): ReactElement {
    return (
        <nav aria-label="Section pages" className={cn('flex flex-col gap-1', className)}>
            {sections.map((section) =>
                section.kind === 'group' ? (
                    <Group key={section.storageKey} group={section} activeHref={activeHref} onNavigate={onNavigate} />
                ) : (
                    <Fragment key="lead">
                        <Links links={section.links} activeHref={activeHref} onNavigate={onNavigate} />
                    </Fragment>
                )
            )}
        </nav>
    );
}
