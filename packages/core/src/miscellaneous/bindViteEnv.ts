import { merge, PortableSource } from 'envapt';

import type { Envapter, Source } from 'envapt';

export function bindEnv(envapter: typeof Envapter, source: Source, directory?: string): Disposable {
    const previousSource = envapter.source;
    const previousBaseDir = previousSource.supportsFiles ? envapter.baseDir : undefined;
    using cleanup = new DisposableStack();
    cleanup.defer(() => {
        envapter.useSource(previousSource);
        if (previousSource.supportsFiles) envapter.baseDir = previousBaseDir;
    });
    if (previousSource.supportsFiles && directory !== undefined) envapter.baseDir = directory;
    envapter.useSource(source);
    return cleanup.move();
}

interface ViteEnvOptions {
    bindings?: Record<string, unknown>;
    directory?: string | undefined;
}

export function bindViteEnv(
    envapter: typeof Envapter,
    vite: Record<string, unknown>,
    { bindings, directory }: ViteEnvOptions = {}
): Disposable {
    // vite has alrdy applied envPrefix to the exposed user vars
    const { MODE: mode, BASE_URL: _baseUrl, DEV: _dev, PROD: _prod, SSR: _ssr, ...values } = vite;
    const source =
        bindings === undefined
            ? envapter.source
            : merge(
                  (key) => (key === 'MODE' && typeof mode === 'string' ? mode : undefined),
                  new PortableSource(bindings)
              );
    return bindEnv(envapter, merge(source, new PortableSource(values)), directory);
}
