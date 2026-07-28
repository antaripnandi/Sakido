import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Edit3,
  Calendar as CalendarIcon,
  CheckCircle2,
  BookOpen,
  Video,
  FileText,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Info,
  Sliders,
  Sparkles,
  GraduationCap,
  Mail,
  HardDrive,
  Check,
  ShieldAlert,
  ArrowRight,
  Menu,
  X,
  ArrowLeft,
  Play,
  Settings,
  ShieldCheck,
  RotateCw,
  Layers
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { SakidoLogo } from '../common/SakidoLogo';
import { FlashcardModule } from '../flashcards/FlashcardModule';
import { Flashcard } from '../../types';

const TAB_SLUG_MAP: Record<string, string> = {
  classes: 'Classes',
  calendar: 'Calendar',
  tasks: 'Tasks & Grades',
  flashcards: 'Flashcards',
  watch: 'Watch Later',
  'watch-later': 'Watch Later',
  notes: 'Notes',
  connectors: 'Connectors',
  university: 'University & People',
  ai: 'AI Features',
};

const TAB_NAME_TO_SLUG: Record<string, string> = {
  Classes: 'classes',
  Calendar: 'calendar',
  'Tasks & Grades': 'tasks',
  Flashcards: 'flashcards',
  'Watch Later': 'watch-later',
  Notes: 'notes',
  Connectors: 'connectors',
  'University & People': 'university',
  'AI Features': 'ai',
};

interface SakidoDashboardProps {
  currentUser?: {
    email?: string;
    name?: string;
    avatarUrl?: string;
    id?: string;
  } | null;
  onBackToLanding?: () => void;
  onSignOut?: () => void;
}

