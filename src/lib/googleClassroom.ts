/**
 * Google Classroom API Service for Sakido
 * Highly adaptable, zero hardcoded values, fully parameter-driven.
 */

import { GoogleService } from './googleTokenStore';

export interface ClassroomDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface ClassroomTimeOfDay {
  hours?: number;
  minutes?: number;
  seconds?: number;
  nanos?: number;
}

export interface DriveFileMaterial {
  driveFile: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
  };
  shareMode?: string;
}

export interface YouTubeVideoMaterial {
  youtubeVideo: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
  };
}

export interface LinkMaterial {
  link: {
    url: string;
    title?: string;
    thumbnailUrl?: string;
  };
}

export interface FormMaterial {
  form: {
    formUrl: string;
    title?: string;
    thumbnailUrl?: string;
    responseUrl?: string;
  };
}

export type ClassroomMaterial = DriveFileMaterial | YouTubeVideoMaterial | LinkMaterial | FormMaterial;

export interface ClassroomTeacher {
  courseId: string;
  userId: string;
  profile?: {
    id?: string;
    name?: {
      givenName?: string;
      familyName?: string;
      fullName?: string;
    };
    emailAddress?: string;
    photoUrl?: string;
  };
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId?: string;
  creationTime?: string;
  updateTime?: string;
  enrollmentCode?: string;
  courseState?: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
  alternateLink?: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
  teacherFolder?: {
    id?: string;
    title?: string;
    alternateLink?: string;
  };
  guardiansEnabled?: boolean;
  calendarId?: string;
  teachers?: ClassroomTeacher[];
}

export interface ClassroomCourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  materials?: ClassroomMaterial[];
  state?: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  dueDate?: ClassroomDate;
  dueTime?: ClassroomTimeOfDay;
  scheduledTime?: string;
  maxPoints?: number;
  workType?: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  associatedWithDeveloper?: boolean;
  assigneeMode?: string;
  submissionModificationMode?: string;
  topicId?: string;
}

export interface ClassroomStudentSubmission {
  id: string;
  courseId: string;
  courseWorkId: string;
  userId: string;
  state?: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
  late?: boolean;
  draftGrade?: number;
  assignedGrade?: number;
  alternateLink?: string;
  associatedWithDeveloper?: boolean;
  submissionHistory?: any[];
  assignmentSubmission?: {
    attachments?: ClassroomMaterial[];
  };
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  text: string;
  materials?: ClassroomMaterial[];
  state?: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  creatorUserId?: string;
}

export interface ClassroomTopic {
  id: string;
  courseId: string;
  name: string;
  updateTime?: string;
}

export interface ClassroomConfig {
  apiBaseUrl?: string;
  courseStates?: string[];
  courseWorkStates?: string[];
  pageSize?: number;
  studentId?: string;
  urgencyThresholdHours?: {
    urgent: number;
    high: number;
    medium: number;
  };
  defaultColorPalette?: string[];
}

export const DEFAULT_CLASSROOM_CONFIG: Required<ClassroomConfig> = {
  apiBaseUrl: 'https://classroom.googleapis.com/v1',
  courseStates: ['ACTIVE'],
  courseWorkStates: ['PUBLISHED'],
  pageSize: 50,
  studentId: 'me',
  urgencyThresholdHours: {
    urgent: 24,
    high: 72,
    medium: 168,
  },
  defaultColorPalette: [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6',
  ],
};

export type ExecuteGoogleApiFn = (
  apiCall: (accessToken: string) => Promise<Response>,
  service?: GoogleService
) => Promise<Response | null>;

/**
 * Fetch all active courses for the student with configurable options.
 */
