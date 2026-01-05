/**
 * @mentions Parsing and Processing
 *
 * This module handles parsing @mentions from discussion content and creating
 * the necessary database records for notifications and tracking.
 *
 * Mention Format:
 * - @username - matches a pool member by name
 * - @everyone or @all - mentions all pool members
 *
 * Features:
 * - Case-insensitive name matching
 * - Fuzzy matching for partial names
 * - Handles multiple mentions in a single message
 * - Creates DiscussionMention records for notification
 */

import mongoose, { Types } from 'mongoose';
import { DiscussionMention } from '../db/models/discussionMention';
import { Pool } from '../db/models/pool';
import { User } from '../db/models/user';

// Regex to match @mentions
// Matches @word or @"multi word name" formats
const MENTION_REGEX = /@(?:"([^"]+)"|(\w+(?:\s+\w+)?))/g;

// Special mentions that target multiple users
const SPECIAL_MENTIONS = ['everyone', 'all', 'here'];

export interface ParsedMention {
  raw: string;           // The raw matched text (e.g., "@John Doe")
  name: string;          // The extracted name (e.g., "John Doe")
  isSpecial: boolean;    // Whether this is @everyone/@all
  startIndex: number;    // Position in the content
  endIndex: number;      // End position in the content
}

export interface ResolvedMention {
  userId: Types.ObjectId;
  userName: string;
  userEmail: string;
}

/**
 * Parse @mentions from content text
 *
 * @param content - The discussion content to parse
 * @returns Array of parsed mentions
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    // match[1] is the quoted name, match[2] is the unquoted name
    const name = (match[1] || match[2]).trim();

    mentions.push({
      raw: match[0],
      name,
      isSpecial: SPECIAL_MENTIONS.includes(name.toLowerCase()),
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  return mentions;
}

/**
 * Resolve parsed mentions to actual user IDs
 *
 * @param mentions - Parsed mentions from content
 * @param poolId - The pool ID to find members in
 * @param excludeUserId - User ID to exclude (typically the author)
 * @returns Array of resolved mentions with user IDs
 */
export async function resolveMentions(
  mentions: ParsedMention[],
  poolId: string | Types.ObjectId,
  excludeUserId?: string | Types.ObjectId
): Promise<ResolvedMention[]> {
  if (mentions.length === 0) {
    return [];
  }

  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());
  const excludeId = excludeUserId
    ? new mongoose.Types.ObjectId(excludeUserId.toString())
    : null;

  // Get the pool with members
  const pool = await Pool.findById(poolObjectId).lean();
  if (!pool || !pool.members) {
    return [];
  }

  const resolvedMentions: ResolvedMention[] = [];
  const processedUserIds = new Set<string>();

  // Check for special mentions (@everyone, @all)
  const hasSpecialMention = mentions.some(m => m.isSpecial);

  if (hasSpecialMention) {
    // Mention all pool members except the author
    for (const member of pool.members) {
      if (!member.userId) continue;

      const memberUserId = member.userId.toString();

      // Skip the author and already processed users
      if (excludeId && memberUserId === excludeId.toString()) continue;
      if (processedUserIds.has(memberUserId)) continue;

      processedUserIds.add(memberUserId);

      resolvedMentions.push({
        userId: new mongoose.Types.ObjectId(memberUserId),
        userName: member.name,
        userEmail: member.email
      });
    }
  } else {
    // Resolve individual mentions by name matching
    for (const mention of mentions) {
      const matchedMember = findMemberByName(pool.members, mention.name);

      if (matchedMember && matchedMember.userId) {
        const memberUserId = matchedMember.userId.toString();

        // Skip the author and already processed users
        if (excludeId && memberUserId === excludeId.toString()) continue;
        if (processedUserIds.has(memberUserId)) continue;

        processedUserIds.add(memberUserId);

        resolvedMentions.push({
          userId: new mongoose.Types.ObjectId(memberUserId),
          userName: matchedMember.name,
          userEmail: matchedMember.email
        });
      }
    }
  }

  return resolvedMentions;
}

/**
 * Find a pool member by name with fuzzy matching
 *
 * @param members - Array of pool members
 * @param name - Name to search for
 * @returns Matched member or null
 */
