import { AutocompleteRoute } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';

import type { Core } from '#interfaces/Core';
import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from 'discord.js';

// fixtures for the autocomplete suite, distinct routes from the other interface test files so the registry
// augmentation does not collide.
declare module '@seedcord/core' {
    interface SlashRegistry {
        search: {
            options: {
                query: { kind: 'string'; required: true; autocomplete: true };
                limit: { kind: 'integer'; required: false; autocomplete: true };
                category: { kind: 'string'; required: false; choices: ['books', 'films'] };
            };
            cache: 'cached';
        };
        find: {
            options: {
                title: { kind: 'string'; required: true; autocomplete: true };
                year: { kind: 'integer'; required: false; autocomplete: true };
            };
            cache: 'cached';
        };
    }
}

// justified: a real Core always carries a bus, respond publishes through it
const core = { bus: { [PublishDefault]: () => undefined } } as unknown as Core;

// the focused getter reads only options.getFocused(true), so a minimal fake is enough.
function autocomplete(name: string, value: string): AutocompleteInteraction<'cached'> {
    return {
        options: { getFocused: () => ({ name, value, focused: true, type: 3 }) }
    } as unknown as AutocompleteInteraction<'cached'>;
}

// a fake whose resolver answers getInteger/getString for the configured siblings.
function autocompleteSiblings(focusedName: string, siblings: { limit?: number }): AutocompleteInteraction<'cached'> {
    return {
        options: {
            getFocused: () => ({ name: focusedName, value: '', focused: true, type: 3 }),
            getInteger: (name: string) => (name === 'limit' ? (siblings.limit ?? null) : null)
        }
    } as unknown as AutocompleteInteraction<'cached'>;
}

// match also calls this.event.respond, so capture its choices into a shared array.
function autocompleteRespond(
    name: string,
    value: string,
    captured: ApplicationCommandOptionChoiceData[]
): AutocompleteInteraction<'cached'> {
    return {
        options: { getFocused: () => ({ name, value, focused: true, type: 3 }) },
        respond: (choices: readonly ApplicationCommandOptionChoiceData[]) => {
            captured.push(...choices);
            return Promise.resolve();
        }
    } as unknown as AutocompleteInteraction<'cached'>;
}

class SearchFocused extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
    read(): { name: 'query' | 'limit'; value: string } {
        return this.focused;
    }
}

// focused.name is the autocompletable union only, category (a choices option) is excluded, and value is string
class FocusedTypes extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        expectTypeOf(this.focused.name).toEqualTypeOf<'query' | 'limit'>();
        expectTypeOf(this.focused.value).toEqualTypeOf<string>();
        await Promise.resolve();
    }
}

// match branches by focused field, each arm gets the partial value (string) and a respond pinned to the field's kind
class SearchMatch extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        await this.match({
            query: (value, respond) => {
                expectTypeOf(value).toEqualTypeOf<string>();
                return respond([{ name: value, value }]);
            },
            limit: (value, respond) => respond([{ name: value, value: 10 }])
        });
    }
}

// every autocompletable field needs an arm
class MissingArm extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        // @ts-expect-error the 'limit' arm is missing.
        await this.match({
            query: (value, respond) => respond([{ name: value, value }])
        });
    }
}
void MissingArm;

// respond choice values are pinned to the focused field's kind
class BadRespond extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        await this.match({
            // @ts-expect-error a numeric choice value is rejected for the string-kind query field.
            query: (_value, respond) => respond([{ name: 'x', value: 42 }]),
            // @ts-expect-error a string choice value is rejected for the integer-kind limit field.
            limit: (_value, respond) => respond([{ name: 'x', value: 'y' }])
        });
    }
}
void BadRespond;

// sibling reads are restricted to the four resolvable kinds, every read nullable, choices narrowing kept
class Siblings extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        expectTypeOf(this.options.getString('query')).toEqualTypeOf<string | null>();
        expectTypeOf(this.options.getString('category')).toEqualTypeOf<'books' | 'films' | null>();
        expectTypeOf(this.options.getInteger('limit')).toEqualTypeOf<number | null>();
        // search has no boolean option, so getBoolean is absent
        // @ts-expect-error getBoolean does not exist when no boolean option is present.
        void this.options.getBoolean;
        // autocomplete never resolves a user, so a rich getter is never on the view
        // @ts-expect-error getUser is not part of the autocomplete options view.
        void this.options.getUser;
        // @ts-expect-error 'ghost' is not a string option on search.
        void this.options.getString('ghost');
        await Promise.resolve();
    }
}
void Siblings;

