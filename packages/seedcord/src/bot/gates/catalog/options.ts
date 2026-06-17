import type { Notice } from '@seedcord/kit';

/**
 * The override a catalog gate accepts, a one-line `message` reword or a full `notice` replacement. Accepted by the
 * agnostic, role, and nsfw gates ({@link OwnerOnly}, {@link GuildOnly}, {@link DmOnly}, {@link RequireRole},
 * {@link Nsfw}, and {@link Cooldown}). {@link RequirePermissions} and {@link RequireBotPermissions} take
 * {@link RequirePermissionsOptions} instead.
 *
 * @example
 * ```ts
 * // reword the default refusal
 * OwnerOnly({ message: 'Bot owners only.' });
 * ```
 *
 * @example
 * ```ts
 * // replace the refusal entirely, for example a translated Notice
 * GuildOnly({ notice: new MyTranslatedNotice() });
 * ```
 */
export interface GateNoticeOptions {
    /** Reword the default refusal, keeping its embed styling. */
    message?: string;
    /** Replace the default refusal Notice entirely, for full control or a translated copy. */
    notice?: Notice;
}

/**
 * Picks the refusal a catalog gate throws, the author override when given, else the gate's default.
 *
 * @param options - The override a catalog gate received, or undefined when the author passed none.
 * @param makeDefault - Builds the gate's default refusal, given the optional reworded message.
 */
export function pickNotice(options: GateNoticeOptions | undefined, makeDefault: (message?: string) => Notice): Notice {
    return options?.notice ?? makeDefault(options?.message);
}
