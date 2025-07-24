/* decorators/EventCatchable.ts */
import { Message } from 'discord.js';

import { ErrorHandlingUtils } from '../utilities/ErrorHandlingUtils';

import type { EventHandler } from '../interfaces/Handler';
import type { ClientEvents } from 'discord.js';

export function EventCatchable(log?: boolean) {
  return function (
    _target: EventHandler<keyof ClientEvents>,
    _prop: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<void>>
  ): void {
    const original = descriptor.value;

    descriptor.value = async function (this: EventHandler<keyof ClientEvents>, ...args: any[]): Promise<void> {
      if (!original) throw new Error('Method not found');

      try {
        await original.apply(this, args);
      } catch (err) {
        if (!(err instanceof Error)) throw err;

        this.setErrored();
        // eslint-disable-next-line no-console
        if (log) console.error(err);

        const eventArgs = Array.isArray(this.getEvent()) ? (this.getEvent() as unknown[]) : [this.getEvent()];
        const msg = eventArgs.find((x): x is Message => x instanceof Message);

        // Use ErrorHandlingUtils for consistent error handling
        const result = ErrorHandlingUtils.handleError(err, this.core, msg?.guild ?? null, msg?.author ?? null);

        if (!msg) return;

        await msg.reply({ embeds: [result.response], components: [] });
      }
    };
  };
}
