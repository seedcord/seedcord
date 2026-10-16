import { Envapter, PortableSource } from 'envapt';
import { onTestFinished, vi } from 'vitest';

import { pinShellEnvironment } from '#core/viteMode';

// envapt caches process.env on its first read, and vitest sets NODE_ENV to test
export function withEnv(vars: Record<string, string>): void {
    // eslint-disable-next-line react-hooks/rules-of-hooks, @eslint-react/rules-of-hooks -- envapt's useSource is not a react hook
    Envapter.useSource(new PortableSource(vars));
    onTestFinished(() => Envapter.useSource(new PortableSource(process.env)));
}

// stubs the shell's environment keys that cli.ts reads at startup
export function withShellEnv(vars: { ENVIRONMENT?: string; ENV?: string; NODE_ENV?: string }): void {
    vi.stubEnv('ENVIRONMENT', vars.ENVIRONMENT);
    vi.stubEnv('ENV', vars.ENV);
    vi.stubEnv('NODE_ENV', vars.NODE_ENV);
    pinShellEnvironment();
    onTestFinished(() => {
        vi.unstubAllEnvs();
        pinShellEnvironment();
    });
}
