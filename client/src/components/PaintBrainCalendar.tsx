import React, { useState, useEffect, useRef } from 'react';
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
  const containerRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [months, setMonths] = useState([
    today.subtract(6, 'month'),
    today.subtract(5, 'month'),
    today.subtract(4, 'month'),
    today.subtract(3, 'month'),
    today.subtract(2, 'month'),
    today.subtract(1, 'month'),
    today,
    today.add(1, 'month'),
    today.add(2, 'month'),
    today.add(3, 'month'),
    today.add(4, 'month'),
    today.add(5, 'month'),
    today.add(6, 'month'),
  ]);

  const [currentIndex, setCurrentIndex] = useState(6); // Index of today (now at position 6)

  useEffect(() => {
    const scrollToCurrent = () => {
      const container = containerRef.current;
      if (container) {
        const width = container.clientWidth;
        container.scrollTo({ left: width * currentIndex, behavior: 'instant' });
      }
    };
    scrollToCurrent();
  }, [currentIndex]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const newIndex = Math.round(container.scrollLeft / container.clientWidth);
    setCurrentIndex(newIndex);
  };

  const renderMonth = (date) => {
    const startOfMonth = date.startOf('month');
    const endOfMonth = date.endOf('month');
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
    // Add empty cells to complete the grid (ensure 6 weeks = 42 cells total)
    while (daysArray.length < 42) {
      daysArray.push(null);
    }

    const isToday = (day) =>
      day === today.date() &&
      date.month() === today.month() &&
      date.year() === today.year();

    return (
      <div className="month" key={date.format('YYYY-MM')}>
        <h2 className="month-name">{date.format('MMMM YYYY')}</h2>
        <div className="calendar-grid">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${date.format('YYYY-MM')}-${d}-${i}`} className="day-name">{d}</div>
          ))}
          {daysArray.map((day, idx) => {
            const isSelected =
              propSelectedDate &&
              day &&
              propSelectedDate === date.date(day).format('YYYY-MM-DD');

            return (
              <div
                key={`${date.format('YYYY-MM')}-${idx}`}
                className={`calendar-cell ${isToday(day) ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  if (day) {
                    const newDate = date.date(day);
                    setSelectedDate(newDate);
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

  return (
    <div className={`calendar-container ${className}`}>
      <div className="scroll-container" ref={containerRef} onScroll={handleScroll}>
        {months.map((m) => renderMonth(m))}
      </div>
    </div>
  );
};

export default CalendarComponent;