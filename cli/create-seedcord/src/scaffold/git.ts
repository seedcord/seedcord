import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export interface GitProbe {
    installed: boolean;
    insideRepo: boolean;
    userName: string | null;
}

export interface GitPlan {
    init: boolean;
    developerUsername: string;
    notice: string | null;
}

// the framework's own default
const PLACEHOLDER = 'the developer';

const FALLBACK_TAIL = `Error cards will say "${PLACEHOLDER}" until you set notifications.developerUsername in src/bot.ts.`;
const GIT_ABSENT = `git is not installed. ${FALLBACK_TAIL}`;
const NAME_MISSING = `git reported no user.name. ${FALLBACK_TAIL}`;
const ALREADY_REPO = 'this directory is already inside a git repo. Nothing was initialized.';

function noticeFor(probe: GitProbe, wanted: boolean): string | null {
    if (!probe.installed) return GIT_ABSENT;
    if (probe.userName === null) return NAME_MISSING;
    if (wanted && probe.insideRepo) return ALREADY_REPO;

    return null;
}

export function gitPlanFrom(probe: GitProbe, wanted: boolean): GitPlan {
    return {
        init: wanted && probe.installed && !probe.insideRepo,
        developerUsername: probe.userName ?? PLACEHOLDER,
        notice: noticeFor(probe, wanted)
    };
}

async function ask(args: string[], cwd: string): Promise<string | null> {
    const result = await run('git', args, { cwd }).catch(() => null);
    return result === null ? null : result.stdout.trim();
}

export async function probeGit(cwd: string): Promise<GitProbe> {
    const version = await ask(['--version'], cwd);
    if (version === null) return { installed: false, insideRepo: false, userName: null };

    const [inside, userName] = await Promise.all([
        ask(['rev-parse', '--is-inside-work-tree'], cwd),
        ask(['config', 'user.name'], cwd)
    ]);

    return {
        installed: true,
        insideRepo: inside === 'true',
        userName: userName === null || userName === '' ? null : userName
    };
}
