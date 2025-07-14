/* decorators/EventCatchable.ts */
import { ClientEvents, Message } from 'discord.js';
import { EventHandler } from '../interfaces/Handler';

export function EventCatchable(log?: boolean) {
  return function (
    _target: EventHandler<keyof ClientEvents>,
    _prop: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<void>>
  ) {
    const original = descriptor.value;

    descriptor.value = async function (this: EventHandler<keyof ClientEvents>, ...args: any[]): Promise<void> {
      if (!original) throw new Error('Method not found');

      try {
        await original.apply(this, args);
      } catch (err) {
        if (!(err instanceof Error)) throw err;

        this.setErrored();
        if (log) console.error(err);

        const eventArgs = Array.isArray(this.getEvent()) ? (this.getEvent() as unknown[]) : [this.getEvent()];

        const msg = eventArgs.find((x): x is Message => x instanceof Message);

        if (!msg) return;

        const embed = this.core.bot.errors.getErrorEmbed(err, msg.guild!, msg.author).component;

        await msg.reply({ embeds: [embed], components: [] });
      }
    };
  };
}
