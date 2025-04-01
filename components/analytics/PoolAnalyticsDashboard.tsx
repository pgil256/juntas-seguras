import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Sample data for analytics
const poolData = {
  id: "123",
  name: "Family Savings Pool",
  description: "Our shared savings for household expenses and emergencies",
  startDate: "2025-01-10",
  currentRound: 4,
  totalRounds: 8,
  contributionAmount: 50,
  totalMembers: 8,
  totalSaved: 1600,
  nextPayoutDate: "2025-03-15",
};

const contributionData = [
  { month: 'Jan', onTime: 8, late: 0, missed: 0 },
  { month: 'Feb', onTime: 7, late: 1, missed: 0 },
  { month: 'Mar', onTime: 6, late: 2, missed: 0 },
];

const memberContributionData = [
  { name: 'You', totalContributed: 250, totalReceived: 0, onTimeRate: 100 },
  { name: 'Maria R.', totalContributed: 250, totalReceived: 400, onTimeRate: 100 },
  { name: 'Carlos M.', totalContributed: 250, totalReceived: 400, onTimeRate: 87 },
  { name: 'Ana G.', totalContributed: 250, totalReceived: 0, onTimeRate: 100 },
  { name: 'Juan P.', totalContributed: 200, totalReceived: 0, onTimeRate: 75 },
  { name: 'Sofia T.', totalContributed: 200, totalReceived: 0, onTimeRate: 87 },
  { name: 'Diego F.', totalContributed: 150, totalReceived: 0, onTimeRate: 62 },
  { name: 'Gabriela O.', totalContributed: 250, totalReceived: 0, onTimeRate: 100 },
];

const savingsGrowthData = [
  { month: 'Jan Week 1', amount: 400 },
  { month: 'Jan Week 2', amount: 800 },
  { month: 'Jan Week 3', amount: 1200 },
  { month: 'Jan Week 4', amount: 1600 },
  { month: 'Feb Week 1', amount: 2000 },
  { month: 'Feb Week 2', amount: 2400 },
  { month: 'Feb Week 3', amount: 2800 },
  { month: 'Feb Week 4', amount: 3200 },
  { month: 'Mar Week 1', amount: 3600 },
  { month: 'Mar Week 2', amount: 4000 },
];

const payoutDistributionData = [
  { name: 'Paid Out', value: 800 },
  { name: 'Remaining', value: 2800 },
];

