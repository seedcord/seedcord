import { settled } from '@seedcord/cli-prompts/testing';
import { Box, Text, useBoxMetrics } from 'ink';
import { render } from 'ink-testing-library';
import React, { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { version } from '#core/version';
import { Sidebar } from '#ui/components/primitives/Sidebar';
import { SlimRail } from '#ui/components/primitives/SlimRail';
import { INITIAL_CURSOR } from '#ui/filterCursor';
import { COMPACT_ROWS, FULL_ROWS } from '#ui/Screen';
import { DevStore } from '#ui/stores/DevStore';
import { LogStore } from '#ui/stores/LogStore';

import type { TunnelStatus } from '#commands/dev/tunnel/TunnelCoordinator';
import type { LogFilters } from '#ui/devPrefs';
import type { FilterView } from '#ui/Screen';
import type { DevState } from '#ui/stores/DevStore';
import type { LogRecord } from '@seedcord/types';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

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
    store.setTransport({ name: '@seedcord/gateway', version: '0.1.4', target: 'server' });
    return store.getState();
}
const RUNNING = runningState();

const NO_FILTERS: LogFilters = { channels: new Set(), levels: new Set() };

// an http run adds the port and tunnel rows, which makes it the tallest the rail gets
function httpState(): DevState {
    const store = new DevStore();
    store.setPhase('running');
    store.setBusy(false);
    store.setStatus('Connected as TestBot');
    store.setTransport({ name: '@seedcord/http', version: '0.2.3', target: 'server' });
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

type RailAt = (ref: Ref<DOMElement>) => ReactElement;

function sidebar(view: FilterView, width: number | null = null): RailAt {
    return (ref) => (
        <Sidebar
            ref={ref}
            state={HTTP}
            filters={NO_FILTERS}
            uptimeMs={12_000}
            following={true}
            interactive={true}
            cursor={INITIAL_CURSOR}
            width={width}
            view={view}
            details="auto"
        />
    );
}

const slimRail: RailAt = (ref) => (
    <Box ref={ref}>
        <SlimRail state={HTTP} uptimeMs={12_000} following={true} interactive={true} view="collapsed" details="auto" />
    </Box>
);

// the size readout sits outside the measured box
function Harness({ rail }: { readonly rail: RailAt }): ReactElement {
    const railRef = useRef<DOMElement | null>(null);
    const { height, width, hasMeasured } = useBoxMetrics(railRef);
    const size = hasMeasured ? `${height}x${width}` : 'pending';

    return (
        <Box flexDirection="column">
            <Box flexDirection="row">{rail(railRef)}</Box>
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

    async function measure(rail: RailAt): Promise<{ rows: number; columns: number }> {
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

        const view = render(<Harness rail={rail} />);
        await settled(() => expect(read(view.lastFrame()).rows).toBeGreaterThan(0));
        const size = read(view.lastFrame());
        view.unmount();
        return size;
    }

    function frameFor(state: DevState): string {
        const view = render(
            <Sidebar
                state={state}
                filters={NO_FILTERS}
                uptimeMs={12_000}
                following={true}
                interactive={true}
                cursor={INITIAL_CURSOR}
                width={null}
                view="collapsed"
                details="auto"
            />
        );
        const frame = view.lastFrame() ?? '';
        view.unmount();
        return frame;
    }

    // the tier thresholds are authored constants, and this is what keeps them honest as the rail changes
    it('fits the open rail inside the full tier', async () => {
        const { rows } = await measure(sidebar('always'));

        expect(rows).toBeLessThanOrEqual(FULL_ROWS);
    });

    it('fits the collapsed rail and the slim rail inside the compact tier', async () => {
        const collapsed = await measure(sidebar('collapsed'));
        const slim = await measure(slimRail);

        expect(collapsed.rows).toBeLessThanOrEqual(COMPACT_ROWS);
        expect(slim.rows).toBeLessThanOrEqual(COMPACT_ROWS);
    });

    // the collapsed rail is the narrowest the filters view can get
    it('fits the filters view inside the compact tier at the collapsed width', async () => {
        const collapsed = await measure(sidebar('collapsed'));
        const { rows } = await measure(sidebar('shown', collapsed.columns));

        expect(rows).toBeLessThanOrEqual(COMPACT_ROWS);
    });

    it('shows the port and the tunnel status on an http run', () => {
        const frame = frameFor(HTTP);

        expect(frame).toContain('4321');
        expect(frame).toContain('live');
    });

    it('trails the ellipsis only while the tunnel is still opening, on one row even in the slim rail', () => {
        expect(frameFor(HTTP)).not.toContain('live…');
        expect(frameFor(tunnelState('resolving'))).toContain('resolving…');

        const slim = render(
            <SlimRail
                state={tunnelState('registering')}
                uptimeMs={null}
                following={true}
                interactive={true}
                view="collapsed"
                details="auto"
            />
        );
        expect(slim.lastFrame()).toContain('tunnel  registering…');
        slim.unmount();
    });

    it('leaves both rows out on a gateway run', () => {
        const frame = frameFor(RUNNING);

        expect(frame).not.toContain('port');
        expect(frame).not.toContain('url');
    });

    it('shows the cli version in the banner and the transport version in its own row', () => {
        const store = new DevStore();
        store.setTransport({ name: '@seedcord/http', version: '9.9.9', target: 'server' });

        const frame = frameFor(store.getState());
        const [banner] = frame.split('\n');

        expect(banner).toContain(version);
        expect(banner).not.toContain('9.9.9');
        expect(frame).toContain('http');
        expect(frame).toContain('v9.9.9');
    });

    it('shows whether the bot runs on the edge or a server beside the transport version', () => {
        const edge = new DevStore();
        edge.setTransport({ name: '@seedcord/http', version: '0.2.3', target: 'edge' });
        const server = new DevStore();
        server.setTransport({ name: '@seedcord/http', version: '0.2.3', target: 'server' });

        expect(frameFor(edge.getState())).toContain('v0.2.3 · edge');
        expect(frameFor(server.getState())).toContain('v0.2.3 · server');
    });

    it('leaves a column between the widest label and its value', () => {
        const store = new DevStore();
        store.setTransport({ name: '@seedcord/gateway', version: '0.1.4', target: 'server' });

        expect(frameFor(store.getState())).toContain('gateway v0.1.4');
    });
}, 20_000);
