import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';

@RegisterCommand('global')
export class LeaderboardCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('leaderboard')
            .setDescription('Headless pagination demo, an embed driven by your own cursor and routing.');
    }
}
