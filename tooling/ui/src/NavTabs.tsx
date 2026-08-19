'use client';

import { LayoutGroup, m, useReducedMotion } from 'motion/react';
import { useId } from 'react';

import { cn } from './lib/cn';
import { layoutSpring } from './lib/motion';
import { PlainLink } from './lib/navLink';

import type { NavLinkComponent } from './lib/navLink';
import type { ReactElement, ReactNode } from 'react';

export interface NavTabItem {
    label: string;
    href: string;
}

const tabClassName = cn(
    'relative inline-flex items-center px-3 py-2.5 text-[12.5px] font-semibold whitespace-nowrap',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-outline-b)'
);

function isActive(href: string, current: string): boolean {
    if (href === '/') return current === '/';
    return current === href || current.startsWith(`${href}/`);
}

export interface NavTabsProps {
    items: readonly NavTabItem[];
    activeHref: string;
    trailing?: ReactNode;
    linkAs?: NavLinkComponent | undefined;
    className?: string | undefined;
}

export function NavTabs({ items, activeHref, trailing, linkAs, className }: NavTabsProps): ReactElement {
    const Link = linkAs ?? PlainLink;
    const reducedMotion = useReducedMotion() ?? false;
    const groupId = useId();
    const underlineId = `nav-tabs-underline-${groupId}`;

    return (
        <LayoutGroup id={groupId}>
            <nav
                aria-label="Sections"
                className={cn('nice-scroll flex w-full items-center gap-1 overflow-x-auto', className)}
            >
                {items.map((item) => {
                    const active = isActive(item.href, activeHref);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                tabClassName,
                                active ? 'text-(--flesh)' : 'text-(--text-muted) hover:text-(--text)'
                            )}
                        >
                            {item.label}
                            {active ? (
                                <m.span
                                    layoutId={underlineId}
                                    aria-hidden
                                    transition={reducedMotion ? { duration: 0 } : layoutSpring}
                                    className={cn('absolute inset-x-0 -bottom-px h-0.5 bg-(--flesh)')}
                                />
                            ) : null}
                        </Link>
                    );
                })}
                {trailing ? <div className={cn('ml-auto flex shrink-0 items-center pl-4')}>{trailing}</div> : null}
            </nav>
        </LayoutGroup>
    );
}
