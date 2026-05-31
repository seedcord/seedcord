'use client';

import { resolveEntityTone } from '@seedcord/docs-engine/client';
import { cn, tw, Icon } from '@seedcord/ui';

import { getToneConfig } from '@lib/tonePresentation';

import { SEARCH_KIND_ICONS } from './constants';

import type { CommandAction, SearchResultKind } from './types';
import type { ReactElement } from 'react';

type NonEntityResultKind = Extract<
    SearchResultKind,
    | 'package'
    | 'page'
    | 'resource'
    | 'constructor'
    | 'method'
    | 'property'
    | 'parameter'
    | 'typeParameter'
    | 'enumMember'
>;

const ENTITY_RESULT_KINDS = new Set<SearchResultKind>(['class', 'interface', 'type', 'enum', 'function', 'variable']);

const NON_ENTITY_BADGES: Record<NonEntityResultKind, string> = {
    package: tw`border-(--badge-package-border) bg-(--badge-package-bg) text-(--badge-package-text)`,
    page: tw`border-(--badge-page-border) bg-(--badge-page-bg) text-(--badge-page-text)`,
    resource: tw`border-(--badge-resource-border) bg-(--badge-resource-bg) text-(--badge-resource-text)`,
    constructor: tw`border-(--entity-function)/34 bg-(--entity-tint-12) text-(--entity-function)`,
    method: tw`border-(--entity-function)/34 bg-(--entity-tint-12) text-(--entity-function)`,
    property: tw`border-(--entity-variable)/38 bg-(--entity-tint-14) text-(--entity-variable)`,
    parameter: tw`border-(--entity-type)/32 bg-(--entity-tint-12) text-(--entity-type)`,
    typeParameter: tw`border-(--entity-type)/32 bg-(--entity-tint-12) text-(--entity-type)`,
    enumMember: tw`border-(--entity-enum)/34 bg-(--entity-tint-14) text-(--entity-enum)`
};

const BASE_ICON_CLASSES = tw`flex size-8 shrink-0 items-center justify-center rounded-xl border transition duration-150`;

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
    const isEntityResult = ENTITY_RESULT_KINDS.has(action.kind);
    const tone = isEntityResult ? resolveEntityTone(action.kind) : undefined;
    const toneStyles = tone ? getToneConfig(tone).styles : undefined;
    const iconClasses = cn(
        BASE_ICON_CLASSES,
        toneStyles ? toneStyles.badge : NON_ENTITY_BADGES[action.kind as NonEntityResultKind]
    );

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
                'group/item mt-1 flex cursor-pointer items-start gap-3 rounded-xl border border-transparent bg-transparent p-3 text-sm text-(--text) transition outline-hidden first:mt-0',
                'data-[active=true]:border-(--accent-b)/38 data-[active=true]:bg-(--accent-b)/16'
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
