import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const root = path.resolve(import.meta.dirname, '..');
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
        debug('Failed to read or parse changeset status payload. Returning empty list.');
        return [];
    } finally {
        await fs.rm(statusFileAbsolute, { force: true }).catch(() => undefined);
    }
};

const main = async (): Promise<void> => {
    const releases = await readChangesetReleases();
    const releaseCount = releases.length;

    process.stdout.write(`count=${releaseCount}\n`);
};

void main();