const onTimeRateData = [
  { month: 'Jan', rate: 100 },
  { month: 'Feb', rate: 87.5 },
  { month: 'Mar', rate: 75 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PoolAnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState('3months');
  const [poolSelector, setPoolSelector] = useState('123');

  return (
    <div className="bg-gray-50 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Pool Analytics</h2>
          <p className="text-gray-500">
            Track contributions, growth, and member performance
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
          <Select
            value={poolSelector}
            onValueChange={setPoolSelector}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Pool" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="123">Family Savings Pool</SelectItem>
              <SelectItem value="456">Vacation Fund</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={timeframe}
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pool Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Savings</p>
                <p className="text-2xl font-semibold">${poolData.totalSaved}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Current Round</p>
                <p className="text-2xl font-semibold">{poolData.currentRound} of {poolData.totalRounds}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">On-Time Rate</p>
                <p className="text-2xl font-semibold">87.5%</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Next Payout</p>
                <p className="text-2xl font-semibold">Mar 15</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="members">Member Performance</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Savings Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Savings Growth</CardTitle>
                <CardDescription>
                  Total pool value over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={savingsGrowthData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                      <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#93c5fd" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payout Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Payout Distribution</CardTitle>
                <CardDescription>
                  Funds paid out vs. remaining
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={payoutDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {payoutDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* On-time Payment Rate */}
            <Card>
              <CardHeader>
                <CardTitle>On-time Payment Rate</CardTitle>
                <CardDescription>
                  Percentage of payments made on time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={onTimeRateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'On-time Rate']} />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="#10b981"
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Contributions */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Contributions</CardTitle>
                <CardDescription>
                  Breakdown of payment statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="onTime" name="On Time" fill="#10b981" />
                      <Bar dataKey="late" name="Late" fill="#f59e0b" />
                      <Bar dataKey="missed" name="Missed" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contributions Tab */}
        <TabsContent value="contributions">
          <Card>
            <CardHeader>
              <CardTitle>Contribution Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of all contributions over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="onTime" name="On Time" fill="#10b981" />
                      <Bar dataKey="late" name="Late" fill="#f59e0b" />
                      <Bar dataKey="missed" name="Missed" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-lg text-blue-900">Contribution Summary</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Total Contributions:</span>
                        <span className="font-medium">{contributionData.reduce((acc, curr) => acc + curr.onTime + curr.late, 0)} payments</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">On-Time Payments:</span>
                        <span className="font-medium">{contributionData.reduce((acc, curr) => acc + curr.onTime, 0)} payments</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Late Payments:</span>
                        <span className="font-medium">{contributionData.reduce((acc, curr) => acc + curr.late, 0)} payments</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Missed Payments:</span>
                        <span className="font-medium">{contributionData.reduce((acc, curr) => acc + curr.missed, 0)} payments</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">On-Time Rate:</span>
                        <span className="font-medium">
                          {(contributionData.reduce((acc, curr) => acc + curr.onTime, 0) / 
                            (contributionData.reduce((acc, curr) => acc + curr.onTime + curr.late + curr.missed, 0)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-lg text-green-900">Insights</h3>
                    <ul className="mt-2 space-y-2 text-green-700">
                      <li className="flex items-start">
                        <div className="mr-2">•</div>
                        <div>On-time payment rate is declining slightly. Consider sending reminders earlier.</div>
                      </li>
                      <li className="flex items-start">
                        <div className="mr-2">•</div>
                        <div>March has had the most late payments so far.</div>
                      </li>
                      <li className="flex items-start">
                        <div className="mr-2">•</div>
                        <div>No missed payments yet - pool members are committed!</div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Member Performance</CardTitle>
              <CardDescription>
                Individual contribution and reliability metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={memberContributionData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                      <Legend />
                      <Bar dataKey="totalContributed" name="Contributed" fill="#3b82f6" />
                      <Bar dataKey="totalReceived" name="Received" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={memberContributionData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [`${value}%`, 'On-time Rate']} />
                      <Bar dataKey="onTimeRate" name="On-time Rate" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium text-lg text-gray-900 mb-4">Member Rankings</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contribution</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">On-time %</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {memberContributionData
                        .sort((a, b) => b.onTimeRate - a.onTimeRate)
                        .map((member, index) => (
                          <tr key={member.name}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${member.totalContributed}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.onTimeRate}%</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                member.onTimeRate >= 90 ? 'bg-green-100 text-green-800' :
                                member.onTimeRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {member.onTimeRate >= 90 ? 'Excellent' :
                                 member.onTimeRate >= 75 ? 'Good' :
                                 'Needs Improvement'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projections Tab */}
        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Future Projections</CardTitle>
              <CardDescription>
                Anticipated growth and completion timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      ...savingsGrowthData,
                      { month: 'Mar Week 3', amount: 4400, projected: true },
                      { month: 'Mar Week 4', amount: 4800, projected: true },
                      { month: 'Apr Week 1', amount: 5200, projected: true },
                      { month: 'Apr Week 2', amount: 5600, projected: true },
                      { month: 'Apr Week 3', amount: 6000, projected: true },
                      { month: 'Apr Week 4', amount: 6400, projected: true },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-lg text-blue-900">Projection Summary</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Projected Completion Date:</span>
                        <span className="font-medium">May 28, 2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Total Expected Value:</span>
                        <span className="font-medium">$6,400</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Your Expected Return:</span>
                        <span className="font-medium">$400</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Return on Contribution:</span>
                        <span className="font-medium">8x</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-lg text-green-900">Timeline Analysis</h3>
                    <ul className="mt-2 space-y-2 text-green-700">
                      <li className="flex items-start">
                        <div className="mr-2">•</div>
                        <div>Pool is on track to complete as scheduled</div>
                      </li>
                      <li className="flex items-start">
                        <div className="mr-2">•</div>
                        <div>Your payout is scheduled for March 15, 2025</div>
                      </li>
                      <li className="flex items-start">
                        <div className="mr-2">•</div>
                        <div>If current trends continue, all members will receive their payouts on time</div>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-medium text-lg text-purple-900">Risk Assessment</h3>
                    <div className="mt-2">
                      <div className="flex items-center mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '15%' }}></div>
                        </div>
                        <span className="text-sm text-gray-700">Low</span>
                      </div>
                      <p className="text-sm text-purple-700">
                        Current risk level is low based on member payment history and pool progression.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium text-lg text-gray-900 mb-4">Future Payout Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="bg-green-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">3</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">You</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">March 15, 2025</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">$400</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Upcoming
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">4</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Ana G.</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">March 29, 2025</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$400</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Scheduled
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">5</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Juan P.</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">April 12, 2025</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$400</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Scheduled
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">6</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Sofia T.</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">April 26, 2025</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$400</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Scheduled
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">7</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Diego F.</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">May 10, 2025</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$400</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Scheduled
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">8</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Gabriela O.</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">May 24, 2025</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$400</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Scheduled
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between mt-6">
        <Button variant="outline">Export as PDF</Button>
        <Button variant="outline">Share Report</Button>
      </div>
    </div>
  );