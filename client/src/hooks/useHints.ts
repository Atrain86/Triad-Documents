import { useState, useEffect } from 'react';
import { HintConfig } from '@/components/ui/hint-tooltip';

// Comprehensive hints database for the painting project management app
export const HINT_DATABASE: HintConfig[] = [
  // Homepage hints
  {
    id: 'homepage-search',
    title: 'Quick Project Search',
    description: 'Use the search bar to quickly find projects by client name, address, or status. Great for busy days when you have lots of projects!',
    type: 'tip',
    priority: 'medium',
    context: 'homepage',
    showOnFirstVisit: true
  },
  {
    id: 'homepage-status-colors',
    title: 'Project Status Colors',
    description: 'Each project card shows a colored status badge. Green means in-progress, blue for scheduled, purple for estimates sent, and so on. This helps you see project stages at a glance.',
    type: 'info',
    priority: 'low',
    context: 'homepage'
  },
  {
    id: 'homepage-archive-toggle',
    title: 'Show Archived Projects',
    description: 'Toggle the archive view to see completed or cancelled projects. Keeps your main view clean while preserving project history.',
    type: 'feature',
    priority: 'low',
    context: 'homepage'
  },
  {
    id: 'homepage-new-client',
    title: 'Creating Your First Project',
    description: 'Click "New Client" to start a project. Enter basic info like name, address, and phone. You can always add more details later!',
    type: 'tip',
    priority: 'high',
    context: 'homepage',
    showOnFirstVisit: true
  },

  // Client page hints
  {
    id: 'client-photos-upload',
    title: 'Upload Project Photos',
    description: 'Add photos to document the job site, before/after shots, or any issues. Photos help with estimates and serve as records for insurance or client communications.',
    type: 'feature',
    priority: 'medium',
    context: 'client-page',
    showOnFirstVisit: true
  },
  {
    id: 'client-photo-compression',
    title: 'Photo Compression Settings',
    description: 'Adjust photo quality in Settings to balance file size and image clarity. Higher quality preserves detail but uses more storage.',
    type: 'info',
    priority: 'low',
    context: 'client-page'
  },
  {
    id: 'client-receipt-ocr',
    title: 'Smart Receipt Processing',
    description: 'Upload receipt photos and the AI will automatically extract vendor, amount, and item details. Review and edit the extracted data before saving.',
    type: 'feature',
    priority: 'high',
    context: 'client-page',
    showOnFirstVisit: true
  },
  {
    id: 'client-hours-tracking',
    title: 'Track Work Hours',
    description: 'Log daily hours with descriptions and worker rates. This data automatically flows into your invoices for accurate billing.',
    type: 'tip',
    priority: 'high',
    context: 'client-page'
  },
  {
    id: 'client-status-updates',
    title: 'Update Project Status',
    description: 'Keep project status current to track progress and prioritize work. Status changes help you stay organized and communicate with clients.',
    type: 'info',
    priority: 'medium',
    context: 'client-page'
  },
  {
    id: 'client-estimate-generator',
    title: 'Professional Estimates',
    description: 'Generate detailed estimates with room-by-room breakdowns, material costs, and professional PDF formatting. Perfect for client presentations.',
    type: 'feature',
    priority: 'high',
    context: 'client-page'
  },
  {
    id: 'client-invoice-generator',
    title: 'Create Invoices',
    description: 'Generate invoices that include tracked hours, materials, and receipts. Invoices can be emailed directly to clients with professional formatting.',
    type: 'feature',
    priority: 'high',
    context: 'client-page'
  },

  // Estimate hints
  {
    id: 'estimate-room-count',
    title: 'Room Count Pricing',
    description: 'Enter the number of rooms to paint. The system will calculate base pricing and allow you to adjust for complexity, ceiling height, or special requirements.',
    type: 'info',
    priority: 'medium',
    context: 'estimate'
  },
  {
    id: 'estimate-material-markup',
    title: 'Material Markup Control',
    description: 'Adjust the material markup percentage to control your profit margins on supplies. This applies to all material costs in the estimate.',
    type: 'tip',
    priority: 'medium',
    context: 'estimate'
  },
  {
    id: 'estimate-email-delivery',
    title: 'Email Professional Estimates',
    description: 'Send estimates directly to clients via email with professional PDF formatting and your business logo. Track when estimates are sent.',
    type: 'feature',
    priority: 'medium',
    context: 'estimate'
  },

  // Invoice hints
  {
    id: 'invoice-auto-numbering',
    title: 'Automatic Invoice Numbers',
    description: 'Invoices are automatically numbered sequentially. You can customize the starting number and prefix in Settings.',
    type: 'info',
    priority: 'low',
    context: 'invoice'
  },
  {
    id: 'invoice-hours-integration',
    title: 'Automatic Hours Integration',
    description: 'Your logged work hours automatically appear in invoices with calculated totals. Review and adjust before sending.',
    type: 'feature',
    priority: 'medium',
    context: 'invoice'
  },
  {
    id: 'invoice-receipt-inclusion',
    title: 'Include Receipt Costs',
    description: 'Material costs from uploaded receipts can be included in invoices with markup applied. Keep track of all project expenses.',
    type: 'tip',
    priority: 'medium',
    context: 'invoice'
  },

  // Settings hints
  {
    id: 'settings-tax-setup',
    title: 'Configure Tax Rates',
    description: 'Set up your local tax rates for accurate estimate and invoice calculations. This ensures legal compliance and correct totals.',
    type: 'warning',
    priority: 'high',
    context: 'settings',
    showOnFirstVisit: true
  },
  {
    id: 'settings-logo-library',
    title: 'Manage Business Logos',
    description: 'Upload and manage logos for different purposes - homepage, estimates, emails, and invoices. Professional branding improves client perception.',
    type: 'feature',
    priority: 'medium',
    context: 'settings'
  },
  {
    id: 'settings-gmail-integration',
    title: 'Email Integration',
    description: 'Connect your Gmail account to send estimates and invoices directly from the app. Keeps all communication organized and professional.',
    type: 'feature',
    priority: 'high',
    context: 'settings'
  },
  {
    id: 'settings-compression-quality',
    title: 'Photo Quality Settings',
    description: 'Adjust photo compression to balance storage space and image quality. Lower compression saves space, higher preserves detail.',
    type: 'info',
    priority: 'low',
    context: 'settings'
  },

  // Universal hints
  {
    id: 'universal-save-reminder',
    title: 'Remember to Save',
    description: 'Don\'t forget to save your changes! Most forms have a Save button at the bottom.',
    type: 'warning',
    priority: 'medium',
    context: 'universal'
  },
  {
    id: 'universal-mobile-friendly',
    title: 'Mobile Optimized',
    description: 'This app works great on your phone or tablet. Take photos on-site and manage projects from anywhere!',
    type: 'info',
    priority: 'low',
    context: 'universal'
  },
  {
    id: 'universal-keyboard-shortcuts',
    title: 'Quick Actions',
    description: 'Many buttons and links have hover tooltips showing what they do. Look for the help icons for additional guidance.',
    type: 'tip',
    priority: 'low',
    context: 'universal'
  }
];

