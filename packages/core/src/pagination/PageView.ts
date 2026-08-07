/**
 * One rendered page of a paginated list.
 */
export interface PageView<Item> {
    items: Item[];
    /** Zero-based, already clamped into range. */
    page: number;
    perPage: number;
    /** The total page count, or `undefined` for a cursor source that has no cheap total. */
    totalPages?: number;
    hasPrev: boolean;
    hasNext: boolean;
}
