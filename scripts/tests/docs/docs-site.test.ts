import { describe, expect, it } from 'vitest';

import { rollbackBuildId } from '#src/docs/DocsSite';

const deployment = (versionId: string): object => ({ versions: [{ version_id: versionId, percentage: 100 }] });

const version = (buildId?: string): object => ({
    resources: { bindings: buildId === undefined ? [] : [{ type: 'plain_text', name: 'BUILD_ID', text: buildId }] }
});

// wrangler lists deployments oldest first
function wrangler(deployments: object[], versions: Record<string, object>): (args: string[]) => string {
    return ([command, , id]) =>
        JSON.stringify(command === 'deployments' ? deployments : (versions[id ?? ''] ?? version()));
}

describe('rollbackBuildId', () => {
    it('reads the build of the deployment before the current one', () => {
        const run = wrangler([deployment('v1'), deployment('v2'), deployment('v3')], {
            v2: version('20261002T000000Z-abc1234'),
            v3: version('20261003T000000Z-abc1234')
        });

        expect(rollbackBuildId(run)).toBe('20261002T000000Z-abc1234');
    });

    it('finds no rollback build on the first deploy', () => {
        expect(rollbackBuildId(wrangler([deployment('v1')], {}))).toBeNull();
    });

    it('finds no rollback build when the previous version set no BUILD_ID', () => {
        expect(rollbackBuildId(wrangler([deployment('v1'), deployment('v2')], { v1: version() }))).toBeNull();
    });
});