export async function fetchClassroomCourses(
  executeApi: ExecuteGoogleApiFn,
  config: Partial<ClassroomConfig> = {}
): Promise<{ courses: ClassroomCourse[]; error?: string }> {
  const merged = { ...DEFAULT_CLASSROOM_CONFIG, ...config };
  const queryParams = new URLSearchParams({
    studentId: merged.studentId,
    pageSize: String(merged.pageSize),
  });

  merged.courseStates.forEach((st) => queryParams.append('courseStates', st));

  const url = `${merged.apiBaseUrl}/courses?${queryParams.toString()}`;

  try {
    const res = await executeApi((token) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      'googleClassroom'
    );

    if (!res) {
      return { courses: [], error: 'Failed to authenticate with Google Classroom API' };
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        courses: [],
        error: errBody.error?.message || `Classroom API error (HTTP ${res.status})`,
      };
    }

    const data = await res.json();
    return { courses: data.courses || [] };
  } catch (err: any) {
    return { courses: [], error: err.message || 'Unknown network error fetching Classroom courses' };
  }
}

/**
 * Fetch teachers for a course to dynamically obtain instructor names & contacts.
 */
export async function fetchClassroomTeachers(
  executeApi: ExecuteGoogleApiFn,
  courseId: string,
  config: Partial<ClassroomConfig> = {}
): Promise<ClassroomTeacher[]> {
  const merged = { ...DEFAULT_CLASSROOM_CONFIG, ...config };
  const url = `${merged.apiBaseUrl}/courses/${encodeURIComponent(courseId)}/teachers?pageSize=${merged.pageSize}`;

  try {
    const res = await executeApi((token) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      'googleClassroom'
    );

    if (!res || !res.ok) return [];
    const data = await res.json();
    return data.teachers || [];
  } catch {
    return [];
  }
}

/**
 * Fetch coursework (assignments, questions) for a specific course.
 */
export async function fetchClassroomCourseWork(
  executeApi: ExecuteGoogleApiFn,
  courseId: string,
  config: Partial<ClassroomConfig> = {}
): Promise<ClassroomCourseWork[]> {
  const merged = { ...DEFAULT_CLASSROOM_CONFIG, ...config };
  const queryParams = new URLSearchParams({
    pageSize: String(merged.pageSize),
  });

  merged.courseWorkStates.forEach((st) => queryParams.append('courseWorkStates', st));

  const url = `${merged.apiBaseUrl}/courses/${encodeURIComponent(courseId)}/courseWork?${queryParams.toString()}`;

  try {
    const res = await executeApi((token) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      'googleClassroom'
    );

    if (!res || !res.ok) return [];
    const data = await res.json();
    return data.courseWork || [];
  } catch {
    return [];
  }
}

/**
 * Fetch student submissions for a specific coursework item.
 */
export async function fetchClassroomSubmissions(
  executeApi: ExecuteGoogleApiFn,
  courseId: string,
  courseWorkId: string,
  config: Partial<ClassroomConfig> = {}
): Promise<ClassroomStudentSubmission[]> {
  const merged = { ...DEFAULT_CLASSROOM_CONFIG, ...config };
  const queryParams = new URLSearchParams({
    userId: merged.studentId,
    pageSize: '10',
  });

  const url = `${merged.apiBaseUrl}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions?${queryParams.toString()}`;

  try {
    const res = await executeApi((token) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      'googleClassroom'
    );

    if (!res || !res.ok) return [];
    const data = await res.json();
    return data.studentSubmissions || [];
  } catch {
    return [];
  }
}

/**
 * Fetch announcements stream for a course.
 */
export async function fetchClassroomAnnouncements(
  executeApi: ExecuteGoogleApiFn,
  courseId: string,
  config: Partial<ClassroomConfig> = {}
): Promise<ClassroomAnnouncement[]> {
  const merged = { ...DEFAULT_CLASSROOM_CONFIG, ...config };
  const url = `${merged.apiBaseUrl}/courses/${encodeURIComponent(courseId)}/announcements?announcementStates=PUBLISHED&pageSize=${merged.pageSize}`;

  try {
    const res = await executeApi((token) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      'googleClassroom'
    );

    if (!res || !res.ok) return [];
    const data = await res.json();
    return data.announcements || [];
  } catch {
    return [];
  }
}

