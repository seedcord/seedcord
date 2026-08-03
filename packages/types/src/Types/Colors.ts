/**
 * A discord.js color name, or `'Random'`.
 *
 * Duplicated from the djs `Colors` keys so `@seedcord/types` stays discord.js-free. A type test in
 * this package pins it against the real table
 */
export type ColorName =
    | 'Aqua'
    | 'Blue'
    | 'Blurple'
    | 'DarkAqua'
    | 'DarkBlue'
    | 'DarkButNotBlack'
    | 'DarkerGrey'
    | 'DarkGold'
    | 'DarkGreen'
    | 'DarkGrey'
    | 'DarkNavy'
    | 'DarkOrange'
    | 'DarkPurple'
    | 'DarkRed'
    | 'DarkVividPink'
    | 'Default'
    | 'Fuchsia'
    | 'Gold'
    | 'Green'
    | 'Grey'
    | 'Greyple'
    | 'LightGrey'
    | 'LuminousVividPink'
    | 'Navy'
    | 'NotQuiteBlack'
    | 'Orange'
    | 'Purple'
    | 'Red'
    | 'White'
    | 'Yellow'
    | 'Random';

/** Any color the bot color accepts: a name, a raw integer, a `#hex` string, or an rgb tuple. */
export type BotColor = ColorName | number | `#${string}` | readonly [number, number, number];
