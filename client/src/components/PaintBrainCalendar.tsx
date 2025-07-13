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
  const [internalSelectedDate, setInternalSelectedDate] = useState(null);
  const [months, setMonths] = useState([
    today.subtract(1, 'month'),
    today,
    today.add(1, 'month'),
    today.add(2, 'month'),
  ]);

  const [currentIndex, setCurrentIndex] = useState(1); // Index of today

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
    for (let i = 0; i < startDay; i++) {
      daysArray.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(day);
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
            const currentDate = day ? date.date(day) : null;
            const isSelected = propSelectedDate && currentDate && 
              dayjs(propSelectedDate).format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD');
            const isDisabled = maxDate && currentDate && currentDate.isAfter(dayjs(maxDate));

            return (
              <div
                key={`${date.format('YYYY-MM')}-${idx}`}
                className={`calendar-cell ${isToday(day) ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                style={{
                  opacity: isDisabled ? 0.5 : 1,
                  cursor: day && !isDisabled ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (day && !isDisabled && onDateSelect) {
                    const dateString = date.date(day).format('YYYY-MM-DD');
                    onDateSelect(dateString);
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