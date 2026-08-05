import { Command } from '@commander-js/extra-typings';
import { describe, expect, it, vi } from 'vitest';

import { DevCommand } from '@commands/dev/DevCommand';
import { DevRunner } from '@commands/dev/DevRunner';

describe('DevCommand', () => {
    // constructing the runner reads DISCORD_BOT_TOKEN, which broke `seedcord build` while it ran per invocation
    it('builds no runner until the dev action runs', () => {
        const create = vi.spyOn(DevRunner, 'create');
        const program = new Command();
        const other = vi.fn();

        new DevCommand().register(program);
        program.command('build').action(other);
        program.parse(['build'], { from: 'user' });

        expect(other).toHaveBeenCalledOnce();
        expect(create).not.toHaveBeenCalled();
        create.mockRestore();
    });
});
