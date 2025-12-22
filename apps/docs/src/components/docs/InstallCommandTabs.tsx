'use client';

import { useMemo, useState } from 'react';

import { cn, tw } from '@lib/utils';
import CopyButton from '@ui/CopyButton';

import type { ReactElement } from 'react';

interface CommandTab {
    id: string;
    label: string;
    html: string | null;
    code: string;
}

interface InstallCommandTabsProps {
    commands: readonly CommandTab[];
}

function InstallCommandTabs({ commands }: InstallCommandTabsProps): ReactElement | null {
    const initialId = commands[0]?.id;
    const [activeId, setActiveId] = useState(initialId);

    const activeCommand = useMemo(
        () => commands.find((command) => command.id === activeId) ?? commands[0],
        [activeId, commands]
    );

    if (!activeCommand) {
        return null;
    }

    const codeContainerClass = tw`code-scroll-area px-4 py-4 text-sm leading-relaxed text-(--text)`;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {commands.map((command) => (
                    <button
                        key={command.id}
                        type="button"
                        onClick={() => setActiveId(command.id)}
                        className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition',
                            command.id === activeCommand.id
                                ? 'border-[color-mix(in_oklab,var(--accent-a)_55%,var(--border))] bg-[color-mix(in_oklab,var(--accent-a)_18%,transparent)] text-(--text)'
                                : 'bg-surface-96 text-subtle border-(--border) hover:border-(--accent-a)/30 hover:text-(--text)'
                        )}
                    >
                        {command.label}
                    </button>
                ))}
            </div>
            <div className="card bg-surface-95 shadow-soft relative overflow-hidden">
                <CopyButton
                    value={activeCommand.code}
                    ariaLabel={`Copy ${activeCommand.label} install command`}
                    className="absolute top-3 right-3 z-10"
                />
                {activeCommand.html ? (
                    <div className={codeContainerClass}>
                        <div className="code-scroll-content" dangerouslySetInnerHTML={{ __html: activeCommand.html }} />
                    </div>
                ) : (
                    <div className={codeContainerClass}>
                        <pre className="code-scroll-content whitespace-pre">
                            <code>{activeCommand.code}</code>
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InstallCommandTabs;
