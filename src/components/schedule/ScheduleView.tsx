import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight, AlertCircle, BookOpen } from 'lucide-react';
import { ScheduleEvent, Course } from '../../types';

interface ScheduleViewProps {
  schedule: ScheduleEvent[];
  courses: Course[];
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, courses }) => {
  const [selectedDay, setSelectedDay] = useState<number>(3); // 3 = Wednesday

  const days = [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
  ];

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
  ];

  const exams = [
    {
      id: 'ex-1',
      courseCode: 'CS 201',
      title: 'Midterm 1: Trees & Hash Tables',
      date: 'Aug 05, 2026',
      time: '10:00 AM - 11:30 AM',
      location: 'Hewlett Auditorium 200',
      daysLeft: 9,
      color: '#3b82f6',
    },
    {
      id: 'ex-2',
      courseCode: 'MATH 204',
      title: 'Exam 2: Orthogonality & Least Squares',
      date: 'Aug 12, 2026',
      time: '01:15 PM - 02:45 PM',
      location: 'Sloan Hall 220',
      daysLeft: 16,
      color: '#8b5cf6',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Upcoming Exams Countdown Banner */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Upcoming Exams & Major Milestones
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map(ex => (
            <div
              key={ex.id}
              className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center justify-between"
            >
              <div className="space-y-1">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                  style={{ backgroundColor: `${ex.color}18`, color: ex.color }}
                >
                  {ex.courseCode}
                </span>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">{ex.title}</h4>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  <span>{ex.date} • {ex.time}</span>
                  <span>|</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ex.location}</span>
                </p>
              </div>

              <div className="text-center px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800">
                <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 leading-none">{ex.daysLeft}</span>
                <span className="block text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mt-0.5">Days Left</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Timetable Grid */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs p-5 space-y-6">
        {/* Day Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Fall 2026 Timetable</span>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
            {days.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedDay === d.id
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Cards List for Selected Day */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            {days.find(d => d.id === selectedDay)?.name}'s Schedule
          </h4>

          {schedule.filter(s => s.dayOfWeek === selectedDay).length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-xs font-medium">
              No classes scheduled for this day. Free study window!
            </div>
          ) : (
            schedule.filter(s => s.dayOfWeek === selectedDay).map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-2xl border transition-all flex items-start gap-4"
                style={{
                  backgroundColor: `${event.color}08`,
                  borderColor: `${event.color}30`,
                }}
              >
                <div className="w-24 text-center border-r pr-4 border-zinc-200/60 dark:border-zinc-800 flex-shrink-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    {event.startTime}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-medium block">
                    to {event.endTime}
                  </span>
                  <span
                    className="inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{ backgroundColor: `${event.color}20`, color: event.color }}
                  >
                    {event.type}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold" style={{ color: event.color }}>
                      {event.courseCode}
                    </span>
                    <span className="text-xs text-zinc-600 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.room}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {event.courseName}
                  </h3>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5 text-zinc-600" />
                    Instructor: {event.instructor}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
