import React, { useState } from 'react';
import dayjs from 'dayjs';
import './calendar.css';

interface PaintBrainCalendarProps {
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  maxDate?: string;
  className?: string;
}

export default function PaintBrainCalendar({ 
  selectedDate, 
  onDateSelect, 
  maxDate,
  className = '' 
}: PaintBrainCalendarProps) {
  const today = dayjs();
  const [currentDate, setCurrentDate] = useState(today);

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startDay = startOfMonth.day(); // Sunday = 0
  const daysInMonth = endOfMonth.date();

  const daysArray = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startDay; i++) {
    daysArray.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  const prevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const nextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const isToday = (day: number | null) =>
    day === today.date() &&
    currentDate.month() === today.month() &&
    currentDate.year() === today.year();

  const isSelected = (day: number | null) => {
    if (!day || !selectedDate) return false;
    const selected = dayjs(selectedDate);
    return day === selected.date() &&
           currentDate.month() === selected.month() &&
           currentDate.year() === selected.year();
  };

  const isDisabled = (day: number | null) => {
    if (!day || !maxDate) return false;
    const dayDate = currentDate.date(day);
    const max = dayjs(maxDate);
    return dayDate.isAfter(max);
  };

  const handleDayClick = (day: number | null) => {
    if (!day || isDisabled(day)) return;
    
    const date = currentDate.date(day);
    const dateString = date.format('YYYY-MM-DD');
    onDateSelect(dateString);
  };

  return (
    <div className={`calendar-container ${className}`}>
      <div className="calendar-header">
        <button onClick={prevMonth}>{'<'}</button>
        <h2 style={{ color: '#0099CC' }}>
          {currentDate.format('MMMM YYYY').toUpperCase()}
        </h2>
        <button onClick={nextMonth}>{'>'}</button>
      </div>

      <div className="calendar-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`day-${i}`} className="calendar-day-name">
            {d}
          </div>
        ))}
        {daysArray.map((day, idx) => {
          const todayCell = isToday(day);
          const selectedCell = isSelected(day);
          const disabledCell = isDisabled(day);
          
          let cellClass = 'calendar-cell ';
          if (!day) {
            cellClass += 'empty';
          } else if (selectedCell) {
            cellClass += 'selected';
          } else if (todayCell) {
            cellClass += 'today';
          } else {
            cellClass += 'day';
          }

          return (
            <div
              key={idx}
              className={cellClass}
              onClick={() => handleDayClick(day)}
              style={{
                opacity: disabledCell ? 0.5 : 1,
                cursor: day && !disabledCell ? 'pointer' : 'default'
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}