import { vi } from 'vitest';

vi.mock('mongoose', async () => {
    const actual = await vi.importActual('mongoose');
    return {
        ...actual,
        connect: vi.fn().mockResolvedValue({
            disconnect: vi.fn().mockResolvedValue(undefined)
        }),
        models: {}
    };
});

vi.mock('kysely', async () => {
    const actual = await vi.importActual('kysely');
    return {
        ...actual,
        PostgresDialect: actual.PostgresDialect
    };
});

vi.mock('pg', () => {
    class Pool {
        connect = vi.fn().mockResolvedValue({
            release: vi.fn(),
            query: vi.fn().mockResolvedValue({ rows: [] })
        });
        end = vi.fn().mockResolvedValue(undefined);
        on = vi.fn();
    }
    return { Pool };
});
