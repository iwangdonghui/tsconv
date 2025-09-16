import { useState, useEffect, ReactNode } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 500 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    const newTimer = setTimeout(() => setIsVisible(true), delay);
    setTimer(newTimer);
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className='relative inline-block'>
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </div>
      {isVisible && (
        <div
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap ${positionClasses[position]} animate-fadeIn`}
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45 ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 -mt-1'
                : position === 'bottom'
                  ? 'bottom-full left-1/2 -translate-x-1/2 mb-1'
                  : position === 'left'
                    ? 'left-full top-1/2 -translate-y-1/2 -ml-1'
                    : 'right-full top-1/2 -translate-y-1/2 mr-1'
            }`}
          />
        </div>
      )}
    </div>
  );
}

interface GuidedTourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: GuidedTourStep[] = [
  {
    target: '[data-tour="mode-tabs"]',
    title: 'Calculator Modes',
    content: 'Switch between Date Difference, Age Calculator, and Live Countdown modes',
    position: 'bottom',
  },
  {
    target: '[data-tour="natural-language"]',
    title: 'Natural Language Input',
    content: 'Type dates in plain English like "yesterday" or "next week"',
    position: 'bottom',
  },
  {
    target: '[data-tour="quick-presets"]',
    title: 'Quick Date Ranges',
    content: 'Select common date ranges with one click',
    position: 'top',
  },
  {
    target: '[data-tour="history"]',
    title: 'Calculation History',
    content: 'Access your recent calculations for quick reuse',
    position: 'left',
  },
  {
    target: '[data-tour="export"]',
    title: 'Export Options',
    content: 'Copy, share, or export your results in multiple formats',
    position: 'left',
  },
];

export function GuidedTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const step = tourSteps[currentStep];
    if (!step) return;

    const element = document.querySelector(step.target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('tour-highlight');
    }

    return () => {
      if (element) {
        element.classList.remove('tour-highlight');
      }
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('tourCompleted', 'true');
    onComplete();
  };

  const step = tourSteps[currentStep];

  if (!isVisible || !step) return null;

  return (
    <>
      {/* Overlay */}
      <div className='fixed inset-0 bg-black/50 z-40' onClick={handleComplete} />

      {/* Tour Popup */}
      <div
        className='fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-sm'
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-bold text-gray-900 dark:text-white'>{step?.title || ''}</h3>
          <button
            onClick={handleComplete}
            className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        <p className='text-gray-600 dark:text-gray-300 mb-6'>{step?.content || ''}</p>

        <div className='flex items-center justify-between'>
          <span className='text-sm text-gray-500'>
            Step {currentStep + 1} of {tourSteps.length}
          </span>
          <div className='flex gap-2'>
            <button
              onClick={handleComplete}
              className='px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className='px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600'
            >
              {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function HelpButton() {
  const [showTour, setShowTour] = useState(false);

  const startTour = () => {
    setShowTour(true);
  };

  return (
    <>
      <Tooltip content='Start guided tour'>
        <button
          onClick={startTour}
          className='fixed bottom-4 left-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors z-30'
        >
          <HelpCircle className='h-5 w-5' />
        </button>
      </Tooltip>

      {showTour && <GuidedTour onComplete={() => setShowTour(false)} />}
    </>
  );
}
