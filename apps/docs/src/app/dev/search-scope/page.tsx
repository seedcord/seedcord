'use client';

import {
    tw,
    Input,
    Icon,
    Dropdown,
    SegmentedControl,
    type SegmentedControlOption,
    type DropdownOption
} from '@seedcord/ui';
import { Search } from 'lucide-react';
import { useState } from 'react';

import { CommandListItem } from '@components/search/command-palette/CommandListItem';

import type { CommandAction, SearchResultKind } from '@components/search/command-palette/types';
import type { ReactElement } from 'react';

// prototype-only, this adds a package field to CommandAction so the mock can group and filter by
// package. the real route derives the package from the result's href
interface MockResult extends CommandAction {
    pkg: Pkg;
}

const PACKAGES = ['seedcord', 'services', 'plugins', 'utils', 'types', 'rate-limiter', 'event-emitter'] as const;
type Pkg = (typeof PACKAGES)[number];

const PACKAGE_OPTIONS: SegmentedControlOption<Pkg>[] = PACKAGES.map((pkg) => ({ value: pkg, label: pkg }));

const SCOPE_OPTIONS: DropdownOption[] = [
    { value: 'all', label: 'All packages' },
    ...PACKAGES.map((pkg) => ({ value: pkg, label: pkg }))
];

type KindFilter = 'all' | 'class' | 'interface' | 'type' | 'enum' | 'function' | 'variable' | 'member';

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

const MEMBER_KINDS = new Set<SearchResultKind>([
    'constructor',
    'method',
    'property',
    'parameter',
    'typeParameter',
    'enumMember'
]);

function kindGroup(kind: SearchResultKind): KindFilter {
    return MEMBER_KINDS.has(kind) ? 'member' : (kind as KindFilter);
}

function entry(pkg: Pkg, label: string, kind: SearchResultKind, qualified = label): MockResult {
    return { id: `${pkg}-${qualified}`, label, kind, pkg, path: `${pkg} · ${qualified}`, href: '#' };
}

// a spread across packages, kinds, and members, with cross-package duplicates (Logger, BotConfig) so the
// scope + kind filters and the active-first grouping can all be triggered
const MOCK: MockResult[] = [
    entry('seedcord', 'Seedcord', 'class'),
    entry('seedcord', 'Plugin', 'class'),
    entry('seedcord', 'Logger', 'class'),
    entry('seedcord', 'BotConfig', 'interface'),
    entry('seedcord', 'SeedcordErrorCode', 'enum'),
    entry('seedcord', 'createBot', 'function'),
    entry('seedcord', 'init', 'method', 'Plugin#init'),
    entry('seedcord', 'debug', 'method', 'Logger#debug'),
    entry(
        'seedcord',
        'PluginKyselyServiceDecoratorMissing',
        'enumMember',
        'SeedcordErrorCode.PluginKyselyServiceDecoratorMissing'
    ),
    entry('services', 'Logger', 'class'),
    entry('rate-limiter', 'MemoryRateLimiter', 'class'),
    entry('services', 'HealthCheck', 'class'),
    entry('event-emitter', 'TypedEventEmitter', 'class'),
    entry('services', 'LogLevel', 'enum'),
    entry('rate-limiter', 'charge', 'method', 'MemoryRateLimiter#charge'),
    entry('plugins', 'Mongoose', 'class'),
    entry('plugins', 'KyselyService', 'class'),
    entry('plugins', 'PluginConfig', 'interface'),
    entry('plugins', 'query', 'method', 'KyselyService#query'),
    entry('utils', 'formatLog', 'function'),
    entry('utils', 'prettify', 'function'),
    entry('utils', 'isObject', 'function'),
    entry('utils', 'Brand', 'type'),
    entry('types', 'BotConfig', 'interface'),
    entry('types', 'EmojiMap', 'interface'),
    entry('types', 'LiteralUnion', 'type')
];

const MIN_QUERY = 2;

interface Highlight {
    group: string;
    index: number;
}

interface PkgGroup {
    pkg: Pkg;
    items: MockResult[];
}

function groupByPackage(results: MockResult[], scope: 'all' | Pkg, currentPkg: Pkg): PkgGroup[] {
    if (scope !== 'all') return results.length ? [{ pkg: scope, items: results }] : [];

    const byPkg = results.reduce<Map<Pkg, MockResult[]>>((acc, result) => {
        const list = acc.get(result.pkg) ?? [];
        list.push(result);
        acc.set(result.pkg, list);
        return acc;
    }, new Map());

    const ordered: Pkg[] = [currentPkg, ...PACKAGES.filter((pkg) => pkg !== currentPkg)];
    return ordered.reduce<PkgGroup[]>((acc, pkg) => {
        const items = byPkg.get(pkg);
        if (items) acc.push({ pkg, items });
        return acc;
    }, []);
}

interface RowsProps {
    groupKey: string;
    items: MockResult[];
    highlight: Highlight | null;
    onHover: (next: Highlight) => void;
}

function Rows({ groupKey, items, highlight, onHover }: RowsProps): ReactElement {
    return (
        <div role="listbox" aria-label={`${groupKey} results`}>
            {items.map((action, index) => (
                <CommandListItem
                    key={action.id}
                    action={action}
                    onSelect={() => undefined}
                    isActive={highlight?.group === groupKey && highlight.index === index}
                    optionId={`${groupKey}-${action.id}`}
                    index={index}
                    onActivate={() => onHover({ group: groupKey, index })}
                />
            ))}
        </div>
    );
}

