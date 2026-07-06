import type { Notice } from '@stops/Notice';

/**
 * The override a catalog gate accepts, a one-line `message` reword or a full `notice` replacement. Accepted by
 * the agnostic gates ({@link OwnerOnly}, {@link GuildOnly}, {@link DmOnly}, {@link Cooldown}) and the gateway's
 * `RequireRole` and `Nsfw`. The gateway's `RequirePermissions` and `RequireBotPermissions` take
 * `RequirePermissionsOptions` instead.
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

export function pickNotice(options: GateNoticeOptions | undefined, makeDefault: (message?: string) => Notice): Notice {
    return options?.notice ?? makeDefault(options?.message);
}
