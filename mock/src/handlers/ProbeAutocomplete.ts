import { AutocompleteRoute, AutocompleteHandler } from '@seedcord/gateway';

const FRUITS = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'];

@AutocompleteRoute('probe')
export class ProbeAutocomplete extends AutocompleteHandler<'probe'> {
    public async execute(): Promise<void> {
        await this.match({
            query: (value, respond) => {
                // a sibling read scopes the suggestions, category is 'books' | 'films' | null mid-edit
                const category = this.options.getString('category');
                const matches = FRUITS.filter((fruit) => fruit.startsWith(value.toLowerCase()));
                const scoped = category ? matches.map((fruit) => `${category}:${fruit}`) : matches;
                return respond(scoped.map((suggestion) => ({ name: suggestion, value: suggestion })));
            },
            // value is the raw partial string even for a number option, so coerce it and drop a NaN mid-edit
            count: (value, respond) => {
                const n = Number.parseInt(value, 10);
                return respond(Number.isNaN(n) ? [] : [{ name: `${n}`, value: n }]);
            },
            ratio: (value, respond) => {
                const n = Number.parseFloat(value);
                return respond(Number.isNaN(n) ? [] : [{ name: `${n}`, value: n }]);
            }
        });
    }
}
