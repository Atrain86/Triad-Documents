import type { Project } from '@shared/schema';
interface EstimateGeneratorProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
}
export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps): import("react/jsx-runtime").JSX.Element;
export {};
