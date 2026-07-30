/**
 * Basic document interface with MongoDB ObjectId field.
 *
 * Represents the minimal structure of a MongoDB document
 * with the required `_id` field.
 */
export interface MongooseDocument {
    /** MongoDB document identifier */
    _id: string;
}
