'use client';

import { cn, useTimedToggle } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';
import { useEffect, useRef, useState } from 'react';

import { DISCORD_URL, DOCS_URL, GUIDE_URL, NPM_URL, REPO_URL } from '#lib/site';

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

interface SlashCommandDef {
    name: string;
    description: string;
    href?: string;
}

const COMMANDS: readonly SlashCommandDef[] = [
    { name: 'ping', description: 'measure the reply time' },
    { name: 'docs', description: 'open the API reference', href: DOCS_URL },
    { name: 'guide', description: 'open the guide', href: GUIDE_URL },
    { name: 'github', description: 'open the repo', href: REPO_URL },
    { name: 'npm', description: 'open the npm package', href: NPM_URL },
    { name: 'invite', description: 'join the Discord server', href: DISCORD_URL }
];

// typed in full these still run. the list never shows them
const HIDDEN_COMMANDS: readonly SlashCommandDef[] = [{ name: 'star', description: 'star the repo', href: REPO_URL }];

const REPLY_DISMISS_MS = 4000;

function isEditable(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]') !== null;
}

function runCommand(command: SlashCommandDef, onReply: (text: string) => void): void {
    if (command.href) {
        window.open(command.href, '_blank', 'noreferrer');
        return;
    }
    const started = performance.now();
    requestAnimationFrame(() => {
        onReply(`pong, replied in ${Math.max(1, Math.round(performance.now() - started))}ms`);
    });
}

interface CommandOptionsProps {
    matches: readonly SlashCommandDef[];
    selected: number;
    onHover: (index: number) => void;
    onRun: (command: SlashCommandDef) => void;
}

function CommandOptions({ matches, selected, onHover, onRun }: CommandOptionsProps): ReactNode {
    return (
        <div role="listbox" aria-label="Commands" className={cn('border-b-[3px] border-(--seed-dark)')}>
            {matches.map((command, index) => (
                <button
                    key={command.name}
                    type="button"
                    role="option"
                    aria-selected={index === selected}
                    // mousedown runs before the input's blur closes the palette
                    onMouseDown={(event) => {
                        event.preventDefault();
                        onRun(command);
                    }}
                    onMouseEnter={() => onHover(index)}
                    className={cn(
                        'flex w-full items-baseline justify-between gap-4 px-3 py-2 text-left',
                        index === selected && 'bg-(--seed-dark)/10'
                    )}
                >
                    <span className={cn('font-mono-code text-sm font-semibold text-(--seed-dark)')}>
                        /{command.name}
                    </span>
                    <span className={cn('text-xs text-(--seed-dark)/60')}>{command.description}</span>
                </button>
            ))}
        </div>
    );
}

interface PaletteProps {
    query: string | null;
    selected: number;
    onSelect: (index: number) => void;
    onChange: (next: string | null) => void;
    onRun: (command: SlashCommandDef) => void;
}

// the input stays mounted while closed. removing a focused input mid-keystroke makes chrome
// collapse the selection to the removal point (the end of body here) and scroll it into view.
function Palette({ query, selected, onSelect, onChange, onRun }: PaletteProps): ReactNode {
    const inputRef = useRef<HTMLInputElement>(null);
    const open = query !== null;

    useEffect(() => {
        if (!open) return;
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        // the input persists across opens, so the caret sits wherever the last session left it
        input.setSelectionRange(input.value.length, input.value.length);
    }, [open]);

    const matches = open ? COMMANDS.filter((command) => command.name.startsWith(query.slice(1).toLowerCase())) : [];

    const close = (): void => {
        inputRef.current?.blur();
        onChange(null);
    };

    const run = (command: SlashCommandDef): void => {
        inputRef.current?.blur();
        onRun(command);
    };

    const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Escape') {
            close();
            return;
        }
        if (event.key === 'Enter') {
            const typed = (query ?? '').trim().toLowerCase();
            const command = matches[selected] ?? HIDDEN_COMMANDS.find((hidden) => `/${hidden.name}` === typed);
            if (command) run(command);
            return;
        }
        if (matches.length === 0) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            onSelect((selected + step + matches.length) % matches.length);
            return;
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            onChange(`/${matches[selected]?.name ?? ''}`);
            onSelect(0);
        }
    };

    const onInput = (value: string): void => {
        if (!value.startsWith('/')) {
            close();
            return;
        }
        onChange(value);
        onSelect(0);
    };

    return (
        <div hidden={!open} className={cn('rule blk-sm pointer-events-auto overflow-hidden rounded-sm bg-(--pith)')}>
            {matches.length > 0 && (
                <CommandOptions matches={matches} selected={selected} onHover={onSelect} onRun={run} />
            )}
            <input
                ref={inputRef}
                value={query ?? '/'}
                onChange={(event) => onInput(event.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => onChange(null)}
                aria-label="Slash command"
                placeholder="type a command"
                className={cn(
                    'font-mono-code w-full bg-transparent px-3 py-2.5 text-sm font-medium text-(--seed-dark) outline-hidden placeholder:text-(--seed-dark)/40'
                )}
            />
        </div>
    );
}

function ReplyBubble({ text }: { text: string }): ReactNode {
    return (
        <div
            className={cn('rule blk-sm pointer-events-auto flex items-center gap-3 rounded-sm bg-(--pith) px-3 py-2.5')}
        >
            <Materwelon className={cn('drop-shadow-mark size-8 shrink-0')} />
            <div>
                <div className={cn('flex items-center gap-1.5')}>
                    <span className={cn('font-display text-sm font-semibold text-(--seed-dark)')}>seedcord</span>
                    <span className={cn('rounded-sm bg-(--vine-deep) px-1 text-[10px] font-semibold text-(--pith)')}>
                        APP
                    </span>
                </div>
                <p className={cn('font-mono-code text-sm text-(--seed-dark)')}>{text}</p>
            </div>
        </div>
    );
}

export function SlashCommand(): ReactNode {
    // null query = closed. an open query always starts with '/'
    const [query, setQuery] = useState<string | null>(null);
    const [selected, setSelected] = useState(0);
    const [reply, setReply] = useState('');
    const [replyVisible, showReply] = useTimedToggle(REPLY_DISMISS_MS);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
            if (isEditable(event.target)) return;
            // the opening keystroke must not reach the input, and Firefox binds / to quick find
            event.preventDefault();
            setQuery('/');
            setSelected(0);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const run = (command: SlashCommandDef): void => {
        setQuery(null);
        runCommand(command, (text) => {
            setReply(text);
            showReply();
        });
    };

    return (
        <div className={cn('pointer-events-none fixed inset-x-0 bottom-6 z-100 mx-auto w-full max-w-md px-4')}>
            <Palette query={query} selected={selected} onSelect={setSelected} onChange={setQuery} onRun={run} />
            {query === null && replyVisible && <ReplyBubble text={reply} />}
        </div>
    );
}
