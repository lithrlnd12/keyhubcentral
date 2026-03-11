'use client';

import { CUSTOMER_STATUS_STEPS } from '@/types/tenant-portal';
import { Check } from 'lucide-react';

interface JobProgressTrackerProps {
  currentStep: number;
  totalSteps: number;
  primaryColor?: string;
}

export function JobProgressTracker({
  currentStep,
  totalSteps,
  primaryColor = '#D4A84B',
}: JobProgressTrackerProps) {
  // Show simplified steps for mobile
  const steps = CUSTOMER_STATUS_STEPS;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative flex items-center justify-between mb-2">
        {/* Background line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-700 -translate-y-1/2" />
        {/* Active line */}
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 transition-all duration-500"
          style={{
            width: `${(currentStep / (totalSteps - 1)) * 100}%`,
            backgroundColor: primaryColor,
          }}
        />
        {/* Step dots */}
        {steps.map((step, i) => {
          const isComplete = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  backgroundColor: isComplete || isCurrent ? primaryColor : '#374151',
                  color: isComplete || isCurrent ? '#fff' : '#9CA3AF',
                  border: isCurrent ? `2px solid ${primaryColor}` : 'none',
                  boxShadow: isCurrent ? `0 0 0 3px ${primaryColor}33` : 'none',
                }}
              >
                {isComplete ? <Check size={14} /> : i + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step labels - hidden on very small screens */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, i) => {
          const isComplete = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <span
              key={step}
              className="text-[10px] text-center max-w-[60px]"
              style={{
                color: isComplete || isCurrent ? primaryColor : '#6B7280',
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              {step}
            </span>
          );
        })}
      </div>
    </div>
  );
}
