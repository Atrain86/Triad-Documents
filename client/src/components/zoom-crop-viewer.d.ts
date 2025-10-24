import type { Photo } from '@shared/schema';
interface SimpleZoomCropProps {
    photos: Photo[];
    onAddCroppedPhoto: (file: File) => void;
    onClose: () => void;
    initialIndex?: number;
}
declare const SimpleZoomCrop: ({ photos, onAddCroppedPhoto, onClose, initialIndex }: SimpleZoomCropProps) => import("react/jsx-runtime").JSX.Element;
export default SimpleZoomCrop;
