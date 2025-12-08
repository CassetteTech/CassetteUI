'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type ReportType = 'conversion_issue' | 'ui_bug' | 'general_feedback' | 'missing_track' | 'wrong_match';

interface ReportIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceContext: string;
  sourceLink?: string;
  conversionData?: {
    elementType?: string;
    title?: string;
    artist?: string;
    platforms?: Record<string, unknown>;
  };
}

const reportTypeOptions: { value: ReportType; label: string; description: string }[] = [
  { value: 'conversion_issue', label: 'Conversion Problem', description: 'Link conversion failed or returned wrong results' },
  { value: 'missing_track', label: 'Missing Track/Album', description: 'Could not find the music on one or more platforms' },
  { value: 'wrong_match', label: 'Wrong Match', description: 'The matched track/album is incorrect' },
  { value: 'ui_bug', label: 'UI/App Bug', description: 'Something looks broken or is not working right' },
  { value: 'general_feedback', label: 'General Feedback', description: 'Other suggestions or comments' },
];

export function ReportIssueModal({
  open,
  onOpenChange,
  sourceContext,
  sourceLink,
  conversionData,
}: ReportIssueModalProps) {
  const [reportType, setReportType] = useState<ReportType>('conversion_issue');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!description.trim()) {
      setErrorMessage('Please provide a description of the issue.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await apiService.reportIssue({
        reportType,
        sourceContext,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        sourceLink,
        description: description.trim(),
        context: {
          ...conversionData,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screenSize: typeof window !== 'undefined'
            ? `${window.innerWidth}x${window.innerHeight}`
            : undefined,
        },
      });

      if (response.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onOpenChange(false);
          // Reset state after modal closes
          setTimeout(() => {
            setSubmitStatus('idle');
            setDescription('');
            setReportType('conversion_issue');
          }, 300);
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(response.message || 'Failed to submit report');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('An error occurred. Please try again.');
      console.error('Report issue error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset on close
        setTimeout(() => {
          setSubmitStatus('idle');
          setDescription('');
          setErrorMessage('');
        }, 300);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Report a Problem
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Help us improve Cassette by reporting issues you encounter.
          </DialogDescription>
        </DialogHeader>

        {submitStatus === 'success' ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center text-foreground font-medium">
              Thank you for your report!
            </p>
            <p className="text-center text-muted-foreground text-sm">
              We&apos;ll review it and work on a fix.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Report Type Selection */}
              <div className="space-y-2">
                <Label>Issue Type</Label>
                <div className="grid gap-2">
                  {reportTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setReportType(option.value)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        reportType === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm text-foreground">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe what happened and what you expected to happen..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Source Link Display (if provided) */}
              {sourceLink && (
                <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                  <span className="font-medium">Link: </span>
                  <span className="break-all">{sourceLink}</span>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
