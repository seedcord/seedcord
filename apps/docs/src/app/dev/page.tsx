import { cn } from '@seedcord/ui';
import Link from 'next/link';

import type { ReactElement } from 'react';

const PRIMITIVES = [
    { href: '/dev/button', label: 'Button', description: 'variant × size matrix, states, asChild, touch targets' },
    {
        href: '/dev/icon',
        label: 'Icon + GithubIcon',
        description: 'size matrix, Lucide gallery, custom SVG, title prop'
    },
    {
        href: '/dev/copy-button',
        label: 'CopyButton',
        description: '36px copy-to-clipboard icon button with copied state'
    },
    {
        href: '/dev/copy-anchor-button',
        label: 'CopyAnchorButton',
        description: '32px hash-icon button that copies #anchored URL'
    },
    {
        href: '/dev/scroll-to-top',
        label: 'ScrollToTopButton',
        description: '48px fixed-position button, fades in past scroll threshold'
    },
    { href: '/dev/code-panel', label: 'CodePanel', description: 'panel-variant code viewport with title/description' },
    { href: '/dev/code-block', label: 'CodeBlock', description: 'card-variant code viewport with label + copy header' },
    {
        href: '/dev/card',
        label: 'Card',
        description: 'polymorphic compound surface (CardHeader/Body/Footer/Title/Description)'
    },
    {
        href: '/dev/tooltip',
        label: 'Tooltip',
        description: 'wrapper + compound, side matrix, animation trials, disabled-trigger workaround'
    },
    {
        href: '/dev/badge',
        label: 'Badge',
        description: 'status/chip variants × neutral/accent/danger/muted tones, EntityHeader migration preview'
    },
    {
        href: '/dev/popover',
        label: 'Popover',
        description: 'compound (Root/Trigger/Content/Arrow), side × align matrix, rich content, controlled state'
    },
    {
        href: '/dev/dropdown',
        label: 'Dropdown',
        description: 'listbox-over-popover single-value picker, sizes, leading icon, states, scrolling long lists'
    },
    {
        href: '/dev/segmented-control',
        label: 'SegmentedControl',
        description: 'joined-segment radiogroup with motion layoutId gliding pill, sizes, leading icons, multi-instance'
    },
    {
        href: '/dev/disclosure',
        label: 'Disclosure',
        description:
            'compound headless disclosure; uncontrolled/controlled/storage modes; CSS grid-rows height animation'
    },
    {
        href: '/dev/input',
        label: 'Input',
        description: 'text field: default/ghost variants, sizes, leading/trailing slots, search-field composition'
    }
] as const;

const DOCS_BEHAVIORS = [
    {
        href: '/dev/package-overview-tabs',
        label: 'PackageOverviewTabs',
        description: 'README | Reference Overview segmented toggle; README default, disabled when a version has none'
    },
    {
        href: '/dev/overview-header',
        label: 'Overview header layouts',
        description: 'candidate layouts for the package title + version + Overview/Reference toggle (pick one)'
    },
    {
        href: '/dev/overview-header-mobile',
        label: 'Overview header (mobile)',
        description: 'mobile header layouts in a 380px frame: centered, full-width tabs, left stack (pick one)'
    },
    {
        href: '/dev/skeletons',
        label: 'Skeletons',
        description: 'sidebar category + overview loading placeholders, in isolation (they flash too fast live)'
    },
    {
        href: '/dev/cross-pkg-link',
        label: 'Cross-package links',
        description: 'new-tab + prose arrow indicator for cross-package and external references (no icon in code)'
    },
    {
        href: '/dev/search-scope',
        label: 'Search scope',
        description: 'three candidate behaviors for cross-package discoverability in the command palette'
    },
    {
        href: '/dev/code-theme',
        label: 'Code theme comparison',
        description: 'catppuccin (before) vs seedcord brand theme, side by side across TS signatures, light + dark'
    },
    {
        href: '/dev/code-palette',
        label: 'Proposed code palette',
        description: 'named warm palette swatches (dark + light) + applied to sample snippets, for theme approval'
    }
] as const;

function DevIndex(): ReactElement {
    return (
        <div className={cn('space-y-8')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Dev playground</h1>
                <p className={cn('text-subtle text-sm')}>
                    Per-primitive routes for @seedcord/ui. Each route renders the variant matrix in light + dark; use
                    the theme toggle in the docs navbar above.
                </p>
            </header>
            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>Primitives</h2>
                <ul className={cn('space-y-1 text-sm')}>
                    {PRIMITIVES.map(({ href, label, description }) => (
                        <li key={href}>
                            <Link href={href} className={cn('text-(--text) hover:text-(--accent-a)')}>
                                {label}
                            </Link>
                            <span className={cn('text-subtle')}>: {description}</span>
                        </li>
                    ))}
                </ul>
            </section>
            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>Docs rendering</h2>
                <ul className={cn('space-y-1 text-sm')}>
                    {DOCS_BEHAVIORS.map(({ href, label, description }) => (
                        <li key={href}>
                            <Link href={href} className={cn('text-(--text) hover:text-(--accent-a)')}>
                                {label}
                            </Link>
                            <span className={cn('text-subtle')}>: {description}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

export default DevIndex;
