/* eslint-disable no-console */

const PREFIX = '[docs]';

export function log(message: string, payload?: unknown): void {
    if (payload !== undefined) {
        console.info(PREFIX, message, payload);
        return;
    }

    console.info(PREFIX, message);
}
