// stubbed at an installed package's path so the rule's origin check sees a real @seedcord/logger layout.
// depending on the real package would cycle, since every package's eslint-config pulls this plugin.
export declare class Logger {
    constructor(label: string);
    error(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    info(msg: string, ...args: unknown[]): void;
    debug(msg: string, ...args: unknown[]): void;
    trace(msg: string, ...args: unknown[]): void;
}
