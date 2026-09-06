import { CustomId, ButtonRoute, RoleMenuRoute, UserMenuRoute } from '@seedcord/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { ButtonHandler, UserMenuHandler } from '#handlers/interaction/components';

// each @ts-expect-error fails the typecheck if the mistake it guards stops being a compile error.

const Approve = new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny']);
const Deny = new CustomId('deny').snowflake('userId').str('reason');
const Assign = new CustomId('assign').snowflake('roleId');

@ButtonRoute(Approve)
class GoodButton extends ButtonHandler<[typeof Approve]> {
    async execute(): Promise<void> {
        expectTypeOf(this.params).toEqualTypeOf<{ userId: string; action: 'approve' | 'deny' }>();
        await Promise.resolve();
    }
}

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

// @ts-expect-error a user menu handler cannot be routed as a role menu.
@RoleMenuRoute(Assign)
class MismatchedSelect extends UserMenuHandler<[typeof Assign]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

@UserMenuRoute(Assign)
class GoodSelect extends UserMenuHandler<[typeof Assign]> {
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
