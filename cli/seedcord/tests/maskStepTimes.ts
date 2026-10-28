// a step's time depends on the machine. the mask keeps its width so the columns still line up
export function maskStepTimes(screen: string): string {
    return screen.replaceAll(/ +\d[\d.]*m?s\b/gu, (time) => 'T'.padStart(time.length));
}
