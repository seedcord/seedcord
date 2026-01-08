import { RegisterCommand, BuilderComponent } from 'seedcord';

@RegisterCommand('global')
export class TestCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('test')
            .setDescription('Test things')
            .addSubcommandGroup(new ConfirmableTestsGroup().component);
        // .addStringOption((option) =>
        //     option.setName('fruits').setDescription('Choose a fruit').setRequired(true).setAutocomplete(true)
        // )
        // .addStringOption((option) =>
        //     option
        //         .setName('vegetables')
        //         .setDescription('Choose a vegetable')
        //         .setRequired(true)
        //         .setAutocomplete(true)
        // );
    }
}

class ConfirmableTestsGroup extends BuilderComponent<'group'> {
    constructor() {
        super('group');

        this.instance
            .setName('confirmable')
            .setDescription('Tests for Confirmable decorator')
            .addSubcommand(this.classicMode().component)
            .addSubcommand(this.v2Mode().component);
    }

    private classicMode(): BuilderComponent<'subcommand'> {
        return new (class extends BuilderComponent<'subcommand'> {
            constructor() {
                super('subcommand');

                this.instance.setName('classic').setDescription('Classic confirmable mode test');
            }
        })();
    }

    private v2Mode(): BuilderComponent<'subcommand'> {
        return new (class extends BuilderComponent<'subcommand'> {
            constructor() {
                super('subcommand');

                this.instance.setName('v2').setDescription('Component V2 confirmable mode test');
            }
        })();
    }
}
