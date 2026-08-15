import { ContextMenuRoute } from '@seedcord/core';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { ContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';

import '../registry';

@ContextMenuRoute(ApplicationCommandType.User, 'User Info')
export class UserInfoMenu extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
