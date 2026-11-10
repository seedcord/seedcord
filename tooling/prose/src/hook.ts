import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// Claude Code PostToolUse hook for Write and Edit. A session started in one checkout can edit another, like a
// worktree it created, so the edited file's own checkout supplies the linters and the rules.

interface ToolInput {
    file_path?: string;
    content?: string;
    new_string?: string;
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

    private valeAlerts(file: string): Alert[] {
        const vale = join(this.root, 'node_modules/.bin/vale');
        if (!existsSync(vale)) return [];
        const report = JSON.parse(
            output(vale, ['--output=JSON', '--minAlertLevel=suggestion', file], this.root) || '{}'
        ) as Record<string, Alert[]>;
        return Object.values(report).flat();
    }

    private stringAlerts(file: string): Alert[] {
        const eslint = join(this.root, 'node_modules/.bin/eslint');
        const config = join(this.root, 'tooling/prose/prose.config.ts');
        if (!existsSync(eslint) || !existsSync(config)) return [];
        const args = ['--no-config-lookup', '-c', config, '--quiet', '--no-warn-ignored', '--format', 'json', file];
        const [result] = JSON.parse(output(eslint, args, this.root) || '[]') as {
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

function writtenLines(fileText: string, written: string): Set<number> {
    const lines = new Set<number>();
    const start = fileText.indexOf(written);
    if (start === -1) return lines;
    const first = fileText.slice(0, start).split('\n').length;
    const count = written.split('\n').length;
    for (let line = first; line < first + count; line++) lines.add(line);
    return lines;
}

const { tool_input: input } = JSON.parse(readFileSync(0, 'utf8')) as { tool_input: ToolInput };
const file = input.file_path;
const written = input.new_string ?? input.content;
const checkout = file === undefined ? undefined : Checkout.of(file);

if (checkout !== undefined && file !== undefined && written !== undefined) {
    const lines = writtenLines(readFileSync(file, 'utf8'), written);
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
