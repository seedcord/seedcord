import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const root = path.resolve(import.meta.dirname, '..');
const packageJsonPath = path.join(root, 'package.json');
const execFileAsync = promisify(execFile);
const HEX_RADIX = 16;
const DEBUG_ENV_VAR = 'RELEASE_METADATA_DEBUG';

const debug = (message: string): void => {
    if (process.env[DEBUG_ENV_VAR] === '1') {
        process.stderr.write(`[release-metadata] ${message}\n`);
    }
};

interface ChangesetRelease {
    name: string;
    newVersion: string | null;
    oldVersion: string | null;
}

interface ChangesetStatus {
    releases?: ({ name?: string | null; newVersion?: string | null; oldVersion?: string | null } | null)[];
}

const extractReleasesFromStatus = (raw: string | undefined): ChangesetRelease[] => {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as ChangesetStatus;
        return (parsed.releases ?? [])
            .map((release) => ({
                name: release?.name?.trim() ?? '',
                newVersion: typeof release?.newVersion === 'string' ? release.newVersion : null,
                oldVersion: typeof release?.oldVersion === 'string' ? release.oldVersion : null
            }))
            .filter((release) => release.name.length > 0);
    } catch {
        return [];
    }
};

const readChangesetReleases = async (): Promise<ChangesetRelease[]> => {
    const statusFileRelative = path.join(
        '.changeset',
        `status-${Date.now()}-${Math.random().toString(HEX_RADIX).slice(2)}.json`
    );
    const statusFileAbsolute = path.join(root, statusFileRelative);

    debug(`Collecting changeset status into ${statusFileAbsolute}`);

    try {
        await execFileAsync('pnpm', ['changeset', 'status', '--output', statusFileRelative], { cwd: root }).catch(
            (error) => {
                const message = error instanceof Error ? error.message : String(error);
                debug(`changeset status command failed: ${message}`);
                // Ignore failures; the file may still contain useful data.
            }
        );
        const raw = await fs.readFile(statusFileAbsolute, 'utf8');
        debug(`Raw changeset status payload: ${raw}`);
        return extractReleasesFromStatus(raw);
    } catch {
        debug('Failed to read or parse changeset status payload. Falling back to package version.');
        return [];
    } finally {
        await fs.rm(statusFileAbsolute, { force: true }).catch(() => undefined);
    }
};

const readPackageVersion = async (): Promise<string | null> => {
    try {
        const raw = await fs.readFile(packageJsonPath, 'utf8');
        const pkg = JSON.parse(raw) as { version?: string };
        return typeof pkg.version === 'string' && pkg.version.trim().length > 0 ? pkg.version : null;
    } catch (error) {
        throw new Error(`Failed to read package.json: ${(error as Error).message}`);
    }
};

const formatDescription = (releases: ChangesetRelease[]): string | null => {
    if (releases.length === 0) {
        return null;
    }

    const escapePipe = (s: string): string => s.replace(/\|/g, '\\|');

    const headerLines: string[] = ['## Updated Packages:', '', '| Package | From | To |', '|---|---|---|'];

    const rows = releases.map((release) => {
        const name = escapePipe(release.name);
        const from = release.oldVersion ? `v${escapePipe(release.oldVersion)}` : 'unreleased';
        const to = release.newVersion ? `v${escapePipe(release.newVersion)}` : 'next';
        return `| ${name} | ${from} | ${to} |`;
    });

    return headerLines.concat(rows).join('\n');
};

const main = async (): Promise<void> => {
    const releases = await readChangesetReleases();
    const releaseCount = releases.length;

    let version: string | null = null;
    let title: string;
    let body: string | null = null;

    if (releaseCount === 0) {
        version = await readPackageVersion();
        title = version ? `chore(release): v${version}` : 'release latest version';
    } else if (releaseCount === 1) {
        const singleRelease = releases[0];
        if (!singleRelease) {
            throw new Error('Unexpected empty release payload while computing metadata.');
        }
        version = singleRelease.newVersion;
        const versionLabel = singleRelease.newVersion ? `v${singleRelease.newVersion}` : 'new release';
        title = `chore(release): ${singleRelease.name} ${versionLabel}`;
        body = formatDescription(releases);
    } else {
        title = `chore: releasing ${releaseCount} packages`;
        body = formatDescription(releases);
    }

    const encodedBody = body ? Buffer.from(body, 'utf8').toString('base64') : '';

    process.stdout.write(`version=${version ?? ''}\n`);
    process.stdout.write(`title=${title}\n`);
    process.stdout.write(`body_b64=${encodedBody}\n`);
};

void main();
