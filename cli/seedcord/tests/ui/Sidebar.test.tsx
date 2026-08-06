import { Box, Text, measureElement } from 'ink';
import { render } from 'ink-testing-library';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Sidebar } from '@ui/components/primitives/Sidebar';
import { INITIAL_CURSOR } from '@ui/filterCursor';
import { DevStore } from '@ui/stores/DevStore';
import { LogStore } from '@ui/stores/LogStore';
import { COMPACT_ROWS, FULL_ROWS } from '@ui/tier';

import { settled } from './settled';

import type { TunnelStatus } from '@commands/dev/tunnel/TunnelCoordinator';
import type { LogRecord } from '@seedcord/logger';
import type { DevState } from '@ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement } from 'react';

// every channel the framework logs on, which is the tallest the chip list gets without plugins
const FRAMEWORK_CHANNELS = [
    'default',
    'bot',
    'lifecycle',
    'health',
    'interactions',
    'events',
    'commands',
    'subscribers',
    'errors',
    'gates',
    'plugins',
    'hmr',
    'cli',
    'tsc'
];

function runningState(): DevState {
    const store = new DevStore();
    store.setPhase('running');
    store.setBusy(false);
    store.setStatus('Connected as TestBot');
    return store.getState();
}
const RUNNING = runningState();

// an http run adds the port and tunnel rows, which makes it the tallest the rail gets
function httpState(): DevState {
    const store = new DevStore();
    store.setPhase('running');
    store.setBusy(false);
    store.setStatus('Connected as TestBot');
    store.apply({ type: 'server-listening', port: 4321 });
    store.setTunnel('live');
    return store.getState();
}
const HTTP = httpState();

function tunnelState(status: TunnelStatus): DevState {
    const store = new DevStore();
    store.setTunnel(status);
    return store.getState();
}

// the readout renders outside the measured rail, so it never changes the size it reports
function Harness({ filtersOpen, state }: { readonly filtersOpen: boolean; readonly state: DevState }): ReactElement {
    const railRef = useRef<DOMElement | null>(null);
    const [size, setSize] = useState('pending');

    // eslint-disable-next-line @eslint-react/exhaustive-deps, react-hooks/exhaustive-deps -- the equality bail below is what keeps the update chain from forming
    useLayoutEffect(() => {
        if (!railRef.current) return;
        const { height, width } = measureElement(railRef.current);

        setSize((prev) => (prev === `${height}x${width}` ? prev : `${height}x${width}`));
    });

    return (
        <Box flexDirection="column">
            <Box flexDirection="row">
                <Sidebar
                    ref={railRef}
                    state={state}
                    enabled={new Set()}
                    enabledLevels={new Set()}
                    uptimeMs={12_000}
                    following={true}
                    interactive={true}
                    cursor={INITIAL_CURSOR}
                    width={null}
                    filtersOpen={filtersOpen}
                />
            </Box>
            <Text>size:{size}</Text>
        </Box>
    );
}

function read(frame: string | undefined): { rows: number; columns: number } {
    const match = /size:(?<rows>\d+)x(?<columns>\d+)/u.exec(frame ?? '');
    return { rows: Number(match?.groups?.rows ?? 0), columns: Number(match?.groups?.columns ?? 0) };
}

describe('Sidebar', () => {
    afterEach(() => LogStore.instance.clear());

    async function measure(filtersOpen: boolean): Promise<{ rows: number; columns: number }> {
        for (const channel of FRAMEWORK_CHANNELS) {
            LogStore.instance.onLog({
                level: 'info',
                message: 'x',
                label: 'Bot',
                channel,
                timestamp: 1_700_000_000_000
            } satisfies LogRecord);
        }
        await LogStore.instance.flush();

        const view = render(<Harness filtersOpen={filtersOpen} state={HTTP} />);
        await settled(() => expect(read(view.lastFrame()).rows).toBeGreaterThan(0));
        const size = read(view.lastFrame());
        view.unmount();
        return size;
    }

    function frameFor(state: DevState): string {
        const view = render(
            <Sidebar
                state={state}
                enabled={new Set()}
                enabledLevels={new Set()}
                uptimeMs={12_000}
                following={true}
                interactive={true}
                cursor={INITIAL_CURSOR}
                width={null}
                filtersOpen={false}
            />
        );
        const frame = view.lastFrame() ?? '';
        view.unmount();
        return frame;
    }

    // the tier thresholds are authored constants, and this is what keeps them honest as the rail changes
    it('fits the open rail inside the full tier', async () => {
        const { rows } = await measure(true);

        expect(rows).toBeLessThanOrEqual(FULL_ROWS);
    });

    it('fits the collapsed rail inside the compact tier', async () => {
        const { rows } = await measure(false);

        expect(rows).toBeLessThanOrEqual(COMPACT_ROWS);
    });

    it('shows the port and the tunnel status on an http run', () => {
        const frame = frameFor(HTTP);

        expect(frame).toContain('4321');
        expect(frame).toContain('live');
    });

    it('trails the ellipsis only while the tunnel is still opening', () => {
        expect(frameFor(HTTP)).not.toContain('live…');
        expect(frameFor(tunnelState('resolving'))).toContain('resolving…');
    });

    it('leaves both rows out on a gateway run', () => {
        const frame = frameFor(RUNNING);

        expect(frame).not.toContain('port');
        expect(frame).not.toContain('url');
    });
}, 20_000);
