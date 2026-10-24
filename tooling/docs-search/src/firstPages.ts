export function firstPages<Row extends { type: string }>(results: readonly Row[], limit: number): Row[] {
    let pages = 0;

    return results.filter((result) => {
        if (result.type === 'page') pages += 1;
        return pages <= limit;
    });
}
