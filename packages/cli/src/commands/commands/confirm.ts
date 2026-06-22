import { createInterface } from 'node:readline';

import type { ILogger } from '@seedcord/types';

type Ask = (question: string) => Promise<string>;

async function readlineAsk(question: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
        return await new Promise<string>((resolve) => rl.question(question, resolve));
    } finally {
        rl.close();
    }
}

/**
 * Gates a destructive delete behind typing the exact count, so a mistyped, empty, or non-numeric answer
 * aborts with nothing deleted.
 */
export async function confirmCount(count: number, logger: ILogger, ask: Ask = readlineAsk): Promise<boolean> {
    logger.warn(`About to delete ${count} guild command(s). This cannot be undone.`);
    const answer = await ask(`Type ${count} to confirm (anything else aborts) `);
    return answer.trim() === String(count);
}
