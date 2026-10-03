const PROTOCOL = 'ref:';
const MEMBER_SEPARATOR = /[.#]/;

const INSTALLED = /\/node_modules\/@seedcord\/([^/]+)\//;
// plugins/mongoose publishes as @seedcord/plugin-mongoose
const WORKSPACE = /\/(packages|plugins|tooling|cli)\/([^/]+)\//;

// the checker writes a module in front of a name it had to disambiguate
const QUOTED_MODULE = /^"[^"]*"\./;

// typescript gives an anonymous declaration a __ name, like __type for an inline payload type
const SYNTHETIC_ROOT = /^__/;

type RefProblem = string;

function packageOfDeclaration(file: string): string | null {
    const installed = INSTALLED.exec(file);
    if (installed?.[1]) return installed[1];

    const [, root, dir] = WORKSPACE.exec(file) ?? [];
    if (!root || !dir) return null;

    return root === 'plugins' ? `plugin-${dir}` : dir;
}

// a symbol is Owner, Owner.member, Owner#member, or empty for the package overview
export class SymbolRef {
    readonly owner: string;
    readonly member: string | undefined;

    private constructor(
        readonly pkg: string,
        readonly symbol: string
    ) {
        const [owner = '', ...members] = symbol.split(MEMBER_SEPARATOR);
        this.owner = owner;
        this.member = members.at(-1);
    }

    static isRefUrl(url: string): boolean {
        return url.startsWith(PROTOCOL);
    }

    // ref:<package> or ref:<package>/<Symbol>
    static fromUrl(url: string): SymbolRef | RefProblem {
        if (!SymbolRef.isRefUrl(url)) return 'is not a ref: link';

        const [pkg = '', symbol, ...extra] = url.slice(PROTOCOL.length).split('/');
        if (pkg === '') return 'is missing the package';
        if (symbol === '') return 'has a slash with no symbol after it';
        if (extra.length > 0) return 'has a path after the symbol';

        const ref = new SymbolRef(pkg, symbol ?? '');
        if (ref.isPackage) return ref;
        if (ref.owner === '') return 'has nothing before the member';
        if (ref.member === '') return 'has nothing after the member separator';
        return ref;
    }

    static fromDeclaration(file: string, qualifiedName: string): SymbolRef | null {
        const pkg = packageOfDeclaration(file);
        if (!pkg) return null;

        const ref = new SymbolRef(pkg, qualifiedName.replace(QUOTED_MODULE, ''));
        return ref.owner === '' || SYNTHETIC_ROOT.test(ref.owner) ? null : ref;
    }

    get isPackage(): boolean {
        return this.symbol === '';
    }
}
