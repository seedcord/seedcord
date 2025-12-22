'use client';

import { Command } from 'cmdk';

import { getToneConfig, resolveEntityTone } from '@lib/entityMetadata';
import { cn, tw } from '@lib/utils';
import Icon from '@ui/Icon';

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
    package: ['border-(--badge-package-border)', 'bg-(--badge-package-bg)', 'text-(--badge-package-text)'].join(' '),
    page: ['border-(--badge-page-border)', 'bg-(--badge-page-bg)', 'text-(--badge-page-text)'].join(' '),
    resource: ['border-(--badge-resource-border)', 'bg-(--badge-resource-bg)', 'text-(--badge-resource-text)'].join(
        ' '
    ),
    constructor: ['border-(--entity-function)/34', 'bg-(--entity-tint-12)', 'text-(--entity-function)'].join(' '),
    method: ['border-(--entity-function)/34', 'bg-(--entity-tint-12)', 'text-(--entity-function)'].join(' '),
    property: ['border-(--entity-variable)/38', 'bg-(--entity-tint-14)', 'text-(--entity-variable)'].join(' '),
    parameter: ['border-(--entity-type)/32', 'bg-(--entity-tint-12)', 'text-(--entity-type)'].join(' '),
    typeParameter: ['border-(--entity-type)/32', 'bg-(--entity-tint-12)', 'text-(--entity-type)'].join(' '),
    enumMember: ['border-(--entity-enum)/34', 'bg-(--entity-tint-14)', 'text-(--entity-enum)'].join(' ')
};

const BASE_ICON_CLASSES = tw`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition duration-150`;

interface CommandListItemProps {
    action: CommandAction;
    onSelect: (action: CommandAction) => void;
}

function CommandListItem({ action, onSelect }: CommandListItemProps): ReactElement {
    const ItemIcon = SEARCH_KIND_ICONS[action.kind];
    const isEntityResult = ENTITY_RESULT_KINDS.has(action.kind);
    const tone = isEntityResult ? resolveEntityTone(action.kind) : undefined;
    const toneStyles = tone ? getToneConfig(tone).styles : undefined;
    const keywords = [action.path, action.id];
    if (action.description) {
        keywords.push(action.description);
    }
    const iconClasses = cn(
        BASE_ICON_CLASSES,
        toneStyles ? toneStyles.badge : NON_ENTITY_BADGES[action.kind as NonEntityResultKind]
    );

    return (
        <Command.Item
            value={`${action.label} ${action.id}`}
            onSelect={() => onSelect(action)}
            data-command-id={action.id}
            title={action.path}
            className={cn(
                'group/item mt-1 flex cursor-pointer items-start gap-3 rounded-xl border border-transparent bg-transparent px-3 py-3 text-sm text-(--text) transition outline-none first:mt-0',
                'data-[selected=true]:border-(--accent-b)/38 data-[selected=true]:bg-(--accent-b)/16'
            )}
            aria-label={action.label}
            keywords={keywords}
        >
            <span className={iconClasses}>
                <Icon icon={ItemIcon} size={18} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium transition-colors group-data-[selected=true]/item:text-[color-mix(in_oklab,var(--text)_85%,var(--accent-b)_15%)]">
                        {action.label}
                    </span>
                </div>
                <span className="text-subtle truncate font-mono text-xs transition-colors">{action.path}</span>
                {action.description ? <span className="text-subtle text-xs">{action.description}</span> : null}
            </div>
            {action.isExternal ? (
                <Icon icon={SEARCH_KIND_ICONS.resource} size={16} className="text-subtle mt-1" aria-hidden />
            ) : null}
        </Command.Item>
    );
}

export default CommandListItem;
