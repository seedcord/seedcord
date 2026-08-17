import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { CustomId } from '#customId/CustomId';
import { ComponentDefsKey } from '#customId/routing';
import {
    AutocompleteRouteBrand,
    ComponentDefsBrand,
    ComponentKindBrand,
    ContextMenuKindBrand,
    SlashRouteBrand
} from '#decorators/brands';
import { SelectMenuKind } from '#decorators/interactionRoutes';
import {
    AutocompleteRoute,
    ButtonRoute,
    ContextMenuRoute,
    ModalRoute,
    SelectMenuRoute,
    SlashRoute
} from '#decorators/routes';
import { InteractionRouteKeys, InteractionRoutes } from '#src/metadataKeys';

import type { AnyCustomId } from '#customId/CustomId';
import type { HasComponentDefs } from '#customId/routing';
import type { SlashOptionRegistry } from '#registries/SlashOptionRegistry';

declare module '#registries/SlashOptionRegistry' {
    interface SlashOptionRegistry {
        rtBan: { target: { kind: 'user'; required: true } };
        rtKick: { note: { kind: 'string'; required: false } };
        rtFind: { query: { kind: 'string'; required: true; autocomplete: true } };
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
abstract class SlashBase<Route extends keyof SlashOptionRegistry> {
    declare readonly [SlashRouteBrand]?: Route;
    abstract execute(): Promise<void>;
}
abstract class AutocompleteBase<Route extends keyof SlashOptionRegistry> {
    declare readonly [AutocompleteRouteBrand]?: Route;
    abstract execute(): Promise<void>;
}
abstract class ContextMenuBase<Kind extends ApplicationCommandType.User | ApplicationCommandType.Message> {
    declare readonly [ContextMenuKindBrand]?: Kind;
    abstract execute(): Promise<void>;
}
abstract class ComponentBase<
    Brand extends 'button' | 'modal' | SelectMenuKind,
    Defs extends readonly AnyCustomId[]
> implements HasComponentDefs<Defs> {
    declare readonly [ComponentKindBrand]?: Brand;
    declare readonly [ComponentDefsBrand]?: Defs;
    abstract execute(): Promise<void>;
}

const ApproveId = new CustomId('approve');
const RejectId = new CustomId('reject');

function routes(route: InteractionRoutes, ctor: object): unknown {
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
@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')
class RejectsMismatchesAtCompile4 extends ContextMenuBase<ApplicationCommandType.User> {
    async execute(): Promise<void> {}
}

// @ts-expect-error a button decorator rejects a modal handler
@ButtonRoute(ApproveId)
class RejectsMismatchesAtCompile5 extends ComponentBase<'modal', [typeof ApproveId]> {
    async execute(): Promise<void> {}
}

// @ts-expect-error the defs do not match the handler generic
@ButtonRoute(ApproveId)
class RejectsMismatchesAtCompile6 extends ComponentBase<'button', [typeof ApproveId, typeof RejectId]> {
    async execute(): Promise<void> {}
}

// @ts-expect-error the select kind does not match the handler generic
@SelectMenuRoute(SelectMenuKind.Role, ApproveId)
class RejectsMismatchesAtCompile7 extends ComponentBase<SelectMenuKind.User, [typeof ApproveId]> {
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
        expect(routes(InteractionRoutes.Slash, Mod)).toEqual(['rtBan', 'rtKick']);
    });

    it('AutocompleteRoute stores the routes under the autocomplete key', () => {
        @AutocompleteRoute('rtFind')
        class Find extends AutocompleteBase<'rtFind'> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionRoutes.Autocomplete, Find)).toEqual(['rtFind']);
    });

    it('ContextMenuRoute stores the names under the kind key', () => {
        @ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
        class Profile extends ContextMenuBase<ApplicationCommandType.User> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionRoutes.UserContextMenu, Profile)).toEqual(['View Profile']);
    });

    it('ButtonRoute stores the prefixes and the defs', () => {
        @ButtonRoute(ApproveId, RejectId)
        class Review extends ComponentBase<'button', [typeof ApproveId, typeof RejectId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionRoutes.Button, Review)).toEqual(['approve', 'reject']);
        expect(Reflect.getMetadata(ComponentDefsKey, Review)).toEqual([ApproveId, RejectId]);
    });

    it('SelectMenuRoute stores under the kind-specific key', () => {
        @SelectMenuRoute(SelectMenuKind.User, ApproveId)
        class Assign extends ComponentBase<SelectMenuKind.User, [typeof ApproveId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionRoutes.UserMenu, Assign)).toEqual(['approve']);
    });

    it('ModalRoute stores under the modal key', () => {
        @ModalRoute(ApproveId)
        class Config extends ComponentBase<'modal', [typeof ApproveId]> {
            async execute(): Promise<void> {}
        }
        expect(routes(InteractionRoutes.Modal, Config)).toEqual(['approve']);
    });
});