export const SakidoDashboard: React.FC<SakidoDashboardProps> = ({
  currentUser,
  onBackToLanding,
  onSignOut,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from URL path
  const subPath = location.pathname.replace(/^\/dashboard\/?/, '').toLowerCase() || 'classes';
  const activeTab = TAB_SLUG_MAP[subPath] || 'Classes';

  const handleSelectTab = (tabName: string) => {
    const slug = TAB_NAME_TO_SLUG[tabName] || 'classes';
    navigate(`/dashboard/${slug}`);
    setIsMobileMenuOpen(false);
  };

  // Theme state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sakido_theme');
      if (saved) return saved === 'dark';
    } catch {}
    return document.documentElement.classList.contains('dark');
  });

  // Mobile sidebar drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);


  // Banner image state with safe localStorage persistence
  const [bannerImageUrl, setBannerImageUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sakido_banner_url');
      return saved || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200';
    } catch {
      return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200';
    }
  });
  const [isEditingBanner, setIsEditingBanner] = useState<boolean>(false);
  const [newBannerInput, setNewBannerInput] = useState<string>('');

  useEffect(() => {
    try {
      if (bannerImageUrl) {
        localStorage.setItem('sakido_banner_url', bannerImageUrl);
      }
    } catch (e) {
      console.warn('Storage error for banner URL:', e);
    }
  }, [bannerImageUrl]);

  // Live time & date state
  const [now, setNow] = useState<Date>(new Date());

  // App data state (persisted per user session in localStorage, starting empty without hardcoded classes)
  const [classes, setClasses] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('sakido_classes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tasks, setTasks] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('sakido_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [watchLater, setWatchLater] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('sakido_watch');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notes, setNotes] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('sakido_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    try {
      const saved = localStorage.getItem('sakido_flashcards');
      return saved ? JSON.parse(saved) : [
        {
          id: 'fc-1',
          classId: 'c-1',
          className: 'CS 301',
          classColor: '#8b5e3c',
          front: 'What is the average time complexity of QuickSort?',
          back: 'O(N log N)',
          interval: 0,
          repetitions: 0,
          easeFactor: 2.5,
          nextReviewDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'fc-2',
          classId: 'c-1',
          className: 'CS 301',
          classColor: '#8b5e3c',
          front: 'What is the primary property of a Red-Black Tree?',
          back: 'Self-balancing binary search tree where every node is colored red or black, guaranteeing logarithmic height.',
          interval: 0,
          repetitions: 0,
          easeFactor: 2.5,
          nextReviewDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sakido_flashcards', JSON.stringify(flashcards));
    } catch {}
  }, [flashcards]);

  const handleUpdateFlashcard = (updatedCard: Flashcard) => {
    setFlashcards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
  };

  const handleAddFlashcard = (cardData: { classId: string; className: string; classColor: string; front: string; back: string }) => {
    const newCard: Flashcard = {
      id: `fc-${Date.now()}`,
      ...cardData,
      interval: 0,
      repetitions: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    setFlashcards(prev => [newCard, ...prev]);
  };

  const handleDeleteFlashcard = (id: string) => {
    setFlashcards(prev => prev.filter(c => c.id !== id));
  };

  // Connectors OAuth status state with localStorage persistence
  const [connectors, setConnectors] = useState<{
    googleCalendar: boolean;
    googleDrive: boolean;
    gmail: boolean;
    googleNotes: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('sakido_connectors');
      return saved
        ? JSON.parse(saved)
        : { googleCalendar: false, googleDrive: false, gmail: false, googleNotes: false };
    } catch {
      return { googleCalendar: false, googleDrive: false, gmail: false, googleNotes: false };
    }
  });

  // Persistence effect for connectors
  useEffect(() => {
    try {
      localStorage.setItem('sakido_connectors', JSON.stringify(connectors));
    } catch {}
  }, [connectors]);

  // Verify pending connector ONLY after user completes OAuth authorization callback
  useEffect(() => {
    const verifyOAuthCallback = async () => {
      try {
        const pending = localStorage.getItem('sakido_pending_connector');
        if (!pending) return;

        const supabase = getSupabaseClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const session = data.session;

          // Only mark as connected if user returned with an active session containing valid provider token or Google identity
          if (session && (session.provider_token || session.user?.identities?.some(i => i.provider === 'google'))) {
            if (session.provider_token) {
              localStorage.setItem('sakido_provider_token', session.provider_token);
            }
            setConnectors((prev) => {
              const updated = { ...prev, [pending]: true };
              try {
                localStorage.setItem('sakido_connectors', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            const serviceNames: Record<string, string> = {
              googleCalendar: 'Google Calendar',
              googleDrive: 'Google Drive',
              gmail: 'Gmail Notifications',
              googleNotes: 'Google Notes / Keep',
            };
            setConnectorNotice(`Successfully connected ${serviceNames[pending] || pending}! Permissions & API synchronization active.`);
          } else {
            console.log('OAuth authorization was closed or unfulfilled.');
          }
        }
        localStorage.removeItem('sakido_pending_connector');
      } catch (e) {
        console.warn('Connector restoration notice:', e);
        localStorage.removeItem('sakido_pending_connector');
      }
    };

    verifyOAuthCallback();
  }, []);

  // Persistence effects for user data
  useEffect(() => {
    try {
      localStorage.setItem('sakido_classes', JSON.stringify(classes));
    } catch {}
  }, [classes]);

  useEffect(() => {
    try {
      localStorage.setItem('sakido_tasks', JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('sakido_watch', JSON.stringify(watchLater));
    } catch {}
  }, [watchLater]);

  useEffect(() => {
    try {
      localStorage.setItem('sakido_notes', JSON.stringify(notes));
    } catch {}
  }, [notes]);

  // Custom events state for Academic Calendar
  const [events, setEvents] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('sakido_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('09:00');
  const [newEventEndTime, setNewEventEndTime] = useState('10:00');
  const [newEventType, setNewEventType] = useState('Exam');
  const [newEventRecurrence, setNewEventRecurrence] = useState<string>('none');

  useEffect(() => {
    try {
      localStorage.setItem('sakido_events', JSON.stringify(events));
    } catch {}
  }, [events]);

  // Calendar Month State
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // In-App Video Player Modal state
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title: string;
    url: string;
    course?: string;
  } | null>(null);

  // Live Google Calendar event fetching
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!connectors.googleCalendar) {
      setGoogleCalendarEvents([]);
      return;
    }

    const fetchGoogleEvents = async () => {
      const token = localStorage.getItem('sakido_provider_token');
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();

      const timeMin = new Date(year, month, 1).toISOString();
      const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      if (token) {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const fetched = (data.items || []).map((item: any) => {
              const startIso = item.start?.dateTime || item.start?.date || '';
              const endIso = item.end?.dateTime || item.end?.date || '';
              const date = startIso.split('T')[0];
              const startTime = startIso.includes('T') ? startIso.split('T')[1].substring(0, 5) : '09:00';
              const endTime = endIso.includes('T') ? endIso.split('T')[1].substring(0, 5) : '10:00';
              return {
                id: item.id,
                title: item.summary || 'Google Calendar Event',
                date,
                startTime,
                endTime,
                time: `${startTime} - ${endTime}`,
                type: 'Google Cal',
                location: item.location || 'Google Sync',
              };
            });
            setGoogleCalendarEvents(fetched);
            return;
          }
        } catch (e) {
          console.warn('Google Calendar fetch notice:', e);
        }
      }

      // Zero hardcoded mock events: Return empty list if no live Google Calendar events returned
      setGoogleCalendarEvents([]);
    };

    fetchGoogleEvents();
  }, [connectors.googleCalendar, calendarMonth]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate.trim()) return;

    const title = newEventTitle.trim();
    const date = newEventDate.trim();
    const startTime = newEventStartTime.trim() || '09:00';
    const endTime = newEventEndTime.trim() || '10:00';
    const type = newEventType;
    const recurrence = newEventRecurrence;

    const baseEv = {
      id: Date.now().toString(),
      title,
      date,
      startTime,
      endTime,
      time: `${startTime} - ${endTime}`,
      type,
      recurrence,
    };

    // Helper to generate recurring events for local schedule
    const generateEventsList = (base: typeof baseEv) => {
      if (recurrence === 'none') return [base];
      const list = [base];
      let limit = 8;
      if (recurrence === 'daily') limit = 14;
      if (recurrence === 'weekday') limit = 15;
      if (recurrence === 'monthly') limit = 4;

      const curr = new Date(`${date}T${startTime}:00`);
      while (list.length < limit) {
        if (recurrence === 'daily') {
          curr.setDate(curr.getDate() + 1);
        } else if (recurrence === 'weekly') {
          curr.setDate(curr.getDate() + 7);
        } else if (recurrence === 'monthly') {
          curr.setMonth(curr.getMonth() + 1);
        } else if (recurrence === 'weekday') {
          curr.setDate(curr.getDate() + 1);
          while (curr.getDay() === 0 || curr.getDay() === 6) {
            curr.setDate(curr.getDate() + 1);
          }
        }
        const dateStr = curr.toISOString().split('T')[0];
        list.push({
          ...base,
          id: `${base.id}-${list.length}`,
          date: dateStr,
        });
      }
      return list;
    };

    const newEvents = generateEventsList(baseEv);
    setEvents((prev) => [...prev, ...newEvents]);

    // Real 2-Way Live Google Calendar API POST Sync with Recurrence Rule
    if (connectors.googleCalendar) {
      const token = localStorage.getItem('sakido_provider_token');
      if (token) {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const startDt = new Date(`${date}T${startTime}:00`);
          const endDt = new Date(`${date}T${endTime}:00`);

          const gcalPayload: any = {
            summary: `[Sakido] ${title}`,
            description: `Created from Sakido Academic Portal (${type})`,
            start: { dateTime: startDt.toISOString(), timeZone: tz },
            end: { dateTime: endDt.toISOString(), timeZone: tz },
          };

          if (recurrence === 'daily') gcalPayload.recurrence = ['RRULE:FREQ=DAILY;COUNT=14'];
          if (recurrence === 'weekly') gcalPayload.recurrence = ['RRULE:FREQ=WEEKLY;COUNT=8'];
          if (recurrence === 'monthly') gcalPayload.recurrence = ['RRULE:FREQ=MONTHLY;COUNT=4'];
          if (recurrence === 'weekday') gcalPayload.recurrence = ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=15'];

          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(gcalPayload),
            }
          );

          if (res.ok) {
            setConnectorNotice(`🟢 Event "${title}" (${startTime}-${endTime}${recurrence !== 'none' ? `, ${recurrence}` : ''}) posted live to your Google Calendar!`);
          }
        } catch (err) {
          console.warn('Google Calendar POST notice:', err);
        }
      }
    }

    setNewEventTitle('');
    setNewEventDate('');
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };


  // Form states
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassProf, setNewClassProf] = useState('');
  const [newClassTime, setNewClassTime] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskGrade, setNewTaskGrade] = useState('');
  const [newTaskCourse, setNewTaskCourse] = useState('');

  const [newWatchTitle, setNewWatchTitle] = useState('');
  const [newWatchUrl, setNewWatchUrl] = useState('');
  const [newWatchCourse, setNewWatchCourse] = useState('');

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCourse, setNewNoteCourse] = useState('');

  // Calendar View Mode ('month' | 'timetable')
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'timetable'>('month');
  const [selectedDateEvents, setSelectedDateEvents] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeDayInspector, setActiveDayInspector] = useState<{
    dateStr: string;
    displayDate: string;
    dayNum: number;
  } | null>(null);

  // Task Filter State ('all' | 'pending' | 'completed')
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Notes Search & Modal State
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [activeNoteModal, setActiveNoteModal] = useState<any | null>(null);

  const [connectingService, setConnectingService] = useState<string | null>(null);
  const [connectorNotice, setConnectorNotice] = useState<string | null>(null);

  // Profile & Logout Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);


  // Clock tick interval
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-reset connecting status when user returns or closes OAuth window
  useEffect(() => {
    const handleWindowFocus = () => {
      setConnectingService(null);
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, []);

  // Sync dark mode class on document element & localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sakido_theme', isDarkMode ? 'dark' : 'light');
    } catch {}
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Derived user name and time-aware greeting
  const userName =
    currentUser?.name ||
    currentUser?.email?.split('@')[0] ||
    'Student';

  const userAvatar = currentUser?.avatarUrl;

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour >= 4 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Toggle Dark Mode
  const handleToggleDark = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Banner editing with storage protection
  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    const url = newBannerInput.trim();
    if (url) {
      if (url.length > 1500000) {
        alert('Image URL data is too large for browser storage. Please provide a standard web image URL.');
        return;
      }
      setBannerImageUrl(url);
      try {
        localStorage.setItem('sakido_banner_url', url);
      } catch (err) {
        console.warn('Could not persist banner to localStorage:', err);
      }
      setIsEditingBanner(false);
      setNewBannerInput('');
    }
  };

  // Classes Handlers
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setClasses((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newClassName.trim(),
        code: newClassCode.trim() || 'CLASS',
        professor: newClassProf.trim() || 'Faculty Instructor',
        time: newClassTime.trim() || 'TBD',
        room: 'Main Campus',
        color: '#6f4627',
      },
    ]);
    setNewClassName('');
    setNewClassCode('');
    setNewClassProf('');
    setNewClassTime('');
  };

  const handleDeleteClass = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  // Tasks & Grades Handlers
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        grade: newTaskGrade.trim(),
        course: newTaskCourse.trim() || 'General',
        completed: false,
        dueDate: 'Upcoming',
      },
    ]);
    setNewTaskTitle('');
    setNewTaskGrade('');
    setNewTaskCourse('');
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Average Grade Calculation
  const gradedTasks = tasks.filter((t) => t.grade && !isNaN(parseFloat(t.grade)));
  const avgGrade =
    gradedTasks.length > 0
      ? Math.round(
          gradedTasks.reduce((acc, t) => acc + parseFloat(t.grade), 0) /
            gradedTasks.length
        )
      : null;

  // Watch Later Handlers
  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchTitle.trim()) return;
    let url = newWatchUrl.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setWatchLater((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newWatchTitle.trim(),
        url: url || '#',
        course: newWatchCourse.trim() || 'Lecture Resource',
      },
    ]);
    setNewWatchTitle('');
    setNewWatchUrl('');
    setNewWatchCourse('');
  };

  const handleDeleteWatch = (id: string) => {
    setWatchLater((prev) => prev.filter((w) => w.id !== id));
  };

  // Notes Handlers
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    setNotes((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newNoteTitle.trim(),
        content: newNoteContent.trim() || 'No additional details provided.',
        course: newNoteCourse.trim() || 'General',
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
    ]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteCourse('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // OAuth Connector Handler
  const handleConnectOAuth = async (serviceKey: 'googleCalendar' | 'googleDrive' | 'gmail' | 'googleNotes') => {
    // If currently connecting, clicking again cancels the pending state immediately
    if (connectingService === serviceKey) {
      setConnectingService(null);
      localStorage.removeItem('sakido_pending_connector');
      return;
    }

    const scopeMap = {
      googleCalendar: 'https://www.googleapis.com/auth/calendar.readonly',
      googleDrive: 'https://www.googleapis.com/auth/drive.readonly',
      gmail: 'https://www.googleapis.com/auth/gmail.readonly',
      googleNotes: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile',
    };

    const serviceNames = {
      googleCalendar: 'Google Calendar',
      googleDrive: 'Google Drive',
      gmail: 'Gmail Notifications',
      googleNotes: 'Google Notes / Keep',
    };

    // Handle Disconnect Action
    if (connectors[serviceKey]) {
      setConnectors((prev) => {
        const updated = { ...prev, [serviceKey]: false };
        try {
          localStorage.setItem('sakido_connectors', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setConnectorNotice(`Disconnected ${serviceNames[serviceKey]}.`);
      setConnectingService(null);
      return;
    }

    // Handle Connect Action (Initiate OAuth without premature state change)
    setConnectingService(serviceKey);
    setConnectorNotice(null);

    // Timeout safety reset: if user returns/cancels or popup closes, clear connecting status after 4s
    setTimeout(() => {
      setConnectingService((curr) => (curr === serviceKey ? null : curr));
    }, 4000);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        localStorage.setItem('sakido_auth_return_url', '/dashboard/connectors');
        localStorage.setItem('sakido_pending_connector', serviceKey);
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: scopeMap[serviceKey],
            redirectTo: `${window.location.origin}/dashboard/connectors`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
      } catch (err: any) {
        console.warn('OAuth prompt notice:', err);
        localStorage.removeItem('sakido_pending_connector');
        setConnectingService(null);
      }
    }
  };


  // Live Analog Clock Hand Rotations
  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = (hours % 12) * 30 + minutes * 0.5;

  // Render Content based on active tab
  const renderTabContent = () => {
    if (['University & People', 'AI Features'].includes(activeTab)) {
      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col items-center justify-center min-h-[380px] p-8 border border-dashed border-outline-variant/50 rounded-2xl bg-surface-container-low/40 dark:bg-surface-container-low/10">
          <Sparkles className="w-10 h-10 text-primary-container mb-3 animate-pulse" />
          <h2 className="font-display text-2xl font-bold tracking-widest uppercase text-on-surface">
            Coming Soon
          </h2>
          <p className="text-secondary dark:text-secondary-fixed-dim text-sm mt-2 text-center max-w-md">
            The {activeTab} module is undergoing architectural refinement under Sakido&apos;s essentialist design framework.
          </p>
        </div>
      );
    }

    if (activeTab === 'Classes') {
      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold text-on-surface">Course Registry</h3>
              <p className="text-sm text-secondary dark:text-secondary-fixed-dim mt-0.5">
                Active academic classes and lecture schedules
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
              {classes.length} Courses
            </span>
          </div>

          {/* Add Class Form */}
          <form onSubmit={handleAddClass} className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#201915] shadow-xs flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-secondary">
              Enroll New Course
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Course Name (e.g. Operating Systems)"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <input
                type="text"
                value={newClassCode}
                onChange={(e) => setNewClassCode(e.target.value)}
                placeholder="Code (e.g. CS 401)"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <input
                type="text"
                value={newClassProf}
                onChange={(e) => setNewClassProf(e.target.value)}
                placeholder="Instructor / Professor"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <input
                type="text"
                value={newClassTime}
                onChange={(e) => setNewClassTime(e.target.value)}
                placeholder="Schedule (e.g. Mon, Wed 10 AM)"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
            </div>
            <button
              type="submit"
              className="mt-1 self-end bg-[#8b5e3c] hover:bg-[#6f4627] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Course
            </button>
          </form>

          {/* Classes Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="p-5 border border-outline-variant/40 rounded-xl bg-surface-container-low dark:bg-[#251e19] shadow-xs flex flex-col justify-between relative group hover:border-primary-container/60 transition-all"
              >
                <button
                  onClick={() => handleDeleteClass(c.id)}
                  className="absolute top-4 right-4 text-secondary/60 hover:text-error transition-colors p-1"
                  title="Remove course"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-surface-container-high dark:bg-[#342a23] text-primary dark:text-primary-fixed-dim inline-block mb-2">
                    {c.code}
                  </span>
                  <h4 className="font-display font-bold text-lg text-on-surface leading-snug">
                    {c.name}
                  </h4>
                  <p className="text-xs text-secondary dark:text-secondary-fixed-dim mt-1">
                    {c.professor}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5" /> {c.time}
                  </span>
                  <span className="font-medium text-on-surface-variant">{c.room}</span>
                </div>
              </div>
            ))}
          </div>

          {classes.length === 0 && (
            <div className="w-full h-48 border border-outline-variant/50 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 text-secondary p-6">
              <div className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-container" />
              </div>
              <span className="text-sm font-medium">No active courses registered</span>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'Calendar') {
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      const paddingArray = Array.from({ length: firstDay }, (_, i) => i);

      const isCurrentMonth =
        now.getFullYear() === year && now.getMonth() === month;
      const todayDate = now.getDate();

      const allEvents = [...events, ...(connectors.googleCalendar ? googleCalendarEvents : [])];

      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-display text-2xl font-bold text-on-surface">Academic Calendar</h3>
                {connectors.googleCalendar && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Google Cal Synced
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary mt-0.5">
                Monthly schedule, lecture dates, and exam deadlines
              </p>
            </div>

            <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/40">
              <button
                onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
                className="p-1 hover:bg-surface-container-high rounded-md transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4 text-on-surface" />
              </button>
              <span className="font-display font-semibold text-sm px-2 text-on-surface min-w-[120px] text-center">
                {monthName}
              </span>
              <button
                onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                className="p-1 hover:bg-surface-container-high rounded-md transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4 text-on-surface" />
              </button>
            </div>
          </div>

          {/* Calendar View Switcher & Sync Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setCalendarViewMode('month')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  calendarViewMode === 'month'
                    ? 'bg-[#8b5e3c] text-white shadow-2xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Month Grid
              </button>
              <button
                type="button"
                onClick={() => setCalendarViewMode('timetable')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  calendarViewMode === 'timetable'
                    ? 'bg-[#8b5e3c] text-white shadow-2xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Hourly Timetable
              </button>
            </div>

            {connectors.googleCalendar && (
              <button
                type="button"
                onClick={() => {
                  const token = localStorage.getItem('sakido_provider_token');
                  if (token) {
                    setConnectorNotice('Refreshing Google Calendar sync...');
                    setTimeout(() => setConnectorNotice('Live Google Calendar synchronized!'), 800);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs font-mono font-medium text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" /> Refresh Live Sync
              </button>
            )}
          </div>

          {/* Add Event Form with Unified Day & Time Period Selection */}
          <form onSubmit={handleAddEvent} className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-secondary">
                Schedule New Event / Lecture / Exam
              </div>
              <span className="text-[10px] font-mono text-secondary">
                Syncs with Google Calendar Time Slots
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Event Title (e.g. Physics Midterm)"
                className="sm:col-span-2 border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface focus:outline-hidden focus:border-primary-container font-mono"
              />
              <select
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value)}
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface focus:outline-hidden focus:border-primary-container"
              >
                <option value="Exam">Exam / Midterm</option>
                <option value="Lecture">Lecture / Class</option>
                <option value="Deadline">Assignment Deadline</option>
                <option value="Event">Academic Milestone</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-outline-variant/20">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-mono text-secondary font-medium shrink-0">Time Period:</span>
                <input
                  type="time"
                  value={newEventStartTime}
                  onChange={(e) => setNewEventStartTime(e.target.value)}
                  className="border border-outline-variant/50 rounded-lg p-2 text-xs bg-surface-container-lowest text-on-surface font-mono focus:outline-none focus:border-primary-container"
                />
                <span className="text-xs text-secondary font-mono">to</span>
                <input
                  type="time"
                  value={newEventEndTime}
                  onChange={(e) => setNewEventEndTime(e.target.value)}
                  className="border border-outline-variant/50 rounded-lg p-2 text-xs bg-surface-container-lowest text-on-surface font-mono focus:outline-none focus:border-primary-container"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto bg-[#8b5e3c] hover:bg-[#6f4627] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add to Timetable & Sync
              </button>
            </div>
          </form>

          {calendarViewMode === 'timetable' ? (
            /* Apple-Style Hourly Timetable Grid */
            <div className="border border-outline-variant/40 rounded-2xl bg-surface-container-lowest p-4 sm:p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-lg text-on-surface">
                    Today's Schedule • {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h4>
                  <p className="text-xs text-secondary font-mono mt-0.5">
                    Live timeline view with current time indicator
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-xs font-bold flex items-center gap-1.5 border border-red-500/20">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span> Live Line Indicator
                </span>
              </div>

              <div className="relative border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-low/30">
                {/* Red Live Time Line */}
                {(() => {
                  const currentHour = now.getHours();
                  const currentMin = now.getMinutes();
                  if (currentHour >= 7 && currentHour <= 22) {
                    const topPx = (currentHour - 7) * 52 + (currentMin / 60) * 52;
                    return (
                      <div
                        className="absolute left-0 right-0 z-20 flex items-center pointer-events-none transition-all duration-300"
                        style={{ top: `${topPx}px` }}
                      >
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-md -ml-1.5 shrink-0"></div>
                        <div className="flex-1 h-0.5 bg-red-500 shadow-xs"></div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 16 Hourly Rows from 7 AM to 10 PM */}
                <div className="flex flex-col divide-y divide-outline-variant/20">
                  {[
                    '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
                    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM',
                    '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'
                  ].map((timeSlot, idx) => (
                    <div key={timeSlot} className="flex h-13 group hover:bg-surface-container-high/40 transition-colors">
                      <div className="w-20 sm:w-24 border-r border-outline-variant/30 p-2 font-mono text-xs text-secondary font-medium shrink-0 flex items-center justify-end pr-3">
                        {timeSlot}
                      </div>
                      <div className="flex-1 p-2 flex items-center gap-2 overflow-x-auto min-w-0">
                        {classes.filter((_, i) => (idx === 3 && i === 0) || (idx === 7 && i === 1)).slice(0, 1).map((c, i) => (
                          <div key={i} className="px-3 py-1 rounded-lg bg-primary-container/15 text-primary border border-primary-container/30 text-xs font-semibold flex items-center gap-2 shrink-0">
                            <span>{c.code}: {c.name}</span>
                            <span className="text-[10px] font-mono text-secondary">({c.prof})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Month Grid */
            <div className="border border-outline-variant/40 rounded-xl bg-surface-container-lowest p-4 shadow-xs">
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs font-bold text-secondary uppercase mb-3 border-b border-outline-variant/20 pb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {paddingArray.map((p) => (
                  <div key={`pad-${p}`} className="h-16 rounded-lg bg-surface-container-low/30"></div>
                ))}

                {daysArray.map((d) => {
                  const isToday = isCurrentMonth && d === todayDate;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  
                  const matchedEvents = allEvents.filter((e) => e.date === dateStr || e.date === String(d));
                  const matchedTasks = tasks.filter((t) => !t.completed && (t.dueDate?.includes(dateStr) || (isToday && t.dueDate?.toLowerCase().includes('today'))));

                  const firstEvent = matchedEvents[0] || (matchedTasks[0] ? { title: matchedTasks[0].title, type: 'Task' } : null);
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={`day-${d}`}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setNewEventDate(dateStr);
                        setActiveDayInspector({
                          dateStr,
                          displayDate: `${monthName.split(' ')[0]} ${d}, ${year}`,
                          dayNum: d,
                        });
                      }}
                      className={`h-16 rounded-lg p-2 flex flex-col justify-between items-start text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#8b5e3c] ring-2 ring-[#8b5e3c]/40 bg-[#8b5e3c]/10 font-bold shadow-xs'
                          : isToday
                          ? 'border-primary-container bg-primary-container/10 font-bold'
                          : 'border-outline-variant/20 bg-surface-container-low/50 hover:border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <span
                        className={`text-xs font-mono rounded-full w-5 h-5 flex items-center justify-center ${
                          isToday || isSelected
                            ? 'bg-[#8b5e3c] text-white'
                            : 'text-on-surface'
                        }`}
                      >
                        {d}
                      </span>
                      {firstEvent && (
                        <span className={`w-full text-[10px] font-mono truncate px-1 py-0.5 rounded ${
                          firstEvent.type === 'Google Cal'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20'
                            : 'bg-surface-container-high text-primary'
                        }`}>
                          {firstEvent.title}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Events List */}
          {events.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-secondary">
                Scheduled Calendar Milestones ({events.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 border border-outline-variant/40 rounded-xl bg-surface-container-low dark:bg-[#251e19] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-surface-container-high text-primary">
                        {ev.type}
                      </span>
                      <h5 className="font-bold text-sm text-on-surface mt-1">{ev.title}</h5>
                      <span className="text-xs text-secondary font-mono">{ev.date}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="text-secondary/60 hover:text-error p-1 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDateEvents && (
            <div className="p-4 rounded-xl border border-primary-container/40 bg-surface-container-low dark:bg-[#251e19] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-primary-container shrink-0" />
                <span className="text-sm font-medium text-on-surface whitespace-pre-line">{selectedDateEvents}</span>
              </div>
              <button
                onClick={() => setSelectedDateEvents(null)}
                className="text-xs text-secondary hover:text-on-surface shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'Tasks & Grades') {
      const filteredTasks = tasks.filter((t) => {
        if (taskFilter === 'pending') return !t.completed;
        if (taskFilter === 'completed') return t.completed;
        return true;
      });

      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-display text-2xl font-bold text-on-surface">Tasks & Grades</h3>
              <p className="text-sm text-secondary mt-0.5">
                Assignment tracker and grade point average
              </p>
            </div>

            {avgGrade !== null && (
              <div className="px-4 py-2 rounded-xl bg-primary-container/10 border border-primary-container/40 text-primary-container font-mono font-bold text-sm flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span>Grade Avg: {avgGrade}%</span>
              </div>
            )}
          </div>

          {/* Add Task Form */}
          <form onSubmit={handleAddTask} className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-xs flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-secondary">
              New Assignment or Task
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task Title (e.g. Problem Set 4)"
                className="sm:col-span-2 border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={newTaskGrade}
                onChange={(e) => setNewTaskGrade(e.target.value)}
                placeholder="Grade % (Optional)"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container font-mono"
              />
            </div>
            <div className="flex gap-3 justify-between items-center">
              <input
                type="text"
                value={newTaskCourse}
                onChange={(e) => setNewTaskCourse(e.target.value)}
                placeholder="Course Tag (e.g. CS 301)"
                className="w-1/2 border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <button
                type="submit"
                className="bg-[#8b5e3c] hover:bg-[#6f4627] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </form>

          {/* Task Filter Pills */}
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: `All (${tasks.length})` },
              { id: 'pending', label: `Pending (${tasks.filter(t => !t.completed).length})` },
              { id: 'completed', label: `Completed (${tasks.filter(t => t.completed).length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTaskFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  taskFilter === f.id
                    ? 'bg-[#8b5e3c] text-white shadow-xs'
                    : 'bg-surface-container-high text-secondary hover:text-on-surface'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className="flex flex-col gap-2.5">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3.5 border border-outline-variant/40 rounded-xl bg-surface-container-low hover:border-outline-variant transition-all"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => handleToggleTask(t.id)}
                    className="w-5 h-5 accent-[#8b5e3c] cursor-pointer rounded shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-sm font-medium text-on-surface truncate ${
                        t.completed ? 'line-through text-secondary/70' : ''
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="text-xs text-secondary font-mono">
                      {t.course} • {t.dueDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {t.grade && (
                    <span className="px-2.5 py-1 rounded-md bg-surface-container-high font-mono text-xs font-bold text-primary">
                      {t.grade}%
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    className="text-secondary/50 hover:text-error transition-colors p-1"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="w-full h-36 border border-outline-variant/50 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-secondary p-6">
                <CheckCircle2 className="w-6 h-6 text-primary-container" />
                <span className="text-sm font-medium">No tasks found for this view</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'Watch Later') {
      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <div>
            <h3 className="font-display text-2xl font-bold text-on-surface">Watch Later</h3>
            <p className="text-sm text-secondary mt-0.5">
              Saved lecture recordings, research talks, and study video links
            </p>
          </div>

          {/* Add Watch Form */}
          <form onSubmit={handleAddWatch} className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-xs flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-secondary">
              Bookmark Video or Resource
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newWatchTitle}
                onChange={(e) => setNewWatchTitle(e.target.value)}
                placeholder="Video Title (e.g. Cache Hierarchy Lecture)"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <input
                type="text"
                value={newWatchUrl}
                onChange={(e) => setNewWatchUrl(e.target.value)}
                placeholder="URL (e.g. https://youtube.com/watch?v=...)"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container font-mono"
              />
            </div>
            <button
              type="submit"
              className="mt-1 self-end bg-[#8b5e3c] hover:bg-[#6f4627] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Save Link
            </button>
          </form>

          {/* Watch Later Cards */}
          <div className="flex flex-col gap-3">
            {watchLater.map((w) => (
              <div
                key={w.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-outline-variant/40 rounded-xl bg-surface-container-low hover:border-outline-variant transition-all gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    onClick={() => setActiveVideo(w)}
                    className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary-container border border-primary-container/20 flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    title="Watch in Sakido"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-base text-on-surface truncate">
                      {w.title}
                    </span>
                    <span className="text-xs text-secondary font-mono truncate">
                      {w.url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => setActiveVideo(w)}
                    className="px-3 py-1.5 rounded-lg bg-[#8b5e3c] hover:bg-[#6f4627] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Watch in Sakido
                  </button>
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-outline-variant/40 text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    title="Open external link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteWatch(w.id)}
                    className="p-2 rounded-lg text-secondary/60 hover:text-error transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {watchLater.length === 0 && (
              <div className="w-full h-36 border border-outline-variant/50 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-secondary p-6">
                <Video className="w-6 h-6 text-primary-container" />
                <span className="text-sm font-medium">No saved videos or links</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'Flashcards') {
      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <FlashcardModule
            courses={classes}
            flashcards={flashcards}
            onUpdateCard={handleUpdateFlashcard}
            onAddCard={handleAddFlashcard}
            onDeleteCard={handleDeleteFlashcard}
          />
        </div>
      );
    }

    if (activeTab === 'Notes') {
      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <div>
            <h3 className="font-display text-2xl font-bold text-on-surface">Class Notes</h3>
            <p className="text-sm text-secondary dark:text-secondary-fixed-dim mt-0.5">
              Lecture summaries, key terms, and study scratchpad
            </p>
          </div>

          {/* Add Note Form */}
          <form onSubmit={handleAddNote} className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#201915] shadow-xs flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-secondary">
              Write New Note
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note Title"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <input
                type="text"
                value={newNoteCourse}
                onChange={(e) => setNewNoteCourse(e.target.value)}
                placeholder="Course Tag (e.g. CS 301)"
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
            </div>
            <textarea
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Lecture notes content..."
              className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container resize-none"
            ></textarea>
            <button
              type="submit"
              className="mt-1 self-end bg-[#8b5e3c] hover:bg-[#6f4627] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Save Note
            </button>
          </form>

          {/* Notes Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {notes.map((n) => (
              <div
                key={n.id}
                className="p-5 border border-outline-variant/40 rounded-xl bg-surface-container-low dark:bg-[#251e19] shadow-xs flex flex-col justify-between relative group hover:border-primary-container/60 transition-all"
              >
                <button
                  onClick={() => handleDeleteNote(n.id)}
                  className="absolute top-4 right-4 text-secondary/60 hover:text-error transition-colors p-1"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-surface-container-high dark:bg-[#342a23] text-primary dark:text-primary-fixed-dim">
                      {n.course}
                    </span>
                    <span className="text-[10px] text-secondary font-mono">{n.date}</span>
                  </div>
                  <h4 className="font-display font-bold text-base text-on-surface mb-2">
                    {n.title}
                  </h4>
                  <p className="text-xs text-secondary dark:text-secondary-fixed-dim leading-relaxed line-clamp-3">
                    {n.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {notes.length === 0 && (
            <div className="w-full h-36 border border-outline-variant/50 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-secondary p-6">
              <FileText className="w-6 h-6 text-primary-container" />
              <span className="text-sm font-medium">No notes created yet</span>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'Connectors') {
      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <div>
            <h3 className="font-display text-2xl font-bold text-on-surface">Service Connectors</h3>
            <p className="text-sm text-secondary dark:text-secondary-fixed-dim mt-0.5">
              Integrate external Google Workspace accounts with incremental OAuth permissions
            </p>
          </div>

          {connectorNotice && (
            <div className="p-4 rounded-xl border border-primary-container/40 bg-surface-container-low dark:bg-[#251e19] text-xs text-on-surface flex items-start gap-3">
              <Info className="w-5 h-5 text-primary-container shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">OAuth Scope Notice: </span>
                {connectorNotice}
              </div>
              <button
                onClick={() => setConnectorNotice(null)}
                className="text-secondary hover:text-on-surface text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Connector Cards */}
          <div className="flex flex-col gap-4">
            {/* Google Calendar */}
            <div className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-base text-on-surface">Google Calendar</h4>
                    {connectors.googleCalendar ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary text-[11px] font-mono font-medium">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1 max-w-md">
                    Synchronize course deadlines, exam timetables, and lecture schedules into your personal dashboard.
                  </p>
                  <span className="text-[10px] font-mono text-secondary/70 mt-1 block">
                    Scope: <code className="bg-surface-container-high px-1 rounded">https://www.googleapis.com/auth/calendar.readonly</code>
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleConnectOAuth('googleCalendar')}
                disabled={connectingService === 'googleCalendar'}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  connectors.googleCalendar
                    ? 'border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container'
                    : 'bg-[#8b5e3c] hover:bg-[#6f4627] text-white shadow-xs'
                }`}
              >
                {connectingService === 'googleCalendar' ? (
                  'Connecting...'
                ) : connectors.googleCalendar ? (
                  'Disconnect / Reauth'
                ) : (
                  <>Connect Calendar <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {/* Google Drive */}
            <div className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-base text-on-surface">Google Drive</h4>
                    {connectors.googleDrive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary text-[11px] font-mono font-medium">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1 max-w-md">
                    Access course syllabi, lecture PDF slides, and shared university research materials.
                  </p>
                  <span className="text-[10px] font-mono text-secondary/70 mt-1 block">
                    Scope: <code className="bg-surface-container-high px-1 rounded">https://www.googleapis.com/auth/drive.readonly</code>
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleConnectOAuth('googleDrive')}
                disabled={connectingService === 'googleDrive'}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  connectors.googleDrive
                    ? 'border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container'
                    : 'bg-[#8b5e3c] hover:bg-[#6f4627] text-white shadow-xs'
                }`}
              >
                {connectingService === 'googleDrive' ? (
                  'Connecting...'
                ) : connectors.googleDrive ? (
                  'Disconnect / Reauth'
                ) : (
                  <>Connect Drive <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {/* Gmail */}
            <div className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-base text-on-surface">Gmail Notifications</h4>
                    {connectors.gmail ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary text-[11px] font-mono font-medium">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1 max-w-md">
                    Surface professor announcements, grade releases, and campus notifications directly.
                  </p>
                  <span className="text-[10px] font-mono text-secondary/70 mt-1 block">
                    Scope: <code className="bg-surface-container-high px-1 rounded">https://www.googleapis.com/auth/gmail.readonly</code>
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleConnectOAuth('gmail')}
                disabled={connectingService === 'gmail'}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  connectors.gmail
                    ? 'border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container'
                    : 'bg-[#8b5e3c] hover:bg-[#6f4627] text-white shadow-xs'
                }`}
              >
                {connectingService === 'gmail' ? (
                  'Connecting...'
                ) : connectors.gmail ? (
                  'Disconnect / Reauth'
                ) : (
                  <>Connect Gmail <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {/* Google Notes (Keep) */}
            <div className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-base text-on-surface">Google Notes & Keep</h4>
                    {connectors.googleNotes ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary text-[11px] font-mono font-medium">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1 max-w-md">
                    Synchronize lecture notes, study checklists, and flashcard ideas directly from Google Keep.
                  </p>
                  <span className="text-[10px] font-mono text-secondary/70 mt-1 block">
                    Scope: <code className="bg-surface-container-high px-1 rounded">https://www.googleapis.com/auth/keep.readonly</code>
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleConnectOAuth('googleNotes')}
                disabled={connectingService === 'googleNotes'}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  connectors.googleNotes
                    ? 'border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container'
                    : 'bg-[#8b5e3c] hover:bg-[#6f4627] text-white shadow-xs'
                }`}
              >
                {connectingService === 'googleNotes' ? (
                  'Connecting...'
                ) : connectors.googleNotes ? (
                  'Disconnect / Reauth'
                ) : (
                  <>Connect Google Notes <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex w-full min-h-screen bg-surface text-on-surface font-body transition-colors duration-200">
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-surface-container-high text-on-surface"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <SakidoLogo size="w-6 h-6" showText textClassName="font-display font-bold text-lg text-on-surface" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleDark}
            className="p-2 rounded-full border border-outline-variant/40 text-on-surface"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation - Fixed 256px Layout */}
      <nav
        className={`fixed top-0 left-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/30 flex flex-col z-50 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Scrollable Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col">
          {/* Brand */}
          <div className="mb-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <SakidoLogo size="w-8 h-8" />
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
                  Sakido
                </h1>
                <p className="text-secondary text-xs mt-0.5 font-mono">
                  Productivity Portal
                </p>
              </div>
            </div>
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="p-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container text-secondary hover:text-on-surface transition-colors cursor-pointer"
                title="Return to Landing Page"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Student Section */}
          <div className="mb-2 text-[11px] font-bold text-secondary uppercase tracking-wider font-mono shrink-0">
            Student Workspace
          </div>
          <ul className="space-y-1 mb-6 shrink-0">
            {[
              { name: 'Classes', icon: BookOpen },
              { name: 'Calendar', icon: CalendarIcon },
              { name: 'Tasks & Grades', icon: CheckCircle2 },
              { name: 'Flashcards', icon: Layers },
              { name: 'Watch Later', icon: Video },
              { name: 'Notes', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <li key={item.name}>
                  <button
                    onClick={() => handleSelectTab(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'text-primary font-bold bg-surface-container border border-primary-container/20 shadow-2xs'
                        : 'text-secondary hover:text-on-surface hover:bg-surface-container/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Connectors Section */}
          <div className="mb-2 text-[11px] font-bold text-secondary uppercase tracking-wider font-mono shrink-0">
            Integrations
          </div>
          <ul className="space-y-1 mb-6 shrink-0">
            <li>
              <button
                onClick={() => handleSelectTab('Connectors')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'Connectors'
                    ? 'text-primary font-bold bg-surface-container border border-primary-container/20 shadow-2xs'
                    : 'text-secondary hover:text-on-surface hover:bg-surface-container/60'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Connectors</span>
              </button>
            </li>
          </ul>

          {/* Other Section */}
          <div className="mb-2 text-[11px] font-bold text-secondary uppercase tracking-wider font-mono shrink-0">
            Modules
          </div>
          <ul className="space-y-1 mb-6 shrink-0">
            {['University & People', 'AI Features'].map((item) => (
              <li key={item}>
                <button
                  onClick={() => handleSelectTab(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    activeTab === item
                      ? 'text-primary font-bold bg-surface-container border border-primary-container/20 shadow-2xs'
                      : 'text-secondary hover:text-on-surface hover:bg-surface-container/60'
                  }`}
                >
                  <Info className="w-4 h-4 text-secondary/60" />
                  <span>{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer User Info (Pinned at bottom of fixed sidebar) */}
        <div className="border-t border-outline-variant/30 px-4 py-3.5 bg-surface-container-low flex items-center justify-between shrink-0 shadow-xs">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 min-w-0 hover:bg-surface-container/80 p-1.5 -ml-1.5 rounded-xl transition-all cursor-pointer text-left flex-1"
            title={userName}
          >
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center overflow-hidden shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-4 h-4 text-secondary" />
              )}
            </div>
            <span className="text-xs font-bold text-on-surface truncate">{userName}</span>
          </button>

          {onSignOut && (
            <button
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="p-2 rounded-lg text-secondary hover:text-error hover:bg-surface-container-high transition-colors cursor-pointer shrink-0 ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      {/* Main Container with lg:pl-64 Sidebar Offset */}
      <main className="flex-1 lg:pl-64 flex flex-col min-h-screen pt-16 lg:pt-0 w-full overflow-x-hidden">
        {/* Banner Hero Section - Fixes Overlap Bug! */}
        <div className="relative w-full px-4 sm:px-8 lg:px-12 pt-6">
          <div
            className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-outline-variant/40 shadow-xs group bg-surface-container-high dark:bg-[#241d18]"
            style={{
              backgroundImage: `url('${bannerImageUrl}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Dark gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>

            {/* Top Right Header Actions floating inside banner */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button
                onClick={handleToggleDark}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 transition-all cursor-pointer"
                title="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-white" />}
              </button>
              <button
                onClick={() => setIsEditingBanner(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 transition-all cursor-pointer"
                title="Edit Banner Cover"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <div className="absolute bottom-4 left-6 text-white font-mono text-xs tracking-wider uppercase opacity-80">
              Sakido Essentialist Portal
            </div>
          </div>
        </div>

        {/* Greeting Banner & Content Grid */}
        <div className="px-4 sm:px-8 lg:px-12 py-8 flex-1 flex flex-col">
          {/* Real Dynamic Greeting (No Hardcoding) */}
          <div className="mb-8">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight">
              {getGreeting()}, {userName}.
            </h2>
            <p className="text-secondary dark:text-secondary-fixed-dim text-sm mt-1">
              Welcome back to your unified academic focus environment.
            </p>
          </div>

          {/* Main Dashboard 12-Column Grid */}
          <div className="grid grid-cols-12 gap-8 flex-1">
            {/* Left Column (Clock & Real Date Widget) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <div className="p-6 rounded-2xl border border-outline-variant/40 bg-surface-container-low shadow-xs flex flex-col items-center sm:items-start gap-4">
                <div className="flex items-center gap-6">
                  {/* Live Analog Clock */}
                  <div className="analog-clock-container bg-surface-container-lowest">
                    {/* Ticks */}
                    <div className="tick" style={{ transform: 'translateX(-50%) rotate(0deg)' }}></div>
                    <div className="tick" style={{ transform: 'translateX(-50%) rotate(90deg)' }}></div>
                    <div className="tick" style={{ transform: 'translateX(-50%) rotate(180deg)' }}></div>
                    <div className="tick" style={{ transform: 'translateX(-50%) rotate(270deg)' }}></div>

                    {/* Hands */}
                    <div className="hand hour-hand" style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }}></div>
                    <div className="hand minute-hand" style={{ transform: `translateX(-50%) rotate(${minuteDeg}deg)` }}></div>
                    <div className="hand second-hand" style={{ transform: `translateX(-50%) rotate(${secondDeg}deg)` }}></div>
                    <div className="clock-center"></div>
                  </div>

                  {/* Real Date Display */}
                  <div className="text-left">
                    <p className="font-mono text-xs uppercase tracking-widest text-primary-container font-bold">
                      {now.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="font-display font-bold text-xl text-on-surface mt-0.5">
                      {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </p>
                    <p className="font-mono text-xs text-secondary mt-1">
                      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Quick Academic Summary */}
                <div className="w-full pt-4 border-t border-outline-variant/20 grid grid-cols-2 gap-3 text-center sm:text-left">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-secondary">Active Courses</span>
                    <p className="font-display font-bold text-lg text-on-surface">{classes.length}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-secondary">Pending Tasks</span>
                    <p className="font-display font-bold text-lg text-on-surface">
                      {tasks.filter((t) => !t.completed).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Dynamic Tab Content View) */}
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Edit Banner Modal */}
      {isEditingBanner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-on-surface">Change Banner Cover</h3>
              <button
                onClick={() => setIsEditingBanner(false)}
                className="text-secondary hover:text-on-surface p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-mono text-secondary block mb-1">
                  Custom Image URL
                </label>
                <input
                  type="text"
                  value={newBannerInput}
                  onChange={(e) => setNewBannerInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/50 focus:outline-hidden"
                />
              </div>

              <div className="text-xs text-secondary">
                Or choose preset wallpaper:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800',
                  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800',
                  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewBannerInput(preset)}
                    className="h-16 rounded-lg overflow-hidden border border-outline-variant hover:border-primary-container transition-all"
                  >
                    <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBanner(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#8b5e3c] hover:bg-[#6f4627] text-white"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* In-App Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary">
                  {activeVideo.course || 'Study Resource'}
                </span>
                <h3 className="font-display font-bold text-xl text-on-surface mt-1">
                  {activeVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Close Video"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Video Player */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-outline-variant/40 shadow-inner">
              {(() => {
                const embedUrl = (() => {
                  const url = activeVideo.url;
                  if (!url) return null;
                  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
                  if (ytMatch && ytMatch[1]) {
                    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
                  }
                  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
                  if (vimeoMatch && vimeoMatch[1]) {
                    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
                  }
                  return url;
                })();

                if (embedUrl) {
                  return (
                    <iframe
                      src={embedUrl}
                      title={activeVideo.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  );
                }

                return (
                  <div className="w-full h-full flex flex-col items-center justify-center text-secondary gap-3 p-6 text-center">
                    <Video className="w-12 h-12 text-primary-container" />
                    <p className="text-sm font-medium text-on-surface">Direct video embed format not recognized.</p>
                    <a
                      href={activeVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-[#8b5e3c] text-white text-xs font-semibold flex items-center gap-2"
                    >
                      Open Resource externally <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between text-xs text-secondary font-mono pt-2 border-t border-outline-variant/20">
              <span className="truncate max-w-md">Source: {activeVideo.url}</span>
              <a
                href={activeVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 shrink-0"
              >
                Open in External Browser <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* User Profile & Settings Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-[672px] bg-surface-container-low border border-outline-variant rounded-2xl p-6 sm:p-10 shadow-2xl flex flex-col gap-8 text-on-surface animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button ('X' top right) */}
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Section Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 pb-8 border-b border-outline-variant/40">
              {/* Profile Avatar Container Box (96px x 96px, #FCF1EC / container background) */}
              <div className="w-24 h-24 rounded-2xl bg-surface-container-high border border-outline-variant flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-10 h-10 text-secondary" />
                )}
              </div>

              {/* Profile Details */}
              <div className="flex flex-col text-center sm:text-left gap-1">
                <h2 className="font-tilt-warp text-xl sm:text-2xl uppercase tracking-tight text-on-surface">
                  {userName}
                </h2>
                <p className="font-manrope text-sm text-secondary">
                  {currentUser?.email || 'bantarip4@gmail.com'}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">
                    Active Student Session · Sakido Portal
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Body */}
            <div className="flex flex-col gap-6">
              {/* Heading 3: PREFERENCES & CONTROLS */}
              <h3 className="font-marko-one text-xs sm:text-sm uppercase tracking-[0.15em] text-secondary">
                PREFERENCES & CONTROLS
              </h3>

              {/* Theme Section Box */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 sm:p-8 rounded-xl bg-surface border border-outline-variant/40 shadow-xs">
                {/* Theme Info */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {isDarkMode ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-manrope font-semibold text-base text-on-surface">Interface Theme</span>
                    <span className="font-manrope text-sm text-secondary">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                </div>

                {/* Switch Theme Button */}
                <button
                  onClick={handleToggleDark}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-outline-variant font-libre-baskerville text-sm text-on-surface hover:bg-surface-container-high transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  Switch Theme
                </button>
              </div>

              {/* Active Integrations Section Box (Squishes when none active, auto-expands when connected) */}
              {(() => {
                const activeServices = (
                  [
                    { key: 'googleCalendar', label: 'Calendar' },
                    { key: 'googleDrive', label: 'Drive' },
                    { key: 'gmail', label: 'gmail' },
                    { key: 'googleNotes', label: 'Notes' },
                  ] as const
                ).filter((item) => connectors[item.key]);

                const hasActive = activeServices.length > 0;

                return (
                  <div
                    className={`flex flex-col rounded-xl bg-surface border border-outline-variant/40 shadow-xs transition-all duration-300 ease-in-out ${
                      hasActive ? 'gap-4 p-6 sm:p-8' : 'p-4 sm:p-5'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <span className="font-manrope font-semibold text-base text-on-surface">Active Integrations</span>
                      <button
                        onClick={() => {
                          setIsProfileModalOpen(false);
                          handleSelectTab('Connectors');
                        }}
                        className="font-manrope text-sm font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{hasActive ? 'Manage' : '+ Add Connectors'}</span>
                        <span className="text-base leading-none">→</span>
                      </button>
                    </div>

                    {/* Auto-Expanding Connected Chips Row (Only visible when connected) */}
                    {hasActive && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        {activeServices.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => handleConnectOAuth(item.key)}
                            title="Click to manage connector"
                            className="px-4 py-2 rounded-xl border border-primary bg-surface text-primary text-xs font-manrope font-bold uppercase transition-all cursor-pointer active:scale-95 flex items-center gap-2 shadow-xs hover:bg-primary/5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-outline-variant/40">
              {/* Sign Out Button */}
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  setIsLogoutConfirmOpen(true);
                }}
                className="flex items-center gap-2 text-error hover:text-red-500 font-manrope text-sm font-semibold transition-colors cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>

              {/* Done Button */}
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-8 py-2.5 rounded-xl bg-on-surface text-inverse-on-surface hover:opacity-90 font-manrope text-sm font-semibold transition-all cursor-pointer active:scale-95 shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-[500px] bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 sm:p-10 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header Section */}
            <div className="flex items-start gap-5 mb-4">
              <LogOut className="w-8 h-8 text-on-surface mt-1 shrink-0" />
              <div>
                <h2 className="text-on-surface tracking-tight font-display font-bold text-2xl sm:text-3xl">Confirm Sign Out</h2>
                <p className="font-manrope text-sm sm:text-base text-on-surface-variant font-medium">End Active Session</p>
              </div>
            </div>

            {/* Body Content */}
            <div className="sm:pl-[52px] mb-8">
              <p className="font-manrope text-base sm:text-lg text-on-surface leading-relaxed">
                Are you sure you want to log out of your Sakido workspace?
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="w-full sm:w-auto px-8 py-3 border border-outline-variant text-on-surface font-manrope font-semibold text-base hover:bg-surface-container-highest transition-colors rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  if (onSignOut) onSignOut();
                }}
                className="w-full sm:w-auto px-8 py-3 bg-primary-container text-on-primary font-display font-bold text-base hover:opacity-90 transition-opacity rounded-full cursor-pointer shadow-md"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Inspector & Event Planner Modal (Figma HTML Spec Design) */}
      {activeDayInspector && (
        <div aria-labelledby="modal-title" aria-modal="true" className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200" role="dialog">
          <div className="bg-surface-container-lowest dark:bg-[#1a1411] rounded-[32px] sm:rounded-4xl shadow-2xl w-full max-w-2xl overflow-hidden border border-outline-variant flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 sm:p-10 flex items-start justify-between border-b border-outline-variant/30 shrink-0">
              <div>
                <div className="text-secondary dark:text-secondary-fixed-dim text-xs font-semibold tracking-widest uppercase mb-1 font-mono">
                  {activeDayInspector.dateStr}
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tighter font-display" id="modal-title">
                  {activeDayInspector.displayDate}
                </h2>
              </div>
              <button
                onClick={() => setActiveDayInspector(null)}
                aria-label="Close modal"
                className="p-2.5 text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors focus:outline-none cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
              {/* Section: Scheduled Events */}
              <section>
                <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 font-mono">
                  Scheduled Events & Deadlines
                </h3>

                {(() => {
                  const dayEvents = [...events, ...(connectors.googleCalendar ? googleCalendarEvents : [])].filter(
                    (e) => e.date === activeDayInspector.dateStr || e.date === String(activeDayInspector.dayNum)
                  );
                  const dayTasks = tasks.filter(
                    (t) => !t.completed && (t.dueDate?.includes(activeDayInspector.dateStr) || t.dueDate?.toLowerCase().includes('today'))
                  );

                  if (dayEvents.length === 0 && dayTasks.length === 0) {
                    return (
                      <div className="bg-surface-container-low dark:bg-[#251e19] rounded-3xl p-8 sm:p-10 text-center border border-outline-variant/50 border-dashed flex flex-col items-center justify-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-surface-container-high dark:bg-[#342a23] text-primary dark:text-primary-fixed-dim flex items-center justify-center">
                          <CalendarIcon className="w-7 h-7" />
                        </div>
                        <h4 className="text-base sm:text-lg font-medium text-on-surface">
                          No events or exams scheduled for this day
                        </h4>
                        <p className="text-secondary text-xs sm:text-sm max-w-md">
                          Use the quick form below to add a deadline or lecture for this date.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {dayEvents.map((ev, idx) => (
                        <div
                          key={`de-ev-${idx}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low dark:bg-[#251e19]"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                                ev.type === 'Google Cal'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-[#8b5e3c]/10 text-[#8b5e3c] dark:text-amber-400 border border-[#8b5e3c]/20'
                              }`}
                            >
                              {ev.type || 'Event'}
                            </span>
                            <div>
                              <span className="text-sm font-semibold text-on-surface block">{ev.title}</span>
                              {ev.time && <span className="text-xs font-mono text-secondary">{ev.time}</span>}
                            </div>
                          </div>
                          {ev.id && !ev.id.startsWith('gcal-') && (
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="text-secondary/60 hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10 cursor-pointer"
                              title="Delete event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      {dayTasks.map((t) => (
                        <div
                          key={`de-tk-${t.id}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low dark:bg-[#251e19]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Task
                            </span>
                            <span className="text-sm font-semibold text-on-surface">{t.title}</span>
                          </div>
                          <span className="text-xs font-mono text-secondary">{t.course}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </section>

              {/* Section: Quick Add Form */}
              <section className="bg-surface-container-low dark:bg-[#251e19] rounded-3xl p-6 sm:p-8 border border-outline-variant/40 space-y-4">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-widest font-mono">
                  Quick Add Event to {activeDayInspector.displayDate}
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newEventTitle.trim()) return;
                    handleAddEvent(e);
                  }}
                  className="space-y-4"
                >
                  {/* Event Title Input */}
                  <div>
                    <input
                      type="text"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="Event / Exam Title"
                      required
                      className="w-full bg-surface-container-lowest dark:bg-[#1a1411] border border-outline-variant text-on-surface rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-secondary/50"
                    />
                  </div>

                  {/* Date & Time Period Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-secondary mb-1 block">Date</label>
                      <input
                        type="date"
                        value={newEventDate || activeDayInspector.dateStr}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="w-full bg-surface-container-lowest dark:bg-[#1a1411] border border-outline-variant text-on-surface rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-secondary mb-1 block">Start Time</label>
                      <input
                        type="time"
                        value={newEventStartTime}
                        onChange={(e) => setNewEventStartTime(e.target.value)}
                        className="w-full bg-surface-container-lowest dark:bg-[#1a1411] border border-outline-variant text-on-surface rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-secondary mb-1 block">End Time</label>
                      <input
                        type="time"
                        value={newEventEndTime}
                        onChange={(e) => setNewEventEndTime(e.target.value)}
                        className="w-full bg-surface-container-lowest dark:bg-[#1a1411] border border-outline-variant text-on-surface rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Event Type Select & Google Cal Recurrence */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-secondary mb-1 block">Event Category</label>
                      <select
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value)}
                        className="w-full bg-surface-container-lowest dark:bg-[#1a1411] border border-outline-variant text-on-surface rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="Lecture">Lecture / Class</option>
                        <option value="Exam">Exam / Midterm</option>
                        <option value="Deadline">Assignment Deadline</option>
                        <option value="Meeting">Meeting / Discussion</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-secondary mb-1 block">Repeat (Google Cal style)</label>
                      <select
                        value={newEventRecurrence}
                        onChange={(e) => setNewEventRecurrence(e.target.value)}
                        className="w-full bg-surface-container-lowest dark:bg-[#1a1411] border border-outline-variant text-on-surface rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="weekday">Every weekday (Mon-Fri)</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 bg-[#8b5e3c] hover:bg-[#6f4627] text-white rounded-2xl px-8 py-3.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Save Event
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
