import { describe, expect, it } from 'vitest';

import { CAPABILITIES, intentsFor, partialsFor, privilegedFor } from '@src/interview/capabilities';

describe('CAPABILITIES', () => {
    it('offers eleven options with unique ids', () => {
        expect(CAPABILITIES).toHaveLength(11);
        expect(new Set(CAPABILITIES.map((c) => c.id)).size).toBe(11);
    });

    it('never offers Guilds as a choice', () => {
        expect(CAPABILITIES.flatMap((c) => c.intents)).not.toContain('Guilds');
    });
});

describe('intentsFor', () => {
    it('writes Guilds even when nothing was picked', () => {
        expect(intentsFor([])).toEqual(['Guilds']);
    });

    it('puts Guilds first, then each pick in the order the list offers them', () => {
        expect(intentsFor(['voice', 'guild-messages'])).toEqual(['Guilds', 'GuildMessages', 'GuildVoiceStates']);
    });

    it('lists a shared intent once', () => {
        const intents = intentsFor(['guild-messages', 'reactions', 'polls']);

        expect(new Set(intents).size).toBe(intents.length);
    });

    it('ignores an id no capability declares', () => {
        expect(intentsFor(['nonsense'])).toEqual(['Guilds']);
    });

    it('carries a message event source when only message-text is picked', () => {
        expect(intentsFor(['message-text'])).toContain('GuildMessages');
    });
});

describe('partialsFor', () => {
    it('is empty when nothing needs one', () => {
        expect(partialsFor(['guild-messages'])).toEqual([]);
    });

    it('pulls the three a reaction on an uncached message needs', () => {
        expect(partialsFor(['reactions'])).toEqual(['Message', 'Channel', 'Reaction']);
    });

    it('lists a shared partial once', () => {
        const partials = partialsFor(['reactions', 'direct-messages']);

        expect(new Set(partials).size).toBe(partials.length);
    });
});

describe('privilegedFor', () => {
    it('names only the three the dashboard gates', () => {
        expect(privilegedFor(CAPABILITIES.map((c) => c.id))).toEqual([
            'MessageContent',
            'GuildMembers',
            'GuildPresences'
        ]);
    });

    it('is empty for a bot that picked none of them', () => {
        expect(privilegedFor(['guild-messages', 'reactions'])).toEqual([]);
    });
});
