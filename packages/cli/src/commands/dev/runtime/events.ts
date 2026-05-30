/**
 * The single vocabulary of dev-session lifecycle events. Producers (`HmrPlugin`, `ViteDevRuntime`)
 * emit these; `DevStore` reduces the ones that map to UI state and ignores the purely informational
 * ones. Adding a new dev signal means adding a variant here and a case in `DevStore.apply`, nowhere else.
 */
export type DevEvent =
    | { type: 'module-loading'; path: string }
    | { type: 'module-loaded'; path: string }
    | { type: 'module-error'; path: string; error: unknown }
    | { type: 'file-change'; path: string }
    | { type: 'restart-required' }
    | { type: 'ready' }
    | { type: 'command-update-prompt'; files: string[] };

export type DevEventHandler = (event: DevEvent) => void;
