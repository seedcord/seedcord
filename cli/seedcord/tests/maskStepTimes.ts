// the step columns line up on each time's width
export function maskStepTimes(screen: string): string {
    return screen.replaceAll(/ +\d[\d.]*m?s\b/gu, (time) => 'T'.padStart(time.length));
}
