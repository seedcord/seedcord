// Plugin declares these so attach can read what a plugin runs on. Nothing assigns them at runtime.

export const TransportBrand: unique symbol = Symbol('seedcord:brand:transport');
export const RuntimeBrand: unique symbol = Symbol('seedcord:brand:runtime');

// only the base constructor's spec carries this key. attach looks for it.
export const ScopedSpec: unique symbol = Symbol('seedcord:brand:scoped-spec');
