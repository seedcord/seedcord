import type { IsStringLiteral } from 'type-fest';

/**
 * What `seedcord codegen` found for each plugin, keyed by the plugin class's `static id`.
 * Codegen writes the members into `seedcord-gen.d.ts`. Read one with {@link Generated}.
 */
export interface PluginTypes {}

interface CodegenPluginClass {
    readonly id: string;
    readonly prototype: object;
}

type CodegenResultOf<PluginClass extends CodegenPluginClass> = PluginClass['prototype'] extends {
    codegen(): infer Result;
}
    ? Awaited<Result>
    : never;

type IdNotLiteral = "This plugin's id is a plain string. Declare it as static readonly id = '<your package name>'.";

type Stale =
    "What seedcord codegen wrote for this plugin doesn't fit its codegen() return type. Run seedcord codegen. If this stays, widen that return type.";

// a plugin's published .d.ts indexes one field. skipLibCheck turns a missing field there into any
type FieldsSetTo<PluginClass extends CodegenPluginClass, Message> = {
    [Field in keyof CodegenResultOf<PluginClass>]: Message;
};

// skipLibCheck skips seedcord-gen.d.ts. Generated is the only check of its rows against codegen()'s return type.
/**
 * The data that `codegen()` returned for a plugin class, merged across every attachment of it.
 * Before codegen has run, it is the declared return type of `codegen()`.
 */
export type Generated<PluginClass extends CodegenPluginClass> =
    IsStringLiteral<PluginClass['id']> extends false
        ? FieldsSetTo<PluginClass, IdNotLiteral>
        : PluginClass['id'] extends keyof PluginTypes
          ? PluginTypes[PluginClass['id']] extends CodegenResultOf<PluginClass>
              ? PluginTypes[PluginClass['id']]
              : FieldsSetTo<PluginClass, Stale>
          : CodegenResultOf<PluginClass>;
