import { Check } from 'lucide-react';

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function WizardStepIndicator({ currentStep, totalSteps, stepLabels }: WizardStepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto">
        {stepLabels.map((label, index) => {
          const step = index + 1;
          const isCompleted = currentStep > step;
          const isActive = currentStep === step;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div className={`flex-1 h-0.5 ${currentStep > step - 1 ? 'bg-primary' : 'bg-muted'}`} />
                )}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-medium text-xs sm:text-sm shrink-0 transition-all ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : step}
                </div>
                {index < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 ${currentStep > step ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
              <span className={`text-[10px] sm:text-xs mt-2 text-center leading-tight ${
                isActive ? 'text-primary font-medium' : 'text-muted-foreground'
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
