"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface ZelleQRData {
  token: string;
  rawContent: string;
  imageDataUrl: string;
  uploadedAt: string;
}

interface ZelleQrUploadProps {
  /** API endpoint to upload to (e.g., "/api/user/zelle-qr" or "/api/pools/[id]/zelle-qr") */
  uploadEndpoint: string;
  /** Currently stored Zelle QR data (if any) */
  currentQR?: ZelleQRData | null;
  /** Callback when upload succeeds */
  onUploadSuccess?: (data: ZelleQRData) => void;
  /** Callback when QR is deleted */
  onDelete?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Whether to show delete button */
  showDelete?: boolean;
  /** Additional class names */
  className?: string;
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
}

type UploadState = "idle" | "uploading" | "success" | "error";

/**
 * ZelleQrUpload Component
 *
 * Allows users to upload Zelle QR codes via drag-drop, file selection, or camera capture.
 * The QR code is decoded on the server and stored for later display.
 */
export function ZelleQrUpload({
  uploadEndpoint,
  currentQR,
  onUploadSuccess,
  onDelete,
  onError,
  showDelete = true,
  className,
  label = "Zelle QR Code",
  helpText = "Upload your Zelle QR code to let others scan and pay you",
}: ZelleQrUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Convert file to base64 data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload the image to the server
  const uploadImage = async (imageDataUrl: string) => {
    setUploadState("uploading");
    setErrorMessage(null);

    try {
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageDataUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload QR code");
      }

      setUploadState("success");
      setPreviewUrl(data.zelleQR?.imageDataUrl || imageDataUrl);
      onUploadSuccess?.(data.zelleQR);

      // Reset success state after 2 seconds
      setTimeout(() => {
        setUploadState("idle");
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload QR code";
      setUploadState("error");
      setErrorMessage(message);
      onError?.(message);
    }
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select an image file");
      setUploadState("error");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image is too large. Please upload an image smaller than 5MB.");
      setUploadState("error");
      return;
    }

    try {
      setPreviewUrl(URL.createObjectURL(file));
      const dataUrl = await fileToDataUrl(file);
      await uploadImage(dataUrl);
    } catch (error) {
      setErrorMessage("Failed to read file");
      setUploadState("error");
    }
  };

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input to allow selecting the same file again
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  // Camera capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      setErrorMessage("Could not access camera. Please check permissions.");
      setUploadState("error");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");

    stopCamera();
    setPreviewUrl(dataUrl);
    uploadImage(dataUrl);
  };

  // Delete QR code
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(uploadEndpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete QR code");
      }

      setPreviewUrl(null);
      onDelete?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete QR code";
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Displayed image (either preview or current stored QR)
  const displayImage = previewUrl || currentQR?.imageDataUrl;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {displayImage && showDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Camera View */}
      {showCamera && (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-64 object-cover"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={stopCamera}
              className="bg-white/90"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={capturePhoto} className="bg-[#6D1ED4] hover:bg-[#5a17b0]">
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      )}

      {/* Upload Area or Preview */}
      {!showCamera && (
        <>
          {displayImage ? (
            // Preview/Current QR Display
            <div className="relative rounded-lg border-2 border-[#6D1ED4]/30 bg-[#6D1ED4]/5 p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={displayImage}
                    alt="Zelle QR Code"
                    className="w-32 h-32 object-contain rounded-lg bg-white border"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {uploadState === "uploading" && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#6D1ED4]" />
                        <span className="text-sm text-gray-600">
                          Processing QR code...
                        </span>
                      </>
                    )}
                    {uploadState === "success" && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">
                          QR code saved successfully!
                        </span>
                      </>
                    )}
                    {uploadState === "error" && (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">
                          {errorMessage}
                        </span>
                      </>
                    )}
                    {uploadState === "idle" && currentQR && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600">
                          Zelle QR code saved
                        </span>
                      </>
                    )}
                  </div>
                  {currentQR?.uploadedAt && uploadState === "idle" && (
                    <p className="text-xs text-gray-500">
                      Uploaded{" "}
                      {new Date(currentQR.uploadedAt).toLocaleDateString()}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3"
                    disabled={uploadState === "uploading"}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Replace QR Code
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Upload Drop Zone
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative rounded-lg border-2 border-dashed transition-colors",
                isDragging
                  ? "border-[#6D1ED4] bg-[#6D1ED4]/10"
                  : "border-gray-300 hover:border-[#6D1ED4]/50",
                uploadState === "error" && "border-red-300 bg-red-50"
              )}
            >
              <div className="flex flex-col items-center justify-center py-8 px-4">
                {uploadState === "uploading" ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-[#6D1ED4] mb-3" />
                    <p className="text-sm text-gray-600">
                      Processing QR code...
                    </p>
                  </>
                ) : uploadState === "error" ? (
                  <>
                    <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                    <p className="text-sm text-red-600 text-center mb-2">
                      {errorMessage}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadState("idle");
                        setErrorMessage(null);
                      }}
                    >
                      Try Again
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#6D1ED4]/10 mb-3">
                      <ImageIcon className="h-7 w-7 text-[#6D1ED4]" />
                    </div>
                    <p className="text-sm text-gray-600 text-center mb-1">
                      <span className="font-medium text-[#6D1ED4]">
                        Drag and drop
                      </span>{" "}
                      your Zelle QR code image here
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      or use the buttons below
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Browse Files
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startCamera}
                        className="gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Help Text */}
      {helpText && uploadState !== "error" && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}

export default ZelleQrUpload;
