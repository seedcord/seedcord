import { describe, expect, expectTypeOf, it } from 'vitest';

import { ButtonRoute, SelectMenuRoute, SelectMenuType } from '@bDecorators/Interactions';
import { ButtonHandler, CustomId, SelectHandler } from '@customId/index';

// Compile-time footgun tests. Each @ts-expect-error fails the typecheck if the mistake it guards ever
// stops being a compile error, so this file is the type-safety regression suite. The classes are
// referenced in the it() block below only so they are not reported unused.

const Approve = new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny']);
const Deny = new CustomId('deny').snowflake('userId').str('reason');
const Assign = new CustomId('assign').snowflake('roleId');

// a matching single-route handler compiles, and this.params infers each field's decoded type.
@ButtonRoute(Approve)
class GoodButton extends ButtonHandler<[typeof Approve]> {
    async execute(): Promise<void> {
        expectTypeOf(this.params).toEqualTypeOf<{ userId: string; action: 'approve' | 'deny' }>();
        await Promise.resolve();
    }
}

// the decorator's definition and the generic's definition disagree.
// @ts-expect-error a handler typed for Approve cannot be routed with Deny.
@ButtonRoute(Deny)
class MismatchedButton extends ButtonHandler<[typeof Approve]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// a multi-route handler must provide an arm for every route.
@ButtonRoute(Approve, Deny)
class MissingArm extends ButtonHandler<[typeof Approve, typeof Deny]> {
    async execute(): Promise<void> {
        // @ts-expect-error the 'deny' arm is missing.
        await this.match({
            approve: (params) => params.userId
        });
    }
}

// an unknown arm is rejected.
@ButtonRoute(Approve)
class ExtraArm extends ButtonHandler<[typeof Approve]> {
    async execute(): Promise<void> {
        await this.match({
            approve: (params) => params.userId,
            // @ts-expect-error 'bogus' is not a registered route.
            bogus: () => 'nope'
        });
    }
}

// a field that is not on the shape is rejected.
@ButtonRoute(Approve)
class WrongField extends ButtonHandler<[typeof Approve]> {
    async execute(): Promise<void> {
        // @ts-expect-error 'channelId' is not a field of Approve.
        void this.params.channelId;
        await Promise.resolve();
    }
}

// this.params is never on a multi-route handler, so authors are pushed to match.
@ButtonRoute(Approve, Deny)
class MultiParams extends ButtonHandler<[typeof Approve, typeof Deny]> {
    async execute(): Promise<void> {
        expectTypeOf(this.params).toBeNever();
        await Promise.resolve();
    }
}

// the select kind in the generic must match the kind in the decorator.
// @ts-expect-error a user-select handler cannot be routed as a role select.
@SelectMenuRoute(SelectMenuType.Role, Assign)
class MismatchedSelect extends SelectHandler<SelectMenuType.User, [typeof Assign]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// a matching select compiles and narrows this.params.
@SelectMenuRoute(SelectMenuType.User, Assign)
class GoodSelect extends SelectHandler<SelectMenuType.User, [typeof Assign]> {
    async execute(): Promise<void> {
        expectTypeOf(this.params).toEqualTypeOf<{ roleId: string }>();
        await Promise.resolve();
    }
}

describe('customId handler type safety', () => {
    it('compiles the matching cases and rejects the mismatched ones', () => {
        const classes = [
            GoodButton,
            MismatchedButton,
            MissingArm,
            ExtraArm,
            WrongField,
            MultiParams,
            MismatchedSelect,
            GoodSelect
        ];
        expect(classes).toHaveLength(8);
    });
});
