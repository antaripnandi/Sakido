export type NavView = 'dashboard' | 'tasks' | 'notes' | 'focus' | 'schedule' | 'habits' | 'courses' | 'flashcards';

export interface Flashcard {
  id: string;
  classId: string;
  className: string;
  classColor: string;
  front: string;
  back: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string; // YYYY-MM-DD
  createdAt: string;
}

export function calculateSM2(card: Flashcard, quality: 0 | 1 | 2 | 3): Flashcard {
  let { interval, repetitions, easeFactor } = card;

  if (quality < 2) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  const qFactor = 3 - quality;
  easeFactor = easeFactor + (0.1 - qFactor * (0.08 + qFactor * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const today = new Date();
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + interval);
  const nextReviewDate = nextDate.toISOString().split('T')[0];

  return {
    ...card,
    interval,
    repetitions,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewDate,
  };
}

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'submitted' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  courseName: string;
  courseColor: string;
  dueDate: string; // ISO date string or formatted
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes?: number;
  subtasks?: { id: string; title: string; completed: boolean }[];
  tags?: string[];
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  courseId: string;
  courseName: string;
  courseColor: string;
  updatedAt: string;
  tags: string[];
  isPinned?: boolean;
  type: 'lecture' | 'summary' | 'exam_prep' | 'lab';
}

export interface Course {
  id: string;
  code: string;
  name: string;
  instructor: string;
  room: string;
  color: string;
  schedule: string;
  credits: number;
  gradeTarget: string;
  currentGrade?: string;
  progress: number;
  iconName?: string;
}

export interface ScheduleEvent {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  dayOfWeek: number; // 1 (Mon) - 5 (Fri)
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:30"
  type: 'lecture' | 'lab' | 'discussion' | 'office_hours';
  color: string;
}

export interface Habit {
  id: string;
  name: string;
  category: 'study' | 'health' | 'mindset' | 'routine';
  targetDaysPerWeek: number;
  completedDays: boolean[]; // 7 days (Mon-Sun)
  streak: number;
  color: string;
}

export interface FocusSession {
  id: string;
  date: string;
  durationMinutes: number;
  taskTitle?: string;
  courseName?: string;
  type: 'focus' | 'shortBreak' | 'longBreak';
}

export interface UserProfile {
  name: string;
  major: string;
  university: string;
  term: string;
  avatarUrl: string;
  dailyGoalMinutes: number;
  completedMinutesToday: number;
  tasksCompletedToday: number;
  streakDays: number;
}
