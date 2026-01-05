// components/ui/mention-input.tsx
"use client";

import * as React from "react";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { AtSign, X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "../../lib/utils";

export interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface MentionInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getValue: () => string;
  getMentions: () => string[];
  insertMention: (user: MentionUser) => void;
}

interface MentionInputProps {
  value?: string;
  onChange?: (value: string, mentions: string[]) => void;
  onSubmit?: (value: string, mentions: string[]) => void;
  placeholder?: string;
  users?: MentionUser[];
  onSearchUsers?: (query: string) => Promise<MentionUser[]> | MentionUser[];
  isLoading?: boolean;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  renderUser?: (user: MentionUser, isSelected: boolean) => React.ReactNode;
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

// Extract mentions from text
const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
};

// Default user renderer
const DefaultUserRenderer = ({
  user,
  isSelected,
}: {
  user: MentionUser;
  isSelected: boolean;
}) => (
  <div
    className={cn(
      "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
    )}
  >
    <Avatar className="h-7 w-7">
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
        {getInitials(user.name)}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
      {user.email && (
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      )}
    </div>
  </div>
);

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  (
    {
      value: controlledValue,
      onChange,
      onSubmit,
      placeholder = "Type @ to mention someone...",
      users = [],
      onSearchUsers,
      isLoading = false,
      disabled = false,
      maxLength,
      rows = 3,
      autoFocus = false,
      className,
      inputClassName,
      dropdownClassName,
      renderUser,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState("");
    const value = controlledValue ?? internalValue;

    const [showDropdown, setShowDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchResults, setSearchResults] = useState<MentionUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [extractedMentions, setExtractedMentions] = useState<string[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      clear: () => {
        if (controlledValue === undefined) {
          setInternalValue("");
        }
        onChange?.("", []);
        setExtractedMentions([]);
      },
      getValue: () => value,
      getMentions: () => extractedMentions,
      insertMention: (user: MentionUser) => {
        if (textareaRef.current) {
          const cursorPos = textareaRef.current.selectionStart || value.length;
          const newValue =
            value.slice(0, cursorPos) + `@${user.name} ` + value.slice(cursorPos);
          handleValueChange(newValue);
          setTimeout(() => {
            textareaRef.current?.focus();
            const newPos = cursorPos + user.name.length + 2;
            textareaRef.current?.setSelectionRange(newPos, newPos);
          }, 0);
        }
      },
    }));

    // Get filtered users based on query
    const filteredUsers = React.useMemo(() => {
      if (onSearchUsers) {
        return searchResults;
      }
      if (!mentionQuery) return users.slice(0, 5);
      return users
        .filter((user) =>
          user.name.toLowerCase().includes(mentionQuery.toLowerCase())
        )
        .slice(0, 5);
    }, [users, mentionQuery, searchResults, onSearchUsers]);

    // Search for users when query changes (async)
    useEffect(() => {
      if (!onSearchUsers || !mentionQuery) {
        setSearchResults([]);
        return;
      }

      let cancelled = false;
      setIsSearching(true);

      const doSearch = async () => {
        try {
          const results = await onSearchUsers(mentionQuery);
          if (!cancelled) {
            setSearchResults(results);
          }
        } catch (error) {
          console.error("Error searching users:", error);
          if (!cancelled) {
            setSearchResults([]);
          }
        } finally {
          if (!cancelled) {
            setIsSearching(false);
          }
        }
      };

      // Debounce the search
      const timeoutId = setTimeout(doSearch, 150);
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }, [mentionQuery, onSearchUsers]);

    // Calculate dropdown position based on cursor
    const calculateDropdownPosition = useCallback(() => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const style = window.getComputedStyle(textarea);
      const lineHeight = parseInt(style.lineHeight) || 20;
      const paddingTop = parseInt(style.paddingTop) || 0;
      const paddingLeft = parseInt(style.paddingLeft) || 0;

      const textBeforeCursor = value.slice(0, mentionStartIndex);
      const lines = textBeforeCursor.split("\n");
      const currentLine = lines.length;

      setDropdownPosition({
        top: currentLine * lineHeight + paddingTop + 4,
        left: paddingLeft,
      });
    }, [value, mentionStartIndex]);

    // Check for mention trigger
    const checkForMention = useCallback(
      (text: string, cursorPos: number) => {
        const textBeforeCursor = text.slice(0, cursorPos);

        // Find the last @ before cursor
        let atIndex = -1;
        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
          if (textBeforeCursor[i] === "@") {
            // Check if it's at the start or after whitespace
            if (i === 0 || /\s/.test(textBeforeCursor[i - 1])) {
              atIndex = i;
              break;
            }
          }
          // Stop searching if we hit whitespace (mention ended)
          if (/\s/.test(textBeforeCursor[i])) {
            break;
          }
        }

        if (atIndex === -1) {
          setShowDropdown(false);
          setMentionQuery("");
          setMentionStartIndex(-1);
          return;
        }

        const query = textBeforeCursor.slice(atIndex + 1);

        // Don't show if query contains spaces (mention is complete)
        if (query.includes(" ") || query.includes("\n")) {
          setShowDropdown(false);
          setMentionQuery("");
          setMentionStartIndex(-1);
          return;
        }

        setMentionQuery(query);
        setMentionStartIndex(atIndex);
        setShowDropdown(true);
        setSelectedIndex(0);
      },
      []
    );

    // Handle value changes
    const handleValueChange = useCallback(
      (newValue: string) => {
        if (maxLength && newValue.length > maxLength) return;

        if (controlledValue === undefined) {
          setInternalValue(newValue);
        }

        const mentions = extractMentions(newValue);
        setExtractedMentions(mentions);
        onChange?.(newValue, mentions);
      },
      [controlledValue, maxLength, onChange]
    );

    // Handle textarea input
    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        handleValueChange(newValue);
        checkForMention(newValue, e.target.selectionStart || 0);
      },
      [handleValueChange, checkForMention]
    );

    // Handle cursor position changes
    const handleSelect = useCallback(() => {
      if (textareaRef.current) {
        checkForMention(value, textareaRef.current.selectionStart || 0);
      }
    }, [value, checkForMention]);

    // Insert mention
    const insertMention = useCallback(
      (user: MentionUser) => {
        if (mentionStartIndex === -1 || !textareaRef.current) return;

        const cursorPos = textareaRef.current.selectionStart || 0;
        const before = value.slice(0, mentionStartIndex);
        const after = value.slice(cursorPos);
        const newValue = `${before}@${user.name} ${after}`;

        handleValueChange(newValue);
        setShowDropdown(false);
        setMentionQuery("");
        setMentionStartIndex(-1);

        // Focus and position cursor
        setTimeout(() => {
          textareaRef.current?.focus();
          const newPos = mentionStartIndex + user.name.length + 2;
          textareaRef.current?.setSelectionRange(newPos, newPos);
        }, 0);
      },
      [mentionStartIndex, value, handleValueChange]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Ctrl/Cmd + Enter
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          onSubmit?.(value, extractedMentions);
          return;
        }

        if (!showDropdown || filteredUsers.length === 0) return;

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < filteredUsers.length - 1 ? prev + 1 : 0
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredUsers.length - 1
            );
            break;
          case "Enter":
          case "Tab":
            e.preventDefault();
            if (filteredUsers[selectedIndex]) {
              insertMention(filteredUsers[selectedIndex]);
            }
            break;
          case "Escape":
            e.preventDefault();
            setShowDropdown(false);
            break;
        }
      },
      [
        showDropdown,
        filteredUsers,
        selectedIndex,
        insertMention,
        onSubmit,
        value,
        extractedMentions,
      ]
    );

    // Update dropdown position when needed
    useEffect(() => {
      if (showDropdown) {
        calculateDropdownPosition();
      }
    }, [showDropdown, calculateDropdownPosition]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current &&
          !textareaRef.current.contains(e.target as Node)
        ) {
          setShowDropdown(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
      if (showDropdown && dropdownRef.current) {
        const selectedItem = dropdownRef.current.querySelector(
          `[data-index="${selectedIndex}"]`
        );
        selectedItem?.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex, showDropdown]);

    return (
      <div className={cn("relative", className)}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          rows={rows}
          className={cn(
            "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "placeholder:text-gray-400",
            "disabled:bg-gray-50 disabled:cursor-not-allowed",
            inputClassName
          )}
        />

        {/* Character count */}
        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {value.length}/{maxLength}
          </div>
        )}

        {/* Mention Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className={cn(
              "absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg",
              "max-h-48 overflow-y-auto w-64",
              dropdownClassName
            )}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            {/* Loading state */}
            {(isLoading || isSearching) && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Searching...</span>
              </div>
            )}

            {/* No results */}
            {!isLoading &&
              !isSearching &&
              filteredUsers.length === 0 &&
              mentionQuery && (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No users found matching &quot;{mentionQuery}&quot;
                </div>
              )}

            {/* User list */}
            {!isLoading && !isSearching && filteredUsers.length > 0 && (
              <div className="py-1">
                {filteredUsers.map((user, index) => (
                  <div
                    key={user.id}
                    data-index={index}
                    onClick={() => insertMention(user)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {renderUser ? (
                      renderUser(user, index === selectedIndex)
                    ) : (
                      <DefaultUserRenderer
                        user={user}
                        isSelected={index === selectedIndex}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Helper text */}
            {!isLoading && !isSearching && filteredUsers.length > 0 && (
              <div className="px-3 py-1.5 border-t border-gray-100 text-xs text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                  ↑↓
                </kbd>{" "}
                to navigate,{" "}
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                  Enter
                </kbd>{" "}
                to select
              </div>
            )}
          </div>
        )}

        {/* Selected mentions tags */}
        {extractedMentions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {extractedMentions.map((mention) => (
              <span
                key={mention}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                <AtSign className="h-3 w-3" />
                {mention}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
);

MentionInput.displayName = "MentionInput";

export default MentionInput;
