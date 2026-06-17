import { CustomId } from '@seedcord/kit';

const RESERVED_CONFIRM_PREFIX = '__seedcord_confirm';

/**
 * The reserved confirm/cancel codec. It has no route, so the dispatcher ignores its clicks and only the
 * in-process collector reads them. Do not mint a real component from it.
 *
 * @internal
 */
export const CONFIRM_DEF = new CustomId(RESERVED_CONFIRM_PREFIX).oneOf('choice', ['confirm', 'cancel']);
