import { CustomId } from '@seedcord/custom-id';
import { describe, expect, it } from 'vitest';

import { ComponentDefsKey } from '#customId/routing';
import {
    AutocompleteRouteBrand,
    ComponentDefsBrand,
    ComponentKindBrand,
    ContextMenuKindBrand,
    ContextMenuNamesBrand,
    SlashRouteBrand
} from '#decorators/brands';
import {
    AutocompleteRoute,
    ButtonRoute,
    ChannelMenuRoute,
    MentionableMenuRoute,
    MessageContextMenuRoute,
    UserContextMenuRoute,
    ModalRoute,
    RoleMenuRoute,
    SlashRoute,
    StringMenuRoute,
    UserMenuRoute
} from '#decorators/routes';
import { InteractionRouteKeys, InteractionKind } from '#src/metadataKeys';

import type { HasComponentDefs } from '#customId/routing';
import type { SlashRegistry } from '#registries/SlashRegistry';
import type { AnyCustomId } from '@seedcord/custom-id';
import type { ApplicationCommandType } from 'discord-api-types/v10';

declare module '#registries/SlashRegistry' {
    interface SlashRegistry {
        rtBan: { options: { target: { kind: 'user'; required: true } }; cache: 'cached' };
        rtKick: { options: { note: { kind: 'string'; required: false } }; cache: 'cached' };
        rtFind: { options: { query: { kind: 'string'; required: true; autocomplete: true } }; cache: 'cached' };
    }
}

declare module '#registries/ContextMenuRegistry' {
    interface UserContextMenuRegistry {
        'View Profile': true;
    }
    interface MessageContextMenuRegistry {
        'Report Message': true;
    }
}

// stub branded bases, the shape both transports' handler bases carry
abstract class SlashBase<Route extends keyof SlashRegistry> {
    declare readonly [SlashRouteBrand]?: Route;
    abstract execute(): Promise<void>;
}
abstract class AutocompleteBase<Route extends keyof SlashRegistry> {
    declare readonly [AutocompleteRouteBrand]?: Route;
    abstract execute(): Promise<void>;
}
abstract class ContextMenuBase<
    Kind extends ApplicationCommandType.User | ApplicationCommandType.Message,
    Names extends string
> {
    declare readonly [ContextMenuKindBrand]?: Kind;
    declare readonly [ContextMenuNamesBrand]?: Names;
    abstract execute(): Promise<void>;
}
abstract class ComponentBase<
    Brand extends InteractionKind,
    Defs extends readonly AnyCustomId[]
> implements HasComponentDefs<Defs> {
    declare readonly [ComponentKindBrand]?: Brand;
    declare readonly [ComponentDefsBrand]?: Defs;
    abstract execute(): Promise<void>;
}

const ApproveId = new CustomId('approve');
const RejectId = new CustomId('reject');

function routes(route: InteractionKind, ctor: object): unknown {
    return Reflect.getMetadata(InteractionRouteKeys[route], ctor);
}

// @ts-expect-error the decorator lists a route the handler does not declare
@SlashRoute('rtKick')
class RejectsMismatchesAtCompile extends SlashBase<'rtBan'> {
    async execute(): Promise<void> {}
}

// @ts-expect-error the handler declares a route the decorator omits
@SlashRoute('rtBan')
class RejectsMismatchesAtCompile2 extends SlashBase<'rtBan' | 'rtKick'> {
    async execute(): Promise<void> {}
}

// @ts-expect-error a slash decorator rejects an autocomplete handler
@SlashRoute('rtFind')
class RejectsMismatchesAtCompile3 extends AutocompleteBase<'rtFind'> {
    async execute(): Promise<void> {}
}

// @ts-expect-error the kind does not match the handler generic
@MessageContextMenuRoute('Report Message')
class RejectsMismatchesAtCompile4 extends ContextMenuBase<ApplicationCommandType.User, 'Report Message'> {
    async execute(): Promise<void> {}
}

// @ts-expect-error a button decorator rejects a modal handler
@ButtonRoute(ApproveId)
class RejectsMismatchesAtCompile5 extends ComponentBase<InteractionKind.Modal, [typeof ApproveId]> {
    async execute(): Promise<void> {}
}

