import { vi } from 'vite-plus/test';

export function slashPayload(name: string): object {
    // the builder reads app_permissions unconditionally, like the gateway does
    return {
        type: 2,
        id: 'int-1',
        application_id: 'app-1',
        token: 'tok',
        app_permissions: '0',
        // discord sends member in a guild and user in a dm
        user: { id: 'u1', username: 'tester' },
        data: { type: 1, name }
    };
}

export interface CapturedCtx {
    waitUntil: ReturnType<typeof vi.fn<(promise: Promise<unknown>) => void>>;
    settled: () => Promise<unknown>;
}

export function capturingCtx(): CapturedCtx {
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    return {
        waitUntil,
        // the loop also reaches calls that a running promise adds while it waits
        settled: async () => {
            if (waitUntil.mock.calls.length === 0) throw new Error('waitUntil was never called');
            for (const [work] of waitUntil.mock.calls) await work;
            return undefined;
        }
    };
}
