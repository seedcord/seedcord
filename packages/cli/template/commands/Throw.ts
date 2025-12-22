import { BuilderComponent, RegisterCommand } from 'seedcord';

@RegisterCommand('global')
export class ThrowCommand extends BuilderComponent<'command'> {
  constructor() {
    super('command');

    this.instance
      .setName('throw')
      .setDescription('Throws a test error')
      .addStringOption((option) =>
        option
          .setName('error')
          .setDescription('The error to throw')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((option) =>
        option
          .setName('message')
          .setDescription('The error message')
          .setRequired(true)
          .setAutocomplete(true)
      );
  }
}
