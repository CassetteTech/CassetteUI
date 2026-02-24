'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, AtSign, User } from 'lucide-react';
import { clientConfig } from '@/lib/config-client';

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
  isFirstStep: boolean;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function ChooseHandleStep({
  formData,
  updateFormData,
  onNext,
  onBack,
  isFirstStep,
}: ChooseHandleStepProps) {
  const apiUrl = clientConfig.api.url;
  const [errors, setErrors] = useState<{ username?: string; displayName?: string }>({});
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [debouncedUsername, setDebouncedUsername] = useState(formData.username);

  // Debounce username input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(formData.username);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  // Check username availability
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');

    try {
      const response = await fetch(`${apiUrl}/api/v1/profile/check-username/${encodeURIComponent(username)}`);

      if (response.ok) {
        const data = await response.json();
        setUsernameStatus(data.available ? 'available' : 'taken');
      } else {
        // If endpoint doesn't exist or errors, assume available and let backend validate on submit
        setUsernameStatus('available');
      }
    } catch {
      // Network error - assume available and let backend validate on submit
      setUsernameStatus('available');
    }
  }, [apiUrl]);

  useEffect(() => {
    checkUsernameAvailability(debouncedUsername);
  }, [debouncedUsername, checkUsernameAvailability]);

  const validateForm = () => {
    const newErrors: { username?: string; displayName?: string } = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    } else if (usernameStatus === 'taken') {
      newErrors.username = 'This username is already taken';
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
    } else {
      toast.error('Please fix the errors before continuing');
    }
  };

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
      case 'available':
        return <CheckCircle2 className="w-4 h-4 text-success-text" />;
      case 'taken':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'invalid':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getUsernameStatusText = () => {
    switch (usernameStatus) {
      case 'checking':
        return 'Checking availability...';
      case 'available':
        return 'Username is available!';
      case 'taken':
        return 'Username is already taken';
      case 'invalid':
        return 'Only letters, numbers, and underscores allowed';
      default:
        return null;
    }
  };

  const isFormValid =
    formData.username.trim().length >= 3 &&
    formData.displayName.trim() &&
    usernameStatus !== 'taken' &&
    usernameStatus !== 'checking';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center text-muted-foreground mb-6">
        <p>Choose a unique username and display name for your profile.</p>
      </div>

      <div className="space-y-5">
        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-foreground flex items-center gap-2">
            <AtSign className="w-4 h-4" />
            Username
          </Label>
          <div className="relative">
            <Input
              id="username"
              type="text"
              placeholder="your_username"
              value={formData.username}
              onChange={(e) => updateFormData({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              className={`pr-10 ${errors.username || usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-destructive focus-visible:ring-destructive' : usernameStatus === 'available' ? 'border-success focus-visible:ring-success' : ''}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getUsernameStatusIcon()}
            </div>
          </div>

          {/* Status Message */}
          {usernameStatus !== 'idle' && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-xs flex items-center gap-1 ${
                usernameStatus === 'available' ? 'text-success-text' :
                usernameStatus === 'checking' ? 'text-muted-foreground' :
                'text-destructive'
              }`}
            >
              {getUsernameStatusText()}
            </motion.p>
          )}

          {errors.username && usernameStatus === 'idle' && (
            <p className="text-sm text-destructive">{errors.username}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Your profile URL: <span className="text-primary font-medium">cassette.tech/@{formData.username || 'username'}</span>
          </p>
        </div>

        {/* Display Name Field */}
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium text-foreground flex items-center gap-2">
            <User className="w-4 h-4" />
            Display Name
          </Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Your Name"
            value={formData.displayName}
            onChange={(e) => updateFormData({ displayName: e.target.value })}
            className={errors.displayName ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.displayName && (
            <p className="text-sm text-destructive">{errors.displayName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            This is how others will see your name on Cassette.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        {!isFirstStep ? (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={handleNext}
          disabled={!isFormValid}
          className="px-8"
        >
          Next
        </Button>
      </div>
    </motion.div>
  );
}
