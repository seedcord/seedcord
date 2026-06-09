import { RegisterCommand, BuilderComponent } from 'seedcord';

@RegisterCommand('global')
export class ProbeCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('probe')
            .setDescription('Autocomplete showcase')
            .addStringOption((o) =>
                o.setName('query').setDescription('What to search').setRequired(true).setAutocomplete(true)
            )
            .addIntegerOption((o) => o.setName('count').setDescription('How many results').setAutocomplete(true))
            .addNumberOption((o) => o.setName('ratio').setDescription('Relevance ratio').setAutocomplete(true))
            .addStringOption((o) =>
                o
                    .setName('category')
                    .setDescription('Scope the query')
                    .addChoices({ name: 'Books', value: 'books' }, { name: 'Films', value: 'films' })
            )
            .addBooleanOption((o) => o.setName('exact').setDescription('Exact match only'));
    }
}
