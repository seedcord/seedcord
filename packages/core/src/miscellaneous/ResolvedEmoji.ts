import type { APIMessageComponentEmoji } from 'discord-api-types/v10';

/**
 * A resolved custom emoji. Renders as `<:name:id>` in message content, or `<a:name:id>` when animated,
 * and passes straight to a builder's `setEmoji`.
 */
// setEmoji in @discordjs/builders rejects any own key past these three, scanning with Object.entries
export class ResolvedEmoji implements APIMessageComponentEmoji {
    constructor(
        public readonly name: string,
        public readonly id: string,
        public readonly animated = false
    ) {}

    public toString(): string {
        return `<${this.animated ? 'a' : ''}:${this.name}:${this.id}>`;
    }
}
