import { describe, it, expect } from 'vitest';

import { buildSlashRoute } from '../../src/strings/buildSlashRoute';

describe('buildSlashRoute', () => {
    it('returns the command for a top-level route', () => {
        expect(buildSlashRoute('ban')).toBe('ban');
    });

    it('joins a command and subcommand', () => {
        expect(buildSlashRoute('demo', 'setup')).toBe('demo/setup');
    });

    it('joins a command, group, and subcommand with the group before the subcommand', () => {
        expect(buildSlashRoute('demo', 'reset', 'admin')).toBe('demo/admin/reset');
    });

    it('ignores a group given without a subcommand', () => {
        expect(buildSlashRoute('demo', undefined, 'admin')).toBe('demo');
    });
});
