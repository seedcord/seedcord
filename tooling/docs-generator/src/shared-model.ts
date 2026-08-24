import { readFile, writeFile } from 'node:fs/promises';

import type { EntryDocResult } from './types';

interface ApiJsonMember {
    canonicalReference?: string;
    name?: string;
    kind?: string;
    overloadIndex?: number;
}

interface ApiJson {
    members: { members: ApiJsonMember[] }[];
}

async function readApiJson(filePath: string): Promise<ApiJson> {
    return JSON.parse(await readFile(filePath, 'utf8')) as ApiJson;
}

// AE rejects two members of one entry point sharing this key, and it counts overloads separately
const containerKey = (member: ApiJsonMember): string =>
    `${member.name ?? ''}|${member.kind ?? ''}|${member.overloadIndex ?? 0}`;

// AE writes `!~Name` for a declaration the entry point pulled in without exporting it
const isLocal = (member: ApiJsonMember): boolean => (member.canonicalReference ?? '').includes('!~');

/**
 * Write a copy of the package's root model that also carries every subpath symbol, for sibling packages
 * to resolve against.
 *
 * @remarks
 * API Extractor matches an inherited base class by exact canonical reference, and it rebuilds that
 * string from the entry point that declares the symbol. The root entry point yields
 * `@seedcord/core!Plugin:class`, and the `@seedcord/core/plugin` entry point yields a different string,
 * so a class extending `Plugin` from another package loses every member it inherits.
 */
export async function writeSharedModel(
    root: EntryDocResult,
    subpaths: readonly EntryDocResult[],
    outputPath: string
): Promise<void> {
    if (!root.outputPath) return;

    const merged = await readApiJson(root.outputPath);
    const rootEntryPoint = merged.members[0];
    if (!rootEntryPoint) return;

    const positions = new Map(rootEntryPoint.members.map((member, index) => [containerKey(member), index]));

    for (const subpath of subpaths) {
        if (!subpath.outputPath) continue;
        const json = await readApiJson(subpath.outputPath);
        for (const member of json.members[0]?.members ?? []) {
            const key = containerKey(member);
            const at = positions.get(key);
            if (at === undefined) {
                positions.set(key, rootEntryPoint.members.length);
                rootEntryPoint.members.push(member);
                continue;
            }
            // sibling packages cite the exported reference
            const claimed = rootEntryPoint.members[at];
            if (claimed && isLocal(claimed) && !isLocal(member)) rootEntryPoint.members[at] = member;
        }
    }

    await writeFile(outputPath, JSON.stringify(merged), 'utf8');
}
