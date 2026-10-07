export type Terminal = Pick<NodeJS.WriteStream, 'write' | 'isTTY' | 'columns'>;

export function widthOf(terminal: Terminal): number | undefined {
    return terminal.isTTY ? terminal.columns : undefined;
}
