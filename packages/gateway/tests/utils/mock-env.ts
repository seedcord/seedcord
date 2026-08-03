import { vi } from 'vitest';

vi.mock('envapt', () => ({
    Envapter: {
        isDevelopment: true,
        isProduction: false
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Envapt: () => () => {}
}));

// v8 split: @Envapt moved to envapt/legacy, so neutralize it too.
vi.mock('envapt/legacy', () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Envapt: () => () => {}
}));
