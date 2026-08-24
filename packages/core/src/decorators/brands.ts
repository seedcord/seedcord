// A handler base declares these so a route decorator can read what the handler is for. Nothing
// assigns them at runtime.

export const SlashRouteBrand: unique symbol = Symbol('seedcord:brand:slashRoute');
export const AutocompleteRouteBrand: unique symbol = Symbol('seedcord:brand:autocompleteRoute');
export const ContextMenuKindBrand: unique symbol = Symbol('seedcord:brand:contextMenuKind');
export const ContextMenuNamesBrand: unique symbol = Symbol('seedcord:brand:contextMenuNames');
export const ComponentKindBrand: unique symbol = Symbol('seedcord:brand:componentKind');
export const ComponentDefsBrand: unique symbol = Symbol('seedcord:brand:componentDefs');
