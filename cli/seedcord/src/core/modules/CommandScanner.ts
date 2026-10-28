import 'reflect-metadata';

import { CommandMetadataKey, isCommandClass } from '@seedcord/core/internal';
import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { ModuleExports } from './ModuleExports';

import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { CommandCtor, CommandMeta } from '@seedcord/core/internal';
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

export interface FoundCommand {
    sourceFile: string;
    className: string;
    json: RESTPostAPIApplicationCommandsJSONBody;
    meta: CommandMeta;
}

function construct({ sourceFile, Command }: CommandClassFile): FoundCommand | SeedcordError | SeedcordTypeError {
    let json: unknown;
    try {
        json = new Command().component.toJSON();
    } catch (error: unknown) {
        const reason = asError(error).message;
        return new SeedcordError(SeedcordErrorCode.CliCommandConstructorThrew, [Command.name, sourceFile, reason], {
            cause: error
        });
    }

    if (!isApplicationCommand(json)) {
        return new SeedcordTypeError(SeedcordErrorCode.CliCommandNotACommand, [Command.name, sourceFile]);
    }
    // justified: isCommandClass checked this key before the walk yielded the class
    const meta = Reflect.getMetadata(CommandMetadataKey, Command) as CommandMeta;
    return { sourceFile, className: Command.name, json, meta };
}

export class CommandScanner {
    constructor(
        private readonly modules: ModuleLoader,
        private readonly files: ProjectFiles
    ) {}

    public async scan(commandsPath: string): Promise<FoundCommand[]> {
        const found: CommandClassFile[] = [];
        const importFailures: unknown[] = [];
        try {
            for await (const commandClass of this.commandClasses(this.files.layout.resolve(commandsPath))) {
                found.push(commandClass);
            }
        } catch (error: unknown) {
            // the walk stops at the first file that fails to import
            importFailures.push(error);
        }

        const exports = new ModuleExports(this.modules.evaluated());
        const commands: FoundCommand[] = [];
        const problems: unknown[] = [];
        for (const { sourceFile, Command } of found) {
            const definingFile = exports.definingExport(Command)?.module.file ?? sourceFile;
            const built = construct({ sourceFile: definingFile, Command });
            if (isSeedcordError(built)) problems.push(built);
            else commands.push(built);
        }

        throwSingleOrAggregate([...problems, ...importFailures], SeedcordErrorCode.CliProblems);
        return commands;
    }

    private async *commandClasses(folder: string): AsyncGenerator<CommandClassFile> {
        const seen = new Set<unknown>();
        for (const file of await this.files.modulePaths(folder)) {
            const imported = await this.modules.importModule<Record<string, unknown>>(file);
            for (const exported of Object.values(imported)) {
                // a barrel re-exports the same class object
                if (seen.has(exported)) continue;
                seen.add(exported);
                // the commands directory holds helpers and constants too
                if (isCommandClass(exported)) yield { sourceFile: file, Command: exported };
            }
        }
    }
}
