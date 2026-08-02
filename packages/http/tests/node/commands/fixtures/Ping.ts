import { BuilderComponent, RegisterCommand } from '@seedcord/core';

@RegisterCommand('global')
export class Ping extends BuilderComponent<'command'> {
    constructor() {
        super('command');
        this.instance.setName('ping').setDescription('Replies with pong');
    }
}
