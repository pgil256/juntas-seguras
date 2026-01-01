'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import ClientComponentBoundary from '../../ClientComponentBoundary';

export default function ClearDatabasePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    clearedCollections?: string[];
    error?: string;
  } | null>(null);

  const handleClearDatabase = async () => {
    if (!confirm('WARNING: This will permanently delete ALL data from the database. This action cannot be undone. Continue?')) {
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/clear-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear database');
      }
      
      setResult({
        success: true,
        message: data.message,
        clearedCollections: data.clearedCollections,
      });
    } catch (error: unknown) {
      console.error('Error clearing database:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred while clearing the database',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ClientComponentBoundary>
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Trash2 className="h-5 w-5 mr-2 text-red-500" />
              Clear Database
            </CardTitle>
            <CardDescription>
              WARNING: This will delete all data from the database. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'} className={result.success ? 'bg-green-50 border-green-200' : ''}>
                {result.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Success</AlertTitle>
                    <AlertDescription className="text-green-700">
                      {result.message}
                      {result.clearedCollections && result.clearedCollections.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Cleared collections:</p>
                          <ul className="list-disc pl-5 mt-1">
                            {result.clearedCollections.map((collection) => (
                              <li key={collection}>{collection}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{result.error}</AlertDescription>
                  </>
                )}
              </Alert>
            )}
            
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div>
                  <p className="font-medium text-red-800">Development Use Only</p>
                  <p className="text-sm text-red-700 mt-1">
                    This tool is for development purposes only. It will clear all collections in the database,
                    removing all users, pools, payments, and other data. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleClearDatabase}
              disabled={isLoading}
            >
              {isLoading ? 'Clearing Database...' : 'Clear All Database Data'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientComponentBoundary>
  );
}