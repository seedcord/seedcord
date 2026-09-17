import { BuilderComponent, RegisterCommand } from '@seedcord/http';

@RegisterCommand()
export class Roll extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('roll')
            .setDescription('Roll a die')
            .addIntegerOption((option) =>
                option.setName('sides').setDescription('How many sides the die has').setMinValue(2).setMaxValue(100)
            );
    }
}
