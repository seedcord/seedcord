const CTRL = 'ctrl+';

// dispatchHotkey runs the action on the second press
export const CONFIRMS = {
    quit: { key: `${CTRL}c`, title: 'Quit?' },
    disconnect: { key: `${CTRL}d`, title: 'Disconnect?' }
} as const;

export type Confirmable = keyof typeof CONFIRMS;

export function confirmKeyLabel(confirm: Confirmable): string {
    return `Ctrl-${CONFIRMS[confirm].key.slice(CTRL.length).toUpperCase()}`;
}
