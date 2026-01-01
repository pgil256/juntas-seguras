import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
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
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { usePoolAnalytics } from '../../lib/hooks/usePoolAnalytics';
import { usePools } from '../../lib/hooks/usePools';
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Calendar, 
  BarChart as BarChartIcon,
  Loader
} from 'lucide-react';

// For custom colors in charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

interface PoolAnalyticsDashboardProps {
  initialPoolId?: string;
}

export default function PoolAnalyticsDashboard({ initialPoolId }: PoolAnalyticsDashboardProps) {
  // State for filters and selections
  const [timeframe, setTimeframe] = useState('3months');
  const [selectedPoolId, setSelectedPoolId] = useState(initialPoolId || '');
  
  // Fetch all pools for the selection dropdown
  const {
    pools,
    isLoading: poolsLoading,
    error: poolsError
  } = usePools();
  
  // Fetch analytics data for the selected pool
  const {
    analytics,
    isLoading: analyticsLoading,
    error: analyticsError
  } = usePoolAnalytics({
    poolId: selectedPoolId,
    timeframe
  });
  
  // Set the first pool as selected if none is provided and pools are loaded
  React.useEffect(() => {
    if (!selectedPoolId && pools && pools.length > 0) {
      setSelectedPoolId(pools[0].id);
    }
  }, [pools, selectedPoolId]);
  
  // Handle pool selection
  const handlePoolChange = (poolId: string) => {
    setSelectedPoolId(poolId);
  };
  
  // Handle timeframe selection
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Loading state
  if (poolsLoading || (analyticsLoading && selectedPoolId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg text-gray-500">Loading analytics data...</p>
      </div>
    );
  }
  
  // Error state
  if (poolsError || (analyticsError && selectedPoolId)) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {poolsError || analyticsError || 'Failed to load analytics data'}
        </AlertDescription>
      </Alert>
    );
  }
  
  // No pools found
  if (!pools || pools.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <BarChartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">No Pools Found</h3>
        <p className="text-gray-500 mt-2">
          You need to be a member of at least one pool to view analytics.
        </p>
        <Button className="mt-6" onClick={() => window.location.href = '/create-pool'}>
          Create a Pool
        </Button>
      </div>
    );
  }
  
  // No pool selected
  if (!selectedPoolId) {
    return (
      <div className="bg-gray-50 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Pool Analytics</h2>
            <p className="text-gray-500">
              Track contributions, growth, and member performance
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Select
              value={selectedPoolId}
              onValueChange={handlePoolChange}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a pool" />
              </SelectTrigger>
              <SelectContent>
                {pools.map(pool => (
                  <SelectItem key={pool.id} value={pool.id}>
                    {pool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <BarChartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Select a Pool</h3>
          <p className="text-gray-500 mt-2">
            Please select a pool from the dropdown to view analytics.
          </p>
        </div>
      </div>
    );
  }
  
  // No analytics data
  if (!analytics) {
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
              value={selectedPoolId}
              onValueChange={handlePoolChange}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a pool" />
              </SelectTrigger>
              <SelectContent>
                {pools.map(pool => (
                  <SelectItem key={pool.id} value={pool.id}>
                    {pool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Alert variant="default" className="mb-6">
          <AlertTitle>No Analytics Data</AlertTitle>
          <AlertDescription>
            There isn't enough data to generate analytics for this pool yet.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Main dashboard view with data
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
            value={selectedPoolId}
            onValueChange={handlePoolChange}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Pool" />
            </SelectTrigger>
            <SelectContent>
              {pools.map(pool => (
                <SelectItem key={pool.id} value={pool.id}>
                  {pool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={timeframe}
            onValueChange={handleTimeframeChange}
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
                <p className="text-2xl font-semibold">{formatCurrency(analytics.totalSaved)}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completion</p>
                <p className="text-2xl font-semibold">{Math.round(analytics.completionPercentage)}%</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">On-Time Rate</p>
                <p className="text-2xl font-semibold">{Math.round(analytics.onTimeRate)}%</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Next Payout</p>
                <p className="text-2xl font-semibold">
                  {analytics.payoutSchedule
                    .find(p => p.status === 'upcoming')?.date 
                    ? formatDate(analytics.payoutSchedule.find(p => p.status === 'upcoming')?.date || '')
                    : 'N/A'}
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
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
                      data={analytics.savingsGrowthData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#3b82f6" 
                        fill="#93c5fd" 
                        activeDot={{ r: 8 }} 
                      />
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
                        data={analytics.payoutDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {analytics.payoutDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
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
                    <LineChart data={analytics.onTimeRateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'On-time Rate']} />
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
                    <BarChart data={analytics.contributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
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
                    <BarChart data={analytics.contributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
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
                        <span className="font-medium">
                          {analytics.contributionData.reduce((acc, curr) => acc + curr.onTime + curr.late, 0)} payments
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">On-Time Payments:</span>
                        <span className="font-medium">
                          {analytics.contributionData.reduce((acc, curr) => acc + curr.onTime, 0)} payments
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Late Payments:</span>
                        <span className="font-medium">
                          {analytics.contributionData.reduce((acc, curr) => acc + curr.late, 0)} payments
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Missed Payments:</span>
                        <span className="font-medium">
                          {analytics.contributionData.reduce((acc, curr) => acc + curr.missed, 0)} payments
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">On-Time Rate:</span>
                        <span className="font-medium">
                          {Math.round(analytics.onTimeRate)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-lg text-green-900">Insights</h3>
                    <ul className="mt-2 space-y-2 text-green-700">
                      {analytics.onTimeRate >= 90 && (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>Excellent on-time payment rate! The pool is running smoothly.</div>
                        </li>
                      )}
                      {analytics.onTimeRate < 90 && analytics.onTimeRate >= 75 && (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>Good on-time payment rate. Consider sending reminders to improve further.</div>
                        </li>
                      )}
                      {analytics.onTimeRate < 75 && (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>On-time payment rate needs improvement. Schedule reminders earlier.</div>
                        </li>
                      )}
                      
                      {analytics.contributionData.length > 0 && analytics.contributionData.some(d => d.late > 0) && (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>{analytics.contributionData.reduce((max, curr) => (curr.late > max.late ? curr : max), analytics.contributionData[0]).period} had the most late payments.</div>
                        </li>
                      )}
                      
                      {analytics.contributionData.length > 0 && analytics.contributionData.every(d => d.missed === 0) && (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>No missed payments yet - pool members are committed!</div>
                        </li>
                      )}
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
                      data={analytics.memberContributionData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                      <Legend />
                      <Bar dataKey="totalContributed" name="Contributed" fill="#3b82f6" />
                      <Bar dataKey="totalReceived" name="Received" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.memberContributionData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'On-time Rate']} />
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
                      {analytics.memberContributionData
                        .sort((a, b) => b.onTimeRate - a.onTimeRate)
                        .map((member, index) => (
                          <tr key={member.name}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(member.totalContributed)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.onTimeRate.toFixed(1)}%</td>
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
                      ...analytics.savingsGrowthData,
                      // Add projected data points
                      ...(analytics.savingsGrowthData.length > 0 ? generateProjectedData(
                        analytics.savingsGrowthData,
                        analytics.projectedTotalValue
                      ) : [])
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
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
                        <span className="font-medium">{formatDate(analytics.projectedCompletionDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Total Expected Value:</span>
                        <span className="font-medium">{formatCurrency(analytics.projectedTotalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Your Expected Return:</span>
                        <span className="font-medium">{formatCurrency(analytics.expectedReturn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Return on Contribution:</span>
                        <span className="font-medium">
                          {(() => {
                            const selectedPool = pools.find(p => p.id === selectedPoolId);
                            const memberCount = selectedPool?.memberCount ?? 1;
                            return (analytics.expectedReturn / (analytics.totalSaved / memberCount)).toFixed(1);
                          })()}x
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-lg text-green-900">Timeline Analysis</h3>
                    <ul className="mt-2 space-y-2 text-green-700">
                      <li className="flex items-start">
                        <div className="mr-2">•</div>
                        <div>Pool is {analytics.onTimeRate >= 85 ? 'on track' : 'at risk of delay'} to complete as scheduled</div>
                      </li>
                      
                      {analytics.payoutSchedule.find(p => p.status === 'upcoming')?.member === 'You' && (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>Your payout is scheduled for {formatDate(analytics.payoutSchedule.find(p => p.status === 'upcoming')?.date || '')}</div>
                        </li>
                      )}
                      
                      {analytics.onTimeRate >= 90 ? (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>If current trends continue, all members will receive their payouts on time</div>
                        </li>
                      ) : analytics.onTimeRate >= 75 ? (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>Minor delays possible if payment trends don't improve</div>
                        </li>
                      ) : (
                        <li className="flex items-start">
                          <div className="mr-2">•</div>
                          <div>Significant risk of delay if payment patterns continue</div>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-medium text-lg text-purple-900">Risk Assessment</h3>
                    <div className="mt-2">
                      <div className="flex items-center mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div 
                            className={`h-2.5 rounded-full ${
                              analytics.riskLevel <= 25 ? 'bg-green-500' :
                              analytics.riskLevel <= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} 
                            style={{ width: `${analytics.riskLevel}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-700 min-w-[80px]">
                          {analytics.riskLevel <= 25 ? 'Low' :
                           analytics.riskLevel <= 50 ? 'Medium' :
                           'High'}
                        </span>
                      </div>
                      <p className="text-sm text-purple-700">
                        {analytics.riskLevel <= 25 
                          ? 'Current risk level is low based on member payment history and pool progression.'
                          : analytics.riskLevel <= 50 
                          ? 'Moderate risk based on current payment patterns. Monitoring recommended.'
                          : 'High risk of delays. Immediate intervention recommended to improve payment patterns.'}
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
                      {analytics.payoutSchedule.map((payout) => (
                        <tr key={payout.round} className={payout.member === 'You' ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payout.round}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{payout.member}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(payout.date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(payout.amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                              payout.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
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
      </Tabs>

      <div className="flex justify-between mt-6">
        <Button variant="outline">Export as PDF</Button>
        <Button variant="outline">Share Report</Button>
      </div>
    </div>
  );
}

// Helper function to generate projected data points
function generateProjectedData(
  existingData: Array<{ period: string; amount: number }>,
  targetAmount: number
) {
  if (existingData.length === 0) return [];
  
  const lastPoint = existingData[existingData.length - 1];
  const lastAmount = lastPoint.amount;
  
  // Calculate how many more data points we need
  const remaining = targetAmount - lastAmount;
  const incrementPerPoint = remaining / 6; // Assume 6 more periods
  
  // Generate period labels (simple approach)
  const lastPeriod = lastPoint.period;
  const [month, weekPart] = lastPeriod.split(' Week ');
  let weekNum = parseInt(weekPart || '1');
  let currentMonth = month;
  
  // Month order for simple progression
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = months.indexOf(currentMonth);
  
  const projectedData = [];
  
  for (let i = 1; i <= 6; i++) {
    weekNum++;
    
    // If we exceed week 4, move to next month
    if (weekNum > 4) {
      weekNum = 1;
      const nextMonthIndex = (monthIndex + 1) % 12;
      currentMonth = months[nextMonthIndex];
    }
    
    const periodLabel = `${currentMonth} Week ${weekNum}`;
    const amount = lastAmount + (incrementPerPoint * i);
    
    projectedData.push({
      period: periodLabel,
      amount,
      projected: true
    });
  }
  
  return projectedData;
}