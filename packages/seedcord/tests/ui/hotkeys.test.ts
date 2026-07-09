import { afterEach, describe, expect, it, vi } from 'vitest';

import { dispatchHotkey } from '@ui/hotkeys';
import { LogStore } from '@ui/stores/LogStore';

import type { LogRecord } from '@seedcord/logger';
import type { Key } from 'ink';

type Ctx = Parameters<typeof dispatchHotkey>[0];

// fixture: a full ink Key with every flag off, overridden per test
function key(overrides: Partial<Key> = {}): Key {
    return {
        upArrow: false,
        downArrow: false,
        leftArrow: false,
        rightArrow: false,
        pageDown: false,
        pageUp: false,
        return: false,
        escape: false,
        ctrl: false,
        shift: false,
        tab: false,
        backspace: false,
        delete: false,
        meta: false,
        ...overrides
    } as unknown as Key;
}

// fixture: only the fields the toggle-mode path reads, the rest stubbed
function makeCtx(overrides: Partial<Ctx>): Ctx {
    return {
        input: '',
        key: key(),
        state: {},
        interactive: true,
        scroll: {},
        store: {},
        enabled: new Set<string>(),
        setEnabled: vi.fn(),
        showToggles: false,
        setShowToggles: vi.fn(),
        cursor: 0,
        setCursor: vi.fn(),
        ...overrides
    } as unknown as Ctx;
}

async function seedChannel(channel: string): Promise<void> {
    const record: LogRecord = { level: 'info', message: 'x', label: 'Test', channel, timestamp: Date.now() };
    LogStore.instance.onLog(record);
    await LogStore.instance.flush();
}

describe('dispatchHotkey channel toggle mode', () => {
    afterEach(() => {
        LogStore.instance.clear();
    });

    it('exits on enter without toggling the channel under the cursor', async () => {
        await seedChannel('alpha');
        const setShowToggles = vi.fn();
        const setEnabled = vi.fn();

        dispatchHotkey(makeCtx({ showToggles: true, key: key({ return: true }), setShowToggles, setEnabled }));

        expect(setShowToggles).toHaveBeenCalledWith(false);
        expect(setEnabled).not.toHaveBeenCalled();
    });

    it('exits on escape', async () => {
        await seedChannel('alpha');
        const setShowToggles = vi.fn();
        const setEnabled = vi.fn();

        dispatchHotkey(makeCtx({ showToggles: true, key: key({ escape: true }), setShowToggles, setEnabled }));

        expect(setShowToggles).toHaveBeenCalledWith(false);
        expect(setEnabled).not.toHaveBeenCalled();
    });

    it('toggles the channel under the cursor on space and stays open', async () => {
        await seedChannel('alpha');
        const setShowToggles = vi.fn();
        const setEnabled = vi.fn();

        dispatchHotkey(makeCtx({ showToggles: true, input: ' ', cursor: 0, setShowToggles, setEnabled }));

        expect(setEnabled).toHaveBeenCalledTimes(1);
        expect(setShowToggles).not.toHaveBeenCalled();
    });
});
