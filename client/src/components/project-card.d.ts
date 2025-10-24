import type { Project } from "@shared/schema";
interface ProjectCardProps {
    project: Project;
    onClick?: () => void;
}
export default function ProjectCard({ project, onClick }: ProjectCardProps): import("react/jsx-runtime").JSX.Element;
export {};
