import { holdOutput } from './holdOutput';

import type { Steps } from './Steps';
import type { Terminal } from './terminal';

// stdout holds only the command's data
export function stderrSteps(stdout: Terminal = process.stdout, stderr: Terminal = process.stderr): Steps<string> {
    return {
        async step(_label, task) {
            const writeStderr = stderr.write.bind(stderr);
            const held = holdOutput(stdout, stderr, false, (line) => writeStderr(`${line}\n`));
            try {
                return await task();
            } finally {
                for (const line of held.release()) stderr.write(`${line}\n`);
            }
        },
        detail: () => undefined
    };
}
