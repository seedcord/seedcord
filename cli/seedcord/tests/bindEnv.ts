import { Envapter, FileSource, PortableSource } from 'envapt';

export function bindEnv(vars: Record<string, string>): Disposable {
    // eslint-disable-next-line @eslint-react/rules-of-hooks, react-hooks/rules-of-hooks -- envapt isn't react
    Envapter.useSource(new PortableSource(vars));
    return { [Symbol.dispose]: () => Envapter.useSource(new FileSource()) };
}
