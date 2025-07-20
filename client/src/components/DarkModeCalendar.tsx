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
  startDate: string;
  endDate: string;
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

  // Mock events that represent your actual calendar data with multi-day spans
  useEffect(() => {
    // These would be fetched from your Google Calendar API in a real implementation
    const mockEvents: CalendarEvent[] = [
      { id: '1', title: 'Mike Manson', startDate: '2025-07-16', endDate: '2025-07-16', color: paintBrainColors.green },
      { id: '2', title: 'Client Project', startDate: '2025-07-20', endDate: '2025-07-24', color: paintBrainColors.purple },
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
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const currentDate = new Date(dateString);
      
      return currentDate >= eventStart && currentDate <= eventEnd;
    });
  };

  const getEventSpanInfo = (event: CalendarEvent, day: number) => {
    const dateString = getDateString(day);
    const currentDate = new Date(dateString);
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    
    const isStart = currentDate.getTime() === eventStart.getTime();
    const isEnd = currentDate.getTime() === eventEnd.getTime();
    const isMiddle = currentDate > eventStart && currentDate < eventEnd;
    const isSingle = eventStart.getTime() === eventEnd.getTime();
    
    return { isStart, isEnd, isMiddle, isSingle };
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

  const calculateEventPositions = () => {
    const eventPositions: any[] = [];
    
    events.forEach(event => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      // Find the week and day position for start and end
      let startPos = null;
      let endPos = null;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayOfWeek = (firstDay + day - 1) % 7;
        const weekNum = Math.floor((firstDay + day - 1) / 7);
        
        if (checkDate >= startDate && checkDate <= endDate) {
          if (!startPos) {
            startPos = { day, week: weekNum, dayOfWeek };
          }
          endPos = { day, week: weekNum, dayOfWeek };
        }
      }
      
      if (startPos && endPos) {
        eventPositions.push({
          ...event,
          startPos,
          endPos,
          isSameWeek: startPos.week === endPos.week
        });
      }
    });
    
    return eventPositions;
  };

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

    // Days of the month - just day numbers, no events
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();

      days.push(
        <div key={day} className="p-1 h-20 border border-gray-700 relative bg-gray-900">
          <div className={`text-sm font-medium ${isToday ? 'text-red-400' : 'text-white'}`}>
            {day}
          </div>
        </div>
      );
    }

    return days;
  };

  const renderEventOverlays = () => {
    const eventPositions = calculateEventPositions();
    
    return eventPositions.map((event, index) => {
      if (event.isSameWeek) {
        // Single week event - create one continuous bar
        const startCol = event.startPos.dayOfWeek + 1; // +1 for 1-based CSS grid
        const endCol = event.endPos.dayOfWeek + 2; // +2 to include end day
        const row = event.startPos.week + 2; // +2 to account for header row
        
        return (
          <div
            key={`overlay-${event.id}`}
            className="absolute text-xs text-white cursor-pointer hover:brightness-110 transition-all flex items-center px-2 font-medium"
            style={{
              backgroundColor: event.color,
              borderRadius: '4px',
              gridColumn: `${startCol} / ${endCol}`,
              gridRow: row,
              top: '28px', // Below the day number
              height: '16px',
              zIndex: 20
            }}
            title={`${event.title} (${event.startDate} to ${event.endDate}) - Click to edit`}
            onClick={() => {
              const editEventUrl = `https://calendar.google.com/calendar/u/0/r/week/${event.startDate.replace(/-/g, '/')}`;
              window.open(editEventUrl, '_blank');
            }}
          >
            <span className="truncate">{event.title}</span>
          </div>
        );
      } else {
        // Multi-week event - create multiple bars (one per week)
        const bars = [];
        let currentWeek = event.startPos.week;
        
        while (currentWeek <= event.endPos.week) {
          const isFirstWeek = currentWeek === event.startPos.week;
          const isLastWeek = currentWeek === event.endPos.week;
          
          const startCol = isFirstWeek ? event.startPos.dayOfWeek + 1 : 1;
          const endCol = isLastWeek ? event.endPos.dayOfWeek + 2 : 8;
          const row = currentWeek + 2;
          
          bars.push(
            <div
              key={`overlay-${event.id}-week-${currentWeek}`}
              className="absolute text-xs text-white cursor-pointer hover:brightness-110 transition-all flex items-center px-2 font-medium"
              style={{
                backgroundColor: event.color,
                borderRadius: isFirstWeek && isLastWeek ? '4px' : 
                            isFirstWeek ? '4px 0 0 4px' :
                            isLastWeek ? '0 4px 4px 0' : '0',
                gridColumn: `${startCol} / ${endCol}`,
                gridRow: row,
                top: '28px',
                height: '16px',
                zIndex: 20
              }}
              title={`${event.title} (${event.startDate} to ${event.endDate}) - Click to edit`}
              onClick={() => {
                const editEventUrl = `https://calendar.google.com/calendar/u/0/r/week/${event.startDate.replace(/-/g, '/')}`;
                window.open(editEventUrl, '_blank');
              }}
            >
              {isFirstWeek && <span className="truncate">{event.title}</span>}
            </div>
          );
          
          currentWeek++;
        }
        
        return bars;
      }
    });
  };

  const handleCreateEvent = () => {
    if (onCreateEvent) {
      onCreateEvent(project);
    }
    onClose();
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
          <div className="relative">
            <div className="grid grid-cols-7 gap-0 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
              {renderCalendarDays()}
            </div>
            {/* Event Overlays */}
            <div className="absolute inset-0 grid grid-cols-7 gap-0 pointer-events-none">
              <div className="contents pointer-events-auto">
                {renderEventOverlays()}
              </div>
            </div>
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