// this.route is the firing command, typed as the registered union
class RouteTyped extends AutocompleteHandler<'search' | 'find'> {
    async execute(): Promise<void> {
        expectTypeOf(this.route).toEqualTypeOf<'search' | 'find'>();
        await Promise.resolve();
    }
}
void RouteTyped;

// a multi-command handler's arms span every autocompletable field across both commands
class MultiCommand extends AutocompleteHandler<'search' | 'find'> {
    async execute(): Promise<void> {
        await this.match({
            query: (value, respond) => respond([{ name: value, value }]),
            limit: (value, respond) => respond([{ name: value, value: 1 }]),
            title: (value, respond) => respond([{ name: value, value }]),
            year: (value, respond) => respond([{ name: value, value: 2024 }])
        });
    }
}
void MultiCommand;

// the sibling view across commands is the union of their options, an option absent on the firing command reads null
class UnionSiblings extends AutocompleteHandler<'search' | 'find'> {
    async execute(): Promise<void> {
        expectTypeOf(this.options.getInteger('limit')).toEqualTypeOf<number | null>();
        expectTypeOf(this.options.getInteger('year')).toEqualTypeOf<number | null>();
        expectTypeOf(this.options.getString('category')).toEqualTypeOf<'books' | 'films' | null>();
        await Promise.resolve();
    }
}
void UnionSiblings;

// the four-kind nullable sibling view, reading through to the djs resolver
class SiblingReader extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
    readLimit(): number | null {
        return this.options.getInteger('limit');
    }
}

// @AutocompleteRoute commands must match the handler generic exactly, in both directions.
@AutocompleteRoute('search')
class DecoratedSingle extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void DecoratedSingle;

@AutocompleteRoute('search', 'find')
class DecoratedMulti extends AutocompleteHandler<'search' | 'find'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void DecoratedMulti;

// the handler declares a command the decorator omits
// @ts-expect-error 'find' is in the generic but not listed on the decorator.
@AutocompleteRoute('search')
class OmitsCommand extends AutocompleteHandler<'search' | 'find'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void OmitsCommand;

// the decorator lists a command the handler does not declare
// @ts-expect-error 'find' is listed on the decorator but not in the generic.
@AutocompleteRoute('search', 'find')
class ExtraCommand extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void ExtraCommand;

// the decorator only accepts registered routes
// @ts-expect-error 'ghost' is not a key of SlashRegistry.
@AutocompleteRoute('ghost')
class UnknownCommand extends AutocompleteHandler<'search'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void UnknownCommand;

describe('AutocompleteHandler', () => {
    it('reads the focused option lazily, typed to the autocompletable union with a string value', () => {
        const handler = new SearchFocused(autocomplete('query', 'sp'), core);
        expect(handler.read()).toEqual({ name: 'query', value: 'sp' });
    });

    it('decodes the focused option once and reuses the cached result', () => {
        const handler = new SearchFocused(autocomplete('query', 'sp'), core);
        expect(handler.read()).toBe(handler.read()); // same cached object across reads
    });

    it('exposes the focused type spec', () => {
        expect(FocusedTypes).toBeTypeOf('function');
    });

    it('runs the arm for the focused field with the partial value', async () => {
        const captured: ApplicationCommandOptionChoiceData[] = [];
        await new SearchMatch(autocompleteRespond('query', 'sp', captured), core).execute();
        expect(captured).toEqual([{ name: 'sp', value: 'sp' }]);
    });

    it('throws AutocompleteMatchArmMissing when the focused field has no arm', async () => {
        // a stale-deployed field arrives that the handler does not branch on
        const handler = new SearchMatch(autocompleteRespond('ghost', 'x', []), core);
        await expect(handler.execute()).rejects.toMatchObject({
            code: SeedcordErrorCode.AutocompleteMatchArmMissing
        });
    });

    it('throws AutocompleteMatchArmMissing for a prototype-named focused field', async () => {
        const handler = new SearchMatch(autocompleteRespond('constructor', 'x', []), core);
        await expect(handler.execute()).rejects.toMatchObject({
            code: SeedcordErrorCode.AutocompleteMatchArmMissing
        });
    });

    it('reads sibling options through the restricted nullable view', () => {
        expect(new SiblingReader(autocompleteSiblings('query', { limit: 7 }), core).readLimit()).toBe(7);
        expect(new SiblingReader(autocompleteSiblings('query', {}), core).readLimit()).toBeNull();
    });
});
