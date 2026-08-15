import { randomUUID } from 'node:crypto';

import { AckTrace } from '@seedcord/core/internal';
import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { UnknownException } from '#subscribers/default/UnknownException';

import type { CoreBase } from '#interfaces/CoreBase';
import type { APIComponentInContainer, APIContainerComponent } from 'discord-api-types/v10';

const ESC = String.fromCharCode(27);

// justified: the Subscriber base only stores core
const core = {} as unknown as CoreBase;

// the text a text-display carries in the container, so an assertion sees the real webhook string
function reportText(error: Error, suppressed = 0): string {
    const report = new UnknownException({ uuid: randomUUID(), error, routeId: 'slash:probe' }, core).report(suppressed);
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

    it('prints no count when nothing was suppressed', () => {
        expect(reportText(new Error('db down'))).not.toContain('more');
    });
});
