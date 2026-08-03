import { describe, it, expect } from 'vitest';

import { MissingPermissions, MissingRole } from '@notices/index';

import { cardJson } from '../utils/cardText';

describe('MissingPermissions', () => {
    it('addresses the caller when the subject is null', () => {
        const text = cardJson(new MissingPermissions(undefined, null, ['Ban Members']).render());
        expect(text).toContain('You are missing the following permission entries:');
        expect(text).toContain('• Ban Members');
    });

    it('names the subject when one is given', () => {
        const text = cardJson(new MissingPermissions(undefined, '<@123>', ['Ban Members']).render());
        expect(text).toContain('<@123> is missing the following permission entries:');
    });

    it('lists every missing permission name as a bullet', () => {
        const text = cardJson(new MissingPermissions(undefined, null, ['Ban Members', 'Kick Members']).render());
        expect(text).toContain('• Ban Members');
        expect(text).toContain('• Kick Members');
    });

    it('leads the card with a custom message when one is passed, keeping the bullets', () => {
        const text = cardJson(new MissingPermissions('You cannot do that here.', null, ['Ban Members']).render());
        expect(text).toContain('You cannot do that here.');
        expect(text).not.toContain('You are missing the following permission entries:');
        expect(text).toContain('• Ban Members');
    });
});

describe('MissingRole', () => {
    it('mentions the role when the id is present', () => {
        expect(new MissingRole(undefined, '456').message).toBe('You need the <@&456> role to use this.');
    });

    it('falls back to a plain message when the id is null', () => {
        expect(new MissingRole(undefined, null).message).toBe('You do not have the required role.');
    });

    it('takes the message override over the default', () => {
        expect(new MissingRole('Members only.', '456').message).toBe('Members only.');
    });
});