function findMemberByName(members: any[], name: string): any | null {
  const normalizedName = name.toLowerCase().trim();

  // Try exact match first
  let match = members.find(
    m => m.name.toLowerCase().trim() === normalizedName
  );

  if (match) return match;

  // Try starts-with match (for first name only mentions)
  match = members.find(
    m => m.name.toLowerCase().startsWith(normalizedName)
  );

  if (match) return match;

  // Try contains match (for partial names)
  match = members.find(
    m => m.name.toLowerCase().includes(normalizedName)
  );

  return match || null;
}

/**
 * Create DiscussionMention records for resolved mentions
 *
 * @param discussionId - The discussion that contains the mentions
 * @param poolId - The pool ID
 * @param mentionedByUserId - The user who made the mentions
 * @param mentionedByName - Name of the user who made the mentions
 * @param discussionType - Type of the discussion
 * @param content - Discussion content for preview
 * @param resolvedMentions - Array of resolved mentions
 */
export async function createMentionRecords(
  discussionId: Types.ObjectId,
  poolId: Types.ObjectId,
  mentionedByUserId: Types.ObjectId,
  mentionedByName: string,
  discussionType: string,
  content: string,
  resolvedMentions: ResolvedMention[]
): Promise<void> {
  if (resolvedMentions.length === 0) {
    return;
  }

  // Create preview (first 150 chars of content)
  const preview = content.length > 150
    ? content.substring(0, 147) + '...'
    : content;

  // Create mention records in bulk
  const mentionDocs = resolvedMentions.map(mention => ({
    discussionId,
    poolId,
    mentionedUserId: mention.userId,
    mentionedByUserId,
    mentionedByName,
    discussionType,
    discussionPreview: preview,
    isRead: false,
    isNotified: false
  }));

  try {
    await DiscussionMention.insertMany(mentionDocs, { ordered: false });
  } catch (error: any) {
    // Ignore duplicate key errors (mention already exists)
    if (error.code !== 11000) {
      throw error;
    }
  }
}

/**
 * Process mentions in a discussion
 * This is the main entry point for mention processing.
 *
 * @param discussionId - The discussion ID
 * @param poolId - The pool ID
 * @param authorId - The author's user ID
 * @param authorName - The author's name
 * @param discussionType - Type of the discussion
 * @param content - Discussion content
 * @returns Array of mentioned user IDs
 */
export async function processMentions(
  discussionId: Types.ObjectId,
  poolId: Types.ObjectId,
  authorId: Types.ObjectId,
  authorName: string,
  discussionType: string,
  content: string
): Promise<Types.ObjectId[]> {
  // Parse mentions from content
  const parsedMentions = parseMentions(content);

  if (parsedMentions.length === 0) {
    return [];
  }

  // Resolve to actual users
  const resolvedMentions = await resolveMentions(
    parsedMentions,
    poolId,
    authorId
  );

  if (resolvedMentions.length === 0) {
    return [];
  }

  // Create mention records for notifications
  await createMentionRecords(
    discussionId,
    poolId,
    authorId,
    authorName,
    discussionType,
    content,
    resolvedMentions
  );

  // Return the mentioned user IDs
  return resolvedMentions.map(m => m.userId);
}

/**
 * Get all pool members as potential mention targets
 * Used for autocomplete in the UI
 *
 * @param poolId - The pool ID
 * @returns Array of mentionable members
 */
export async function getMentionableMembers(
  poolId: string | Types.ObjectId
): Promise<{ id: string; name: string; avatar?: string }[]> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const pool = await Pool.findById(poolObjectId)
    .select('members')
    .lean();

  if (!pool || !pool.members) {
    return [];
  }

  return pool.members
    .filter((m: any) => m.userId)
    .map((m: any) => ({
      id: m.userId.toString(),
      name: m.name,
      avatar: m.avatar
    }));
}

/**
 * Format content with mention highlighting
 * Returns content with mentions wrapped in a specific format for rendering
 *
 * @param content - Raw discussion content
 * @param mentionedUserIds - Array of mentioned user IDs for highlighting
 * @returns Formatted content with mention markers
 */
export function formatMentions(
  content: string,
  mentionedUserIds: string[] = []
): string {
  // This function can be extended to wrap mentions in special tags
  // For now, we just return the content as-is since the frontend
  // will handle rendering based on the mentions array
  return content;
}