interface UseHintsOptions {
  context?: HintConfig['context'];
  autoShow?: boolean;
  maxConcurrentHints?: number;
}

export function useHints(options: UseHintsOptions = {}) {
  const { context = 'universal', autoShow = true, maxConcurrentHints = 2 } = options;
  
  const [activeHints, setActiveHints] = useState<HintConfig[]>([]);
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Load dismissed hints from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedHints');
    if (stored) {
      setDismissedHints(new Set(JSON.parse(stored)));
    }

    const firstVisit = localStorage.getItem(`firstVisit_${context}`);
    if (!firstVisit) {
      setIsFirstVisit(true);
      localStorage.setItem(`firstVisit_${context}`, 'true');
    }
  }, [context]);

  // Filter and show relevant hints
  useEffect(() => {
    if (!autoShow) return;

    const relevantHints = HINT_DATABASE.filter(hint => {
      // Skip dismissed hints
      if (dismissedHints.has(hint.id)) return false;
      
      // Show context-specific hints or universal hints
      if (hint.context !== context && hint.context !== 'universal') return false;
      
      // Show first-visit hints only on first visit
      if (hint.showOnFirstVisit && !isFirstVisit) return false;
      
      return true;
    });

    // Sort by priority and show limited number
    const sortedHints = relevantHints
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, maxConcurrentHints);

    setActiveHints(sortedHints);
  }, [context, dismissedHints, autoShow, maxConcurrentHints, isFirstVisit]);

  const dismissHint = (hintId: string) => {
    const newDismissed = new Set(dismissedHints);
    newDismissed.add(hintId);
    setDismissedHints(newDismissed);
    localStorage.setItem('dismissedHints', JSON.stringify(Array.from(newDismissed)));
    
    // Remove from active hints
    setActiveHints(prev => prev.filter(hint => hint.id !== hintId));
  };

  const showHint = (hintId: string) => {
    const hint = HINT_DATABASE.find(h => h.id === hintId);
    if (hint && !activeHints.find(h => h.id === hintId)) {
      setActiveHints(prev => [...prev, hint]);
    }
  };

  const clearAllHints = () => {
    setActiveHints([]);
  };

  const resetDismissedHints = () => {
    setDismissedHints(new Set());
    localStorage.removeItem('dismissedHints');
  };

  const getHintById = (hintId: string) => {
    return HINT_DATABASE.find(hint => hint.id === hintId);
  };

  const getHintsByContext = (targetContext: HintConfig['context']) => {
    return HINT_DATABASE.filter(hint => 
      hint.context === targetContext || hint.context === 'universal'
    );
  };

  return {
    activeHints,
    dismissedHints,
    isFirstVisit,
    dismissHint,
    showHint,
    clearAllHints,
    resetDismissedHints,
    getHintById,
    getHintsByContext
  };
}