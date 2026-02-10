'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Upload, User, Camera, X, ImagePlus } from 'lucide-react';
import { normalizeAvatarForUpload } from '@/lib/utils/avatar-upload';

interface FormData {
  username: string;
  displayName: string;
  avatarFile: File | null;
}

interface AvatarStepProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AvatarStep({
  formData,
  updateFormData,
  onNext,
  onBack,
  isLastStep,
}: AvatarStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please use JPEG, PNG, or WebP images only.',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', {
        description: 'Maximum file size is 5MB.',
      });
      return;
    }

    const normalizedFile = await normalizeAvatarForUpload(file);
    updateFormData({ avatarFile: normalizedFile });

    // Cleanup previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create new preview URL
    const url = URL.createObjectURL(normalizedFile);
    setPreviewUrl(url);
    toast.success('Photo uploaded!');
  }, [previewUrl, updateFormData]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    updateFormData({ avatarFile: null });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Photo removed');
  };

  const handlePrimaryAction = () => {
    if (isLastStep) {
      onNext(); // This will trigger the parent's finish handler
    } else {
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center text-muted-foreground mb-6">
        <p>Add a profile picture to help others recognize you.</p>
        <p className="text-xs mt-1 text-muted-foreground/70">This step is optional</p>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center py-8 rounded-xl border-2 border-dashed transition-all duration-200 ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-muted-foreground/30 hover:border-primary/50'
        }`}
      >
        {/* Avatar Preview */}
        <div className="relative group mb-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-32 h-32 rounded-full border-4 overflow-hidden ${
              previewUrl ? 'border-primary' : 'border-muted'
            }`}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <User className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </motion.div>

          {/* Hover Overlay */}
          <button
            onClick={handleUploadClick}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>

          {/* Remove Button */}
          {previewUrl && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleRemovePhoto}
              className="absolute -top-1 -right-1 w-7 h-7 bg-destructive rounded-full flex items-center justify-center text-white shadow-md hover:bg-destructive/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Upload Instructions */}
        <div className="text-center space-y-3">
          {!previewUrl ? (
            <>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <ImagePlus className="w-5 h-5" />
                <span className="text-sm">Drag and drop your photo here</span>
              </div>
              <div className="text-xs text-muted-foreground">or</div>
            </>
          ) : null}

          <Button
            variant="outline"
            onClick={handleUploadClick}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {formData.avatarFile ? 'Change Photo' : 'Choose Photo'}
          </Button>

          <p className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP • Max 5MB
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          {!formData.avatarFile && (
            <Button
              variant="ghost"
              onClick={handlePrimaryAction}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
          <Button
            onClick={handlePrimaryAction}
            className="px-8"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
