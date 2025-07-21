import type { Client } from 'discord.js';

export const Emojis = {};

export const EmojiIcons: Record<EmojiKey, string> = Object.fromEntries(
  Object.keys(Emojis).map((key) => [key, ''])
) as Record<EmojiKey, string>;

type EmojiKey = keyof typeof Emojis;

export class EmojiInjector {
  constructor(private readonly client: Client) {}

  public async init(): Promise<void> {
    if (Object.keys(Emojis).length > 0) return;

    await this.client.application?.emojis.fetch();

    Object.entries(Emojis).forEach(([key, val]) => {
      const emoji = this.client.application?.emojis.cache.find((e) => e.name === val);

      if (emoji) {
        // @ts-expect-error // EmojiKey will never be never because the code will return early if Emojis is not empty
        Emojis[key as EmojiKey] = `<${emoji.identifier}>`;
        // @ts-expect-error // EmojiKey will never be never because the code will return early if Emojis is not empty
        EmojiIcons[key as EmojiKey] = `${emoji.imageURL({ size: 2048, extension: emoji.animated ? 'gif' : 'webp' })}`;
      }
    });
  }
}
