import { RegisterCommand, BuilderComponent } from 'seedcord';

@RegisterCommand('global')
export class TestCommand extends BuilderComponent<'command'> {
  constructor() {
    super('command');

    this.instance
      .setName('test')
      .setDescription('Test things')
      .addStringOption((option) =>
        option.setName('fruits').setDescription('Choose a fruit').setRequired(true).setAutocomplete(true)
      )
      .addStringOption((option) =>
        option.setName('vegetables').setDescription('Choose a vegetable').setRequired(true).setAutocomplete(true)
      );
  }
}
