import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { cliLogger } from '#core/cliLogger';
import { useLogCapture } from '#ui/hooks/useLogCapture.ts';
import { LogStore } from '#ui/stores/LogStore.ts';

import type { ReactElement } from 'react';

function Harness({ onReady }: { readonly onReady: () => void }): ReactElement {
    useLogCapture(onReady);
    return <Text>ready</Text>;
}

describe('useLogCapture', () => {
    afterEach(() => LogStore.instance.clear());

    it('keeps capturing after onReady changes, and calls onReady once', async () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender, unmount } = render(<Harness onReady={first} />);

        rerender(<Harness onReady={second} />);
        cliLogger('Test').info('still captured');
        await LogStore.instance.flush();
        unmount();

        expect(LogStore.instance.getLogs().map((entry) => entry.text)).toContain('still captured');
        expect(first).toHaveBeenCalledOnce();
        expect(second).not.toHaveBeenCalled();
    });
});
