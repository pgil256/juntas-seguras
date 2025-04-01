// app/member-management/[id]/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Sample pool data
const poolData = {
  id: "123",
  name: "Family Savings Pool",
  description: "Our shared savings for household expenses and emergencies",
  totalMembers: 8,
  contributionAmount: 50,
  frequency: "Weekly",
  startDate: "January 10, 2025",
  admin: {
    id: 1,
    name: "You",
    email: "you@example.com",
  },
  members: [
    {
      id: 1,
      name: "You",
      email: "you@example.com",
      phone: "(555) 123-4567",
      joinDate: "2025-01-10T00:00:00Z",
      role: "admin",
      position: 3,
      status: "current",
      paymentsOnTime: 8,
      paymentsMissed: 0,
      totalContributed: 400,
      payoutReceived: false,
      payoutDate: "2025-03-15",
      avatar: "",
    },
    {
      id: 2,
      name: "Maria Rodriguez",
      email: "maria@example.com",
      phone: "(555) 234-5678",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 1,
      status: "completed",
      paymentsOnTime: 8,
      paymentsMissed: 0,
      totalContributed: 400,
      payoutReceived: true,
      payoutDate: "2025-01-24",
      avatar: "",
    },
    {
      id: 3,
      name: "Carlos Mendez",
      email: "carlos@example.com",
      phone: "(555) 345-6789",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 2,
      status: "completed",
      paymentsOnTime: 7,
      paymentsMissed: 1,
      totalContributed: 350,
      payoutReceived: true,
      payoutDate: "2025-02-07",
      avatar: "",
    },
    {
      id: 4,
      name: "Ana Garcia",
      email: "ana@example.com",
      phone: "(555) 456-7890",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 4,
      status: "upcoming",
      paymentsOnTime: 8,
      paymentsMissed: 0,
      totalContributed: 400,
      payoutReceived: false,
      payoutDate: "2025-03-28",
      avatar: "",
    },
    {
      id: 5,
      name: "Juan Perez",
      email: "juan@example.com",
      phone: "(555) 567-8901",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 5,
      status: "upcoming",
      paymentsOnTime: 6,
      paymentsMissed: 2,
      totalContributed: 300,
      payoutReceived: false,
      payoutDate: "2025-04-11",
      avatar: "",
    },
    {
      id: 6,
      name: "Sofia Torres",
      email: "sofia@example.com",
      phone: "(555) 678-9012",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 6,
      status: "upcoming",
      paymentsOnTime: 7,
      paymentsMissed: 1,
      totalContributed: 350,
      payoutReceived: false,
      payoutDate: "2025-04-25",
      avatar: "",
    },
    {
      id: 7,
      name: "Diego Flores",
      email: "diego@example.com",
      phone: "(555) 789-0123",
      joinDate: "2025-01-12T00:00:00Z",
      role: "member",
      position: 7,
      status: "upcoming",
      paymentsOnTime: 5,
      paymentsMissed: 3,
      totalContributed: 250,
      payoutReceived: false,
      payoutDate: "2025-05-09",
      avatar: "",
    },
    {
      id: 8,
      name: "Gabriela Ortiz",
      email: "gabriela@example.com",
      phone: "(555) 890-1234",
      joinDate: "2025-01-15T00:00:00Z",
      role: "member",
      position: 8,
      status: "upcoming",
      paymentsOnTime: 8,
      paymentsMissed: 0,
      totalContributed: 400,
      payoutReceived: false,
      payoutDate: "2025-05-23",
      avatar: "",
    },
  ],
  invitationsSent: [
    {
      id: 1,
      email: "luis@example.com",
      sentDate: "2025-02-28T00:00:00Z",
      status: "pending",
    },
    {
      id: 2,
      email: "carmen@example.com",
      sentDate: "2025-03-01T00:00:00Z",
      status: "expired",
    },
  ],
};

