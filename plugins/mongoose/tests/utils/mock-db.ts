import { vi } from 'vitest';

vi.mock('mongoose', () => {
    class Schema {
        constructor(public readonly definition: unknown) {}
    }

    // mirrors mongoose's own registry so a second model on one name with a different schema throws,
    // the way mongoose.js does
    const models: Record<string, { modelName: string; schema: unknown }> = {};

    const model = vi.fn((name: string, schema?: unknown) => {
        const existing = models[name];
        if (existing) {
            if (schema !== undefined && existing.schema !== schema) {
                const err = new Error(`Cannot overwrite \`${name}\` model once compiled.`);
                err.name = 'OverwriteModelError';
                throw err;
            }
            return existing;
        }

        if (schema === undefined) {
            const err = new Error(`Schema hasn't been registered for model "${name}".`);
            err.name = 'MissingSchemaError';
            throw err;
        }

        const created = { modelName: name, schema };
        models[name] = created;
        return created;
    });

    const core = {
        Schema,
        connect: vi
            .fn()
            .mockResolvedValue({ connection: { name: 'mock' }, disconnect: vi.fn().mockResolvedValue(undefined) }),
        model,
        models,
        deleteModel: vi.fn((name: string) => {
            Reflect.deleteProperty(models, name);
        })
    };

    return { default: core, ...core };
});
