import { CustomId } from '@seedcord/core';

const RESERVED_CONFIRM_PREFIX = '__seedcord_confirm';

// the dispatcher skips these clicks because this id doesn't have a route, and the in-process collector reads them instead.
// never mint a real component from this id.
export const CONFIRM_DEF = new CustomId(RESERVED_CONFIRM_PREFIX).oneOf('choice', ['confirm', 'cancel']);
