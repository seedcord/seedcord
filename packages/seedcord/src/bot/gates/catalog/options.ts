import type { Notice } from '@seedcord/kit';

/** The override a catalog gate accepts, a one-line `message` reword or a full `notice` replacement. */
export interface GateNoticeOptions {
    /** Reword the default refusal, keeping its embed styling. */
    message?: string;
    /** Replace the default refusal Notice entirely, for full control or a translated copy. */
    notice?: Notice;
}

/** Picks the refusal a catalog gate throws, the author override when given, else the gate's default. */
export function pickNotice(options: GateNoticeOptions | undefined, makeDefault: (message?: string) => Notice): Notice {
    return options?.notice ?? makeDefault(options?.message);
}
