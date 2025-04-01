// app/pools/[id]/page.tsx
"use client";

import { useState } from "react";
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

// Sample pool data - in a real app, this would come from an API call
const poolData = {
  id: "123",
  name: "Family Savings Pool",
  description: "Our shared savings for household expenses and emergencies",
  createdAt: "2025-01-10T00:00:00Z",
  status: "active",
  totalAmount: 950,
  contributionAmount: 50,
  frequency: "Weekly",
  currentRound: 4,
  totalRounds: 8,
  nextPayoutDate: "2025-03-15T00:00:00Z",
  memberCount: 8,
  members: [
    {
      id: 1,
      name: "You",
      email: "you@example.com",
      joinDate: "2025-01-10T00:00:00Z",
      role: "admin",
      position: 3,
      status: "current",
      avatar: "",
    },
    {
      id: 2,
      name: "Maria Rodriguez",
      email: "maria@example.com",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 1,
      status: "completed",
      avatar: "",
    },
    {
      id: 3,
      name: "Carlos Mendez",
      email: "carlos@example.com",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 2,
      status: "completed",
      avatar: "",
    },
    {
      id: 4,
      name: "Ana Garcia",
      email: "ana@example.com",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 4,
      status: "upcoming",
      avatar: "",
    },
    {
      id: 5,
      name: "Juan Perez",
      email: "juan@example.com",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 5,
      status: "upcoming",
      avatar: "",
    },
    {
      id: 6,
      name: "Sofia Torres",
      email: "sofia@example.com",
      joinDate: "2025-01-10T00:00:00Z",
      role: "member",
      position: 6,
      status: "upcoming",
      avatar: "",
    },
    {
      id: 7,
      name: "Diego Flores",
      email: "diego@example.com",
      joinDate: "2025-01-12T00:00:00Z",
      role: "member",
      position: 7,
      status: "upcoming",
      avatar: "",
    },
    {
      id: 8,
      name: "Gabriela Ortiz",
      email: "gabriela@example.com",
      joinDate: "2025-01-15T00:00:00Z",
      role: "member",
      position: 8,
      status: "upcoming",
      avatar: "",
    },
  ],
  transactions: [
    {
      id: 1,
      type: "contribution",
      amount: 50,
      date: "2025-02-20T10:30:00Z",
      member: "You",
      status: "completed",
    },
    {
      id: 2,
      type: "contribution",
      amount: 50,
      date: "2025-02-20T09:15:00Z",
      member: "Ana Garcia",
      status: "completed",
    },
    {
      id: 3,
      type: "contribution",
      amount: 50,
      date: "2025-02-19T16:45:00Z",
      member: "Juan Perez",
      status: "completed",
    },
    {
      id: 4,
      type: "payout",
      amount: 400,
      date: "2025-02-15T12:00:00Z",
      member: "Carlos Mendez",
      status: "completed",
    },
    {
      id: 5,
      type: "contribution",
      amount: 50,
      date: "2025-02-13T10:30:00Z",
      member: "You",
      status: "completed",
    },
    {
      id: 6,
      type: "contribution",
      amount: 50,
      date: "2025-02-13T08:45:00Z",
      member: "Sofia Torres",
      status: "completed",
    },
    {
      id: 7,
      type: "contribution",
      amount: 50,
      date: "2025-02-12T18:20:00Z",
      member: "Diego Flores",
      status: "completed",
    },
    {
      id: 8,
      type: "contribution",
      amount: 50,
      date: "2025-02-12T14:10:00Z",
      member: "Gabriela Ortiz",
      status: "completed",
    },
    {
      id: 9,
      type: "payout",
      amount: 400,
      date: "2025-01-24T12:00:00Z",
      member: "Maria Rodriguez",
      status: "completed",
    },
  ],
  messages: [
    {
      id: 1,
      author: "Maria Rodriguez",
      content:
        "Just received my payout! Thank you everyone for contributing on time.",
      date: "2025-01-24T14:30:00Z",
    },
    {
      id: 2,
      author: "Carlos Mendez",
      content:
        "I'll be traveling next week, but I've already scheduled my payment.",
      date: "2025-02-08T09:15:00Z",
    },
    {
      id: 3,
      author: "You",
      content: "Remember that contributions are due every Friday by 6pm.",
      date: "2025-02-10T11:20:00Z",
    },
    {
      id: 4,
      author: "Sofia Torres",
      content: "Will we rotate the payout order for the next cycle?",
      date: "2025-02-18T16:45:00Z",
    },
    {
      id: 5,
      author: "You",
      content: "Yes, we'll have a random draw for positions in the next cycle.",
      date: "2025-02-18T17:30:00Z",
    },
  ],
};

export default function PoolDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

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
    return type === "contribution" ? (
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the message to an API
    console.log("Sending message:", message);
    setMessage("");
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
                onClick={() => router.back()}
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back
              </Button>
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  {poolData.name}
                </h2>
                <p className="mt-1 text-gray-500">
                  Created on {formatDate(poolData.createdAt)}
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
                    {formatCurrency(poolData.totalAmount)}
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
                    {formatDate(poolData.nextPayoutDate)}
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
                    {poolData.currentRound} of {poolData.totalRounds}
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
                    {poolData.memberCount}
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
              {poolData.currentRound} of {poolData.totalRounds} rounds completed
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
                      (poolData.currentRound / poolData.totalRounds) * 100
                    )}
                    %
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                <div
                  style={{
                    width: `${
                      (poolData.currentRound / poolData.totalRounds) * 100
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Invite Member
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
                        {poolData.members.map((member) => (
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
                        {poolData.transactions.map((transaction) => (
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
                                  transaction.type === "contribution"
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
                    <div className="space-y-4">
                      {poolData.messages.map((message) => (
                        <div key={message.id} className="flex">
                          <Avatar className="h-10 w-10 mr-3 mt-1">
                            <AvatarFallback className="bg-blue-200 text-blue-800">
                              {getInitials(message.author)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="font-medium">
                                {message.author}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(message.date)}
                              </span>
                            </div>
                            <p className="mt-1 text-gray-700">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="mt-6">
                      <div className="flex">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback className="bg-blue-200 text-blue-800">
                            {getInitials("You")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full border-gray-300 rounded-lg pr-12"
                            placeholder="Type your message..."
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          >
                            <MessageCircle className="h-5 w-5 text-blue-600" />
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
                            {formatCurrency(poolData.contributionAmount)}
                          </strong>{" "}
                          every {poolData.frequency.toLowerCase()}.
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
                            poolData.contributionAmount * poolData.memberCount
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
    </div>
  );
}
