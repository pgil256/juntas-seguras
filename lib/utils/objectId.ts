/**
 * Utility functions for MongoDB ObjectId validation
 * Provides safe validation and lookup for user IDs from sessions
 */

import mongoose from 'mongoose';

/**
 * Validates if a string is a valid MongoDB ObjectId format
 * @param id - The string to validate
 * @returns true if valid ObjectId format, false otherwise
 */
export function isValidObjectId(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // MongoDB ObjectIds are 24 character hex strings
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Validates and converts a string to a MongoDB ObjectId
 * @param id - The string to validate and convert
 * @returns The ObjectId if valid, null otherwise
 */
export function toObjectId(id: string | undefined | null): mongoose.Types.ObjectId | null {
  if (!isValidObjectId(id)) {
    return null;
  }

  try {
    return new mongoose.Types.ObjectId(id!);
  } catch {
    return null;
  }
}

/**
 * Error class for invalid ObjectId errors
 */
export class InvalidObjectIdError extends Error {
  constructor(fieldName: string = 'id') {
    super(`Invalid ${fieldName}: not a valid MongoDB ObjectId format`);
    this.name = 'InvalidObjectIdError';
  }
}

const objectIdUtils = {
  isValidObjectId,
  toObjectId,
  InvalidObjectIdError,
};

export default objectIdUtils;
