import { DISCORD_URL, DOCS_URL, GUIDE_URL, REPO_URL } from '@lib/site';

// wordmark art for the devtools console, pre-rendered from assets/wordmark-{dark,light}.svg.
// each cell is a half-block glyph carrying two vertical pixels, encoded as runs of
// three alphabet chars (top color index, bottom color index, run length). index 0 is transparent.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const RUN_WIDTH = 3;

interface WordmarkArt {
    palette: readonly string[];
    rows: readonly string[];
    copyColor: string;
}

const DARK: WordmarkArt = {
    palette: [
        '',
        '#6fab49',
        '#f04e36',
        '#f04e36',
        '#c84838',
        '#6fab49',
        '#d84838',
        '#d85838',
        '#b87838',
        '#f8f6e8',
        '#988848',
        '#788848',
        '#a87838',
        '#b84838',
        '#a88848',
        '#b88858',
        '#d8d8b8',
        '#88a848',
        '#88a858',
        '#e8e8d8',
        '#a8c888',
        '#f04e36',
        '#f89878',
        '#f8d8c8',
        '#b8d898',
        '#f8b8a8',
        '#d8a898',
        '#f86858',
        '#f89888'
    ],
    rows: [
        'AAPABEAA/AAI',
        'AAHACCADBAEBAABAFBBBIABBAA/AAF',
        'AAEACBCCEDCBGCBHIBFFCBFCBBHAAiJJBAAcJJBAAD',
        'AACACBCCBGEBCCGKLBFFEBFBBBGAAHAJEAAEAJDAAEAJEAAEAJDAABJJBAADAJEAAEAJEAADAJBAABAJCAACAJDAABJJBAAD',
        'AABACBCCJMHBFFFBFBBBFAAGJJCAACJACAABAJBJJBJABAABJABJJBAJBAABJJCJADJJBAABAJBJJBJAEJJBAACJJCJADJJBAACJJBJAEJJBAACJJCJACAJBJJBJAEJJBAAD',
        'AABCCFNCBCCFODBFPBFQBRJBSJBFTBBUBBBCBABAAIJADJJBAJBAABJJCJAFAABJJBJAFAABJJCAAEJJBAACJJBAJBAADAJBAABJJCAAEJJCAABJJBAADJJCAAEJJBAAD',
        'AABCCBDNBDDBCCFGCBECBCCBVWBXJBJJFYJBAAJJABJJBAJCJJBJABAABJABJJCAJBJJCAACJABJJBAJCJJBJABAACJJCAJCJABJJBAACJABJJBAJCJJBJABAACJABJJBAJCJJBJABAACJJBAAEJJCAJCJABJJBAAD',
        'AACCCKZaBJJHAA/AAH',
        'AADCABCCBNCBDCBCCCCNBCDBCCBbCBJcBJJFJABAA/AAH',
        'AAGCAHAACJACAA/AAK',
        'AA/AAb'
    ],
    copyColor: '#a8a695'
};

const LIGHT: WordmarkArt = {
    palette: [
        '',
        '#6fab49',
        '#f04e36',
        '#f04e36',
        '#c84838',
        '#6fab49',
        '#d84838',
        '#d85838',
        '#b87838',
        '#2d3328',
        '#988848',
        '#788848',
        '#a87838',
        '#b84838',
        '#a88848',
        '#b88858',
        '#d8d8b8',
        '#88a848',
        '#f8f6e8',
        '#88a858',
        '#e8e8d8',
        '#a8c888',
        '#f04e36',
        '#f89878',
        '#f8d8c8',
        '#b8d898',
        '#f8b8a8',
        '#d8a898',
        '#f86858',
        '#f89888'
    ],
    rows: [
        'AAPABEAA/AAI',
        'AAHACCADBAEBAABAFBBBIABBAA/AAF',
        'AAEACBCCEDCBGCBHIBFFCBFCBBHAAiJJBAAcJJBAAD',
        'AACACBCCBGEBCCGKLBFFEBFBBBGAAHAJEAAEAJDAAEAJEAAEAJDAABJJBAADAJEAAEAJEAADAJBAABAJCAACAJDAABJJBAAD',
        'AABACBCCJMHBFFFBFBBBFAAGJJCAACJACAABAJBJJBJABAABJABJJBAJBAABJJCJADJJBAABAJBJJBJAEJJBAACJJCJADJJBAACJJBJAEJJBAACJJCJACAJBJJBJAEJJBAAD',
        'AABCCFNCBCCFODBFPBFQBRSBTSBFUBBVBBBCBABAAIJADJJBAJBAABJJCJAFAABJJBJAFAABJJCAAEJJBAACJJBAJBAADAJBAABJJCAAEJJCAABJJBAADJJCAAEJJBAAD',
        'AABCCBDNBDDBCCFGCBECBCCBWXBYSBSSFZSBAAJJABJJBAJCJJBJABAABJABJJCAJBJJCAACJABJJBAJCJJBJABAACJJCAJCJABJJBAACJABJJBAJCJJBJABAACJABJJBAJCJJBJABAACJJBAAEJJCAJCJABJJBAAD',
        'AACCCKabBSSHAA/AAH',
        'AADCABCCBNCBDCBCCCCNBCDBCCBcCBSdBSSFSABAA/AAH',
        'AAGCAHAACSACAA/AAK',
        'AA/AAb'
    ],
    copyColor: '#55584a'
};

const COPY = [
    'a typed framework for Discord bots',
    '',
    `docs     ${DOCS_URL}`,
    `guide    ${GUIDE_URL}`,
    `github   ${REPO_URL}`,
    `discord  ${DISCORD_URL}`
].join('\n');

function buildArgs(art: WordmarkArt): [string, ...string[]] {
    let text = '';
    const styles: string[] = [];
    for (const row of art.rows) {
        for (let i = 0; i < row.length; i += RUN_WIDTH) {
            const top = ALPHABET.indexOf(row[i] as string);
            const bottom = ALPHABET.indexOf(row[i + 1] as string);
            const length = ALPHABET.indexOf(row[i + 2] as string);
            let glyph = ' ';
            let style = '';
            if (top > 0 && bottom > 0) {
                glyph = '▀';
                style = `color:${art.palette[top]};background:${art.palette[bottom]}`;
            } else if (top > 0) {
                glyph = '▀';
                style = `color:${art.palette[top]}`;
            } else if (bottom > 0) {
                glyph = '▄';
                style = `color:${art.palette[bottom]}`;
            }
            text += `%c${glyph.repeat(length)}`;
            styles.push(style);
        }
        text += '\n';
    }
    text += `%c${COPY}`;
    styles.push(`color:${art.copyColor}`);
    return [text, ...styles];
}

let logged = false;

export function logConsoleGreeting(): void {
    // react strict mode re-runs the mount effect in dev
    if (logged) return;
    logged = true;
    // the devtools theme is unreadable from the page, and its default follows the OS scheme
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // eslint-disable-next-line no-console -- the console is the display surface here
    console.log(...buildArgs(dark ? DARK : LIGHT));
}
