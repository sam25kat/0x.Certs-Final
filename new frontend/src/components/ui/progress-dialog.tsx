import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProgressStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: string;
}

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: ProgressStep[];
  currentStep?: number;
  showSuccessAnimation?: boolean;
  onComplete?: () => void;
}

export function ProgressDialog({
  open,
  onOpenChange,
  title,
  steps,
  currentStep = 0,
  showSuccessAnimation = false,
  onComplete
}: ProgressDialogProps) {
  const [animationComplete, setAnimationComplete] = useState(false);

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const hasErrors = steps.some(step => step.status === 'error');
  const allCompleted = completedSteps === totalSteps && !hasErrors;

  useEffect(() => {
    if (showSuccessAnimation && allCompleted) {
      const timer = setTimeout(() => {
        setAnimationComplete(true);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation, allCompleted, onComplete]);

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {allCompleted && showSuccessAnimation ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500 animate-pulse" />
                <span className="text-green-600">Completed Successfully!</span>
              </div>
            ) : (
              title
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedSteps}/{totalSteps}</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground text-center">
              {Math.round(progressPercentage)}% Complete
            </div>
          </div>

          {/* Steps List */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'error' ? 'text-red-600' :
                    step.status === 'loading' ? 'text-primary' :
                    'text-muted-foreground'
                  }`}>
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </div>
                  )}
                  {step.error && (
                    <div className="text-xs text-red-500 mt-1">
                      {step.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Success Animation */}
          {allCompleted && showSuccessAnimation && (
            <div className="text-center py-6">
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
              <div className="text-xl font-semibold text-green-600 mb-2 animate-fade-in">
                All Done!
              </div>
              <div className="text-sm text-muted-foreground animate-fade-in-delay">
                Operation completed successfully
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {(allCompleted || hasErrors) && (
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                size="sm"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}