'use client';

import { useState, useEffect } from 'react';
import { Calendar, ArrowDownUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    sortField: initialFilters.sortField || '',
    sortDirection: initialFilters.sortDirection || 'desc',
  });
  
  // Available sort fields based on category
  const getSortFieldOptions = (category: string) => {
    const commonOptions = [
      { value: 'relevance', label: 'Relevance' },
    ];
    
    switch (category) {
      case 'pools':
        return [
          ...commonOptions,
          { value: 'name', label: 'Name' },
          { value: 'members', label: 'Members' },
        ];
      case 'members':
        return [
          ...commonOptions,
          { value: 'name', label: 'Name' },
          { value: 'position', label: 'Position' },
        ];
      case 'transactions':
        return [
          ...commonOptions,
          { value: 'date', label: 'Date' },
          { value: 'amount', label: 'Amount' },
        ];
      case 'messages':
        return [
          ...commonOptions,
          { value: 'date', label: 'Date' },
          { value: 'author', label: 'Author' },
        ];
      default:
        return commonOptions;
    }
  };

  // Set default sort field when category changes
  useEffect(() => {
    const category = filters.category;
    if (category !== 'all' && !filters.sortField) {
      // Set default sort field based on category
      let defaultSortField = 'relevance';
      if (category === 'transactions' || category === 'messages') {
        defaultSortField = 'date';
      }
      
      handleFilterChange('sortField', defaultSortField);
    }
  }, [filters.category]);

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
      sortField: '',
      sortDirection: 'desc',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    const newDirection = filters.sortDirection === 'asc' ? 'desc' : 'asc';
    handleFilterChange('sortDirection', newDirection);
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
        
        {/* Sorting Options */}
        <div>
          <h3 className="text-sm font-medium mb-3">Sort By</h3>
          <div className="flex items-center space-x-2">
            <Select
              value={filters.sortField}
              onValueChange={(value) => handleFilterChange('sortField', value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {getSortFieldOptions(filters.category).map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSortDirection}
              title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              disabled={!filters.sortField}
              className="shrink-0"
            >
              {filters.sortDirection === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
          </div>
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
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="upcoming" id="status-upcoming" />
              <Label htmlFor="status-upcoming">Upcoming</Label>
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