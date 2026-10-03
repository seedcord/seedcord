'use client';

import { Dropdown, SearchField, Switch, cn, tw, useSearchDialogContainer, type DropdownOption } from '@seedcord/ui';

import { COMMAND_LISTBOX_ID, KIND_FILTERS } from './constants';

import type { KindFilter } from './constants';
import type { DocsPackageOption } from './types';
import type { KeyboardEvent, ReactElement, RefObject } from 'react';

const KIND_OPTIONS: DropdownOption[] = [...KIND_FILTERS];

const SEPARATOR = tw`text-sm text-(--text-faint)`;

interface FilterControlsProps {
    scope: string;
    kind: KindFilter;
    packages: DocsPackageOption[];
    onScopeChange: (scope: string) => void;
    onKindChange: (kind: string) => void;
}

function FilterDropdowns({ scope, kind, packages, onScopeChange, onKindChange }: FilterControlsProps): ReactElement {
    const container = useSearchDialogContainer();
    const scopeOptions: DropdownOption[] = [
        { value: 'all', label: 'All packages' },
        ...packages.map((pkg) => ({ value: pkg.folder, label: pkg.label }))
    ];

    return (
        <span className={cn('flex items-center gap-1')}>
            <Dropdown
                variant="ghost"
                placeholderLabel="All packages"
                value={scope}
                options={scopeOptions}
                onChange={onScopeChange}
                container={container}
                aria-label="Package scope"
            />
            <span className={SEPARATOR}>/</span>
            <Dropdown
                variant="ghost"
                placeholderLabel="All kinds"
                value={kind}
                options={KIND_OPTIONS}
                onChange={onKindChange}
                container={container}
                aria-label="Kind filter"
            />
        </span>
    );
}

function SearchLeading(controls: FilterControlsProps): ReactElement {
    return (
        <span className={cn('hidden items-center gap-1 sm:flex')}>
            <FilterDropdowns {...controls} />
            <span className={SEPARATOR}>/</span>
        </span>
    );
}

function PrereleaseToggle({
    checked,
    onChange
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
}): ReactElement {
    return <Switch size="sm" checked={checked} onCheckedChange={onChange} label="Pre-release" />;
}

interface CommandHeaderProps {
    inputRef: RefObject<HTMLInputElement | null>;
    onClose: () => void;
    onValueChange: (value: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    searchValue: string;
    isSearching: boolean;
    activeId: string | undefined;
    listExpanded: boolean;
    scope: string;
    kind: KindFilter;
    prerelease: boolean;
    hasPrerelease: boolean;
    packages: DocsPackageOption[];
    onScopeChange: (scope: string) => void;
    onKindChange: (kind: string) => void;
    onPrereleaseChange: (next: boolean) => void;
}

export function CommandHeader({
    inputRef,
    onClose,
    onValueChange,
    onKeyDown,
    searchValue,
    isSearching,
    activeId,
    listExpanded,
    scope,
    kind,
    prerelease,
    hasPrerelease,
    packages,
    onScopeChange,
    onKindChange,
    onPrereleaseChange
}: CommandHeaderProps): ReactElement {
    const filters = { scope, kind, packages, onScopeChange, onKindChange };
    const toggle = hasPrerelease ? <PrereleaseToggle checked={prerelease} onChange={onPrereleaseChange} /> : null;

    return (
        <SearchField
            inputRef={inputRef}
            value={searchValue}
            onValueChange={onValueChange}
            onKeyDown={onKeyDown}
            onClose={onClose}
            label="Search documentation"
            closeLabel="Close command palette"
            listboxId={COMMAND_LISTBOX_ID}
            listExpanded={listExpanded}
            activeId={activeId}
            isSearching={isSearching}
            leading={<SearchLeading {...filters} />}
            trailing={toggle && <span className={cn('hidden sm:flex')}>{toggle}</span>}
            aboveOnMobile={
                <div className={cn('flex items-center justify-between gap-2')}>
                    <FilterDropdowns {...filters} />
                    {toggle}
                </div>
            }
        />
    );
}
