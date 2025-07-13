import React, { useState } from 'react';
import dayjs from 'dayjs';
import './calendar.css';

const CalendarComponent = () => {
  const today = dayjs();
  const [currentDate, setCurrentDate] = useState(today);

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startDay = startOfMonth.day(); // Sunday = 0
  const daysInMonth = endOfMonth.date();

  const daysArray = [];

  for (let i = 0; i < startDay; i++) {
    daysArray.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  const prevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const nextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const isToday = (day) =>
    day === today.date() &&
    currentDate.month() === today.month() &&
    currentDate.year() === today.year();

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={prevMonth}>{'<'}</button>
        <h2 style={{ color: '#0099CC' }}>
          {currentDate.format('MMMM YYYY').toUpperCase()}
        </h2>
        <button onClick={nextMonth}>{'>'}</button>
      </div>

      <div className="calendar-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
          <div key={d} className="calendar-day-name">
            {d}
          </div>
        ))}
        {daysArray.map((day, idx) => (
          <div
            key={idx}
            className={`calendar-cell ${
              isToday(day) ? 'today' : day ? 'day' : 'empty'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarComponent;