'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Users,
  ChevronLeft,
  Mail,
  Phone,
  UserPlus,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Ban,
  RefreshCw,
  Send,
  MessageSquare,
  Loader,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { usePool } from "../../../lib/hooks/usePool";
import { usePoolMembers } from "../../../lib/hooks/usePoolMembers";
import { usePoolInvitations } from "../../../lib/hooks/usePoolInvitations";
import { PoolMember, PoolMemberRole, PoolMemberStatus, InvitationStatus } from "../../../types/pool";
import { MemberMessageDialog } from "../../../components/pools/MemberMessageDialog";
import { InviteMembersDialog } from "../../../components/pools/InviteMembersDialog";
import { useSession } from "next-auth/react";

export default function MemberManagementPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || null;
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PoolMember | null>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [positionsChanged, setPositionsChanged] = useState(false);
  const [originalPositions, setOriginalPositions] = useState<PoolMember[]>([]);
  const [editedMember, setEditedMember] = useState<PoolMember | null>(null);
  
  // Fetch pool details
  const {
    pool,
    isLoading: isLoadingPool,
    error: poolError,
    refreshPool
  } = usePool({
    poolId: id
  });
  
  // Fetch pool members
  const {
    members,
    isLoading: isLoadingMembers,
    error: membersError,
    addMember,
    updateMember,
    removeMember,
    updatePositions,
    refreshMembers
  } = usePoolMembers({
    poolId: id
  });

  // Local state for position management
  const [localMembers, setLocalMembers] = useState<PoolMember[]>([]);
  
  // Use the pool invitations hook for managing invitations
  const {
    invitations,
    isLoading: isLoadingInvitations,
    error: invitationsError,
    resendInvitation,
    cancelInvitation,
    refreshInvitations
  } = usePoolInvitations({
    poolId: id,
    userId: currentUserId || undefined
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case PoolMemberStatus.CURRENT:
        return "bg-blue-100 text-blue-800";
      case PoolMemberStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case PoolMemberStatus.UPCOMING:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInvitationStatusColor = (status: string) => {
    switch (status) {
      case InvitationStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case InvitationStatus.ACCEPTED:
        return "bg-green-100 text-green-800";
      case InvitationStatus.EXPIRED:
        return "bg-red-100 text-red-800";
      case InvitationStatus.REJECTED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Sync localMembers with members from the hook
  useEffect(() => {
    if (members.length > 0) {
      setLocalMembers([...members]);
      setOriginalPositions([...members]);
    }
  }, [members]);
  
  // Move a member up in position (lower position number)
  const moveMemberUp = (memberId: number) => {
    const memberIndex = localMembers.findIndex(m => m.id === memberId);
    if (memberIndex <= 0) return; // Already at the top

    const newMembers = [...localMembers];
    const memberToMove = newMembers[memberIndex];
    const memberAbove = newMembers[memberIndex - 1];

    // Swap positions
    const tempPosition = memberToMove.position;
    memberToMove.position = memberAbove.position;
    memberAbove.position = tempPosition;

    // Sort by position
    newMembers.sort((a, b) => a.position - b.position);

    // Update the local members list
    setLocalMembers(newMembers);
    setPositionsChanged(true);
  };

  // Move a member down in position (higher position number)
  const moveMemberDown = (memberId: number) => {
    const memberIndex = localMembers.findIndex(m => m.id === memberId);
    if (memberIndex === -1 || memberIndex >= localMembers.length - 1) return; // Already at the bottom

    const newMembers = [...localMembers];
    const memberToMove = newMembers[memberIndex];
    const memberBelow = newMembers[memberIndex + 1];

    // Swap positions
    const tempPosition = memberToMove.position;
    memberToMove.position = memberBelow.position;
    memberBelow.position = tempPosition;

    // Sort by position
    newMembers.sort((a, b) => a.position - b.position);

    // Update the local members list
    setLocalMembers(newMembers);
    setPositionsChanged(true);
  };

  // Reset positions to original
  const resetPositions = () => {
    setLocalMembers([...originalPositions]);
    setPositionsChanged(false);
  };

  // Save position changes
  const savePositionChanges = async () => {
    // Prepare the position updates
    const positionUpdates = localMembers.map(member => ({
      memberId: member.id,
      position: member.position
    }));
    
    // Call the API to update positions
    const result = await updatePositions({ positions: positionUpdates });
    
    if (result.success) {
      // Update the original positions
      setOriginalPositions([...localMembers]);
      setPositionsChanged(false);
    } else {
      // Show error message
      alert(result.error || 'Failed to update positions');
    }
  };
  
  // Initialize edited member data when a member is selected
  useEffect(() => {
    if (selectedMember) {
      setEditedMember({...selectedMember});
    }
  }, [selectedMember]);
  
  // Handle member profile edit
  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editedMember || !selectedMember) return;
    
    // Get form data
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Prepare updates
    const updates = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as PoolMemberRole,
      paymentsOnTime: parseInt(formData.get('paymentsOnTime') as string),
      paymentsMissed: parseInt(formData.get('paymentsMissed') as string),
      payoutReceived: formData.has('payoutReceived'),
      payoutDate: formData.get('payoutDate') as string,
    };
    
    // Call the API to update the member
    const result = await updateMember({
      memberId: selectedMember.id,
      updates
    });
    
    if (result.success) {
      // Close dialog and reset
      setShowEditDialog(false);
      setSelectedMember(null);
      setEditedMember(null);
    } else {
      // Show error message
      alert(result.error || 'Failed to update member');
    }
  };

  // We're now using the InviteMembersDialog component which handles invitations directly

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    
    // Call the API to remove the member
    const result = await removeMember(selectedMember.id);
    
    if (result.success) {
      // Close dialog and reset selection
      setShowRemoveDialog(false);
      setSelectedMember(null);
    } else {
      // Show error message
      alert(result.error || 'Failed to remove member');
    }
  };

  const handleSendMessage = () => {
    if (!selectedMember || !messageText) return;

    // Message would be sent to the member here

    // Reset and close
    setMessageText("");
    setShowMessageDialog(false);
    setSelectedMember(null);
  };

  const handleSendReminder = async () => {
    if (!selectedMember) return;

    setIsSendingReminder(true);

    try {
      const response = await fetch(`/api/pools/${id}/members/${selectedMember.id}/reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: reminderMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to send reminder');
      } else {
        alert('Reminder sent successfully!');
        setShowReminderDialog(false);
        setReminderMessage("");
        setSelectedMember(null);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('An unexpected error occurred while sending the reminder');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleResendInvitation = async (invitationId: number) => {
    try {
      const result = await resendInvitation(invitationId);
      
      if (!result.success) {
        // Show error message
        alert(result.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('An unexpected error occurred while resending the invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      const result = await cancelInvitation(invitationId);
      
      if (!result.success) {
        // Show error message
        alert(result.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert('An unexpected error occurred while cancelling the invitation');
    }
  };
  
  // Loading state
  if (isLoadingPool || isLoadingMembers || isLoadingInvitations) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-lg text-gray-500">Loading member details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (poolError || membersError || invitationsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{poolError || membersError || invitationsError}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push(`/pools/${id}`)}>
              Back to Pool
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // No pool or members found
  if (!pool) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Alert>
            <AlertTitle>Pool Not Found</AlertTitle>
            <AlertDescription>The requested pool could not be found.</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/my-pool')}>
              Back to My Pools
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="mr-4"
                onClick={() => router.push(`/pools/${id}`)}
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back to Pool
              </Button>
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Manage Members
                </h2>
                <p className="mt-1 text-gray-500">
                  {pool.name} • {members.length} members
                </p>
              </div>
            </div>

            <div className="mt-4 md:mt-0 w-full md:w-auto">
              <Button
                className="flex items-center justify-center min-h-[44px] w-full md:w-auto"
                onClick={() => setShowInviteDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
              
              {/* Import and use the InviteMembersDialog component */}
              {pool && (
                <InviteMembersDialog
                  poolId={id}
                  poolName={pool.name}
                  isOpen={showInviteDialog}
                  onClose={() => {
                    setShowInviteDialog(false);
                    // Refresh invitations when dialog closes
                    refreshInvitations();
                  }}
                  userId={currentUserId || undefined}
                />
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="members" className="mt-6">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Pool Members</CardTitle>
                <CardDescription>
                  Manage the members of your savings pool
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-3 sm:px-4">Member</TableHead>
                        <TableHead className="px-3 sm:px-4">Position</TableHead>
                        <TableHead className="px-3 sm:px-4">Status</TableHead>
                        <TableHead className="hidden md:table-cell px-3 sm:px-4">Payments</TableHead>
                        <TableHead className="hidden lg:table-cell px-3 sm:px-4">Total Contributed</TableHead>
                        <TableHead className="hidden sm:table-cell px-3 sm:px-4">Payout Date</TableHead>
                        <TableHead className="px-3 sm:px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow
                          key={member.id}
                          className={member.name === "You" ? "bg-blue-50" : ""}
                        >
                          <TableCell className="px-3 sm:px-4">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage
                                  src={member.avatar}
                                  alt={member.name}
                                />
                                <AvatarFallback className="bg-blue-200 text-blue-800">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium truncate max-w-[120px] sm:max-w-none">{member.name}</div>
                                <div className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none hidden sm:block">
                                  {member.email}
                                </div>
                              </div>
                              {member.role === PoolMemberRole.ADMIN && (
                                <Badge className="hidden sm:inline-flex ml-2">Admin</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 sm:px-4">{member.position}</TableCell>
                          <TableCell className="px-3 sm:px-4">
                            <Badge className={getStatusColor(member.status)}>
                              {member.status.charAt(0).toUpperCase() +
                                member.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell px-3 sm:px-4">
                            <div className="flex items-center space-x-1">
                              <span className="text-green-600 font-medium">
                                {member.paymentsOnTime}
                              </span>
                              <span className="text-gray-500">/</span>
                              <span className="text-red-600 font-medium">
                                {member.paymentsMissed}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell px-3 sm:px-4">${member.totalContributed}</TableCell>
                          <TableCell className="hidden sm:table-cell px-3 sm:px-4">{formatDate(member.payoutDate)}</TableCell>
                          <TableCell className="px-3 sm:px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-11 w-11 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowMessageDialog(true);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Message
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowReminderDialog(true);
                                  }}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {member.name !== "You" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setShowRemoveDialog(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Remove
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle>Invitations</CardTitle>
                <CardDescription>
                  Track and manage invitations sent to potential members
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      No invitations sent
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Invite members to join your savings pool
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => setShowInviteDialog(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-3 sm:px-4">Email Address</TableHead>
                          <TableHead className="hidden sm:table-cell px-3 sm:px-4">Sent Date</TableHead>
                          <TableHead className="px-3 sm:px-4">Status</TableHead>
                          <TableHead className="px-3 sm:px-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell className="px-3 sm:px-4">
                              <div className="font-medium truncate max-w-[140px] sm:max-w-none">
                                {invitation.email}
                              </div>
                              <div className="text-xs text-gray-500 sm:hidden">
                                {formatDate(invitation.sentDate)}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell px-3 sm:px-4">
                              {formatDate(invitation.sentDate)}
                            </TableCell>
                            <TableCell className="px-3 sm:px-4">
                              <Badge
                                className={getInvitationStatusColor(
                                  invitation.status
                                )}
                              >
                                {invitation.status.charAt(0).toUpperCase() +
                                  invitation.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3 sm:px-4">
                              <div className="flex space-x-2">
                                {invitation.status === InvitationStatus.PENDING ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[44px]"
                                    onClick={() =>
                                      handleCancelInvitation(invitation.id)
                                    }
                                  >
                                    Cancel
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[44px]"
                                    onClick={() =>
                                      handleResendInvitation(invitation.id)
                                    }
                                  >
                                    <RefreshCw className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Resend</span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle>Manage Positions</CardTitle>
                <CardDescription>
                  Adjust the payout order for members in this pool
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">
                        Changing positions
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Changing positions will affect the payout schedule. Make
                        sure all members are informed about any changes.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-3 sm:px-4">Position</TableHead>
                          <TableHead className="px-3 sm:px-4">Member</TableHead>
                          <TableHead className="px-3 sm:px-4">Status</TableHead>
                          <TableHead className="hidden sm:table-cell px-3 sm:px-4">Payout Date</TableHead>
                          <TableHead className="px-3 sm:px-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...localMembers]
                          .sort((a, b) => a.position - b.position)
                          .map((member) => (
                            <TableRow
                              key={member.id}
                              className={
                                member.name === "You" ? "bg-blue-50" : ""
                              }
                            >
                              <TableCell className="font-medium px-3 sm:px-4">
                                {member.position}
                              </TableCell>
                              <TableCell className="px-3 sm:px-4">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage
                                      src={member.avatar}
                                      alt={member.name}
                                    />
                                    <AvatarFallback className="bg-blue-200 text-blue-800">
                                      {getInitials(member.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="truncate max-w-[120px] sm:max-w-none">{member.name}</div>
                                </div>
                              </TableCell>
                              <TableCell className="px-3 sm:px-4">
                                <Badge className={getStatusColor(member.status)}>
                                  {member.status.charAt(0).toUpperCase() +
                                    member.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell px-3 sm:px-4">
                                {formatDate(member.payoutDate)}
                              </TableCell>
                              <TableCell className="px-3 sm:px-4">
                                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[44px] text-xs sm:text-sm"
                                    disabled={member.position === 1}
                                    onClick={() => moveMemberUp(member.id)}
                                  >
                                    Up
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[44px] text-xs sm:text-sm"
                                    disabled={member.position === localMembers.length}
                                    onClick={() => moveMemberDown(member.id)}
                                  >
                                    Down
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={resetPositions}
                  disabled={!positionsChanged}
                >
                  Reset to Original
                </Button>
                <Button 
                  onClick={savePositionChanges}
                  disabled={!positionsChanged}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Remove Member Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the pool?
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="py-4">
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                  />
                  <AvatarFallback className="bg-blue-200 text-blue-800">
                    {getInitials(selectedMember.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedMember.name}</div>
                  <div className="text-sm text-gray-500">
                    {selectedMember.email}
                  </div>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h4 className="font-medium text-red-800">Warning</h4>
                <p className="text-sm text-red-700 mt-1">
                  This member has contributed ${selectedMember.totalContributed}{" "}
                  to the pool.
                  {selectedMember.payoutReceived
                    ? " They have already received their payout."
                    : " They have not yet received their payout."}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Message Dialog - Direct Messaging */}
      {selectedMember && (
        <MemberMessageDialog
          isOpen={showMessageDialog}
          onClose={() => setShowMessageDialog(false)}
          poolId={id}
          member={{
            id: selectedMember.id,
            name: selectedMember.name,
            avatar: selectedMember.avatar
          }}
          userId={currentUserId || undefined}
        />
      )}

      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member Profile</DialogTitle>
            <DialogDescription>
              Update member information and preferences
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <form onSubmit={handleEditMember}>
              <div className="py-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={selectedMember.avatar}
                      alt={selectedMember.name}
                    />
                    <AvatarFallback className="bg-blue-200 text-blue-800">
                      {getInitials(selectedMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-lg">{selectedMember.name}</div>
                    <div className="text-sm text-gray-500">
                      Joined {formatDate(selectedMember.joinDate)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={selectedMember.name}
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={selectedMember.email}
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={selectedMember.phone}
                      className="mt-1"
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">Pool Role</h4>
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="role-member"
                          name="role"
                          value={PoolMemberRole.MEMBER}
                          defaultChecked={selectedMember.role === PoolMemberRole.MEMBER}
                          className="mr-2"
                        />
                        <Label htmlFor="role-member">Member</Label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="role-admin"
                          name="role"
                          value={PoolMemberRole.ADMIN}
                          defaultChecked={selectedMember.role === PoolMemberRole.ADMIN}
                          className="mr-2"
                        />
                        <Label htmlFor="role-admin">Admin</Label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">Payment Status</h4>
                    <div className="flex space-x-2 items-center">
                      <Label htmlFor="paymentsOnTime" className="text-sm text-gray-500">Payments On Time:</Label>
                      <Input
                        id="paymentsOnTime"
                        name="paymentsOnTime"
                        type="number"
                        defaultValue={selectedMember.paymentsOnTime}
                        className="w-16 inline"
                        min="0"
                      />
                    </div>
                    <div className="flex space-x-2 items-center mt-2">
                      <Label htmlFor="paymentsMissed" className="text-sm text-gray-500">Payments Missed:</Label>
                      <Input
                        id="paymentsMissed"
                        name="paymentsMissed"
                        type="number"
                        defaultValue={selectedMember.paymentsMissed}
                        className="w-16 inline"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">Payout Information</h4>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="payoutReceived"
                        name="payoutReceived"
                        defaultChecked={selectedMember.payoutReceived}
                        className="mr-2"
                      />
                      <Label htmlFor="payoutReceived">Payout Received</Label>
                    </div>
                    <div className="mt-3">
                      <Label htmlFor="payoutDate">Scheduled Payout Date</Label>
                      <Input
                        id="payoutDate"
                        name="payoutDate"
                        type="date"
                        defaultValue={
                          new Date(selectedMember.payoutDate)
                            .toISOString()
                            .split("T")[0]
                        }
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <div className="flex space-x-2 mb-2 sm:mb-0">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                      onClick={() => {
                        // Send reset password link to user
                      }}
                    >
                      Reset Password
                    </Button>
                    <Button type="submit">
                      Save Changes
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Member Message Dialog - Direct Messaging */}
      {selectedMember && (
        <MemberMessageDialog
          isOpen={showMessageDialog}
          onClose={() => setShowMessageDialog(false)}
          poolId={id}
          member={{
            id: selectedMember.id,
            name: selectedMember.name,
            avatar: selectedMember.avatar
          }}
          userId={currentUserId || undefined}
        />
      )}

      {/* Send Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
            <DialogDescription>
              Send a payment reminder email to this member
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="py-4">
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                  />
                  <AvatarFallback className="bg-blue-200 text-blue-800">
                    {getInitials(selectedMember.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedMember.name}</div>
                  <div className="text-sm text-gray-500">
                    {selectedMember.email}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="reminderMessage">Personal Message (optional)</Label>
                  <textarea
                    id="reminderMessage"
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    placeholder="Add a personal message to include in the reminder email..."
                    className="w-full mt-1 p-3 border rounded-md min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-700">
                    A reminder email will be sent to <strong>{selectedMember.email}</strong> about
                    their upcoming payment of <strong>${pool?.contributionAmount}</strong> for the pool "{pool?.name}".
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReminderDialog(false);
                setReminderMessage("");
                setSelectedMember(null);
              }}
              disabled={isSendingReminder}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReminder}
              disabled={isSendingReminder}
            >
              {isSendingReminder ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}