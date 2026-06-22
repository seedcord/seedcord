'use client';

import { cn, tw, Icon } from '@seedcord/ui';

import { getToneConfig } from '@lib/tonePresentation';

import { SEARCH_KIND_ICONS } from './constants';

import type { CommandAction, SearchResultKind } from './types';
import type { EntityTone } from '@seedcord/docs-engine/client';
import type { ReactElement } from 'react';

// Only the kinds with no entity tone; every tone-able kind (entities + members) renders from its tone.
type NonEntityResultKind = Extract<SearchResultKind, 'package' | 'page' | 'resource'>;

// Tone-able result kind -> entity tone. Members inherit their owner's family (a method is
// function-toned, a property variable-toned, an enum member enum-toned), so their icon + active
// highlight match that tone. package/page/resource have no entity tone.
const RESULT_TONE: Partial<Record<SearchResultKind, EntityTone>> = {
    class: 'class',
    interface: 'interface',
    type: 'type',
    enum: 'enum',
    function: 'function',
    variable: 'variable',
    constructor: 'function',
    method: 'function',
    property: 'variable',
    parameter: 'type',
    typeParameter: 'type',
    enumMember: 'enum'
};

const ACCENT_ACTIVE = tw`data-[active=true]:border-(--accent-b)/38 data-[active=true]:bg-(--accent-b)/16`;

const NON_ENTITY_BADGES: Record<NonEntityResultKind, string> = {
    package: tw`border-(--badge-package-border) bg-(--badge-package-bg) text-(--badge-package-text)`,
    page: tw`border-(--badge-page-border) bg-(--badge-page-bg) text-(--badge-page-text)`,
    resource: tw`border-(--badge-resource-border) bg-(--badge-resource-bg) text-(--badge-resource-text)`
};

const BASE_ICON_CLASSES = tw`flex size-8 shrink-0 items-center justify-center rounded-md border transition duration-150`;

interface CommandListItemProps {
    action: CommandAction;
    onSelect: (action: CommandAction) => void;
    isActive: boolean;
    optionId: string;
    index: number;
    onActivate: (index: number) => void;
}

export function CommandListItem({
    action,
    onSelect,
    isActive,
    optionId,
    index,
    onActivate
}: CommandListItemProps): ReactElement {
    const ItemIcon = SEARCH_KIND_ICONS[action.kind];
    const tone = RESULT_TONE[action.kind];
    const toneStyles = tone ? getToneConfig(tone).styles : undefined;
    const iconClasses = cn(
        BASE_ICON_CLASSES,
        toneStyles ? toneStyles.badge : NON_ENTITY_BADGES[action.kind as NonEntityResultKind]
    );
    const activeHighlight = toneStyles?.active ?? ACCENT_ACTIVE;

    return (
        // In the WAI-ARIA combobox/listbox pattern, options are not individually focusable and take no key
        // handlers: focus stays on the input and keyboard selection runs there via aria-activedescendant + Enter.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
        <div
            id={optionId}
            role="option"
            aria-selected={isActive}
            data-active={isActive || undefined}
            data-command-id={action.id}
            aria-label={action.label}
            onClick={() => onSelect(action)}
            onMouseMove={() => onActivate(index)}
            className={cn(
                'group/item mt-1 flex cursor-pointer items-start gap-3 rounded-md border border-transparent bg-transparent p-3 text-sm text-(--text) outline-hidden transition first:mt-0',
                activeHighlight
            )}
        >
            <span className={cn(iconClasses)}>
                <Icon icon={ItemIcon} size={18} aria-hidden />
            </span>
            <div className={cn('flex min-w-0 flex-1 flex-col gap-1')}>
                <div className={cn('flex flex-wrap items-center gap-2')}>
                    <span
                        className={cn(
                            'truncate font-medium transition-colors group-data-[active=true]/item:text-(--text-accent-b-subtle)'
                        )}
                    >
                        {action.label}
                    </span>
                    {action.value ? (
                        <span className={cn('text-subtle shrink-0 font-mono text-xs')}>= {action.value}</span>
                    ) : null}
                </div>
                <span className={cn('text-subtle truncate font-mono text-xs transition-colors')}>{action.path}</span>
                {action.description ? <span className={cn('text-subtle text-xs')}>{action.description}</span> : null}
            </div>
            {action.isExternal ? (
                <Icon icon={SEARCH_KIND_ICONS.resource} size={16} className={cn('text-subtle mt-1')} aria-hidden />
            ) : null}
        </div>
    );
}
