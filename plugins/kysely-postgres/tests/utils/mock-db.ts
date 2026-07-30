import { vi } from 'vitest';

vi.mock('kysely', async () => {
    const actual = await vi.importActual('kysely');
    return {
        ...actual,
        PostgresDialect: actual.PostgresDialect
    };
});

vi.mock('pg', () => {
    // shared across instances so a test can assert the plugin closed its pool
    const end = vi.fn().mockResolvedValue(undefined);
    class Pool {
        connect = vi.fn().mockResolvedValue({
            release: vi.fn(),
            query: vi.fn().mockResolvedValue({ rows: [] })
        });
        end = end;
        on = vi.fn();
    }
    return { Pool, poolEnd: end };
});
