import { describe, it, expect } from 'vitest';

import { HasPresentPermissions, MissingPermissions, MissingRole } from '#notices/index';
import { cardJson } from '#tests/utils/cardText';

describe('MissingPermissions', () => {
    it('addresses the caller when the subject is null', () => {
        const text = cardJson(new MissingPermissions(null, ['Ban Members']).render());
        expect(text).toContain('You are missing the following permission entries:');
        expect(text).toContain('• Ban Members');
    });

    it('names the subject when one is given', () => {
        const text = cardJson(new MissingPermissions('<@123>', ['Ban Members']).render());
        expect(text).toContain('<@123> is missing the following permission entries:');
    });

    it('lists every missing permission name as a bullet', () => {
        const text = cardJson(new MissingPermissions(null, ['Ban Members', 'Kick Members']).render());
        expect(text).toContain('• Ban Members');
        expect(text).toContain('• Kick Members');
    });
});

describe('HasPresentPermissions', () => {
    it('leads with the subject and lists the refused permissions', () => {
        const text = cardJson(new HasPresentPermissions('<@123>', ['Administrator']).render());
        expect(text).toContain("<@123> holds permissions that aren't allowed here:");
        expect(text).toContain('• Administrator');
    });
});

describe('MissingRole', () => {
    it('mentions the role', () => {
        expect(new MissingRole('456').message).toBe('You need the <@&456> role to use this.');
    });
});
