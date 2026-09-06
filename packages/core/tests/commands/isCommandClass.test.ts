import { describe, expect, it } from 'vitest';

import { BuilderComponent } from '#components/Component';
import { RegisterCommand } from '#decorators/Command';
import { isCommandClass } from '#src/commands/isCommandClass';
import { CommandMetadataKey } from '#src/metadataKeys';

function freshCommand(): new () => BuilderComponent<'command'> {
    return class extends BuilderComponent<'command'> {
        public constructor() {
            super('command');
        }
    };
}

// under the cli, BuilderComponent.prototype is a different object carrying the same registered brand.
// this rebuilds that shape without loading the module twice
function foreignCopySubclass(): new () => unknown {
    const foreignBase = Object.defineProperty({}, Symbol.for('seedcord:core:builder-component'), { value: true });
    const Sub = class {
        public readonly type = 'command';
    };
    Object.setPrototypeOf(Sub.prototype, foreignBase);
    return Sub;
}

describe('isCommandClass', () => {
    it('accepts a decorated command class', () => {
        const Cmd = freshCommand();
        RegisterCommand('global')(Cmd);
        expect(isCommandClass(Cmd)).toBe(true);
    });

    it('rejects a command class with no decorator', () => {
        expect(isCommandClass(freshCommand())).toBe(false);
    });

    it('accepts a decorated subclass reached through another copy of the module', () => {
        const Cmd = foreignCopySubclass();
        Reflect.defineMetadata(CommandMetadataKey, { scope: 'global' }, Cmd);
        expect(isCommandClass(Cmd)).toBe(true);
    });

    it('rejects a class that carries the metadata without extending BuilderComponent', () => {
        class Forged {
            public readonly component = {};
        }
        Reflect.defineMetadata(CommandMetadataKey, { scope: 'global' }, Forged);
        expect(isCommandClass(Forged)).toBe(false);
    });

    it('rejects a value that is not a class', () => {
        expect(isCommandClass({ component: {} })).toBe(false);
        expect(isCommandClass(() => undefined)).toBe(false);
    });
});
