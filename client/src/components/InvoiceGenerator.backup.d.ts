import type { Project, Receipt, DailyHours } from '@shared/schema';
interface InvoiceGeneratorProps {
    project: Project;
    dailyHours: DailyHours[];
    receipts: Receipt[];
    isOpen: boolean;
    onClose: () => void;
}
export default function InvoiceGenerator({ project, dailyHours, receipts, isOpen, onClose }: InvoiceGeneratorProps): import("react/jsx-runtime").JSX.Element;
export {};