export default function MemberManagementPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [members, setMembers] = useState(poolData.members);
  const [invitations, setInvitations] = useState(poolData.invitationsSent);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newInvite, setNewInvite] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [messageText, setMessageText] = useState("");

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
      case "current":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInvitationStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleInvite = () => {
    // In a real app, this would send an invitation to the email address
    console.log("Inviting:", newInvite);

    // Add to invitations list
    const newInvitation = {
      id: invitations.length + 1,
      email: newInvite.email,
      sentDate: new Date().toISOString(),
      status: "pending",
    };
    setInvitations([...invitations, newInvitation]);

    // Reset form and close dialog
    setNewInvite({ name: "", email: "", phone: "" });
    setShowInviteDialog(false);
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;

    // In a real app, this would call an API to remove the member
    console.log("Removing member:", selectedMember);

    // Remove from members list
    setMembers(members.filter((m) => m.id !== selectedMember.id));

    // Close dialog and reset selection
    setShowRemoveDialog(false);
    setSelectedMember(null);
  };

  const handleSendMessage = () => {
    if (!selectedMember || !messageText) return;

    // In a real app, this would send a message to the member
    console.log("Sending message to", selectedMember.name, ":", messageText);

    // Reset and close
    setMessageText("");
    setShowMessageDialog(false);
    setSelectedMember(null);
  };

  const handleResendInvitation = (invitationId: number) => {
    // In a real app, this would resend the invitation
    console.log("Resending invitation:", invitationId);

    // Update invitation status
    setInvitations(
      invitations.map((inv) =>
        inv.id === invitationId
          ? { ...inv, sentDate: new Date().toISOString(), status: "pending" }
          : inv
      )
    );
  };

  const handleCancelInvitation = (invitationId: number) => {
    // In a real app, this would cancel the invitation
    console.log("Cancelling invitation:", invitationId);

    // Remove from invitations list
    setInvitations(invitations.filter((inv) => inv.id !== invitationId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="mr-4"
                onClick={() => router.push(`/pools/${params.id}`)}
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back to Pool
              </Button>
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Manage Members
                </h2>
                <p className="mt-1 text-gray-500">
                  {poolData.name} • {poolData.members.length} members
                </p>
              </div>
            </div>

            <div className="mt-4 md:mt-0">
              <Dialog
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite a New Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join the pool. They'll receive
                      instructions on how to join.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="name">Name (Optional)</Label>
                      <Input
                        id="name"
                        value={newInvite.name}
                        onChange={(e) =>
                          setNewInvite({ ...newInvite, name: e.target.value })
                        }
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        value={newInvite.email}
                        onChange={(e) =>
                          setNewInvite({ ...newInvite, email: e.target.value })
                        }
                        placeholder="Enter email address"
                        type="email"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        value={newInvite.phone}
                        onChange={(e) =>
                          setNewInvite({ ...newInvite, phone: e.target.value })
                        }
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={!newInvite.email}>
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payments</TableHead>
                        <TableHead>Total Contributed</TableHead>
                        <TableHead>Payout Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow
                          key={member.id}
                          className={member.name === "You" ? "bg-blue-50" : ""}
                        >
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={member.avatar}
                                  alt={member.name}
                                />
                                <AvatarFallback className="bg-blue-200 text-blue-800">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-xs text-gray-500">
                                  {member.email}
                                </div>
                              </div>
                              {member.role === "admin" && (
                                <Badge className="ml-2">Admin</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{member.position}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(member.status)}>
                              {member.status.charAt(0).toUpperCase() +
                                member.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
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
                          <TableCell>${member.totalContributed}</TableCell>
                          <TableCell>{formatDate(member.payoutDate)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email Address</TableHead>
                          <TableHead>Sent Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell>
                              <div className="font-medium">
                                {invitation.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(invitation.sentDate)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getInvitationStatusColor(
                                  invitation.status
                                )}
                              >
                                {invitation.status.charAt(0).toUpperCase() +
                                  invitation.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {invitation.status === "pending" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
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
                                    onClick={() =>
                                      handleResendInvitation(invitation.id)
                                    }
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Resend
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

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payout Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...members]
                        .sort((a, b) => a.position - b.position)
                        .map((member) => (
                          <TableRow
                            key={member.id}
                            className={
                              member.name === "You" ? "bg-blue-50" : ""
                            }
                          >
                            <TableCell className="font-medium">
                              {member.position}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={member.avatar}
                                    alt={member.name}
                                  />
                                  <AvatarFallback className="bg-blue-200 text-blue-800">
                                    {getInitials(member.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>{member.name}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(member.status)}>
                                {member.status.charAt(0).toUpperCase() +
                                  member.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(member.payoutDate)}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={member.position === 1}
                                >
                                  Move Up
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={member.position === members.length}
                                >
                                  Move Down
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="outline" className="mr-2">
                  Reset to Original
                </Button>
                <Button>Save Changes</Button>
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

      {/* Message Member Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to this member about the pool
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
              <div className="mt-2">
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md mt-1 h-32"
                  placeholder="Type your message here..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMessageDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={!messageText}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
