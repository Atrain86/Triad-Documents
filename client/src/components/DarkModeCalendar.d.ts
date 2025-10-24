import React from 'react';
interface DarkModeCalendarProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateEvent?: (project?: any) => void;
    project?: any;
}
declare const DarkModeCalendar: React.FC<DarkModeCalendarProps>;
export default DarkModeCalendar;
