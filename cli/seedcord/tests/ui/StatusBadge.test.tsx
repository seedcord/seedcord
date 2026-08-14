import React, { useEffect, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '@ui/components/StatusBadge';

import { renderAt } from './renderAt';
import { settled } from './settled';

import type { DevPhase } from '@ui/stores/devPhase';
import type { ReactElement } from 'react';

const SIZE = { rows: 24, columns: 80 };

// balloon2 ticks every 120ms, so this lands on frame 4, past toggle4's four frames
const PAST_TOGGLE4 = 520;

const TOGGLE4_FRAMES = ['■', '□', '▪', '▫'];

function Flipping(): ReactElement {
    const [phase, setPhase] = useState<DevPhase>('starting');

    useEffect(() => {
        const timer = setTimeout(() => setPhase('running'), PAST_TOGGLE4);
        return () => clearTimeout(timer);
    }, []);

    return <StatusBadge phase={phase} />;
}

describe('StatusBadge', () => {
    it('keeps a glyph when the phase swaps one spinner for a shorter one', async () => {
        const { lastFrame, unmount } = renderAt(<Flipping />, SIZE);

        await settled(() => {
            expect(lastFrame()).toContain('running');
        });
        await settled(() => {
            expect(TOGGLE4_FRAMES.some((frame) => lastFrame().includes(frame))).toBe(true);
        });

        unmount();
    });

    it('holds the phase icon while running with animation off', async () => {
        const { lastFrame, unmount } = renderAt(<StatusBadge phase="running" animate={false} />, SIZE);

        await settled(() => {
            expect(lastFrame()).toContain('●');
            expect(TOGGLE4_FRAMES.some((frame) => lastFrame().includes(frame))).toBe(false);
        });

        unmount();
    });

    it('holds the live dot lit with animation off', async () => {
        const { lastFrame, unmount } = renderAt(<StatusBadge phase="running" glyph="live" animate={false} />, SIZE);

        await settled(() => expect(lastFrame()).toContain('●'));

        unmount();
    });
});
