import { confirm as clackConfirm, select as clackSelect } from '@clack/prompts';

import { requireValue } from './requireValue';

import type { ConfirmOptions, SelectOptions } from '@clack/prompts';

export { intro, outro, log, note, spinner } from '@clack/prompts';
export { pickFromList } from './pickFromList';

export async function select<Value>(opts: SelectOptions<Value>): Promise<Value> {
    return requireValue(await clackSelect(opts));
}

export async function confirm(opts: ConfirmOptions): Promise<boolean> {
    return requireValue(await clackConfirm(opts));
}
