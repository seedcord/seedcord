import { Envapter, PortableSource } from 'envapt';
import { onTestFinished } from 'vitest';

// envapt caches process.env on its first read, and vitest sets NODE_ENV to test
export function withEnv(vars: Record<string, string>): void {
    // eslint-disable-next-line react-hooks/rules-of-hooks, @eslint-react/rules-of-hooks -- envapt's useSource is not a react hook
    Envapter.useSource(new PortableSource(vars));
    onTestFinished(() => Envapter.useSource(new PortableSource(process.env)));
}
