'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { useIdentityVerification } from '../../lib/hooks/useIdentityVerification';
import { Loader2, ShieldCheck, ShieldX, ShieldQuestion, AlertTriangle, BadgeCheck, CreditCard, FileText, FileImage } from 'lucide-react';
import { VerificationStatus, VerificationType, VerificationMethod } from '../../types/identity';

interface IdentityVerificationProps {
  userId: string;
  requiredForPools?: boolean;
}

export function IdentityVerification({ userId, requiredForPools = false }: IdentityVerificationProps) {
  const router = useRouter();
  const [verificationType, setVerificationType] = useState<VerificationType>(VerificationType.GOVERNMENT_ID);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(VerificationMethod.STRIPE_IDENTITY);
  
  const {
    isLoading,
    error,
    identityInfo,
    startVerification,
    checkVerificationStatus,
  } = useIdentityVerification({ userId });

  const startVerificationProcess = async () => {
    const result = await startVerification(verificationType, verificationMethod);
    
    if (result.success && result.verificationUrl) {
      // Redirect to the verification URL
      window.location.href = result.verificationUrl;
    }
  };

  // Render verification status badge
  const renderStatusBadge = () => {
    if (!identityInfo) return null;
    
    switch (identityInfo.verificationStatus) {
      case VerificationStatus.VERIFIED:
        return (
          <div className="flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
            <BadgeCheck className="h-4 w-4 mr-1" />
            Verified
          </div>
        );
      case VerificationStatus.PENDING:
        return (
          <div className="flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm">
            <ShieldQuestion className="h-4 w-4 mr-1" />
            Pending
          </div>
        );
      case VerificationStatus.SUBMITTED:
        return (
          <div className="flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            In Review
          </div>
        );
      case VerificationStatus.REJECTED:
        return (
          <div className="flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
            <ShieldX className="h-4 w-4 mr-1" />
            Rejected
          </div>
        );
      default:
        return (
          <div className="flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
            <ShieldQuestion className="h-4 w-4 mr-1" />
            Not Verified
          </div>
        );
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Identity Verification</CardTitle>
            <CardDescription>
              Verify your identity to access all features and protect your account
            </CardDescription>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {requiredForPools && !identityInfo?.isVerified && (
          <Alert variant="warning" className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verification Required</AlertTitle>
            <AlertDescription>
              Identity verification is required to create or join money pools. This helps ensure
              security and trust among all members.
            </AlertDescription>
          </Alert>
        )}
        
        {identityInfo?.isVerified ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center text-green-800 mb-2">
              <ShieldCheck className="h-5 w-5 mr-2" />
              <h3 className="font-medium">Identity Verified</h3>
            </div>
            <p className="text-green-700 text-sm">
              Your identity has been successfully verified. You can now access all features of the platform.
            </p>
            <div className="mt-3 text-xs text-green-600">
              Verified on: {identityInfo.lastUpdated ? new Date(identityInfo.lastUpdated).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        ) : identityInfo?.verificationStatus === VerificationStatus.SUBMITTED ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center text-blue-800 mb-2">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <h3 className="font-medium">Verification In Progress</h3>
            </div>
            <p className="text-blue-700 text-sm">
              Your verification is being processed. This usually takes 1-2 business days.
              We'll notify you once your verification is complete.
            </p>
            <Button 
              variant="outline" 
              className="mt-3" 
              size="sm" 
              onClick={checkVerificationStatus}
            >
              Check Status
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center text-blue-800 mb-2">
                <ShieldCheck className="h-5 w-5 mr-2" />
                <h3 className="font-medium">Why We Verify Your Identity</h3>
              </div>
              <p className="text-blue-700 text-sm">
                Identity verification protects all members of our financial pools.
                This process helps prevent fraud and ensures trust and security in all transactions.
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-medium mb-2">Select ID Type</h3>
              <RadioGroup 
                value={verificationType} 
                onValueChange={(v) => setVerificationType(v as VerificationType)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                  <RadioGroupItem value={VerificationType.GOVERNMENT_ID} id="id-type-1" />
                  <Label htmlFor="id-type-1" className="flex items-center cursor-pointer">
                    <CreditCard className="h-5 w-5 mr-2 text-gray-600" />
                    <div>
                      <span className="block font-medium">Government ID</span>
                      <span className="block text-gray-500 text-sm">National ID, residence permit, etc.</span>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                  <RadioGroupItem value={VerificationType.PASSPORT} id="id-type-2" />
                  <Label htmlFor="id-type-2" className="flex items-center cursor-pointer">
                    <FileText className="h-5 w-5 mr-2 text-gray-600" />
                    <div>
                      <span className="block font-medium">Passport</span>
                      <span className="block text-gray-500 text-sm">International passport document</span>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                  <RadioGroupItem value={VerificationType.DRIVERS_LICENSE} id="id-type-3" />
                  <Label htmlFor="id-type-3" className="flex items-center cursor-pointer">
                    <FileImage className="h-5 w-5 mr-2 text-gray-600" />
                    <div>
                      <span className="block font-medium">Driver's License</span>
                      <span className="block text-gray-500 text-sm">Valid driver's license with photo</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-sm text-gray-500 mb-2">What to expect:</h3>
              <ul className="text-sm space-y-1 text-gray-700 pl-5 list-disc">
                <li>You'll be redirected to our secure verification partner</li>
                <li>You'll need to upload photos of your ID document</li>
                <li>You'll take a quick selfie for face matching</li>
                <li>Verification usually takes 1-2 business days</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        {!identityInfo?.isVerified && identityInfo?.verificationStatus !== VerificationStatus.SUBMITTED && (
          <Button 
            onClick={startVerificationProcess} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Verify Identity'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}