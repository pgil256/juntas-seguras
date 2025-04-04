'use client';

import { useState } from 'react';
import { 
  Send, 
  User, 
  Mail,
  FileUp,
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  Loader2,
  X
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SupportCategory, TicketPriority } from '@/types/support';

interface ContactFormProps {
  userId?: string;
  userEmail?: string;
  userName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  supportCategories?: SupportCategory[];
}

export default function ContactForm({
  userId,
  userEmail = '',
  userName = '',
  onSuccess,
  onCancel,
  supportCategories
}: ContactFormProps) {
  // Form state
  const [formData, setFormData] = useState({
    name: userName,
    email: userEmail,
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal'
  });
  
  // File attachment state
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Default categories if not provided
  const defaultCategories: SupportCategory[] = [
    { value: 'general', label: 'General Question' },
    { value: 'account', label: 'Account Issue' },
    { value: 'pool', label: 'Pool Management' },
    { value: 'payment', label: 'Payment Issue' },
    { value: 'technical', label: 'Technical Problem' },
    { value: 'feedback', label: 'Feedback & Suggestions' },
    { value: 'security', label: 'Security Concern' }
  ];
  
  const categories = supportCategories || defaultCategories;
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle dropdown select change
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle file attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Limit total attachments to 5
      setAttachments(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };
  
  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Basic validation
      if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
        throw new Error('Please fill out all required fields');
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // In a real app, we would handle file uploads here 
      // using FormData for attachments
      
      // Create request body
      const requestBody = {
        userId,
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
        priority: formData.priority
      };
      
      // Submit form data to API
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message. Please try again.');
      }
      
      // Set success states
      setSubmitSuccess(true);
      setTicketId(data.ticketId || null);
      
      // Call success callback if provided
      if (onSuccess) {
        setTimeout(onSuccess, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get priority badge class
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case TicketPriority.LOW:
        return 'bg-green-100 text-green-800';
      case TicketPriority.NORMAL:
        return 'bg-blue-100 text-blue-800';
      case TicketPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case TicketPriority.URGENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // If submission was successful, show success message
  if (submitSuccess) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center">Support Ticket Created!</CardTitle>
          <CardDescription className="text-center">
            Thank you for contacting our support team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              We've received your message and will get back to you as soon as possible, usually within 24 hours.
            </p>
            {ticketId && (
              <div className="bg-gray-50 p-3 rounded-md inline-block">
                <p className="text-sm text-gray-500">Your ticket reference number</p>
                <p className="font-mono font-medium">{ticketId}</p>
                <p className="text-xs text-gray-500 mt-2">Save this number for future reference</p>
              </div>
            )}
          </div>
          <div className="mt-6 space-y-2 border-t pt-4">
            <p className="text-sm font-medium text-gray-700">Next Steps:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your email for a confirmation of your support request</li>
              <li>• You'll receive updates when our team responds to your ticket</li>
              <li>• You can view and respond to your ticket in your account</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onSuccess} variant="outline">
            Close
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>
            Fill out the form below and our team will get back to you as soon as possible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Name and Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>Name</span>
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                <span>Email</span>
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>
          
          {/* Category and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange('category', value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleSelectChange('priority', value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center">
                      <Badge className="bg-green-100 text-green-800 mr-2">Low</Badge>
                      <span>General questions</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="normal">
                    <div className="flex items-center">
                      <Badge className="bg-blue-100 text-blue-800 mr-2">Normal</Badge>
                      <span>Standard issues</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center">
                      <Badge className="bg-orange-100 text-orange-800 mr-2">High</Badge>
                      <span>Urgent problems</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center">
                      <Badge className="bg-red-100 text-red-800 mr-2">Urgent</Badge>
                      <span>Critical issues</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Brief description of your issue"
            />
          </div>
          
          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>Message</span>
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Please describe your issue in detail. Include any relevant information that might help us assist you better."
              required
              rows={5}
            />
          </div>
          
          {/* File Attachments */}
          <div className="space-y-2">
            <Label htmlFor="attachments" className="flex items-center">
              <FileUp className="h-4 w-4 mr-1" />
              <span>Attachments</span>
              <span className="text-xs text-gray-500 ml-2">(Optional, up to 5 files)</span>
            </Label>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              {/* Attachment list */}
              {attachments.length > 0 && (
                <div className="mb-3 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center text-sm">
                        <FileUp className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeAttachment(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* File input */}
              <div className="flex items-center">
                <input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={attachments.length >= 5}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('attachments')?.click()}
                  disabled={attachments.length >= 5}
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  {attachments.length > 0 ? 'Add Another File' : 'Attach Files'}
                </Button>
                <span className="ml-3 text-xs text-gray-500">
                  Supported formats: PDF, JPG, PNG, DOC
                </span>
              </div>
            </div>
          </div>
          
          {/* Current Priority */}
          <div className="pt-3 border-t mt-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Current Priority:</span>
                <Badge className={`ml-2 ${getPriorityBadge(formData.priority)}`}>
                  {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Response time: {
                  formData.priority === 'urgent' ? 'Within 2 hours' :
                  formData.priority === 'high' ? 'Within 24 hours' :
                  formData.priority === 'normal' ? '1-2 business days' : 
                  '2-3 business days'
                }
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-500">
            By submitting this form, you agree to our <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a> and consent to us using your information to respond to your inquiry.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} type="button">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} className={onCancel ? '' : 'w-full'}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting Ticket...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Support Ticket
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}