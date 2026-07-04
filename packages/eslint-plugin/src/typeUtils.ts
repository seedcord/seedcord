import type * as ts from 'typescript';

// the symbol is declared inside the discord.js or @discordjs packages, so a same-named local class is excluded
export function isFromDiscordJs(symbol: ts.Symbol | undefined): boolean {
    const file = symbol?.declarations?.[0]?.getSourceFile().fileName;
    return file !== undefined && (file.includes('/discord.js/') || file.includes('/@discordjs/'));
}

// a class/interface type directly, or the underlying class behind a generic instantiation (TypeReference).
// discord.js interactions are generic (ChatInputCommandInteraction<Cached>), so their base chain is only
// reachable through the target.
function asClassOrInterface(type: ts.Type): ts.InterfaceType | undefined {
    if (type.isClassOrInterface()) return type;
    // justified: the checker types .target as an always-present GenericType, but it is undefined on a
    // non-reference type at runtime.
    const target = (type as ts.TypeReference).target as ts.Type | undefined;
    if (target !== undefined && target !== type && target.isClassOrInterface()) return target;
    return undefined;
}

// the type, or one of its base or union members, is a discord.js class whose name is in `names`
export function extendsDjsType(checker: ts.TypeChecker, type: ts.Type, names: string | ReadonlySet<string>): boolean {
    const wanted = typeof names === 'string' ? new Set([names]) : names;
    const seen = new Set<ts.Type>();
    const stack: ts.Type[] = [type];

    while (stack.length > 0) {
        const current = stack.pop();
        if (current === undefined || seen.has(current)) continue;
        seen.add(current);

        if (current.isUnionOrIntersection()) {
            stack.push(...current.types);
            continue;
        }

        const symbol = current.getSymbol();
        if (symbol !== undefined && wanted.has(symbol.getName()) && isFromDiscordJs(symbol)) return true;

        const iface = asClassOrInterface(current);
        if (iface !== undefined) stack.push(...checker.getBaseTypes(iface));
    }

    return false;
}
