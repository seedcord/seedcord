import type { ChatInputCommandInteraction } from 'discord.js';
import {
  AutocompleteHandler,
  AutocompleteRoute,
  Catchable,
  InteractionHandler,
  SlashRoute,
} from 'seedcord';

@SlashRoute('throw')
export class Throw extends InteractionHandler<ChatInputCommandInteraction> {
  @Catchable()
  execute(): Promise<void> {
    throw new Error('This is a test error');
  }
}

@AutocompleteRoute('throw', ['error', 'message'])
export class ThrowAutocomplete extends AutocompleteHandler {
  async execute(): Promise<void> {
    const options: { name: string; value: string }[] = [
      { name: 'Error 1', value: 'error1' },
      { name: 'Error 2', value: 'error2' },
      { name: 'Error 3', value: 'error3' },
      { name: 'Error 4', value: 'error4' },
      { name: 'Error 5', value: 'error5' },
      { name: 'Error 6', value: 'error6' },
      { name: 'Message 1', value: 'message1' },
      { name: 'Message 2', value: 'message2' },
      { name: 'Message 3', value: 'message3' },
      { name: 'Message 4', value: 'message4' },
      { name: 'Message 5', value: 'message5' },
      { name: 'Message 6', value: 'message6' },
    ];

    const focused = this.focused.value;

    const filtered = options.filter((option) =>
      option.value.startsWith(focused)
    );

    await this.event.respond(filtered);
  }
}
