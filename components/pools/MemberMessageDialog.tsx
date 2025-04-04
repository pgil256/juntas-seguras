import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { useDirectMessages } from '@/lib/hooks/useDirectMessages';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MemberMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: string;
  member: {
    id: number;
    name: string;
    avatar?: string;
  };
  userId: string;
}

export function MemberMessageDialog({ isOpen, onClose, poolId, member, userId }: MemberMessageDialogProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage,
    refreshMessages 
  } = useDirectMessages({ 
    poolId, 
    userId, 
    memberId: member.id 
  });

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    try {
      const result = await sendMessage(messageText);
      if (result) {
        setMessageText(''); // Clear input on success
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
              <AvatarFallback className="bg-blue-200 text-blue-800">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <span>Message {member.name}</span>
          </DialogTitle>
          <DialogDescription>
            Your conversation is only visible to you and {member.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2 space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex">
                    <Avatar className="h-8 w-8 mr-2 shrink-0 mt-1">
                      <AvatarFallback className="bg-blue-200 text-blue-800">
                        {getInitials(message.author)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`${message.author === 'You' 
                        ? 'bg-blue-100' 
                        : 'bg-gray-100'} 
                        p-3 rounded-lg flex-1`}
                    >
                      <div className="flex justify-between items-start text-xs text-gray-500 mb-1">
                        <span>{message.author}</span>
                        <span>{formatDateTime(message.date)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          
          <form onSubmit={handleSendMessage}>
            <div className="flex">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type a message..."
              />
              <Button 
                type="submit" 
                disabled={!messageText.trim() || isLoading}
                className="rounded-l-none"
              >
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}