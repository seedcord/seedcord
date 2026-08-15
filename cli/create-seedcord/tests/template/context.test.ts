import { describe, expect, it } from 'vitest';

import { buildContext } from '#template/context';

import type { ScaffoldAnswers } from '#template/context';

const GATEWAY: ScaffoldAnswers = {
    directory: 'my-bot',
    language: 'typescript',
    transport: 'gateway',
    capabilities: ['reactions'],
    token: 'aaa.bbb.ccc',
    botColor: 'Blurple'
};

const HTTP: ScaffoldAnswers = {
    directory: 'edge/my-bot',
    language: 'typescript',
    transport: 'http',
    token: 'aaa.bbb.ccc',
    publicKey: 'a'.repeat(64),
    botColor: '#ff8800'
};

const EXTRAS = { developerUsername: 'dhruv', runCommand: 'pnpm run' };

describe('buildContext on gateway', () => {
    const context = buildContext(GATEWAY, EXTRAS);

    it('names the project after the last part of the directory', () => {
        expect(context.projectName).toBe('my-bot');
    });

    it('points the imports at the gateway package', () => {
        expect(context.isGateway).toBe(true);
        expect(context.transportPackage).toBe('@seedcord/gateway');
    });

    it('resolves the picked capabilities into intents and partials', () => {
        expect(context.intents).toEqual(['Guilds', 'GuildMessageReactions', 'DirectMessageReactions']);
        expect(context.partials).toEqual(['Message', 'Channel', 'Reaction']);
    });

    it('sees no message capability behind reactions alone', () => {
        expect(context.hasMessages).toBe(false);
    });

    it('leaves the public key empty, since gateway never asks for one', () => {
        expect(context.publicKey).toBe('');
    });
});

describe('buildContext on http', () => {
    const context = buildContext(HTTP, EXTRAS);

    it('takes the project name from a nested path', () => {
        expect(context.projectName).toBe('my-bot');
    });

    it('points the imports at the http package', () => {
        expect(context.isGateway).toBe(false);
        expect(context.transportPackage).toBe('@seedcord/http');
    });

    it('carries no intents or partials', () => {
        expect(context.intents).toEqual([]);
        expect(context.partials).toEqual([]);
        expect(context.hasMessages).toBe(false);
    });

    it('carries the public key through', () => {
        expect(context.publicKey).toBe('a'.repeat(64));
    });
});

describe('buildContext on a gateway bot that picked nothing', () => {
    const context = buildContext({ ...GATEWAY, capabilities: [] }, EXTRAS);

    it('still writes Guilds', () => {
        expect(context.intents).toEqual(['Guilds']);
    });

    it('sees no message capability', () => {
        expect(context.hasMessages).toBe(false);
    });
});

describe('the message capabilities', () => {
    it.each(['guild-messages', 'message-text', 'direct-messages'])('counts %s', (id) => {
        expect(buildContext({ ...GATEWAY, capabilities: [id] }, EXTRAS).hasMessages).toBe(true);
    });

    it.each(['reactions', 'voice', 'polls', 'automod'])('leaves %s out', (id) => {
        expect(buildContext({ ...GATEWAY, capabilities: [id] }, EXTRAS).hasMessages).toBe(false);
    });
});

describe('buildContext extras', () => {
    it('carries the developer name and the run command', () => {
        const context = buildContext(GATEWAY, EXTRAS);

        expect(context.developerUsername).toBe('dhruv');
        expect(context.pm.run).toBe('pnpm run');
    });
});
