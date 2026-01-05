// components/discussions/NewPostForm.tsx
"use client";

import * as React from "react";
import { useState, useCallback, useRef } from "react";
import {
  Send,
  Image as ImageIcon,
  Smile,
  AtSign,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";

export interface PostAuthor {
  id: string;
  name: string;
  avatar?: string;
}

export interface MentionSuggestion {
  id: string;
  name: string;
  avatar?: string;
}

interface NewPostFormProps {
  author?: PostAuthor;
  poolId?: string;
  placeholder?: string;
  maxLength?: number;
  showMentions?: boolean;
  mentionSuggestions?: MentionSuggestion[];
  onSubmit: (content: string, mentions?: string[]) => Promise<void> | void;
  onMentionSearch?: (query: string) => void;
  disabled?: boolean;
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

export function NewPostForm({
  author,
  poolId,
  placeholder = "Share an update with your pool...",
  maxLength = 1000,
  showMentions = true,
  mentionSuggestions = [],
  onSubmit,
  onMentionSearch,
  disabled = false,
  className,
}: NewPostFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // Track if we're currently in a mention (after @ symbol)
  const checkForMention = useCallback(
    (text: string, cursorPosition: number) => {
      const textBeforeCursor = text.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex === -1) {
        setShowMentionDropdown(false);
        return;
      }

      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      // Check if there's a space after the @ (means mention ended)
      if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) {
        setShowMentionDropdown(false);
        return;
      }

      // Valid mention query
      setMentionQuery(textAfterAt);
      setShowMentionDropdown(true);
      onMentionSearch?.(textAfterAt);

      // Calculate dropdown position
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const lineHeight = parseInt(
          window.getComputedStyle(textarea).lineHeight
        );
        const lines = textBeforeCursor.split("\n");
        const currentLineIndex = lines.length - 1;

        setMentionPosition({
          top: (currentLineIndex + 1) * lineHeight + 8,
          left: 12,
        });
      }
    },
    [onMentionSearch]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      if (newContent.length <= maxLength) {
        setContent(newContent);
        setError(null);

        if (showMentions) {
          checkForMention(newContent, e.target.selectionStart || 0);
        }
      }
    },
    [maxLength, showMentions, checkForMention]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Handle mention dropdown navigation
      if (showMentionDropdown && mentionSuggestions.length > 0) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowMentionDropdown(false);
        }
      }
    },
    [showMentionDropdown, mentionSuggestions]
  );

  const insertMention = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const cursorPosition = textarea.selectionStart || 0;
      const textBeforeCursor = content.slice(0, cursorPosition);
      const textAfterCursor = content.slice(cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex === -1) return;

      // Replace the @query with @username
      const newContent =
        textBeforeCursor.slice(0, lastAtIndex) +
        `@${suggestion.name} ` +
        textAfterCursor;

      setContent(newContent);
      setSelectedMentions((prev) => [...prev, suggestion.id]);
      setShowMentionDropdown(false);

      // Focus back on textarea
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = lastAtIndex + suggestion.name.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [content]
  );

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(content.trim(), selectedMentions);
      setContent("");
      setSelectedMentions([]);
      setIsFocused(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create post"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [content, isSubmitting, disabled, onSubmit, selectedMentions]);

  const handleCancel = useCallback(() => {
    setContent("");
    setSelectedMentions([]);
    setIsFocused(false);
    setError(null);
  }, []);

  const remainingChars = maxLength - content.length;
  const isNearLimit = remainingChars <= 100;
  const isAtLimit = remainingChars <= 0;

  // Filter mention suggestions based on query
  const filteredSuggestions = mentionSuggestions.filter((s) =>
    s.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <Card className={cn("overflow-visible", className)}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Author Avatar */}
          {author && (
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {getInitials(author.name)}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                placeholder={placeholder}
                disabled={disabled || isSubmitting}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg text-sm resize-none transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  "placeholder:text-gray-400",
                  disabled && "bg-gray-50 cursor-not-allowed",
                  error && "border-red-300 focus:ring-red-500",
                  isFocused ? "min-h-[100px]" : "min-h-[44px]"
                )}
                rows={isFocused ? 4 : 1}
              />

              {/* Mention Dropdown */}
              {showMentionDropdown && filteredSuggestions.length > 0 && (
                <div
                  ref={mentionDropdownRef}
                  className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-64"
                  style={{
                    top: mentionPosition.top,
                    left: mentionPosition.left,
                  }}
                >
                  <div className="p-1">
                    {filteredSuggestions.slice(0, 5).map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => insertMention(suggestion)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={suggestion.avatar}
                            alt={suggestion.name}
                          />
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                            {getInitials(suggestion.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-900">
                          {suggestion.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-1.5 mt-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions Bar (visible when focused) */}
            {isFocused && (
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1">
                  {showMentions && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (textareaRef.current) {
                          const cursorPos =
                            textareaRef.current.selectionStart || content.length;
                          const newContent =
                            content.slice(0, cursorPos) +
                            "@" +
                            content.slice(cursorPos);
                          setContent(newContent);
                          textareaRef.current.focus();
                          setTimeout(() => {
                            textareaRef.current?.setSelectionRange(
                              cursorPos + 1,
                              cursorPos + 1
                            );
                          }, 0);
                        }
                      }}
                      title="Mention someone"
                    >
                      <AtSign className="h-4 w-4 text-gray-500" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Character count */}
                  <span
                    className={cn(
                      "text-xs",
                      isAtLimit
                        ? "text-red-500 font-medium"
                        : isNearLimit
                        ? "text-amber-500"
                        : "text-gray-400"
                    )}
                  >
                    {remainingChars}
                  </span>

                  {/* Cancel button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>

                  {/* Submit button */}
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={
                      !content.trim() || isSubmitting || disabled || isAtLimit
                    }
                    className="min-w-[80px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1.5" />
                        Post
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Submit hint when not focused */}
            {!isFocused && content.trim() && (
              <div className="flex items-center justify-end mt-2">
                <span className="text-xs text-gray-400">
                  Press Ctrl+Enter to post
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default NewPostForm;
