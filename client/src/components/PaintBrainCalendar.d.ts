import './calendar.css';
interface PaintBrainCalendarProps {
    selectedDate?: string;
    onDateSelect: (date: string) => void;
    maxDate?: string;
    className?: string;
}
declare const CalendarComponent: ({ selectedDate: propSelectedDate, onDateSelect, maxDate, className }: PaintBrainCalendarProps) => import("react/jsx-runtime").JSX.Element;
export default CalendarComponent;
