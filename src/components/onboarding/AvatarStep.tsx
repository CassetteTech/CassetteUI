'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Upload, User, Camera, X, ImagePlus } from 'lucide-react';
import { AvatarCropDialog } from '@/components/shared/avatar-crop-dialog';

interface FormData {
  username: string;
  displayName: string;
  avatarFile: File | null;
}

interface AvatarStepProps {
  formData: FormData;
  avatarPreview: string | null;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AvatarStep({
  formData,
  avatarPreview,
  updateFormData,
  onNext,
  onBack,
  isLastStep,
}: AvatarStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback((file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please use JPEG, PNG, or WebP images only.',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_SOURCE_FILE_SIZE) {
      toast.error('File too large', {
        description: 'Please choose an image smaller than 20MB.',
      });
      return;
    }

    setPendingAvatarFile(file);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    updateFormData({ avatarFile: null });
    setPendingAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Photo removed');
  };

  const handleCropCancel = () => {
    setPendingAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropApply = async (croppedFile: File) => {
    if (croppedFile.size > MAX_UPLOAD_FILE_SIZE) {
      toast.error('Photo is still too large', {
        description: 'Try zooming in a bit more or choose a smaller source image.',
      });
      return;
    }

    updateFormData({ avatarFile: croppedFile });
    setPendingAvatarFile(null);
    toast.success('Photo uploaded!');
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
              avatarPreview ? 'border-primary' : 'border-muted'
            }`}
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
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
          {avatarPreview && (
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
          {!avatarPreview ? (
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
            data-testid="onboarding-avatar-choose"
          >
            <Upload className="w-4 h-4" />
            {formData.avatarFile ? 'Change Photo' : 'Choose Photo'}
          </Button>

          <p className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP • Source up to 20MB, cropped avatar under 5MB
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          data-testid="onboarding-avatar-file-input"
          className="hidden"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handlePrimaryAction}
          data-testid="onboarding-avatar-next"
          className="px-8"
        >
          {isLastStep ? 'Finish' : 'Next'}
        </Button>
      </div>

      <AvatarCropDialog
        open={pendingAvatarFile !== null}
        file={pendingAvatarFile}
        onApply={handleCropApply}
        onCancel={handleCropCancel}
      />
    </motion.div>
  );
}
