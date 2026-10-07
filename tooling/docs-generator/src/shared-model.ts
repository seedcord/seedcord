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

type ExportedByLocal = Map<string, string>;

function recordPromotion(promotions: ExportedByLocal, claimed: ApiJsonMember, incoming: ApiJsonMember): void {
    const [local, exported] = isLocal(claimed) ? [claimed, incoming] : [incoming, claimed];
    if (!isLocal(local) || isLocal(exported)) return;
    promotions.set(local.canonicalReference ?? '', exported.canonicalReference ?? '');
}

function retarget(node: unknown, promotions: ExportedByLocal): void {
    if (Array.isArray(node)) {
        for (const item of node) retarget(item, promotions);
        return;
    }
    if (typeof node !== 'object' || node === null) return;

    // justified: a parsed JSON object, walked key by key
    const record = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
        if (key === 'canonicalReference' && typeof value === 'string') record[key] = promotions.get(value) ?? value;
        else retarget(value, promotions);
    }
}

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
    const promotions: ExportedByLocal = new Map();

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
            if (!claimed) continue;
            recordPromotion(promotions, claimed, member);
            if (isLocal(claimed) && !isLocal(member)) rootEntryPoint.members[at] = member;
        }
    }

    retarget(merged, promotions);
    await writeFile(outputPath, JSON.stringify(merged), 'utf8');
}