// @ts-expect-error the defs do not match the handler generic
@ButtonRoute(ApproveId)
class RejectsMismatchesAtCompile6 extends ComponentBase<InteractionKind.Button, [typeof ApproveId, typeof RejectId]> {
    async execute(): Promise<void> {}
}

// @ts-expect-error a role menu decorator rejects a user menu handler
@RoleMenuRoute(ApproveId)
class RejectsMismatchesAtCompile7 extends ComponentBase<InteractionKind.UserMenu, [typeof ApproveId]> {
    async execute(): Promise<void> {}
}

void RejectsMismatchesAtCompile;
void RejectsMismatchesAtCompile2;
void RejectsMismatchesAtCompile3;
void RejectsMismatchesAtCompile4;
void RejectsMismatchesAtCompile5;
void RejectsMismatchesAtCompile6;
void RejectsMismatchesAtCompile7;

describe('route metadata writes', () => {
    it('SlashRoute stores the routes under the slash key', () => {
        @SlashRoute('rtBan', 'rtKick')
        class Mod extends SlashBase<'rtBan' | 'rtKick'> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.Slash, Mod)).toEqual(['rtBan', 'rtKick']);
    });

    it('AutocompleteRoute stores the routes under the autocomplete key', () => {
        @AutocompleteRoute('rtFind')
        class Find extends AutocompleteBase<'rtFind'> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.Autocomplete, Find)).toEqual(['rtFind']);
    });

    it('ContextMenuRoute stores the names under the kind key', () => {
        @UserContextMenuRoute('View Profile')
        class Profile extends ContextMenuBase<ApplicationCommandType.User, 'View Profile'> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.UserContextMenu, Profile)).toEqual(['View Profile']);
    });

    it('ButtonRoute stores the prefixes and the defs', () => {
        @ButtonRoute(ApproveId, RejectId)
        class Review extends ComponentBase<InteractionKind.Button, [typeof ApproveId, typeof RejectId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.Button, Review)).toEqual(['approve', 'reject']);
        expect(Reflect.getMetadata(ComponentDefsKey, Review)).toEqual([ApproveId, RejectId]);
    });

    it('ModalRoute stores under the modal key', () => {
        @ModalRoute(ApproveId)
        class Config extends ComponentBase<InteractionKind.Modal, [typeof ApproveId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.Modal, Config)).toEqual(['approve']);
    });
});

describe('each menu decorator writes its own kind', () => {
    it('StringMenuRoute stores under the string menu key', () => {
        @StringMenuRoute(ApproveId)
        class Topics extends ComponentBase<InteractionKind.StringMenu, [typeof ApproveId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.StringMenu, Topics)).toEqual(['approve']);
    });

    it('UserMenuRoute stores under the user menu key', () => {
        @UserMenuRoute(ApproveId)
        class Assign extends ComponentBase<InteractionKind.UserMenu, [typeof ApproveId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.UserMenu, Assign)).toEqual(['approve']);
    });

    it('RoleMenuRoute stores under the role menu key', () => {
        @RoleMenuRoute(ApproveId)
        class Grant extends ComponentBase<InteractionKind.RoleMenu, [typeof ApproveId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.RoleMenu, Grant)).toEqual(['approve']);
    });

    it('ChannelMenuRoute stores under the channel menu key', () => {
        @ChannelMenuRoute(ApproveId)
        class LogTarget extends ComponentBase<InteractionKind.ChannelMenu, [typeof ApproveId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.ChannelMenu, LogTarget)).toEqual(['approve']);
    });

    it('MentionableMenuRoute stores under the mentionable menu key', () => {
        @MentionableMenuRoute(ApproveId)
        class Invite extends ComponentBase<InteractionKind.MentionableMenu, [typeof ApproveId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.MentionableMenu, Invite)).toEqual(['approve']);
    });

    it('a menu decorator stores every prefix it is given', () => {
        @StringMenuRoute(ApproveId, RejectId)
        class Filters extends ComponentBase<InteractionKind.StringMenu, [typeof ApproveId, typeof RejectId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionKind.StringMenu, Filters)).toEqual(['approve', 'reject']);
        expect(Reflect.getMetadata(ComponentDefsKey, Filters)).toEqual([ApproveId, RejectId]);
    });
});
