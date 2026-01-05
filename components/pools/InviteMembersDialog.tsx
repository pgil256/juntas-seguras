'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Mail, X, Copy, Check, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { usePoolInvitations } from '../../lib/hooks/usePoolInvitations';

interface InviteMembersDialogProps {
  poolId: string;
  poolName: string;
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // In a real app, this would be from auth context
}

export function InviteMembersDialog({
  poolId,
  poolName,
  isOpen,
  onClose,
  userId = 'user123', // Default mock user ID for development
}: InviteMembersDialogProps) {
  // State for invitation form
  const [emails, setEmails] = useState<string[]>(['']);
  const [personalMessage, setPersonalMessage] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for invite link
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLinkExpiry, setInviteLinkExpiry] = useState<string | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [expiryDays, setExpiryDays] = useState('7');

  // Use the pool invitations hook
  const {
    sendInvitation,
    isLoading: isSending
  } = usePoolInvitations({
    poolId,
    userId
  });

  // Fetch existing invite link when dialog opens
  const fetchInviteLink = useCallback(async () => {
    if (!poolId) return;
    setIsLoadingLink(true);
    try {
      const response = await fetch(`/api/pools/${poolId}/invite-link`);
      const data = await response.json();
      if (data.success && data.inviteLink) {
        setInviteLink(data.inviteLink);
        setInviteLinkExpiry(data.expiresAt);
      }
    } catch (err) {
      console.error('Error fetching invite link:', err);
    } finally {
      setIsLoadingLink(false);
    }
  }, [poolId]);

  useEffect(() => {
    if (isOpen) {
      fetchInviteLink();
    }
  }, [isOpen, fetchInviteLink]);

  // Generate new invite link
  const generateInviteLink = async () => {
    setIsLoadingLink(true);
    setError(null);
    try {
      const response = await fetch(`/api/pools/${poolId}/invite-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryDays: parseInt(expiryDays, 10) })
      });
      const data = await response.json();
      if (data.success) {
        setInviteLink(data.inviteLink);
        setInviteLinkExpiry(data.expiresAt);
      } else {
        setError(data.error || 'Failed to generate invite link');
      }
    } catch (err) {
      console.error('Error generating invite link:', err);
      setError('Failed to generate invite link');
    } finally {
      setIsLoadingLink(false);
    }
  };
  
  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };
  
  const addEmailField = () => {
    setEmails([...emails, '']);
  };
  
  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      const newEmails = [...emails];
      newEmails.splice(index, 1);
      setEmails(newEmails);
    }
  };
  
  const handleSendInvites = async () => {
    try {
      setError(null);
      
      // Filter out empty emails
      const validEmails = emails.filter(email => email.trim() !== '');
      
      if (validEmails.length === 0) {
        setError('Please provide at least one valid email address');
        return;
      }
      
      // Send each invitation individually
      const results = await Promise.all(
        validEmails.map(async (email) => {
          return await sendInvitation({ 
            email,
            // Include optional personal message as name for now
            // In a real app, this would be handled differently
            name: personalMessage ? `Personal message: ${personalMessage}` : undefined
          });
        })
      );
      
      // Check if any invitations failed
      const failures = results.filter(result => !result.success);
      
      if (failures.length > 0) {
        // Show error for the first failure
        setError(failures[0].error || 'Failed to send some invitations');
        return;
      }
      
      // All invitations sent successfully
      // Reset form and close dialog
      setEmails(['']);
      setPersonalMessage('');
      setError(null);
      onClose();
      
    } catch (error) {
      console.error('Error sending invites:', error);
      setError('An unexpected error occurred while sending invitations');
    }
  };
  
  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);

      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Invite new members to join your "{poolName}" pool
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="email" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email Invites</TabsTrigger>
            <TabsTrigger value="link">Invite Link</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="pt-4">
            <div className="space-y-4">
              {emails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="name@example.com"
                      className="pl-8"
                      required={index === 0}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmailField(index)}
                    disabled={emails.length === 1}
                    className="h-8 w-8 p-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
                className="mt-2"
              >
                Add Another Email
              </Button>
              
              <div className="mt-4">
                <Label htmlFor="message" className="block mb-2">Personal Message (Optional)</Label>
                <textarea
                  id="message"
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add a personal note to your invitation..."
                ></textarea>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="link" className="pt-4">
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Share this invite link with people you want to invite to your pool. Anyone with this link can request to join.
              </p>

              {isLoadingLink ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : inviteLink ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyInviteLink}
                    >
                      {linkCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="text-sm text-gray-500">
                    {linkCopied ? (
                      <p className="text-green-600">Link copied to clipboard!</p>
                    ) : (
                      <p>Click the copy button to copy the link</p>
                    )}
                    {inviteLinkExpiry && (
                      <p className="mt-1">
                        Expires: {new Date(inviteLinkExpiry).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateInviteLink}
                    className="mt-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate New Link
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="expiry-days" className="text-sm text-gray-700">
                      Link expires after
                    </Label>
                    <select
                      id="expiry-days"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(e.target.value)}
                      className="rounded border border-gray-300 text-sm p-1"
                    >
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    onClick={generateInviteLink}
                    className="w-full"
                  >
                    Generate Invite Link
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSendInvites}
            disabled={isSending || (emails.length === 1 && emails[0].trim() === '')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Invitations'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}