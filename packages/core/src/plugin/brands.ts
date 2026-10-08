// Plugin declares these so attach can read what a plugin runs on. Nothing assigns them at runtime.

export const TransportBrand: unique symbol = Symbol('seedcord:brand:transport');
export const RuntimeBrand: unique symbol = Symbol('seedcord:brand:runtime');

// the base constructor's spec type carries this key
export const ScopedSpec: unique symbol = Symbol('seedcord:brand:scoped-spec');
