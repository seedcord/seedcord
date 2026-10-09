import { assertPermissions, SlashHandler, SlashRoute } from '@seedcord/gateway';
import { PermissionFlagsBits } from 'discord.js';

@SlashRoute('permissions')
export class PermissionsHandler extends SlashHandler<'permissions'> {
    public async execute(): Promise<void> {
        await this.defer();
        const { channel, user } = this.getEvent();

        if (!channel) throw new Error('Channel not found');

        const targetUser = this.options.getMember('user') ?? user;

        const channelPermissions = channel.permissionsFor(targetUser.id, true);

        if (!channelPermissions) throw new Error('Failed to retrieve channel permissions');

        assertPermissions({
            subject: `<@${targetUser.id}>`,
            permissions: channelPermissions.bitfield,
            scope: [PermissionFlagsBits.Administrator]
        });

        await this.send('Permissions check passed');
    }
}
