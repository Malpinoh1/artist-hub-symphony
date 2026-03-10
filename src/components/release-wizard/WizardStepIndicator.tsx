import { Check } from 'lucide-react';

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function WizardStepIndicator({ currentStep, totalSteps, stepLabels }: WizardStepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="relative mb-2">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Step indicators */}
      <div className="flex items-center justify-between w-full">
        {stepLabels.map((label, index) => {
          const step = index + 1;
          const isCompleted = currentStep > step;
          const isActive = currentStep === step;
          return (
            <div key={step} className="flex flex-col items-center relative" style={{ flex: 1 }}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-medium text-xs sm:text-sm shrink-0 transition-all duration-300 ${
                isCompleted
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : isActive
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isCompleted ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`text-[10px] sm:text-xs mt-2 text-center leading-tight transition-colors ${
                isActive ? 'text-primary font-semibold' : isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
