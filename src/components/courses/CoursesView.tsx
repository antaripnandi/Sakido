import React from 'react';
import { GraduationCap, MapPin, User, BookOpen, CheckSquare, Clock, ArrowRight } from 'lucide-react';
import { Course, Task, Note, NavView } from '../../types';

interface CoursesViewProps {
  courses: Course[];
  tasks: Task[];
  notes: Note[];
  onNavigate: (view: NavView) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  tasks,
  notes,
  onNavigate,
}) => {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Fall Quarter 2026
          </span>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
            Enrolled Academic Courses ({courses.length})
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-medium">
            18 Total Quarter Credits • Cumulative Target GPA: 3.90
          </p>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => {
          const courseTasks = tasks.filter(t => t.courseId === course.id);
          const courseNotes = notes.filter(n => n.courseId === course.id);

          return (
            <div
              key={course.id}
              className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="text-xs font-bold text-zinc-600 uppercase tracking-wide">
                      {course.code} • {course.credits} Credits
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {course.name}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold uppercase block">Grade</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{course.currentGrade}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-zinc-600">
                  <span>Term Completion</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${course.progress}%`, backgroundColor: course.color }}
                  />
                </div>
              </div>

              {/* Course Meta Info */}
              <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <User className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="truncate">{course.instructor}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="truncate">{course.room}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>{course.schedule}</span>
                </div>
              </div>

              {/* Linked Tasks & Notes Quick Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" />
                    {courseTasks.length} Tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {courseNotes.length} Notes
                  </span>
                </div>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View Tasks
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
