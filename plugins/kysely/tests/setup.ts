import 'reflect-metadata';

import { vi } from 'vite-plus/test';

vi.mock('envapt', () => ({
    Envapter: {
        isDevelopment: true,
        isProduction: false
    },
    Envapt: () => () => {}
}));
