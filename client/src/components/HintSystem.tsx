import React from 'react';
import { useHints } from '@/hooks/useHints';
import { HintCard, InlineHint, HintConfig } from '@/components/ui/hint-tooltip';

interface HintSystemProps {
  context?: HintConfig['context'];
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  maxHints?: number;
  autoShow?: boolean;
}

export function HintSystem({ 
  context = 'universal', 
  position = 'top-right',
  maxHints = 2,
  autoShow = true 
}: HintSystemProps) {
  const { activeHints, dismissHint } = useHints({ 
    context, 
    autoShow, 
    maxConcurrentHints: maxHints 
  });

  if (activeHints.length === 0) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50';
      case 'top-left':
        return 'fixed top-4 left-4 z-50';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50';
      default:
        return 'fixed top-4 right-4 z-50';
    }
  };

  return (
    <div className={getPositionClasses()}>
      <div className="space-y-3 max-w-sm">
        {activeHints.map((hint, index) => (
          <div 
            key={hint.id}
            style={{ 
              animationDelay: `${index * 200}ms`,
              zIndex: 50 + activeHints.length - index 
            }}
            className="animate-in slide-in-from-right-2 duration-500"
          >
            <HintCard
              hint={hint}
              isVisible={true}
              autoHide={hint.priority === 'low'}
              onDismiss={dismissHint}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Component for inline help icons and tooltips
export function HelpIcon({ 
  hintId, 
  position = 'top', 
  showText = false 
}: { 
  hintId: string; 
  position?: 'top' | 'bottom' | 'left' | 'right';
  showText?: boolean;
}) {
  const { getHintById } = useHints();
  const hint = getHintById(hintId);

  if (!hint) return null;

  return (
    <InlineHint 
      hint={hint} 
      position={position} 
      showIcon={!showText}
    >
      {showText && (
        <span className="text-xs text-gray-400 hover:text-gray-300 cursor-help">
          Help
        </span>
      )}
    </InlineHint>
  );
}

// Context-specific hint containers
export function HomepageHints() {
  return <HintSystem context="homepage" position="top-right" maxHints={2} />;
}

export function ClientPageHints() {
  return <HintSystem context="client-page" position="bottom-right" maxHints={3} />;
}

export function SettingsHints() {
  return <HintSystem context="settings" position="top-right" maxHints={2} />;
}

export function EstimateHints() {
  return <HintSystem context="estimate" position="bottom-left" maxHints={2} />;
}

export function InvoiceHints() {
  return <HintSystem context="invoice" position="bottom-left" maxHints={2} />;
}

export default HintSystem;