/**
 * Basic document interface with MongoDB ObjectId field.
 *
 * Represents the minimal structure of a MongoDB document
 * with the required `_id` field.
 */
export interface IDocument {
    /** MongoDB document identifier */
    _id: string;
}

/**
 * Helper type to extract the type of a document that extends IDocument.
 *
 * @typeParam Doc - The document type extending IDocument
 */
export type TypeOfIDocument<Doc extends IDocument = IDocument> = Doc;
