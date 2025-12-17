'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Upload, User } from 'lucide-react';

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
  onFinish: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function AvatarStep({
  formData,
  updateFormData,
  onNext,
  onBack,
  onFinish,
  isLastStep,
}: AvatarStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (match API requirements)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type! Use JPEG, PNG, or WebP');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large! Max 5MB');
        return;
      }

      updateFormData({ avatarFile: file });
      
      // Cleanup previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Create new preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSkip = () => {
    updateFormData({ avatarFile: null });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (isLastStep) {
      onFinish();
    } else {
      onNext();
    }
  };

  const handlePrimaryAction = () => {
    if (isLastStep) {
      onFinish();
    } else {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center text-muted-foreground mb-6">
        <p>Add a profile picture to help others recognize you.</p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* Avatar preview */}
        <div className="relative">
          <Avatar className="w-32 h-32 border-4 border-muted">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Profile preview"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <User className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </Avatar>
          
          {/* Upload button overlay */}
          <button
            onClick={handleUploadClick}
            className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          >
            <Upload className="w-8 h-8 text-white" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-center">
          <Button
            variant="outline"
            onClick={handleUploadClick}
            className="mb-2"
          >
            <Upload className="w-4 h-4 mr-2" />
            {formData.avatarFile ? 'Change Photo' : 'Upload Photo'}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG or WebP • Max 5MB
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
        <div className="space-x-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
          >
            Skip
          </Button>
          <Button
            onClick={handlePrimaryAction}
            className="px-8"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
