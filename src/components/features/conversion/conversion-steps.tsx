import React from 'react';
import { ContentType } from '@/hooks/use-simulated-progress';

interface Step {
  name: string;
  duration: number;
}

interface ConversionStepsProps {
  steps: Step[];
  currentStep: number;
  contentType: ContentType;
  className?: string;
}

export const ConversionSteps: React.FC<ConversionStepsProps> = ({
  steps,
  currentStep,
  contentType,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          Converting {contentType}
        </h3>
      </div>
      
      <div className="flex flex-wrap justify-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div
              key={step.name}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border-2 transition-all duration-300
                ${isCompleted 
                  ? 'bg-success/10 text-success border-success/20' 
                  : isCurrent 
                    ? 'bg-primary/10 text-primary border-primary/30 animate-pulse' 
                    : 'bg-muted/10 text-muted-foreground border-border'
                }
              `}
            >
              {/* Step indicator */}
              <div className={`
                flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
                ${isCompleted 
                  ? 'bg-success text-white' 
                  : isCurrent 
                    ? 'bg-primary text-white' 
                    : 'bg-muted-foreground/20 text-muted-foreground'
                }
              `}>
                {isCompleted ? (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              {/* Step name */}
              <span className="whitespace-nowrap">
                {step.name}
              </span>
              
              {/* Loading dots for current step */}
              {isCurrent && (
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
    </div>
  );
};