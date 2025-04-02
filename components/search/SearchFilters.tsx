'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchFiltersProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
}

export function SearchFilters({ onFilterChange, initialFilters = {} }: SearchFiltersProps) {
  const [filters, setFilters] = useState({
    category: initialFilters.category || 'all',
    dateFrom: initialFilters.dateFrom || '',
    dateTo: initialFilters.dateTo || '',
    status: initialFilters.status || 'all',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      category: 'all',
      dateFrom: '',
      dateTo: '',
      status: 'all',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div>
          <h3 className="text-sm font-medium mb-3">Categories</h3>
          <RadioGroup
            value={filters.category}
            onValueChange={(value) => handleFilterChange('category', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="category-all" />
              <Label htmlFor="category-all">All</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pools" id="category-pools" />
              <Label htmlFor="category-pools">Pools</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="members" id="category-members" />
              <Label htmlFor="category-members">Members</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="transactions" id="category-transactions" />
              <Label htmlFor="category-transactions">Transactions</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="messages" id="category-messages" />
              <Label htmlFor="category-messages">Messages</Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Date Range */}
        <div>
          <h3 className="text-sm font-medium mb-3">Date Range</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="date-from" className="text-xs">From</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="date-from"
                  type="date"
                  className="pl-9"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  suppressHydrationWarning
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date-to" className="text-xs">To</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="date-to"
                  type="date"
                  className="pl-9"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  suppressHydrationWarning
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Filter */}
        <div>
          <h3 className="text-sm font-medium mb-3">Status</h3>
          <RadioGroup
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="status-all" />
              <Label htmlFor="status-all">All</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="active" id="status-active" />
              <Label htmlFor="status-active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="completed" id="status-completed" />
              <Label htmlFor="status-completed">Completed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pending" id="status-pending" />
              <Label htmlFor="status-pending">Pending</Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Reset Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleReset}
          suppressHydrationWarning
        >
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  );
}