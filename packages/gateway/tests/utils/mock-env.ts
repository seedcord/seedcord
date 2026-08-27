import { vi } from 'vitest';

vi.mock('envapt', () => ({
    Envapter: {
        isDevelopment: true,
        isProduction: false
    },
    Envapt: () => () => {}
}));

vi.mock('envapt/legacy', () => ({
    Envapt: () => () => {}
}));
