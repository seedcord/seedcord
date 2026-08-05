// a new dev signal is a variant here plus a case in DevStore.apply
export type DevEvent =
    | { type: 'module-loading'; path: string }
    | { type: 'module-loaded'; path: string }
    | { type: 'module-error'; path: string; error: unknown }
    | { type: 'file-change'; path: string }
    | { type: 'restart-required' }
    | { type: 'ready' }
    | { type: 'command-update-prompt'; files: string[] }
    | { type: 'server-listening'; port: number; healthPath: string | undefined };

export type DevEventHandler = (event: DevEvent) => void;
