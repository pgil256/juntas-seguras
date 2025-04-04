'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  Users,
  DollarSign,
  Clock,
  CreditCard,
  MessageCircle,
  Settings,
  Share2,
  MoreHorizontal,
  UserPlus,
  Loader,
  Send,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { InviteMembersDialog } from "@/components/pools/InviteMembersDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePool } from "@/lib/hooks/usePool";
import { usePoolMessages } from "@/lib/hooks/usePoolMessages";
import { TransactionType } from "@/types/pool";

// For demo purposes - in a real app, this would come from authentication context
const mockUserId = 'user123';

export default function PoolDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [messageText, setMessageText] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { pool, isLoading: poolLoading, error: poolError, refreshPool } = usePool({ 
    poolId: params.id,
    userId: mockUserId
  });
  
  const { 
    messages, 
    isLoading: messagesLoading, 
    error: messagesError, 
    sendMessage,
    deleteMessage,
    refreshMessages
  } = usePoolMessages({ 
    poolId: params.id,
    userId: mockUserId
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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

  const getTransactionIcon = (type: string) => {
    return type === TransactionType.CONTRIBUTION ? (
      <DollarSign className="h-5 w-5 text-blue-500" />
    ) : (
      <CreditCard className="h-5 w-5 text-green-500" />
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    try {
      const result = await sendMessage(messageText);
      if (result) {
        setMessageText(""); // Clear input only on success
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };
  
  const handleDeleteMessage = async (messageId: number) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };
  
  const handleManageMembers = () => {
    router.push(`/member-management/${params.id}`);
  };
  
  if (poolLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-lg text-gray-500">Loading pool details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (poolError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{poolError}</AlertDescription>
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
  
  if (!pool) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
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
                onClick={() => router.push('/my-pool')}
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back to My Pools
              </Button>
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  {pool.name}
                </h2>
                <p className="mt-1 text-gray-500">
                  Created on {formatDate(pool.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button variant="outline" size="sm" className="flex items-center">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Make Payment
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Pool
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(pool.totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Next Payout
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatDate(pool.nextPayoutDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Round</p>
                  <p className="text-2xl font-semibold">
                    {pool.currentRound} of {pool.totalRounds}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Members</p>
                  <p className="text-2xl font-semibold">
                    {pool.memberCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pool Progress</CardTitle>
            <CardDescription>
              {pool.currentRound} of {pool.totalRounds} rounds completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    In Progress
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {Math.round(
                      (pool.currentRound / pool.totalRounds) * 100
                    )}
                    %
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                <div
                  style={{
                    width: `${
                      (pool.currentRound / pool.totalRounds) * 100
                    }%`,
                  }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <div className="mt-8">
          <Tabs defaultValue="members">
            <TabsList className="mb-6">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Pool Members</CardTitle>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                        onClick={() => setShowInviteDialog(true)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                        onClick={handleManageMembers}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Members
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Member
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Position
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Joined
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Role
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pool.members.map((member) => (
                          <tr
                            key={member.id}
                            className={
                              member.name === "You" ? "bg-blue-50" : ""
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-3">
                                  <AvatarImage
                                    src={member.avatar}
                                    alt={member.name}
                                  />
                                  <AvatarFallback className="bg-blue-200 text-blue-800">
                                    {getInitials(member.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {member.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {member.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {member.position}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                  member.status
                                )}`}
                              >
                                {member.status.charAt(0).toUpperCase() +
                                  member.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(member.joinDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                              {member.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button className="text-gray-400 hover:text-gray-500">
                                <MoreHorizontal className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Transaction History</CardTitle>
                    <Button variant="outline" size="sm">
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Type
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Member
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Amount
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Date
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pool.transactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getTransactionIcon(transaction.type)}
                                <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                                  {transaction.type}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.member}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span
                                className={
                                  transaction.type === TransactionType.CONTRIBUTION
                                    ? "text-blue-600"
                                    : "text-green-600"
                                }
                              >
                                {formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(transaction.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 capitalize">
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Discussion Tab */}
            <TabsContent value="discussion">
              <Card>
                <CardHeader>
                  <CardTitle>Group Discussion</CardTitle>
                  <CardDescription>
                    Communicate with other members of this pool
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {messagesLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader className="h-6 w-6 text-blue-500 animate-spin" />
                      </div>
                    ) : messagesError ? (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error loading messages</AlertTitle>
                        <AlertDescription>{messagesError}</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto p-2">
                        {messages.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No messages yet. Start the conversation!
                          </div>
                        ) : (
                          messages.map((message) => (
                            <div key={message.id} className="flex group">
                              <Avatar className="h-10 w-10 mr-3 mt-1 shrink-0">
                                <AvatarFallback className="bg-blue-200 text-blue-800">
                                  {getInitials(message.author)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <span className="font-medium">
                                    {message.author}
                                  </span>
                                  <div className="flex items-center">
                                    <span className="text-xs text-gray-500 mr-2">
                                      {formatDateTime(message.date)}
                                    </span>
                                    {message.author === "You" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                                        onClick={() => handleDeleteMessage(message.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <p className="mt-1 text-gray-700 whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="mt-6">
                      <div className="flex">
                        <Avatar className="h-10 w-10 mr-3 shrink-0">
                          <AvatarFallback className="bg-blue-200 text-blue-800">
                            {getInitials("You")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            className="w-full border-gray-300 rounded-lg pr-12"
                            placeholder="Type your message..."
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            disabled={!messageText.trim()}
                          >
                            <Send className="h-5 w-5 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules">
              <Card>
                <CardHeader>
                  <CardTitle>Pool Rules</CardTitle>
                  <CardDescription>
                    Guidelines and terms for this savings pool
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Contribution Rules
                      </h3>
                      <ul className="mt-3 space-y-3 text-sm text-gray-700 list-disc pl-5">
                        <li>
                          All members must contribute{" "}
                          <strong>
                            {formatCurrency(pool.contributionAmount)}
                          </strong>{" "}
                          every {pool.frequency.toLowerCase()}.
                        </li>
                        <li>Payments are due every Friday by 8:00 PM.</li>
                        <li>
                          Members who fail to make payments on time will receive
                          a warning. After two missed payments, they may be
                          removed from future pools.
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Payout Rules
                      </h3>
                      <ul className="mt-3 space-y-3 text-sm text-gray-700 list-disc pl-5">
                        <li>
                          The payout order was determined randomly at the start
                          of the pool.
                        </li>
                        <li>
                          Each member will receive one payout of{" "}
                          {formatCurrency(
                            pool.contributionAmount * pool.memberCount
                          )}{" "}
                          during their assigned round.
                        </li>
                        <li>
                          Payouts will be processed every two weeks on Saturday.
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Member Rules
                      </h3>
                      <ul className="mt-3 space-y-3 text-sm text-gray-700 list-disc pl-5">
                        <li>
                          If a member needs to leave the pool, they must find a
                          replacement who agrees to the same terms.
                        </li>
                        <li>
                          New members must be approved by a majority of existing
                          members.
                        </li>
                        <li>
                          All members must maintain active contact information.
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Dispute Resolution
                      </h3>
                      <ul className="mt-3 space-y-3 text-sm text-gray-700 list-disc pl-5">
                        <li>
                          All disputes will be resolved by a majority vote of
                          pool members.
                        </li>
                        <li>
                          The pool administrator has final say in urgent
                          matters.
                        </li>
                        <li>
                          Members agree to resolve disputes internally before
                          seeking external resolution.
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Invite Members Dialog */}
      <InviteMembersDialog
        poolId={params.id}
        poolName={pool.name}
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
      />
    </div>
  );
}