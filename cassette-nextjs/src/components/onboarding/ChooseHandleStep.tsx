'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormData {
  username: string;
  displayName: string;
  avatarFile: File | null;
}

interface ChooseHandleStepProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function ChooseHandleStep({
  formData,
  updateFormData,
  onNext,
}: ChooseHandleStepProps) {
  const [errors, setErrors] = useState<{ username?: string; displayName?: string }>({});

  const validateForm = () => {
    const newErrors: { username?: string; displayName?: string } = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center text-muted-foreground mb-6">
        <p>Choose a unique username and display name for your profile.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="username" className="text-sm font-medium text-foreground">
            Username
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={formData.username}
            onChange={(e) => updateFormData({ username: e.target.value.toLowerCase() })}
            className={`mt-1 ${errors.username ? 'border-destructive' : ''}`}
          />
          {errors.username && (
            <p className="text-sm text-destructive mt-1">{errors.username}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            This will be part of your profile URL: cassette.app/@{formData.username || 'username'}
          </p>
        </div>

        <div>
          <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
            Display Name
          </Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Enter your display name"
            value={formData.displayName}
            onChange={(e) => updateFormData({ displayName: e.target.value })}
            className={`mt-1 ${errors.displayName ? 'border-destructive' : ''}`}
          />
          {errors.displayName && (
            <p className="text-sm text-destructive mt-1">{errors.displayName}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            This is how others will see your name on Cassette.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <div>
          {/* Placeholder for back button alignment */}
        </div>
        <Button
          onClick={handleNext}
          disabled={!formData.username.trim() || !formData.displayName.trim()}
          className="px-8"
        >
          Next
        </Button>
      </div>
    </div>
  );
}