const SEPARATOR = tw`text-sm text-(--text-faint)`;

interface ScopeBarProps {
    query: string;
    onQuery: (value: string) => void;
    scope: 'all' | Pkg;
    kind: KindFilter;
    onScope: (value: 'all' | Pkg) => void;
    onKind: (value: KindFilter) => void;
}

function ScopeBar({ query, onQuery, scope, kind, onScope, onKind }: ScopeBarProps): ReactElement {
    return (
        <div className={tw`border-b border-(--border) px-4 py-3`}>
            <Input
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                placeholder="Search…"
                variant="ghost"
                className={tw`bg-surface-subtle border border-(--border)/80 focus-within:border-(--border-accent-b-subtle) focus-within:bg-(--surface-accent-b-subtle)`}
                leading={
                    <span className={tw`flex items-center gap-1`}>
                        <Icon icon={Search} size={16} className={tw`text-subtle`} />
                        <Dropdown
                            variant="ghost"
                            placeholderLabel="All packages"
                            value={scope}
                            options={SCOPE_OPTIONS}
                            onChange={(value) => onScope(value as 'all' | Pkg)}
                            aria-label="Package scope"
                        />
                        <span className={SEPARATOR}>/</span>
                        <Dropdown
                            variant="ghost"
                            placeholderLabel="All kinds"
                            value={kind}
                            options={KIND_OPTIONS}
                            onChange={(value) => onKind(value as KindFilter)}
                            aria-label="Kind filter"
                        />
                        <span className={SEPARATOR}>/</span>
                    </span>
                }
            />
        </div>
    );
}

interface ResultsListProps {
    ready: boolean;
    groups: PkgGroup[];
    currentPkg: Pkg;
    scope: 'all' | Pkg;
    highlight: Highlight | null;
    onHover: (next: Highlight) => void;
}

function ResultsList({ ready, groups, currentPkg, scope, highlight, onHover }: ResultsListProps): ReactElement {
    return (
        <div className={tw`max-h-96 overflow-y-auto p-2`}>
            {!ready ? (
                <EmptyHint text={`Type at least ${String(MIN_QUERY)} characters`} />
            ) : groups.length === 0 ? (
                <EmptyHint text="No results for this query and filters" />
            ) : (
                groups.map((group) => (
                    <section key={group.pkg}>
                        <div className={tw`flex items-center justify-between px-3 pt-2 pb-1`}>
                            <span className={tw`text-subtle text-xs font-semibold tracking-wide`}>
                                {group.pkg === currentPkg && scope === 'all' ? `${group.pkg} (current)` : group.pkg}
                            </span>
                            <span className={tw`text-xs text-(--text-faint)`}>{group.items.length}</span>
                        </div>
                        <Rows groupKey={group.pkg} items={group.items} highlight={highlight} onHover={onHover} />
                    </section>
                ))
            )}
        </div>
    );
}

function EmptyHint({ text }: { text: string }): ReactElement {
    return <div className={tw`text-subtle px-3 py-8 text-center text-sm`}>{text}</div>;
}

function SearchScopePage(): ReactElement {
    const [query, setQuery] = useState('log');
    const [currentPkg, setCurrentPkg] = useState<Pkg>('plugins');
    const [filters, setFilters] = useState<{ scope: 'all' | Pkg; kind: KindFilter }>({ scope: 'all', kind: 'all' });
    const [highlight, setHighlight] = useState<Highlight | null>(null);

    const trimmed = query.trim().toLowerCase();
    const ready = trimmed.length >= MIN_QUERY;

    const matches = ready
        ? MOCK.filter((result) => {
              const inScope = filters.scope === 'all' || result.pkg === filters.scope;
              const inKind = filters.kind === 'all' || kindGroup(result.kind) === filters.kind;
              const inQuery = `${result.label} ${result.path}`.toLowerCase().includes(trimmed);
              return inScope && inKind && inQuery;
          })
        : [];

    const groups = groupByPackage(matches, filters.scope, currentPkg);

    return (
        <div className={tw`space-y-8 pb-32`}>
            <header className={tw`space-y-2`}>
                <h1 className={tw`text-2xl font-semibold tracking-tight text-(--text)`}>Search scope</h1>
                <p className={tw`text-subtle text-sm`}>
                    Inline scope + kind filters as borderless dropdowns in the search bar (TanStack-style). Searches
                    every package by default; results group by package, current one first. Type a query (try `log`),
                    change the simulated current package, and use the inline dropdowns to narrow.
                </p>
            </header>

            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs`}>Simulated current package (drives active-first ordering)</p>
                <SegmentedControl options={PACKAGE_OPTIONS} value={currentPkg} onChange={setCurrentPkg} size="sm" />
            </div>

            <div
                className={tw`shadow-soft mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-(--border) bg-(--bg-dim)`}
            >
                <ScopeBar
                    query={query}
                    onQuery={setQuery}
                    scope={filters.scope}
                    kind={filters.kind}
                    onScope={(scope) => setFilters((prev) => ({ ...prev, scope }))}
                    onKind={(kind) => setFilters((prev) => ({ ...prev, kind }))}
                />
                <ResultsList
                    ready={ready}
                    groups={groups}
                    currentPkg={currentPkg}
                    scope={filters.scope}
                    highlight={highlight}
                    onHover={setHighlight}
                />
            </div>
        </div>
    );
}

export default SearchScopePage;
