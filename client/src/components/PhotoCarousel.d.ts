interface PhotoCarouselProps {
    photos: Array<{
        id: number;
        filename: string;
        description?: string | null;
    }>;
    initialIndex: number;
    onClose: () => void;
    onDelete?: (photoId: number) => void;
}
export default function PhotoCarousel({ photos, initialIndex, onClose, onDelete }: PhotoCarouselProps): import("react/jsx-runtime").JSX.Element;
export {};
