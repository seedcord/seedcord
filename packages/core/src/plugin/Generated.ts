import type { IsStringLiteral } from 'type-fest';

/**
 * The type of what each plugin's `codegen()` returned, keyed by the plugin class's `static id`.
 * `seedcord codegen` writes the rows into `seedcord-gen.ts`. Read a plugin's row with {@link Generated}.
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

// a plugin's published .d.ts indexes one field. skipLibCheck turns a missing field there into any
type FieldsSetTo<PluginClass extends CodegenPluginClass, Message> = {
    [Field in keyof CodegenResultOf<PluginClass>]: Message;
};

/**
 * The data that `codegen()` returned for a plugin class, merged across every attachment of it.
 * Before codegen has run, it is the declared return type of `codegen()`.
 *
 * When the class's `id` is typed as a plain `string`, each field becomes a message that says how to fix it.
 */
export type Generated<PluginClass extends CodegenPluginClass> =
    IsStringLiteral<PluginClass['id']> extends false
        ? FieldsSetTo<PluginClass, IdNotLiteral>
        : PluginClass['id'] extends keyof PluginTypes
          ? // Fits in seedcord-gen.ts checks this row against codegen()'s return type
            PluginTypes[PluginClass['id']]
          : CodegenResultOf<PluginClass>;
