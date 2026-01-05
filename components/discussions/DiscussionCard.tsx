// components/discussions/DiscussionCard.tsx
"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  ThumbsUp,
  MoreHorizontal,
  Pin,
  Trash2,
  Edit2,
  Flag,
  Share2,
  Reply,
  ChevronDown,
  ChevronUp,
  Heart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";

export interface DiscussionReply {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  mentions?: string[];
}

export interface DiscussionPost {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role?: "admin" | "member" | "creator";
  };
  poolId?: string;
  poolName?: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  isLiked?: boolean;
  isPinned?: boolean;
  replyCount: number;
  replies?: DiscussionReply[];
  mentions?: string[];
}

interface DiscussionCardProps {
  post: DiscussionPost;
  currentUserId?: string;
  isAdmin?: boolean;
  showPoolName?: boolean;
  onLike?: (postId: string) => void;
  onReply?: (postId: string, content: string) => void;
  onEdit?: (postId: string, newContent: string) => void;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
  className?: string;
}

// Get user initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Format timestamp for display
const formatTimestamp = (timestamp: string) => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return timestamp;
  }
};

// Render content with highlighted mentions
const renderContent = (
  content: string,
  mentions?: string[],
  onUserClick?: (userId: string) => void
) => {
  if (!mentions || mentions.length === 0) {
    return <span>{content}</span>;
  }

  // Split content by @mentions
  const parts = content.split(/(@\w+)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("@")) {
          const username = part.slice(1);
          const isMention = mentions.some(
            (m) => m.toLowerCase() === username.toLowerCase()
          );
          if (isMention) {
            return (
              <button
                key={index}
                onClick={() => onUserClick?.(username)}
                className="text-blue-600 font-medium hover:underline"
              >
                {part}
              </button>
            );
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

// Role badge component
const RoleBadge = ({ role }: { role?: "admin" | "member" | "creator" }) => {
  if (!role || role === "member") return null;

  const roleStyles = {
    admin: "bg-blue-100 text-blue-700",
    creator: "bg-purple-100 text-purple-700",
  };

  const roleLabels = {
    admin: "Admin",
    creator: "Creator",
  };

  return (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded-full font-medium",
        roleStyles[role]
      )}
    >
      {roleLabels[role]}
    </span>
  );
};

// Reply component
const ReplyItem = ({
  reply,
  currentUserId,
  onLike,
  onUserClick,
}: {
  reply: DiscussionReply;
  currentUserId?: string;
  onLike?: (replyId: string) => void;
  onUserClick?: (userId: string) => void;
}) => {
  return (
    <div className="flex gap-3 py-3 first:pt-0">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={reply.author.avatar} alt={reply.author.name} />
        <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
          {getInitials(reply.author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUserClick?.(reply.author.id)}
            className="text-sm font-medium text-gray-900 hover:underline"
          >
            {reply.author.name}
          </button>
          <span className="text-xs text-gray-500">
            {formatTimestamp(reply.createdAt)}
          </span>
        </div>
        <p className="text-sm text-gray-700 mt-0.5">
          {renderContent(reply.content, reply.mentions, onUserClick)}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={() => onLike?.(reply.id)}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              reply.isLiked
                ? "text-red-500"
                : "text-gray-500 hover:text-red-500"
            )}
          >
            <Heart
              className={cn("h-3.5 w-3.5", reply.isLiked && "fill-current")}
            />
            {reply.likes > 0 && <span>{reply.likes}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export function DiscussionCard({
  post,
  currentUserId,
  isAdmin = false,
  showPoolName = false,
  onLike,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onReport,
  onShare,
  onUserClick,
  className,
}: DiscussionCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const isOwnPost = currentUserId === post.author.id;
  const canModerate = isAdmin || isOwnPost;

  const handleLike = useCallback(() => {
    onLike?.(post.id);
  }, [onLike, post.id]);

  const handleSubmitReply = useCallback(async () => {
    if (!replyContent.trim() || !onReply) return;

    setIsSubmittingReply(true);
    try {
      await onReply(post.id, replyContent);
      setReplyContent("");
      setIsReplying(false);
      setShowReplies(true);
    } finally {
      setIsSubmittingReply(false);
    }
  }, [onReply, post.id, replyContent]);

  const handleDelete = useCallback(() => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      onDelete?.(post.id);
    }
  }, [onDelete, post.id]);

  return (
    <Card
      className={cn(
        "overflow-hidden",
        post.isPinned && "border-blue-200 bg-blue-50/30",
        className
      )}
    >
      <CardContent className="p-4">
        {/* Pinned indicator */}
        {post.isPinned && (
          <div className="flex items-center gap-1.5 text-blue-600 text-xs font-medium mb-3">
            <Pin className="h-3.5 w-3.5" />
            <span>Pinned post</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onUserClick?.(post.author.id)}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {post.author.name}
                </button>
                <RoleBadge role={post.author.role} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <span>{formatTimestamp(post.createdAt)}</span>
                {post.updatedAt && post.updatedAt !== post.createdAt && (
                  <span className="text-gray-400">(edited)</span>
                )}
                {showPoolName && post.poolName && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>{post.poolName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Post options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(post.id)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              {canModerate && onPin && (
                <DropdownMenuItem onClick={() => onPin(post.id)}>
                  <Pin className="h-4 w-4 mr-2" />
                  {post.isPinned ? "Unpin" : "Pin"} post
                </DropdownMenuItem>
              )}
              {isOwnPost && onEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    const newContent = window.prompt(
                      "Edit your post:",
                      post.content
                    );
                    if (newContent && newContent !== post.content) {
                      onEdit(post.id, newContent);
                    }
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {!isOwnPost && onReport && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onReport(post.id)}
                    className="text-red-600"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </>
              )}
              {canModerate && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="mt-3">
          <p className="text-gray-800 whitespace-pre-wrap">
            {renderContent(post.content, post.mentions, onUserClick)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              post.isLiked
                ? "text-red-500"
                : "text-gray-500 hover:text-red-500"
            )}
          >
            <Heart
              className={cn("h-4 w-4", post.isLiked && "fill-current")}
            />
            <span>{post.likes > 0 ? post.likes : "Like"}</span>
          </button>

          <button
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            <Reply className="h-4 w-4" />
            <span>Reply</span>
          </button>

          {post.replyCount > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors ml-auto"
            >
              <MessageSquare className="h-4 w-4" />
              <span>
                {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
              </span>
              {showReplies ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Reply input */}
        {isReplying && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                  You
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim() || isSubmittingReply}
                  >
                    {isSubmittingReply ? "Posting..." : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {showReplies && post.replies && post.replies.length > 0 && (
          <div className="mt-4 pt-3 border-t divide-y divide-gray-100">
            {post.replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                currentUserId={currentUserId}
                onUserClick={onUserClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DiscussionCard;
