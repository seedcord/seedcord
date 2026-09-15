import { UnhandledAutocomplete } from '#handlers/defaults/UnhandledAutocomplete';
import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';
import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';

import { BanAutocomplete } from './discovery/fixtures/handlers/BanAutocomplete';
import { ConfirmButton } from './discovery/fixtures/handlers/ConfirmControls';
import { PingCommand } from './discovery/fixtures/handlers/PingCommand';
import { UserInfoMenu } from './discovery/fixtures/handlers/UserInfoMenu';

import type { Manifest } from '#src/manifest/Manifest';

// a generated manifest lists concrete classes and cannot cast them
export const handlers: Manifest['handlers'] = [
    PingCommand,
    BanAutocomplete,
    ConfirmButton,
    UserInfoMenu,
    UnhandledRepliable,
    UnhandledAutocomplete
];

class Audit extends InteractionMiddleware {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}

export const middleware: Manifest['middleware'] = [Audit];

// @ts-expect-error a middleware class reaches BaseHandler through RepliableHandler
export const crossed: Manifest['handlers'] = [Audit];
