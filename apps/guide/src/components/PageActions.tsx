'use client';

import { Button, cn, GithubIcon, Popover, PopoverContent, PopoverTrigger, tw } from '@seedcord/ui';
import { ArrowUpRight, ChevronDown, FileText, MessageSquareWarning } from 'lucide-react';
import { useState } from 'react';

import { AssistantIcon } from '#components/AssistantIcons';
import { CopyPageButton } from '#components/CopyPageButton';

import type { PageActionLinks } from '#lib/pageActions';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

export interface PageActionsProps {
    copySource: string;
    viewHref: string;
    links: PageActionLinks;
    className?: string | undefined;
}

interface ActionItem {
    href: string;
    label: string;
    icon: ReactNode;
}

const rowClassName = cn(
    tw`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm`,
    tw`text-(--text) transition-colors duration-100 ease-out`,
    tw`hover:bg-(--bg-accent-b-moderate) focus-visible:bg-(--bg-accent-b-moderate) focus-visible:outline-hidden`
);

function lucide(Icon: LucideIcon): ReactNode {
    return <Icon size={16} aria-hidden className={cn('shrink-0 text-(--text-faint)')} />;
}

function itemsFor(viewHref: string, links: PageActionLinks): ActionItem[] {
    return [
        { href: viewHref, label: 'View as Markdown', icon: lucide(FileText) },
        {
            href: links.edit,
            label: 'Edit on GitHub',
            // a stroke of 16 in a 192 box matches lucide's 2 in a 24 box
            icon: <GithubIcon size={16} strokeWidth={16} aria-hidden className={cn('shrink-0 text-(--text-faint)')} />
        },
        { href: links.report, label: 'Report a problem', icon: lucide(MessageSquareWarning) },
        { href: links.claude, label: 'Open in Claude', icon: <AssistantIcon brand="claude" /> },
        { href: links.chatgpt, label: 'Open in ChatGPT', icon: <AssistantIcon brand="openai" /> },
        { href: links.cursor, label: 'Open in Cursor', icon: <AssistantIcon brand="cursor" /> }
    ];
}

function PageActionMenu({ viewHref, links }: { viewHref: string; links: PageActionLinks }): ReactElement {
    return (
        <ul className={cn('space-y-0.5')}>
            {itemsFor(viewHref, links).map((item) => (
                <li key={item.href}>
                    <a href={item.href} target="_blank" rel="noreferrer" className={cn(rowClassName)}>
                        {item.icon}
                        <span className={cn('truncate')}>{item.label}</span>
                        <ArrowUpRight size={14} aria-hidden className={cn('ms-auto shrink-0 text-(--text-faint)')} />
                    </a>
                </li>
            ))}
        </ul>
    );
}

export function PageActions({ copySource, viewHref, links, className }: PageActionsProps): ReactElement {
    const [open, setOpen] = useState(false);

    return (
        <div className={cn('inline-flex items-center', className)}>
            {/* grow fills a stretched row */}
            <CopyPageButton source={copySource} className={cn('grow justify-start rounded-e-none pe-2')} />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label="More actions for this page"
                        className={cn('text-subtle rounded-s-none px-1.5 hover:text-(--text)')}
                    >
                        <ChevronDown
                            size={16}
                            aria-hidden
                            className={cn('transition-transform duration-150 ease-out', open && 'rotate-180')}
                        />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className={cn('w-60 p-1')}>
                    <PageActionMenu viewHref={viewHref} links={links} />
                </PopoverContent>
            </Popover>
        </div>
    );
}
