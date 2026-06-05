'use client';

import { Button, Icon, IconSwap, Input, Dropdown, cn, tw, type DropdownOption } from '@seedcord/ui';
import { LoaderCircle, Search, X } from 'lucide-react';

import { COMMAND_LISTBOX_ID } from './constants';

import type { DocsPackageOption } from './types';
import type { KeyboardEvent, ReactElement, RefObject } from 'react';

const KIND_OPTIONS: DropdownOption[] = [
    { value: 'all', label: 'All kinds' },
    { value: 'class', label: 'Classes' },
    { value: 'interface', label: 'Interfaces' },
    { value: 'type', label: 'Types' },
    { value: 'enum', label: 'Enums' },
    { value: 'function', label: 'Functions' },
    { value: 'variable', label: 'Variables' },
    { value: 'member', label: 'Members' }
];

const SEPARATOR = tw`text-(--text-faint) text-sm`;

interface FilterControlsProps {
    scope: string;
    kind: string;
    packages: DocsPackageOption[];
    container: HTMLElement | null;
    onScopeChange: (scope: string) => void;
    onKindChange: (kind: string) => void;
}

// Borderless scope/kind dropdowns. They portal into `container` (the dialog) so their lists scroll inside
// the palette's scroll lock. Rendered twice: inline in the field on sm+, and on their own row on mobile
// (CSS toggles which is visible) so a narrow screen doesn't crush the query input.
function FilterDropdowns({
    scope,
    kind,
    packages,
    container,
    onScopeChange,
    onKindChange
}: FilterControlsProps): ReactElement {
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

// The input's leading content: the search glyph, plus the filters inline on sm+. On mobile the filters
// are hidden here and rendered on their own row above the input instead.
function SearchLeading({ isSearching, ...controls }: FilterControlsProps & { isSearching: boolean }): ReactElement {
    return (
        <span className={cn('flex items-center gap-1')}>
            <IconSwap
                active={isSearching}
                idleIcon={Search}
                activeIcon={LoaderCircle}
                size={16}
                className={cn('text-subtle')}
                activeClassName={cn('animate-spin motion-reduce:animate-none')}
            />
            <span className={cn('hidden items-center gap-1 sm:flex')}>
                <FilterDropdowns {...controls} />
                <span className={SEPARATOR}>/</span>
            </span>
        </span>
    );
}

// Mobile shows an icon close; sm+ shows the keyboard `Esc` hint. The two are mutually exclusive by breakpoint.
function CloseButtons({ onClose }: { onClose: () => void }): ReactElement {
    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close command palette"
                className={cn('text-subtle size-9 rounded-md hover:text-(--text) sm:hidden')}
            >
                <Icon icon={X} size={16} aria-hidden />
            </Button>
            <Button
                variant="ghost"
                onClick={onClose}
                aria-label="Close command palette"
                className={cn(
                    'border-border bg-surface-moderate text-subtle hidden h-auto items-center rounded-md border px-2 py-1 text-xs leading-none font-semibold tracking-wide uppercase hover:bg-surface-moderate hover:text-(--text) sm:inline-flex'
                )}
            >
                Esc
            </Button>
        </>
    );
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
    kind: string;
    packages: DocsPackageOption[];
    container: HTMLElement | null;
    onScopeChange: (scope: string) => void;
    onKindChange: (kind: string) => void;
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
    packages,
    container,
    onScopeChange,
    onKindChange
}: CommandHeaderProps): ReactElement {
    return (
        <div className={cn('border-border border-b px-4 py-3')}>
            {/* On mobile the filters get their own row; the sm+ copy lives inline in the input's leading. */}
            <div className={cn('mb-2 flex items-center gap-1 sm:hidden')}>
                <FilterDropdowns
                    scope={scope}
                    kind={kind}
                    packages={packages}
                    container={container}
                    onScopeChange={onScopeChange}
                    onKindChange={onKindChange}
                />
            </div>
            <Input
                ref={inputRef}
                role="combobox"
                aria-expanded={listExpanded}
                aria-controls={COMMAND_LISTBOX_ID}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                autoComplete="off"
                value={searchValue}
                onChange={(event) => onValueChange(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search…"
                aria-label="Search documentation"
                variant="ghost"
                className={cn(
                    'bg-surface-subtle border border-(--border)/80 focus-within:border-(--border-accent-b-subtle) focus-within:bg-(--surface-accent-b-subtle)'
                )}
                leading={
                    <SearchLeading
                        isSearching={isSearching}
                        scope={scope}
                        kind={kind}
                        packages={packages}
                        container={container}
                        onScopeChange={onScopeChange}
                        onKindChange={onKindChange}
                    />
                }
                trailing={<CloseButtons onClose={onClose} />}
            />
        </div>
    );
}
