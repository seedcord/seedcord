import { describe, it, expect } from 'vitest';

import { buildSlashRoute } from '#src/strings/buildSlashRoute';

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

    it('returns the command unchanged for an empty command name', () => {
        expect(buildSlashRoute('')).toBe('');
    });

    it('treats an empty-string subcommand as absent and returns only the command', () => {
        expect(buildSlashRoute('demo', '')).toBe('demo');
    });

    it('treats an empty-string subcommand as absent even when a group is given', () => {
        expect(buildSlashRoute('demo', '', 'admin')).toBe('demo');
    });

    it('falls back to cmd/sub when the group is an empty string', () => {
        expect(buildSlashRoute('demo', 'reset', '')).toBe('demo/reset');
    });

    it('returns an empty string when every segment is empty', () => {
        expect(buildSlashRoute('', '', '')).toBe('');
    });

    it('does not trim, lowercase, or escape segments', () => {
        expect(buildSlashRoute('Demo', ' Reset ', 'Admin')).toBe('Demo/Admin/ Reset ');
    });
});
