import React, { useState } from 'react';

// PaintBrain brand colors
const RED = '#E03E3E';
const YELLOW = '#F7C11F';
const CREAM = '#FAF4E5';
const DARK = '#000000';

interface PaintBrainCalendarProps {
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  maxDate?: string;
  className?: string;
}

// Generate a grid for a given month and year
function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // Sunday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let day = 1;

  for (let i = 0; i < 6; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      if ((i === 0 && j < firstDay) || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(day++);
      }
    }
    weeks.push(week);
  }
  return weeks;
}

// Render one month of the calendar
function MonthView({ 
  year, 
  month, 
  today, 
  selectedDate, 
  onDateSelect, 
  maxDate 
}: {
  year: number;
  month: number;
  today: Date;
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  maxDate?: string;
}) {
  const weeks = getMonthGrid(year, month);
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const maxDateObj = maxDate ? new Date(maxDate + 'T00:00:00') : null;
  
  const isToday = (day: number | null) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const isSelected = (day: number | null) =>
    day && selectedDateObj &&
    day === selectedDateObj.getDate() &&
    month === selectedDateObj.getMonth() &&
    year === selectedDateObj.getFullYear();

  const isDisabled = (day: number | null) => {
    if (!day || !maxDateObj) return false;
    const dayDate = new Date(year, month, day);
    return dayDate > maxDateObj;
  };

  const handleDayClick = (day: number | null) => {
    if (!day || isDisabled(day)) return;
    
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    onDateSelect(dateString);
  };

  return (
    <div
      style={{
        minWidth: '100%',
        scrollSnapAlign: 'start',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontWeight: 'bold',
          color: CREAM,
          fontSize: 18,
          marginBottom: 10,
        }}
      >
        {new Date(year, month).toLocaleString('en-US', {
          month: 'long',
        }).toUpperCase()}{' '}
        {year}
      </div>

      {/* Day labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: 'transparent',
          borderTop: `1px solid ${YELLOW}`,
          borderBottom: `1px solid ${YELLOW}`,
        }}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              padding: '6px',
              borderRight: i < 6 ? `1px solid ${YELLOW}` : 'none',
              color: CREAM,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0,
        }}
      >
        {weeks.map((week, i) =>
          week.map((day, j) => {
            const todayCell = isToday(day);
            const selectedCell = isSelected(day);
            const disabledCell = isDisabled(day);

            return (
              <div
                key={`${i}-${j}`}
                onClick={() => handleDayClick(day)}
                style={{
                  aspectRatio: '1 / 1',
                  borderBottom: `1px solid ${YELLOW}`,
                  borderRight: j < 6 ? `1px solid ${YELLOW}` : 'none',
                  backgroundColor: selectedCell ? `${YELLOW}60` : todayCell ? `${RED}80` : 'transparent',
                  color: day ? CREAM : 'transparent',
                  textAlign: 'center',
                  padding: '6px 0',
                  fontWeight: todayCell || selectedCell ? 'bold' : 'normal',
                  cursor: day && !disabledCell ? 'pointer' : 'default',
                  opacity: disabledCell ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {day || ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Main scrollable calendar component
export default function PaintBrainCalendar({ 
  selectedDate, 
  onDateSelect, 
  maxDate,
  className = '' 
}: PaintBrainCalendarProps) {
  const [today] = useState(new Date());
  const [monthsToRender] = useState(12); // current month + 11 ahead
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

  const months = Array.from({ length: monthsToRender }, (_, i) => {
    const newDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    return { year: newDate.getFullYear(), month: newDate.getMonth() };
  });

  return (
    <div
      className={className}
      style={{
        backgroundColor: DARK,
        padding: 0,
        overflowX: 'auto',
        display: 'flex',
        scrollSnapType: 'x mandatory',
        border: `1px solid ${YELLOW}`,
        borderRadius: '8px',
        scrollBehavior: 'smooth',
        maxWidth: '100%',
        height: 'auto',
      }}
    >
      {months.map(({ year, month }) => (
        <MonthView 
          key={`${year}-${month}`} 
          year={year} 
          month={month} 
          today={today}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          maxDate={maxDate}
        />
      ))}
    </div>
  );
}