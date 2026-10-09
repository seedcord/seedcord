import 'reflect-metadata';

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { isCommandClass } from '@seedcord/core/internal';
import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { isTsOrJsFile } from '@seedcord/utils/node';
import { ApplicationCommandType } from 'discord-api-types/v10';

import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ScannedCommand } from './AugmentationBuilder';
import type { CommandCtor } from '@seedcord/core/internal';
import type { ILogger } from '@seedcord/types';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

interface CommandClassFile {
    sourceFile: string;
    Command: CommandCtor;
}

function isApplicationCommand(json: unknown): json is RESTPostAPIApplicationCommandsJSONBody {
    if (typeof json !== 'object' || json === null) return false;
    const { name, type } = json as { name?: unknown; type?: unknown };
    if (typeof name !== 'string') return false;
    // chat-input omits type or sets ChatInput, context menus set User or Message
    return (
        type === undefined ||
        type === ApplicationCommandType.ChatInput ||
        type === ApplicationCommandType.User ||
        type === ApplicationCommandType.Message
    );
}

function construct({ sourceFile, Command }: CommandClassFile): ScannedCommand | SeedcordError | undefined {
    let json: unknown;
    try {
        json = new Command().component.toJSON();
    } catch (error: unknown) {
        const reason = Error.isError(error) ? error.message : 'Unknown error';
        return new SeedcordError(
            SeedcordErrorCode.CliCodegenCommandConstructorThrew,
            [Command.name, sourceFile, reason],
            {
                cause: error
            }
        );
    }

    return isApplicationCommand(json) ? { sourceFile, json } : undefined;
}

export class CommandScanner {
    constructor(
        private readonly modules: ModuleLoader,
        private readonly logger: ILogger
    ) {}

    public async scan(commandsDir: string): Promise<ScannedCommand[]> {
        const commands: ScannedCommand[] = [];
        const problems: unknown[] = [];
        try {
            for await (const commandClass of this.walk(commandsDir, new Set(), true)) {
                const built = construct(commandClass);
                if (isSeedcordError(built)) problems.push(built);
                else if (built) commands.push(built);
            }
        } catch (error: unknown) {
            // the walk stops at the first file that fails to import
            problems.push(error);
        }

        throwSingleOrAggregate(problems, SeedcordErrorCode.CliCodegenCommandProblems);
        return commands;
    }

    private async *walk(dir: string, seen: Set<unknown>, isRoot: boolean): AsyncGenerator<CommandClassFile> {
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : 'Unknown error';
            // an unreadable commands dir would pass --check against a stale registry
            if (isRoot) throw new SeedcordError(SeedcordErrorCode.CliCodegenCommandsDirUnreadable, [dir, reason]);
            this.logger.warn(`Skipping unreadable directory ${dir}. ${reason}.`);
            return;
        }

        // readdir order differs between filesystems
        for (const entry of entries.toSorted((a, b) => a.name.localeCompare(b.name))) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                yield* this.walk(fullPath, seen, false);
            } else if (isTsOrJsFile(entry)) {
                const imported = await this.modules.importModule<Record<string, unknown>>(fullPath);
                for (const exported of Object.values(imported)) {
                    // a barrel re-exports the same class object
                    if (seen.has(exported)) continue;
                    seen.add(exported);
                    // the commands directory holds helpers and constants too
                    if (isCommandClass(exported)) yield { sourceFile: fullPath, Command: exported };
                }
            }
        }
    }
}
