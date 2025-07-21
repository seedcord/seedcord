/*
 * Based on: https://github.com/mason-rogers/envuments
 * Copyright (c) 2020 Mason Rogers <viction.dev@gmail.com> (https://github.com/mason-rogers)
 *
 * Modified in 2025 by Dhruv (https://github.com/materwelonDhruv)
 * Changes: improved type safety, added resolver support, service dependency
 */

export type EnvInput = string | undefined;
type EnvParser<T> = (raw: EnvInput, fallback?: T) => T;
export type EnvConverter<T> = typeof Number | typeof Boolean | typeof String | EnvParser<T>;

export interface EnvConverterService {
  get(key: string, def?: string): string;
  getNumber(key: string, def?: number): number;
  getBoolean(key: string, def?: boolean): boolean;
}

export class Parser {
  private readonly TEMPLATE_REGEX = /\${\w*}/g;

  constructor(private readonly envService: EnvConverterService) {}

  private escapeRegexChars(str: string): string {
    return str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
  }

  resolveValueString(key: string, value: string): string {
    const templates = value.match(this.TEMPLATE_REGEX);
    if (!templates) return value;

    for (const template of templates) {
      const variable = template.slice(2, -1);
      if (!variable || variable === key) continue; // Prevent any circulars

      const variableVal = this.envService.get(variable);

      value = value.replace(new RegExp(this.escapeRegexChars(template), 'g'), variableVal || template);
    }

    return value;
  }

  convertValue<T>(key: string, fallback: T | undefined, converter: EnvConverter<T> | undefined): T {
    // Determine which converter to use
    const resolvedConverter = this.resolveConverter(converter, fallback);

    // Apply the converter
    if (resolvedConverter === Number) return this.convertToNumber(key, fallback) as unknown as T;
    if (resolvedConverter === Boolean) return this.convertToBoolean(key, fallback) as unknown as T;
    if (resolvedConverter === String) return this.convertToString(key, fallback) as unknown as T;

    // Custom converter function
    const raw = this.envService.get(key, undefined) as EnvInput;
    return (resolvedConverter as EnvParser<T>)(raw, fallback);
  }

  private resolveConverter<T>(converter: EnvConverter<T> | undefined, fallback: T | undefined): EnvConverter<T> {
    // User provided explicit converter. Use it
    if (converter) return converter;

    // Special case: undefined fallback means we want undefined, not string conversion
    if (fallback === undefined) return String;

    // Auto-detect type from fallback using typeof
    const fallbackType = typeof fallback;
    if (fallbackType === 'number') return Number;
    if (fallbackType === 'boolean') return Boolean;
    return String;
  }

  private convertToNumber<T>(key: string, fallback: T | undefined): number {
    // Convert fallback to number if needed
    const numFallback = typeof fallback === 'number' ? fallback : fallback ? Number(fallback) : undefined;
    return this.envService.getNumber(key, numFallback);
  }

  private convertToBoolean<T>(key: string, fallback: T | undefined): boolean {
    // Convert fallback to boolean if needed
    const boolFallback = typeof fallback === 'boolean' ? fallback : fallback ? Boolean(fallback) : undefined;
    return this.envService.getBoolean(key, boolFallback);
  }

  private convertToString<T>(key: string, fallback: T | undefined): string | undefined {
    // Handle undefined fallback properly for strings
    if (fallback === undefined) return this.envService.get(key, undefined);

    return this.envService.get(key, String(fallback));
  }
}
