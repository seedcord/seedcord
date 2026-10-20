import { Envapter, FileSource, PortableSource } from 'envapt';
import { onTestFinished } from 'vitest';

export function bindEnv(vars: Record<string, string>): void {
    // eslint-disable-next-line @eslint-react/rules-of-hooks, react-hooks/rules-of-hooks -- envapt isn't react
    Envapter.useSource(new PortableSource(vars));
    onTestFinished(() => Envapter.useSource(new FileSource()));
}
