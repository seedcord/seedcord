import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

// a deploy builds these bodies for the commands in registries.ts
export function commandBodies(): RESTPostAPIApplicationCommandsJSONBody[] {
    return [
        { name: '8ball', description: 'Ask the ball' },
        {
            name: 'config',
            description: 'Settings',
            options: [
                {
                    type: ApplicationCommandOptionType.SubcommandGroup,
                    name: 'logs',
                    description: 'Log settings',
                    options: [
                        {
                            type: ApplicationCommandOptionType.Subcommand,
                            name: 'set',
                            description: 'Set the log channel',
                            options: [
                                {
                                    type: ApplicationCommandOptionType.Channel,
                                    name: 'channel',
                                    description: 'Where logs go',
                                    required: true
                                }
                            ]
                        }
                    ]
                },
                { type: ApplicationCommandOptionType.Subcommand, name: 'show', description: 'Show the settings' }
            ]
        },
        {
            name: 'probe',
            description: 'Probe something',
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: 'category',
                    description: 'What to probe',
                    choices: [
                        { name: 'Books', value: 'books' },
                        { name: 'Films', value: 'films' }
                    ]
                }
            ]
        },
        { type: ApplicationCommandType.User, name: 'View Profile' },
        { type: ApplicationCommandType.Message, name: 'Report Message' }
    ];
}
