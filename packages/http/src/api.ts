import { API } from '@discordjs/core/http-only';

import type { REST } from '@discordjs/rest';

const apis = new WeakMap<REST, API>();

export function apiFor(rest: REST): API {
    let api = apis.get(rest);
    if (!api) {
        api = new API(rest);
        apis.set(rest, api);
    }
    return api;
}
