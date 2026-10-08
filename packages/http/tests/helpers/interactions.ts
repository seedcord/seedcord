import { vi } from 'vitest';

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
        settled: async () => {
            const call = waitUntil.mock.calls[0];
            if (!call) throw new Error('waitUntil was never called');
            return call[0];
        }
    };
}