/**
 * Fetch syllabus topics for a course.
 */
export async function fetchClassroomTopics(
  executeApi: ExecuteGoogleApiFn,
  courseId: string,
  config: Partial<ClassroomConfig> = {}
): Promise<ClassroomTopic[]> {
  const merged = { ...DEFAULT_CLASSROOM_CONFIG, ...config };
  const url = `${merged.apiBaseUrl}/courses/${encodeURIComponent(courseId)}/topics?pageSize=${merged.pageSize}`;

  try {
    const res = await executeApi((token) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      'googleClassroom'
    );

    if (!res || !res.ok) return [];
    const data = await res.json();
    return data.topic || [];
  } catch {
    return [];
  }
}

/**
 * Student in-app action: Turn in a submission.
 */
export async function turnInClassroomSubmission(
  executeApi: ExecuteGoogleApiFn,
  courseId: string,
  courseWorkId: string,
  submissionId: string,
  config: Partial<ClassroomConfig> = {}
): Promise<{ ok: boolean; error?: string }> {
  const merged = { ...DEFAULT_CLASSROOM_CONFIG, ...config };
  const url = `${merged.apiBaseUrl}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions/${encodeURIComponent(submissionId)}:turnIn`;

  try {
    const res = await executeApi((token) =>
      fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }),
      'googleClassroom'
    );

    if (!res) return { ok: false, error: 'Authorization error' };
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error?.message || `Failed to turn in (HTTP ${res.status})` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error turning in assignment' };
  }
}

/**
 * Helper to parse Classroom Date + TimeOfDay into a standard JavaScript Date in local time.
 */
export function parseClassroomDueDate(
  dueDate?: ClassroomDate,
  dueTime?: ClassroomTimeOfDay
): Date | null {
  if (!dueDate || !dueDate.year || !dueDate.month || !dueDate.day) return null;

  // Google Classroom returns UTC due dates/times
  const year = dueDate.year;
  const month = dueDate.month - 1; // 0-indexed in JS Date
  const day = dueDate.day;
  const hours = dueTime?.hours ?? 23;
  const minutes = dueTime?.minutes ?? 59;
  const seconds = dueTime?.seconds ?? 0;

  // Construct UTC date and return
  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

/**
 * Format a Date object into human-readable deadline info.
 */
export function formatClassroomDeadline(date: Date | null): {
  dateStr: string;
  timeStr: string;
  isOverdue: boolean;
  hoursRemaining: number;
} {
  if (!date) {
    return {
      dateStr: 'No deadline',
      timeStr: '',
      isOverdue: false,
      hoursRemaining: Infinity,
    };
  }

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return {
    dateStr,
    timeStr,
    isOverdue: hoursRemaining < 0,
    hoursRemaining,
  };
}

/**
 * Dynamic mapping from Classroom CourseWork + Submission into a Sakido Task object.
 */
export function mapCourseWorkToSakidoTask(
  cw: ClassroomCourseWork,
  sub: ClassroomStudentSubmission | undefined,
  course: ClassroomCourse | undefined,
  config: Partial<ClassroomConfig> = {}
): {
  id: string;
  title: string;
  course: string;
  date: string;
  time?: string;
  completed: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  grade?: string;
  maxPoints?: number;
  assignedGrade?: number;
  classroomLink?: string;
  courseWorkId: string;
  courseId: string;
  submissionId?: string;
  submissionState?: string;
  isLate?: boolean;
} {
  const merged = { ...DEFAULT_CLASSROOM_CONFIG, ...config };
  const deadlineDate = parseClassroomDueDate(cw.dueDate, cw.dueTime);
  const { dateStr, timeStr, isOverdue, hoursRemaining } = formatClassroomDeadline(deadlineDate);

  // Priority based on variable threshold
  let priority: 'urgent' | 'high' | 'medium' | 'low' = 'low';
  if (isOverdue || hoursRemaining <= merged.urgencyThresholdHours.urgent) {
    priority = 'urgent';
  } else if (hoursRemaining <= merged.urgencyThresholdHours.high) {
    priority = 'high';
  } else if (hoursRemaining <= merged.urgencyThresholdHours.medium) {
    priority = 'medium';
  }

  const isCompleted = sub?.state === 'TURNED_IN' || sub?.state === 'RETURNED';

  let gradeStr: string | undefined = undefined;
  if (sub?.assignedGrade !== undefined && cw.maxPoints) {
    const pct = Math.round((sub.assignedGrade / cw.maxPoints) * 100);
    gradeStr = `${sub.assignedGrade}/${cw.maxPoints} (${pct}%)`;
  }

  return {
    id: `gclass-${cw.id}`,
    title: cw.title,
    course: course?.name || 'Classroom',
    date: dateStr,
    time: timeStr || undefined,
    completed: isCompleted,
    priority,
    grade: gradeStr,
    maxPoints: cw.maxPoints,
    assignedGrade: sub?.assignedGrade,
    classroomLink: cw.alternateLink,
    courseWorkId: cw.id,
    courseId: cw.courseId,
    submissionId: sub?.id,
    submissionState: sub?.state,
    isLate: Boolean(sub?.late),
  };
}

/**
 * Composite sync structure representing all fetched data from Classroom.
 */
export interface ClassroomHubData {
  courses: ClassroomCourse[];
  courseWork: Record<string, ClassroomCourseWork[]>; // keyed by courseId
  submissions: Record<string, ClassroomStudentSubmission[]>; // keyed by courseWorkId
  announcements: Record<string, ClassroomAnnouncement[]>; // keyed by courseId
  topics: Record<string, ClassroomTopic[]>; // keyed by courseId
  teachers: Record<string, ClassroomTeacher[]>; // keyed by courseId
  lastSyncedAt: string;
  errors: string[];
}

/**
 * Orchestrator: Fetches courses, coursework, submissions, announcements, and teachers
 * across all active enrolled classes concurrently with error isolation.
 */
export async function syncClassroomHubData(
  executeApi: ExecuteGoogleApiFn,
  config: Partial<ClassroomConfig> = {}
): Promise<ClassroomHubData> {
  const hubData: ClassroomHubData = {
    courses: [],
    courseWork: {},
    submissions: {},
    announcements: {},
    topics: {},
    teachers: {},
    lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    errors: [],
  };

  // 1. Fetch enrolled active courses
  const coursesRes = await fetchClassroomCourses(executeApi, config);
  if (coursesRes.error) {
    hubData.errors.push(coursesRes.error);
    return hubData;
  }

  hubData.courses = coursesRes.courses;
  if (coursesRes.courses.length === 0) {
    return hubData;
  }

  // 2. Concurrently fetch details per course with isolated error handlers
  const coursePromises = coursesRes.courses.map(async (course) => {
    try {
      const [cwList, annList, topicList, teacherList] = await Promise.all([
        fetchClassroomCourseWork(executeApi, course.id, config),
        fetchClassroomAnnouncements(executeApi, course.id, config),
        fetchClassroomTopics(executeApi, course.id, config),
        fetchClassroomTeachers(executeApi, course.id, config),
      ]);

      hubData.courseWork[course.id] = cwList;
      hubData.announcements[course.id] = annList;
      hubData.topics[course.id] = topicList;
      hubData.teachers[course.id] = teacherList;

      // 3. For each coursework item, fetch student submission
      if (cwList.length > 0) {
        const subPromises = cwList.map(async (cw) => {
          try {
            const subs = await fetchClassroomSubmissions(executeApi, course.id, cw.id, config);
            hubData.submissions[cw.id] = subs;
          } catch {
            hubData.submissions[cw.id] = [];
          }
        });
        await Promise.all(subPromises);
      }
    } catch (err: any) {
      hubData.errors.push(`Course "${course.name}": ${err.message || 'Failed to sync'}`);
    }
  });

  await Promise.allSettled(coursePromises);
  return hubData;
}
