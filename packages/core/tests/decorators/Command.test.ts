import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuilderComponent } from '#components/Component';
import { RegisterCommand } from '#decorators/Command';
import { CommandMetadataKey } from '#src/metadataKeys';

import type { CommandMeta } from '#decorators/Command';

// eslint-disable-next-line @seedcord/command-builder-missing-register-command -- the tests apply RegisterCommand manually
class TestCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');
    }
}

// bypasses the overloads to hit the runtime guards a caller could still reach through untyped code
const registerRaw = RegisterCommand as (scope: string, guilds?: string[]) => (ctor: typeof TestCommand) => void;

function freshCommand(): typeof TestCommand {
    return class extends BuilderComponent<'command'> {
        constructor() {
            super('command');
        }
    };
}

describe('RegisterCommand', () => {
    it('stores global scope metadata on the class', () => {
        const Cmd = freshCommand();
        RegisterCommand('global')(Cmd);
        expect(Reflect.getOwnMetadata(CommandMetadataKey, Cmd) as CommandMeta).toEqual({ scope: 'global' });
    });

    it('stores guild scope metadata with the guild ids', () => {
        const Cmd = freshCommand();
        RegisterCommand('guild', ['123'])(Cmd);
        expect(Reflect.getOwnMetadata(CommandMetadataKey, Cmd) as CommandMeta).toEqual({
            scope: 'guild',
            guilds: ['123']
        });
    });

    it('throws when the same class is registered twice', () => {
        const Cmd = freshCommand();
        RegisterCommand('global')(Cmd);
        let caught: unknown;
        try {
            RegisterCommand('global')(Cmd);
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.DecoratorCommandAlreadyRegistered)).toBe(true);
    });

    it('throws when global scope carries guild ids', () => {
        let caught: unknown;
        try {
            registerRaw('global', ['123'])(freshCommand());
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.DecoratorCommandGlobalWithGuilds)).toBe(true);
    });

    it('throws when guild scope carries no guild ids', () => {
        let caught: unknown;
        try {
            registerRaw('guild')(freshCommand());
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.DecoratorCommandGuildWithoutGuilds)).toBe(true);
    });
});
