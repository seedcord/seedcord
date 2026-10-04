import { UserContextMenuRoute } from '@seedcord/core';

import { UserContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';

import '#tests/node/discovery/fixtures/registry';

@UserContextMenuRoute('User Info')
export class UserInfoMenu extends UserContextMenuHandler<'User Info'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
