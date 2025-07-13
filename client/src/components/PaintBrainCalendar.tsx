import React, { useState } from 'react';

// PaintBrain brand colors
const COLORS = {
  red: '#E03E3E',
  yellow: '#F7C11F',
  blue: '#0099CC',
  cream: '#FAF4E5',
  black: '#000000',
  white: '#FFFFFF'
};

interface PaintBrainCalendarProps {
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  maxDate?: string;
  className?: string;
}

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
        backgroundColor: COLORS.black
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontWeight: 'bold',
          color: COLORS.blue,
          fontSize: 18,
          marginBottom: 10
        }}
      >
        {new Date(year, month).toLocaleString('en-US', {
          month: 'long'
        }).toUpperCase()}{' '}
        {year}
      </div>

      {/* Day labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderTop: `1px solid ${COLORS.yellow}`,
          borderBottom: `1px solid ${COLORS.yellow}`
        }}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              padding: '6px',
              borderRight: i < 6 ? `1px solid ${COLORS.yellow}` : 'none',
              color: COLORS.white
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
          borderLeft: `1px solid ${COLORS.yellow}`
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
                  borderBottom: `1px solid ${COLORS.yellow}`,
                  borderRight: `1px solid ${COLORS.yellow}`,
                  backgroundColor: selectedCell ? `${COLORS.yellow}60` : todayCell ? `${COLORS.red}80` : 'transparent',
                  color: day ? COLORS.white : 'transparent',
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

export default function PaintBrainCalendar({ 
  selectedDate, 
  onDateSelect, 
  maxDate,
  className = '' 
}: PaintBrainCalendarProps) {
  const [today] = useState(new Date());
  const monthsToRender = 12;
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

  const months = Array.from({ length: monthsToRender }, (_, i) => {
    const newDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    return { year: newDate.getFullYear(), month: newDate.getMonth() };
  });

  return (
    <div
      className={className}
      style={{
        backgroundColor: COLORS.black,
        padding: 0,
        overflowX: 'auto',
        display: 'flex',
        scrollSnapType: 'x mandatory',
        border: `1px solid ${COLORS.yellow}`,
        borderRadius: '8px',
        scrollBehavior: 'smooth'
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