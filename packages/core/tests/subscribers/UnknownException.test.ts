import { randomUUID } from 'node:crypto';

import { DiscordAPIError } from '@discordjs/rest';
import { AckTrace } from '@seedcord/core/internal';
import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { UnknownException } from '#subscribers/default/UnknownException';
import { CommonJsDiscordAPIError } from '#tests/utils/commonJsRest';

import type { CoreBase } from '#interfaces/CoreBase';
import type { APIComponentInContainer, APIContainerComponent } from 'discord-api-types/v10';

const ESC = String.fromCharCode(27);

// justified: the Subscriber base only stores core
const core = {} as unknown as CoreBase;

// the text of a text-display in the container, to let an assertion read the real webhook string
function reportText(error: Error, suppressed = 0): string {
    const data = { uuid: randomUUID(), dispatchId: 'd-1', error, origin: 'slash:probe' };
    const report = new UnknownException(data, core, 'unknownException').report(suppressed);
    // justified: report() emits a single container component, its json shape is APIContainerComponent
    const container = report.components[0]?.toJSON() as APIContainerComponent;
    return container.components
        .filter((child: APIComponentInContainer) => child.type === ComponentType.TextDisplay)
        .map((child) => child.content)
        .join('\n');
}

describe('UnknownException.report', () => {
    it('strips ANSI escapes from the error stack', () => {
        const error = new Error(`${ESC}[1mbad request${ESC}[22m`);
        error.name = `${ESC}[31mSeedcordError${ESC}[39m`;
        expect(reportText(error)).not.toContain(ESC);
    });

    it('renders the direct AckTrace cause', () => {
        const error = new Error('illegal ack', { cause: new AckTrace('reply') });
        expect(reportText(error)).toContain('reply() acknowledged this interaction');
    });

    it('prints the suppressed count', () => {
        expect(reportText(new Error('db down'), 412)).toContain('412 more');
    });

    it("doesn't print a count when nothing was suppressed", () => {
        expect(reportText(new Error('db down'))).not.toContain('more');
    });

    it.each([
        ['', DiscordAPIError],
        [', thrown by a discord.js call', CommonJsDiscordAPIError]
    ])("adds the interaction's timestamps to a Discord error on its callback%s", (_source, ApiError) => {
        const url = 'https://discord.com/api/v10/interactions/1450000000000000000/token/callback';
        const error = new ApiError({ message: 'Unknown interaction', code: 10_062 }, 10_062, 404, 'POST', url, {});

        expect(reportText(error)).toContain('### Timestamps');
    });
});
