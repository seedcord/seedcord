import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';

// Claude Code PostToolUse hook for Write and Edit. A session started in one checkout can edit another, like a
// worktree it created, so the edited file's own checkout supplies the linters and the rules.

interface ToolInput {
    file_path: string;
    content?: string;
}

// each line starts with ' ' for context, '+' for a written line, or '-' for a removed one
interface Hunk {
    newStart: number;
    lines: string[];
}

interface ToolResponse {
    type?: string;
    structuredPatch: Hunk[];
}

interface Alert {
    Line: number;
    Severity: string;
    Check: string;
    Message: string;
}

function output(command: string, args: string[], cwd: string): string {
    return spawnSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).stdout;
}

class Checkout {
    // node runs this file with type stripping, which rejects constructor parameter properties
    private readonly root: string;

    private constructor(root: string) {
        this.root = root;
    }

    static of(file: string): Checkout | undefined {
        const root = output('git', ['rev-parse', '--show-toplevel'], dirname(file)).trim();
        if (root === '' || !existsSync(join(root, '.vale.ini'))) return undefined;
        return new Checkout(root);
    }

    relative(file: string): string {
        return relative(this.root, file);
    }

    alerts(file: string): Alert[] {
        return [...this.valeAlerts(file), ...this.stringAlerts(file)];
    }

    // a node_modules/.bin shim is a shell script on unix and a .cmd file on windows, so node runs the package's own bin
    private run(pkg: string, bin: string, args: string[]): string {
        let manifest: string;
        try {
            manifest = createRequire(join(this.root, 'package.json')).resolve(`${pkg}/package.json`);
        } catch {
            return '';
        }
        return output(process.execPath, [join(dirname(manifest), bin), ...args], this.root);
    }

    private valeAlerts(file: string): Alert[] {
        const report = JSON.parse(
            this.run('@vvago/vale', 'bin/vale.cjs', ['--output=JSON', '--minAlertLevel=suggestion', file]) || '{}'
        ) as Record<string, Alert[]>;
        return Object.values(report).flat();
    }

    private stringAlerts(file: string): Alert[] {
        const config = join(this.root, 'tooling/prose/prose.config.ts');
        if (!existsSync(config)) return [];
        const args = ['--no-config-lookup', '-c', config, '--quiet', '--no-warn-ignored', '--format', 'json', file];
        const [result] = JSON.parse(this.run('eslint', 'bin/eslint.js', args) || '[]') as {
            messages: { line: number; message: string }[];
        }[];
        return (result?.messages ?? []).map(({ line, message }) => ({
            Line: line,
            Severity: 'error',
            Check: 'Seedcord.Strings',
            Message: message
        }));
    }
}

function hunksOf(input: ToolInput, response: ToolResponse): Hunk[] {
    // only an Edit or an overwrite reports hunks
    if (response.type === 'create') {
        return [{ newStart: 1, lines: (input.content ?? '').split('\n').map((line) => `+${line}`) }];
    }
    return response.structuredPatch;
}

function writtenLines(hunks: readonly Hunk[]): Set<number> {
    const written = new Set<number>();
    for (const hunk of hunks) {
        let line = hunk.newStart;
        for (const entry of hunk.lines) {
            if (entry.startsWith('-')) continue;
            if (entry.startsWith('+')) written.add(line);
            line++;
        }
    }
    return written;
}

const { tool_input: input, tool_response: response } = JSON.parse(readFileSync(0, 'utf8')) as {
    tool_input: ToolInput;
    tool_response: ToolResponse;
};
const file = input.file_path;
const checkout = Checkout.of(file);

if (checkout !== undefined) {
    const lines = writtenLines(hunksOf(input, response));
    const hits = checkout.alerts(file).filter(({ Line }) => lines.has(Line));

    if (hits.length > 0) {
        const report = hits
            .map(({ Line, Severity, Check, Message }) => `- ${String(Line)} ${Severity} ${Check}: ${Message}`)
            .join('\n');
        const blocking = hits.some(({ Severity }) => Severity === 'error');
        const summary = `The prose lint found these in lines this edit wrote in ${checkout.relative(file)}:\n${report}\n`;
        const followUp = blocking
            ? 'Errors fail the pre-commit hook and CI. Each one needs a rewrite.'
            : 'Suggestions depend on the sense of the word. Rewrite only where the message fits and the rewrite reads plainer.';
        process.stdout.write(
            JSON.stringify(
                blocking
                    ? { decision: 'block', reason: summary + followUp }
                    : { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: summary + followUp } }
            )
        );
    }
}
