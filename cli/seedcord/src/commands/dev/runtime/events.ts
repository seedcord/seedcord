export type DevEvent =
    | { type: 'restart-required' }
    | { type: 'command-update-prompt'; files: string[] }
    | { type: 'server-listening'; port: number }
    | { type: 'progress'; status: string };

export type DevEventHandler = (event: DevEvent) => void;
