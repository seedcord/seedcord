// keeps each time's width, so the step columns still line up
export function maskStepTimes(screen: string): string {
    return screen.replaceAll(/ +\d[\d.]*m?s\b/gu, (time) => 'T'.padStart(time.length));
}
