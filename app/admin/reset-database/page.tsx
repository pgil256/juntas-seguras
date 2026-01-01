'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Trash2, AlertTriangle, RefreshCw, CheckCircle, DatabaseIcon } from 'lucide-react';
import ClientOnly from '../../../components/ClientOnly';

export default function ResetDatabasePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    clearedCollections?: string[];
    error?: string;
  } | null>(null);

  const handleResetDatabase = async () => {
    if (!confirm('WARNING: This will delete ALL data in the database. This action cannot be undone. Continue?')) {
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
        throw new Error(data.error || 'Failed to reset database');
      }
      
      setResult({
        success: true,
        message: data.message,
        clearedCollections: data.clearedCollections,
      });
    } catch (error: unknown) {
      console.error('Error resetting database:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred while resetting the database',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ClientOnly>
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 text-amber-500" />
              Reset Database
            </CardTitle>
            <CardDescription>
              Clear all data and start fresh with an empty database.
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
            
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                <div>
                  <p className="font-medium text-amber-800">Development Tool</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This will delete all data in the database, removing all users, pools, payments, and other data. Use this to start fresh with the app.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-gray-600">You can:</p>
              <div className="flex space-x-2">
                <DatabaseIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Reset Database</p>
                  <p className="text-xs text-gray-500">Delete all data and start fresh</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Trash2 className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">After Reset</p>
                  <p className="text-xs text-gray-500">You can register new users and test the MFA flow</p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleResetDatabase}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting Database...' : 'Reset Database'}
            </Button>
            
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Return to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </ClientOnly>
  );
}