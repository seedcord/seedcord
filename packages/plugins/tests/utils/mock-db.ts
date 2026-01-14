import { vi } from 'vitest';

vi.mock('mongoose', () => {
    const core = {
        Schema: class Schema {
            constructor(_def: unknown) {}
        },
        connect: vi
            .fn()
            .mockResolvedValue({ connection: { name: 'mock' }, disconnect: vi.fn().mockResolvedValue(undefined) }),
        model: (name: string) => ({ modelName: name }),
        models: {},
        deleteModel: vi.fn()
    };

    return { default: core, ...core };
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
