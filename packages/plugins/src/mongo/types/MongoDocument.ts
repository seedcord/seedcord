/**
 * Basic document interface with MongoDB ObjectId field.
 *
 * Represents the minimal structure of a MongoDB document
 * with the required `_id` field.
 */
export interface MongoDocument {
    /** MongoDB document identifier */
    _id: string;
}

/**
 * Helper type to extract the type of a document that extends MongoDocument.
 *
 * @typeParam Doc - The document type extending MongoDocument
 */
export type MongoDocumentType<Doc extends MongoDocument = MongoDocument> = Doc;
