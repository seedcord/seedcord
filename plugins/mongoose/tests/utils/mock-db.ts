import { vi } from 'vitest';

vi.mock('mongoose', () => {
    const core = {
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class
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
