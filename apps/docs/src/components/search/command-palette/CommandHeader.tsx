'use client';

import { Button, Icon, cn } from '@seedcord/ui';
import { Command } from 'cmdk';
import { Search, X } from 'lucide-react';

import type { ReactElement, RefObject } from 'react';

interface CommandHeaderProps {
    inputRef: RefObject<HTMLInputElement | null>;
    onClose: () => void;
    onValueChange: (value: string) => void;
    searchValue: string;
}

function CommandHeader({ inputRef, onClose, onValueChange, searchValue }: CommandHeaderProps): ReactElement {
    return (
        <div className={cn('border-border border-b px-4 py-3')}>
            <div
                className={cn(
                    'bg-surface-subtle flex items-center gap-2 rounded-lg border border-(--border)/80 px-3 py-2 transition focus-within:border-(--border-accent-b-subtle) focus-within:bg-(--surface-accent-b-subtle)'
                )}
            >
                <Icon icon={Search} size={16} className={cn('text-subtle')} aria-hidden />

                <Command.Input
                    ref={inputRef}
                    value={searchValue}
                    onValueChange={onValueChange}
                    placeholder="Search entities or their members"
                    aria-label="Search documentation"
                    className={cn(
                        'placeholder:text-subtle flex-1 bg-transparent text-sm text-(--text) outline-none focus:outline-none'
                    )}
                />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label="Close command palette"
                    className={cn(
                        'text-subtle flex size-9 items-center justify-center rounded-md transition hover:text-(--text) sm:hidden'
                    )}
                >
                    <Icon icon={X} size={16} aria-hidden />
                </Button>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close command palette"
                    className={cn(
                        'bg-surface-subtle text-subtle hidden items-center gap-1 rounded-md border border-(--border)/70 px-2 py-1 text-[0.7rem] font-semibold tracking-wide uppercase transition hover:border-(--border-accent-b-subtle) hover:bg-(--surface-accent-b-subtle) hover:text-(--text-muted-light) sm:inline-flex'
                    )}
                >
                    Esc
                </button>
            </div>
        </div>
    );
}

export default CommandHeader;
