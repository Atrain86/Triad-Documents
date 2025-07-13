import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Paint Brain Brand Colors
const PAINT_RED = '#E03E3E';
const PAINT_YELLOW = '#F7C11F';
const PAINT_BLUE = '#0099CC';
const PAINT_TEAL = '#00B4A6';
const CREAM = '#FAF4E5';
const DARK_BG = '#0D0D0D';

interface PaintBrainCalendarProps {
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  maxDate?: string;
  className?: string;
}

// Generate calendar grid
function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let day = 1;

  for (let i = 0; i < 6; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      const cellIndex = i * 7 + j;
      if (cellIndex < firstDay || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(day++);
      }
    }
    weeks.push(week);
    // Stop if we've placed all days
    if (day > daysInMonth) break;
  }
  return weeks;
}

export default function PaintBrainCalendar({ 
  selectedDate, 
  onDateSelect, 
  maxDate,
  className = '' 
}: PaintBrainCalendarProps) {
  const [now] = useState(new Date());
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [weeks, setWeeks] = useState<(number | null)[][]>([]);

  // Parse selected date if provided
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const selectedDay = selectedDateObj ? selectedDateObj.getDate() : null;

  // Parse max date if provided
  const maxDateObj = maxDate ? new Date(maxDate + 'T00:00:00') : null;

  useEffect(() => {
    setWeeks(getMonthGrid(year, month));
  }, [month, year]);

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const isToday = (day: number | null) =>
    day === now.getDate() &&
    month === now.getMonth() &&
    year === now.getFullYear();

  const isSelected = (day: number | null) =>
    day === selectedDay &&
    selectedDateObj &&
    month === selectedDateObj.getMonth() &&
    year === selectedDateObj.getFullYear();

  const isDisabled = (day: number | null) => {
    if (!day || !maxDateObj) return false;
    const dayDate = new Date(year, month, day);
    return dayDate > maxDateObj;
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(year, month + offset);
    setMonth(newDate.getMonth());
    setYear(newDate.getFullYear());
  };

  const handleDayClick = (day: number | null) => {
    if (!day || isDisabled(day)) return;
    
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    onDateSelect(dateString);
  };

  const monthName = new Date(year, month).toLocaleString('en-US', { month: 'long' });

  return (
    <div className={`bg-gray-900 text-cream p-4 rounded-xl w-80 font-sans shadow-2xl ${className}`}>
      {/* Header with month/year */}
      <div 
        className="text-center font-bold text-lg py-3 px-4 rounded-lg text-black mb-3"
        style={{ backgroundColor: PAINT_RED }}
      >
        {monthName.toUpperCase()} {year}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mb-3">
        <button
          onClick={() => changeMonth(-1)}
          className="flex items-center px-3 py-2 rounded-lg font-bold text-black hover:opacity-80 transition-opacity"
          style={{ backgroundColor: PAINT_BLUE }}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back
        </button>
        <button
          onClick={() => changeMonth(1)}
          className="flex items-center px-3 py-2 rounded-lg font-bold text-black hover:opacity-80 transition-opacity"
          style={{ backgroundColor: PAINT_YELLOW }}
        >
          Next
          <ChevronRight size={16} className="ml-1" />
        </button>
      </div>

      {/* Day headers */}
      <div 
        className="grid grid-cols-7 py-2 rounded-lg font-bold text-black text-center text-sm mb-2"
        style={{ backgroundColor: PAINT_YELLOW }}
      >
        {days.map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, i) =>
          week.map((day, j) => {
            const todayCell = isToday(day);
            const selectedCell = isSelected(day);
            const disabledCell = isDisabled(day);
            
            return (
              <div
                key={`${i}-${j}`}
                onClick={() => handleDayClick(day)}
                className={`
                  rounded-lg py-3 text-center cursor-pointer transition-all duration-200
                  ${day ? 'hover:opacity-80' : 'cursor-default'}
                  ${selectedCell ? 'ring-2 ring-yellow-400 font-bold' : ''}
                  ${disabledCell ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                style={{
                  backgroundColor: todayCell 
                    ? PAINT_RED 
                    : day && !disabledCell 
                      ? PAINT_BLUE 
                      : 'transparent',
                  color: day ? CREAM : 'transparent'
                }}
              >
                {day || ''}
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="mt-3 text-xs text-center text-gray-400">
        <span style={{ color: PAINT_RED }}>●</span> Today  
        <span className="mx-3">|</span>
        <span style={{ color: PAINT_BLUE }}>●</span> Available
      </div>
    </div>
  );
}