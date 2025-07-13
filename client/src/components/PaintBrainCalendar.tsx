import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import './calendar.css';

const CalendarComponent = () => {
  const today = dayjs();
  const containerRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(null);
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
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
            <div key={d} className="day-name">{d}</div>
          ))}
          {daysArray.map((day, idx) => {
            const isSelected =
              selectedDate &&
              day &&
              selectedDate.date() === day &&
              selectedDate.month() === date.month() &&
              selectedDate.year() === date.year();

            return (
              <div
                key={idx}
                className={`calendar-cell ${isToday(day) ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => day && setSelectedDate(date.date(day))}
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
    <div className="calendar-container">
      <div className="scroll-container" ref={containerRef} onScroll={handleScroll}>
        {months.map((m) => renderMonth(m))}
      </div>
    </div>
  );
};

export default CalendarComponent;