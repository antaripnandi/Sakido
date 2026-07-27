export type NavView = 'dashboard' | 'tasks' | 'notes' | 'focus' | 'schedule' | 'habits' | 'courses';

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
