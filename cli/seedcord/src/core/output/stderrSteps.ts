import { holdOutput } from './holdOutput';

import type { Steps } from './Steps';
import type { Terminal } from './terminal';

// stdout stays free for a command's data. whatever a step prints goes to stderr
export function stderrSteps(stdout: Terminal = process.stdout, stderr: Terminal = process.stderr): Steps<string> {
    return {
        async step(_label, task) {
            const held = holdOutput(stdout, stderr, false);
            try {
                return await task();
            } finally {
                for (const line of held.release()) stderr.write(`${line}\n`);
            }
        },
        detail: () => undefined
    };
}
