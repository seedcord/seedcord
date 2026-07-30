import { vi } from 'vitest';

vi.mock('kysely', async () => {
    const actual = await vi.importActual('kysely');
    return {
        ...actual,
        PostgresDialect: actual.PostgresDialect
    };
});

vi.mock('pg', () => {
    // shared across instances so a test can assert the plugin closed its pool, or fail a connect
    const end = vi.fn().mockResolvedValue(undefined);
    const connect = vi.fn().mockResolvedValue({
        release: vi.fn(),
        query: vi.fn().mockResolvedValue({ rows: [] })
    });
    class Pool {
        connect = connect;
        end = end;
        on = vi.fn();
    }
    return { Pool, poolEnd: end, poolConnect: connect };
});
