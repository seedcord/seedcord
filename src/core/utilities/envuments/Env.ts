/*
 * Based on: https://github.com/mason-rogers/envuments
 * Copyright (c) 2020 Mason Rogers <viction.dev@gmail.com> (https://github.com/mason-rogers)
 *
 * Modified in 2025 by Dhruv (https://github.com/materwelonDhruv)
 * Changes: typed variable parsing during both compile time and runtime, support for custom parsers, and more.
 */

import { Envuments, EnvCache } from './Envuments';
import { Parser, type EnvConverter } from './Parser';

interface EnvOptions<T = string> {
  fallback?: T;
  converter?: EnvConverter<T>;
}

function createPropertyDecorator<T>(
  key: string,
  fallback: T | undefined,
  converter: EnvConverter<T> | undefined,
  hasFallback = true
): PropertyDecorator {
  return function (target: object, prop: string | symbol): void {
    const propKey = String(prop);
    const cacheKey = `${target.constructor.name}.${propKey}`;

    // Create a property with a getter that handles environment changes
    Object.defineProperty(target, propKey, {
      get: function () {
        // Check if the environment cache has been cleared (indicating config change)
        // If so, we need to re-evaluate our cached value
        let value = EnvCache.get(cacheKey) as T | null | undefined;

        // Re-evaluate if we don't have a cached value
        if (value === undefined) {
          const parser = new Parser(new Envuments());
          value = parser.convertValue(key, fallback, converter, hasFallback);
          EnvCache.set(cacheKey, value);
        }

        return value;
      },
      configurable: false,
      enumerable: true
    });
  };
}

/**
 * Decorator that pulls a key from the environment once,
 * converts it with the chosen converter, and caches the result.
 * Automatically detects type from fallback value using typeof, but allows override with explicit converter.
 */
export function Env<T = string>(key: string, options?: EnvOptions<T>): PropertyDecorator;
export function Env<T = string>(key: string, fallback?: T, converter?: EnvConverter<T>): PropertyDecorator;
export function Env<T = string>(
  key: string,
  fallbackOrOptions?: T | EnvOptions<T>,
  converter?: EnvConverter<T>
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!Reflect)
    throw new Error("@Env annotation used without Reflect, have you called import 'reflect-metadata'; in your code?");

  // Determine if using new options API or legacy API
  let fallback: T | undefined;
  let actualConverter: EnvConverter<T> | undefined;
  let hasFallback = true;

  if (
    fallbackOrOptions &&
    typeof fallbackOrOptions === 'object' &&
    ('fallback' in fallbackOrOptions || 'converter' in fallbackOrOptions)
  ) {
    // New options API
    const options = fallbackOrOptions;
    fallback = options.fallback;
    actualConverter = options.converter;
    hasFallback = 'fallback' in options;
  } else {
    // Legacy API
    fallback = fallbackOrOptions as T;
    actualConverter = converter;
    hasFallback = arguments.length > 1;
  }

  return createPropertyDecorator(key, fallback, actualConverter, hasFallback);
}
