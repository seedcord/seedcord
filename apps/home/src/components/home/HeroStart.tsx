'use client';

import { SegmentedControl, cn } from '@seedcord/ui';
import { useState } from 'react';

import { CopyCommand } from '#components/ui/CopyCommand';
import { NEW_BOT_PROMPT, PORT_PROMPT } from '#lib/agentPrompts';

import type { SwapDirection } from '#components/ui/CopyCommand';
import type { ReactNode } from 'react';

const STARTS = {
    terminal: { command: 'pnpm create seedcord', label: undefined },
    agent: { command: NEW_BOT_PROMPT, label: 'copy prompt for your agent' },
    port: { command: PORT_PROMPT, label: 'copy prompt to port a discord.js bot' }
} as const;

type Start = keyof typeof STARTS;

const MODES = [
    { value: 'terminal', label: 'terminal' },
    { value: 'agent', label: 'agent' },
    { value: 'port', label: 'port' }
] as const satisfies readonly { value: Start; label: string }[];

function tabIndex(start: Start): number {
    return MODES.findIndex((mode) => mode.value === start);
}

export function HeroStart(): ReactNode {
    const [{ start, direction }, setState] = useState<{ start: Start; direction: SwapDirection }>({
        start: 'terminal',
        direction: 1
    });
    const { command, label } = STARTS[start];

    const select = (next: Start): void => {
        setState({ start: next, direction: tabIndex(next) > tabIndex(start) ? 1 : -1 });
    };

    return (
        // ml-1 matches the poster button's 4px rest translate, aligning the chip with the button face
        <div className={cn('mt-7 ml-1')}>
            <SegmentedControl
                options={MODES}
                value={start}
                onChange={select}
                variant="underline"
                aria-label="How to start"
                className={cn('mb-3')}
            />
            <div>
                <CopyCommand command={command} direction={direction} {...(label !== undefined && { label })} />
            </div>
        </div>
    );
}
