import React, { useState } from 'react';
import dayjs from 'dayjs';
import './calendar.css';

interface PaintBrainCalendarProps {
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  maxDate?: string;
  className?: string;
}

const CalendarComponent = ({ 
  selectedDate: propSelectedDate, 
  onDateSelect, 
  maxDate,
  className = '' 
}: PaintBrainCalendarProps) => {
  const today = dayjs();
  const [currentMonth, setCurrentMonth] = useState(today);

  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');
  const startDay = startOfMonth.day();
  const daysInMonth = endOfMonth.date();

  const daysArray = [];
  // Add empty cells for days before month starts
  for (let i = 0; i < startDay; i++) {
    daysArray.push(null);
  }
  // Add actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  const isToday = (day) =>
    day === today.date() &&
    currentMonth.month() === today.month() &&
    currentMonth.year() === today.year();

  const goToPreviousMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };

  const goToNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };

  return (
    <div className={`calendar-container ${className}`}>
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="nav-button">‹</button>
        <h2 className="month-name">{currentMonth.format('MMMM YYYY')}</h2>
        <button onClick={goToNextMonth} className="nav-button">›</button>
      </div>
      <div className="calendar-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`${d}-${i}`} className="day-name">{d}</div>
        ))}
        {daysArray.map((day, idx) => {
          const isSelected =
            propSelectedDate &&
            day &&
            propSelectedDate === currentMonth.date(day).format('YYYY-MM-DD');

          return (
            <div
              key={idx}
              className={`calendar-cell ${isToday(day) ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                if (day) {
                  const newDate = currentMonth.date(day);
                  if (onDateSelect) {
                    onDateSelect(newDate.format('YYYY-MM-DD'));
                  }
                }
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarComponent;