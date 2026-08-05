export interface BackgroundCandidate {
    id: string;
    label: string;
    hex: string;
    note: string;
}

export const BACKGROUND_CANDIDATES: BackgroundCandidate[] = [
    { id: 'neutral-12', label: 'neutral 12 (current)', hex: '#1f1f1f', note: 'hsl 0 0% 12%' },
    { id: 'seed', label: 'seed', hex: '#2d3328', note: 'hsl 93 12% 18% · the green one' },
    { id: 'ink', label: 'near-black', hex: '#0e120c', note: 'hsl 100 20% 6%' },
    { id: 'neutral-15', label: 'neutral 15', hex: '#262626', note: 'hsl 0 0% 15%' },
    { id: 'neutral-18', label: 'neutral 18', hex: '#2d2d2d', note: 'hsl 0 0% 18%' },
    { id: 'warm-13', label: 'warm 13', hex: '#231f1c', note: 'hsl 26 11% 12%' },
    { id: 'warm-16', label: 'warm 16', hex: '#2b2723', note: 'hsl 30 10% 15%' },
    { id: 'warm-18', label: 'warm 18', hex: '#302b26', note: 'hsl 30 12% 17%' },
    { id: 'slate-15', label: 'slate 15', hex: '#23252a', note: 'hsl 223 9% 15%' },
    { id: 'desat-seed', label: 'desaturated seed', hex: '#2b2c28', note: 'hsl 75 5% 16%' }
];
