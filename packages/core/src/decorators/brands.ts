// A handler base declares these so a route decorator can read what the handler is for. Nothing
// assigns them at runtime.

export const SlashRouteBrand: unique symbol = Symbol('seedcord:brand:slash-route');
export const AutocompleteRouteBrand: unique symbol = Symbol('seedcord:brand:autocomplete-route');
export const ContextMenuKindBrand: unique symbol = Symbol('seedcord:brand:context-menu-kind');
export const ContextMenuNamesBrand: unique symbol = Symbol('seedcord:brand:context-menu-names');
export const ComponentKindBrand: unique symbol = Symbol('seedcord:brand:component-kind');
export const ComponentDefsBrand: unique symbol = Symbol('seedcord:brand:component-defs');
