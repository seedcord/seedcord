import '../utils/mock-env';

import { randomUUID } from 'node:crypto';

import { Notice } from '@seedcord/core';
import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { HandledException } from '@subscribers/default/HandledException';

import type { Core } from '@interfaces/Core';
import type { ReplyResponse } from '@seedcord/types';
import type { EventFaultSource, FaultSource, InteractionFaultSource } from '@subscribers/types/Subscriptions';
import type { APIComponentInContainer, APIContainerComponent } from 'discord-api-types/v10';

class TestFault extends Notice {
    constructor(message = 'boom', cause?: unknown) {
        super(message, cause === undefined ? undefined : { cause });
    }
    render(): ReplyResponse {
        return { components: [] };
    }
}

const interactionSource: InteractionFaultSource = {
    kind: 'interaction',
    interactionKind: 'slash',
    command: 'ban',
    customId: null,
    userId: 'u1',
    guildId: 'g1',
    channelId: 'c1',
    interactionId: 'i1',
    raw: {}
};

const eventSource: EventFaultSource = {
    kind: 'event',
    eventName: 'messageCreate',
    handler: 'Starboard',
    userId: null,
    guildId: 'g1',
    channelId: null,
    raw: []
};

// justified: the Subscriber base only stores core
const core = {} as unknown as Core;

function reportText(denial: Notice, source: FaultSource): string {
    const report = new HandledException({ denial, uuid: randomUUID(), source }, core).report();
    return JSON.stringify(report.components.map((component) => component.toJSON()));
}

// the raw text-display strings, so an assertion sees the real webhook content before JSON escaping
function rawText(denial: Notice, source: FaultSource): string {
    const report = new HandledException({ denial, uuid: randomUUID(), source }, core).report();
    const container = report.components[0]?.toJSON() as APIContainerComponent;
    return container.components
        .filter((child: APIComponentInContainer) => child.type === ComponentType.TextDisplay)
        .map((child) => child.content)
        .join('\n');
}

describe('HandledException.report', () => {
    it('renders the command and customId for an interaction source', () => {
        const text = reportText(new TestFault(), interactionSource);
        expect(text).toContain('**Command:** ban');
        expect(text).toContain('**Interaction ID:** `i1`');
        expect(text).not.toContain('**Event:**');
    });

    it('renders the event name and handler for an event source, with nullable fallbacks', () => {
        const text = reportText(new TestFault(), eventSource);
        expect(text).toContain('**Event:** messageCreate');
        expect(text).toContain('**Handler:** Starboard');
        expect(text).toContain('**User ID:** `n/a`');
        expect(text).toContain('**Channel ID:** `n/a`');
        expect(text).not.toContain('**Interaction ID:**');
    });

    it('shows an Error cause stack', () => {
        expect(reportText(new TestFault('x', new Error('driver down')), interactionSource)).toContain('driver down');
    });

    it('shows a string cause as-is', () => {
        expect(reportText(new TestFault('x', 'plain reason'), interactionSource)).toContain('plain reason');
    });

    it('does not throw on a bigint cause', () => {
        expect(reportText(new TestFault('x', 10_987_654_321n), interactionSource)).toContain('10987654321');
    });

    it('does not throw on a circular-object cause', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        expect(() => reportText(new TestFault('x', circular), interactionSource)).not.toThrow();
    });

    it('strips ANSI escapes from the denial name, message, and cause stack', () => {
        const ESC = String.fromCharCode(27);
        const fault = new TestFault(`${ESC}[1mboom${ESC}[22m`, new Error(`${ESC}[31mdriver down${ESC}[39m`));
        fault.name = `${ESC}[31mSeedcordError${ESC}[39m`;
        expect(rawText(fault, interactionSource)).not.toContain(ESC);
    });
});
