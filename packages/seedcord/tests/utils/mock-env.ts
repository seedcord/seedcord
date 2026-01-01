import { vi } from 'vitest';

vi.mock('envapt', () => ({
    Envapter: {
        isDevelopment: true,
        isProduction: false
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Envapt: () => () => {}
}));
