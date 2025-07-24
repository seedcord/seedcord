/*
 * Based on: https://github.com/mason-rogers/envuments
 * Copyright (c) 2020 Mason Rogers <viction.dev@gmail.com> (https://github.com/mason-rogers)
 *
 * Modified in 2025 by Dhruv (https://github.com/materwelonDhruv)
 * Changes: typed variable parsing during both compile time and runtime, support for custom parsers, and more.
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
export type EnvInput = string | undefined;
type EnvParser<T> = (raw: EnvInput, fallback?: T) => T;
export type EnvConverter<T> = typeof Number | typeof Boolean | typeof String | EnvParser<T>;

export interface EnvConverterService {
  getRaw(key: string): string | undefined;
  get(key: string, def?: string): string;
  getNumber(key: string, def?: number): number;
  getBoolean(key: string, def?: boolean): boolean;
}

export class Parser {
  private readonly TEMPLATE_REGEX = /\${\w*}/g;

  constructor(private readonly envService: EnvConverterService) {}

  resolveValueString(key: string, value: string, stack = new Set<string>()): string {
    if (stack.has(key)) return value; // direct cycle, keep as is

    stack.add(key);

    const out = value.replace(this.TEMPLATE_REGEX, (template) => {
      const variable = template.slice(2, -1);
      if (!variable) return template; // empty name, preserve

      if (stack.has(variable)) return template; // cycle, preserve

      const raw = this.envService.getRaw(variable);
      if (!raw || raw === '') return template; // missing or empty, preserve

      const resolved = this.resolveValueString(variable, raw, new Set(stack));

      // If resolution still references the current key, skip replacement (indirect cycle)
      if (resolved.includes(`\${${key}}`)) return template;

      // If nothing changed (unresolved placeholders stayed), also preserve original template
      if (resolved === raw && /\$\{[^}]*\}/.test(resolved)) return template;

      return resolved;
    });

    stack.delete(key);
    return out;
  }

  convertValue<T>(
    key: string,
    fallback: T | undefined,
    converter: EnvConverter<T> | undefined,
    hasFallback = true
  ): T | null | undefined {
    // Determine which converter to use
    const resolvedConverter = this.resolveConverter(converter, fallback);

    // Apply the converter
    if (resolvedConverter === Number)
      return this.convertToNumber(key, fallback, hasFallback) as unknown as T | null | undefined;
    if (resolvedConverter === Boolean)
      return this.convertToBoolean(key, fallback, hasFallback) as unknown as T | null | undefined;
    if (resolvedConverter === String)
      return this.convertToString(key, fallback, hasFallback) as unknown as T | null | undefined;

    // Custom converter function
    const raw = this.envService.get(key, undefined) as EnvInput;

    // If no fallback provided and no value found, return null
    // If explicit undefined fallback and no value found, return undefined
    if (raw === undefined) return hasFallback ? fallback : null;

    return (resolvedConverter as EnvParser<T>)(raw, fallback);
  }

  private resolveConverter<T>(converter: EnvConverter<T> | undefined, fallback: T | undefined): EnvConverter<T> {
    // User provided explicit converter. Use it
    if (converter) return converter;

    // Auto-detect type from fallback using typeof
    const fallbackType = typeof fallback;
    if (fallbackType === 'number') return Number;
    if (fallbackType === 'boolean') return Boolean;
    return String;
  }

  private convertToNumber<T>(key: string, fallback: T | undefined, hasFallback = true): number | null | undefined {
    // Convert fallback to number if needed
    const numFallback = typeof fallback === 'number' ? fallback : fallback ? Number(fallback) : undefined;
    const result = this.envService.getNumber(key, numFallback);
    if (result === undefined) return hasFallback ? undefined : null;

    return result;
  }

  private convertToBoolean<T>(key: string, fallback: T | undefined, hasFallback = true): boolean | null | undefined {
    // Convert fallback to boolean if needed
    const boolFallback = typeof fallback === 'boolean' ? fallback : fallback ? Boolean(fallback) : undefined;
    const result = this.envService.getBoolean(key, boolFallback);
    if (result === undefined) return hasFallback ? undefined : null;

    return result;
  }

  private convertToString<T>(key: string, fallback: T | undefined, hasFallback = true): string | null | undefined {
    // Handle undefined fallback properly for strings
    if (fallback === undefined) {
      const value = this.envService.get(key, undefined);
      if (value === undefined) return hasFallback ? undefined : null;

      return value;
    }

    return this.envService.get(key, String(fallback));
  }
}
