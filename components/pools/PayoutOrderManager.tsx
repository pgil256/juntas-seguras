// components/pools/PayoutOrderManager.tsx
// Touch-friendly drag-to-reorder interface for payout order management
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, AlertTriangle, Check, RotateCcw, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface Member {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  position: number;
  status: string;
  payoutDate: string;
}

interface PayoutOrderManagerProps {
  members: Member[];
  onSave: (positions: { memberId: number; position: number }[]) => Promise<{ success: boolean; error?: string }>;
  onReset?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function PayoutOrderManager({
  members: initialMembers,
  onSave,
  onReset,
  isLoading = false,
  className,
}: PayoutOrderManagerProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Initialize members sorted by position
  useEffect(() => {
    const sorted = [...initialMembers].sort((a, b) => a.position - b.position);
    setMembers(sorted);
  }, [initialMembers]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Move a member to a new position
  const moveMember = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setMembers((prev) => {
      const newMembers = [...prev];
      const [movedMember] = newMembers.splice(fromIndex, 1);
      newMembers.splice(toIndex, 0, movedMember);

      // Update positions
      return newMembers.map((member, index) => ({
        ...member,
        position: index + 1,
      }));
    });

    setHasChanges(true);
  }, []);

  // Touch handlers for mobile drag
  const handleTouchStart = useCallback((e: React.TouchEvent, memberId: number) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchCurrentY(touch.clientY);
    setDraggedId(memberId);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggedId === null || touchStartY === null) return;

    const touch = e.touches[0];
    setTouchCurrentY(touch.clientY);

    // Find which item we're over
    const listElement = listRef.current;
    if (!listElement) return;

    const items = Array.from(itemRefs.current.entries());
    for (const [id, element] of items) {
      if (id === draggedId) continue;
      const rect = element.getBoundingClientRect();
      if (touch.clientY > rect.top && touch.clientY < rect.bottom) {
        setDragOverId(id);
        return;
      }
    }
    setDragOverId(null);
  }, [draggedId, touchStartY]);

  const handleTouchEnd = useCallback(() => {
    if (draggedId !== null && dragOverId !== null) {
      const fromIndex = members.findIndex((m) => m.id === draggedId);
      const toIndex = members.findIndex((m) => m.id === dragOverId);

      if (fromIndex !== -1 && toIndex !== -1) {
        moveMember(fromIndex, toIndex);

        // Haptic feedback for successful drop
        if (navigator.vibrate) {
          navigator.vibrate(20);
        }
      }
    }

    setDraggedId(null);
    setDragOverId(null);
    setTouchStartY(null);
    setTouchCurrentY(null);
  }, [draggedId, dragOverId, members, moveMember]);

  // Desktop drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, memberId: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', memberId.toString());
    setDraggedId(memberId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, memberId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(memberId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const sourceId = parseInt(e.dataTransfer.getData('text/plain'));

    const fromIndex = members.findIndex((m) => m.id === sourceId);
    const toIndex = members.findIndex((m) => m.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      moveMember(fromIndex, toIndex);
    }

    setDraggedId(null);
    setDragOverId(null);
  }, [members, moveMember]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const positions = members.map((m) => ({
        memberId: m.id,
        position: m.position,
      }));

      const result = await onSave(positions);

      if (result.success) {
        setHasChanges(false);
        // Haptic feedback for success
        if (navigator.vibrate) {
          navigator.vibrate([20, 50, 20]);
        }
      } else {
        alert(result.error || 'Failed to save positions');
      }
    } catch (err) {
      console.error('Error saving positions:', err);
      alert('Failed to save positions');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original
  const handleReset = () => {
    const sorted = [...initialMembers].sort((a, b) => a.position - b.position);
    setMembers(sorted);
    setHasChanges(false);
    onReset?.();
  };

  // Calculate drag offset for visual feedback
  const getDragOffset = () => {
    if (touchStartY === null || touchCurrentY === null) return 0;
    return touchCurrentY - touchStartY;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Warning banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-medium text-yellow-800">Changing payout order</h4>
          <p className="text-sm text-yellow-700 mt-1">
            Drag members to reorder. Changes will affect the payout schedule. Make sure all members are informed.
          </p>
        </div>
      </div>

      {/* Instructions for mobile */}
      <p className="text-sm text-gray-500 md:hidden">
        Touch and hold, then drag to reorder
      </p>

      {/* Sortable list */}
      <div ref={listRef} className="space-y-2">
        {members.map((member, index) => {
          const isDragging = draggedId === member.id;
          const isDragOver = dragOverId === member.id;

          return (
            <div
              key={member.id}
              ref={(el) => {
                if (el) itemRefs.current.set(member.id, el);
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, member.id)}
              onDragOver={(e) => handleDragOver(e, member.id)}
              onDrop={(e) => handleDrop(e, member.id)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, member.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={cn(
                'flex items-center gap-3 p-3 bg-white border rounded-lg transition-all duration-150 cursor-grab active:cursor-grabbing select-none',
                isDragging && 'opacity-50 scale-95 shadow-lg z-10',
                isDragOver && 'border-blue-500 bg-blue-50',
                !isDragging && !isDragOver && 'hover:border-gray-300'
              )}
              style={{
                transform: isDragging && touchCurrentY ? `translateY(${getDragOffset()}px)` : undefined,
              }}
            >
              {/* Drag handle */}
              <div className="text-gray-400 touch-none">
                <GripVertical className="h-5 w-5" />
              </div>

              {/* Position number */}
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                {member.position}
              </div>

              {/* Member info */}
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="bg-blue-200 text-blue-800">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{member.name}</div>
                <div className="text-xs text-gray-500 hidden sm:block truncate">
                  {member.email}
                </div>
              </div>

              {/* Status and payout date */}
              <div className="flex flex-col items-end gap-1">
                <Badge className={getStatusColor(member.status)}>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatDate(member.payoutDate)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || isSaving || isLoading}
          className="min-h-[44px]"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || isLoading}
          className="min-h-[44px]"
        >
          {isSaving ? (
            <>
              <span className="animate-spin mr-2">...</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Order
            </>
          )}
        </Button>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
          <AlertTriangle className="h-4 w-4" />
          <span>You have unsaved changes</span>
        </div>
      )}
    </div>
  );
}

export default PayoutOrderManager;
