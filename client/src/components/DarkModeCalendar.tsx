import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';

// Paint Brain Color Palette
const paintBrainColors = {
  purple: '#8B5FBF',
  orange: '#D4A574',  
  green: '#6A9955',
  red: '#E53E3E',      
  blue: '#3182CE',     
  yellow: '#ECC94B',   
  gray: '#6B7280'
};

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: string;
  time?: string;
}

interface DarkModeCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent?: (project?: any) => void;
  project?: any;
}

const DarkModeCalendar: React.FC<DarkModeCalendarProps> = ({ 
  isOpen, 
  onClose, 
  onCreateEvent,
  project 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Mock events that represent your actual calendar data
  useEffect(() => {
    // These would be fetched from your Google Calendar API in a real implementation
    const mockEvents: CalendarEvent[] = [
      { id: '1', title: 'Mike Manson', date: '2025-07-16', color: paintBrainColors.green },
      { id: '2', title: 'Client Project', date: '2025-07-20', color: paintBrainColors.purple },
      { id: '3', title: 'Client Project', date: '2025-07-21', color: paintBrainColors.purple },
      { id: '4', title: 'Client Project', date: '2025-07-22', color: paintBrainColors.purple },
      { id: '5', title: 'Client Project', date: '2025-07-23', color: paintBrainColors.purple },
      { id: '6', title: 'Client Project', date: '2025-07-24', color: paintBrainColors.purple },
    ];
    setEvents(mockEvents);
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getDateString = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const getEventsForDate = (day: number) => {
    const dateString = getDateString(day);
    return events.filter(event => event.date === dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                         currentDate.getFullYear() === today.getFullYear();

  const renderCalendarDays = () => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Day headers
    dayNames.forEach(day => {
      days.push(
        <div key={`header-${day}`} className="p-2 text-center text-sm font-medium text-gray-400">
          {day}
        </div>
      );
    });

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateEvents = getEventsForDate(day);
      const isToday = isCurrentMonth && day === today.getDate();

      days.push(
        <div key={day} className="p-1 h-20 border border-gray-700 relative">
          <div className={`text-sm font-medium ${isToday ? 'text-red-400' : 'text-white'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-0.5">
            {dateEvents.map((event, index) => (
              <div
                key={event.id}
                className="text-xs px-1 py-0.5 rounded text-white truncate"
                style={{ backgroundColor: event.color }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const handleCreateEvent = () => {
    if (onCreateEvent) {
      onCreateEvent(project);
    }
    onClose();
  };

  const handleOpenGoogleCalendar = () => {
    // Open the main Google Calendar interface
    const workCalendarDirectUrl = 'https://calendar.google.com/calendar/u/0?cid=NmI5OTBhZjU2NTg0MDg0MjJjNDI2Nzc1NzJmMmVmMTk3NDAwOTZhMTYwODE2NWYxNWY1OTEzNWRiNGYyYTk4MUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t';
    window.open(workCalendarDirectUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-black text-white border border-gray-700">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold text-white">
            A-Frame Work Calendar
          </DialogTitle>
          <div className="flex items-center gap-2">
            {project && (
              <Button
                onClick={handleCreateEvent}
                size="sm"
                className="text-white"
                style={{ backgroundColor: paintBrainColors.purple }}
              >
                <Plus size={16} className="mr-1" />
                Add Event
              </Button>
            )}
            <Button
              onClick={handleOpenGoogleCalendar}
              size="sm"
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Open in Google
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              onClick={() => navigateMonth('prev')}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-800"
            >
              <ChevronLeft size={16} />
            </Button>
            <h2 className="text-lg font-semibold text-white">
              {formatDate(currentDate)}
            </h2>
            <Button
              onClick={() => navigateMonth('next')}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-800"
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0 bg-gray-900 rounded-lg overflow-hidden">
            {renderCalendarDays()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: paintBrainColors.purple }}
              ></div>
              <span className="text-gray-300">Client Projects</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: paintBrainColors.green }}
              ></div>
              <span className="text-gray-300">Special Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-400"></div>
              <span className="text-gray-300">Today</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DarkModeCalendar;