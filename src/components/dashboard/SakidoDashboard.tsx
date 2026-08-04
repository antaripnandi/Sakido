import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProviderToken, setProviderToken, clearProviderToken, getOrRefresh, getGeneration, GoogleService, broadcastTokenUpdate, listenForTokenUpdates } from '../../lib/googleTokenStore';
import { useMigrateToCalendars, TYPE_TO_CALENDAR_MAP } from '../../hooks/useMigrateToCalendars';
import { MiniMonthPicker } from '../calendar/MiniMonthPicker';
import { CalendarList } from '../calendar/CalendarList';
import { WeekGrid } from '../calendar/WeekGrid';
import { addDays, formatDate, parseDate, startOfWeek } from '../calendar/utils/calendarUtils';
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
  Check,
  ArrowRight,
  Menu,
  X,
  Play,
  RotateCw,
  Layers,
  Pin,
  Archive,
  Palette,
  CheckSquare,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  AlertCircle,
  MapPin,
  Save
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { normalizeToISODate, safeCreateDateTime } from '../../lib/dateUtils';
import { SakidoLogo } from '../common/SakidoLogo';
import { FlashcardModule } from '../flashcards/FlashcardModule';
import { Flashcard } from '../../types';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import { FocusTimer } from '../focus/FocusTimer';
import { FocusTimerView, FocusSessionConfig } from '../focus/FocusTimerView';
import { TaskDetailModal, NoteDetailModal, CourseDetailModal } from './DetailModals';
import { DashboardView } from './DashboardView';
import { ConnectorsView } from '../connectors/ConnectorsView';

const TAB_SLUGS: { slug: string; name: string }[] = [
  { slug: 'overview', name: 'Overview' },
  { slug: 'classes', name: 'Classes' },
  { slug: 'calendar', name: 'Calendar' },
  { slug: 'tasks', name: 'Tasks & Grades' },
  { slug: 'flashcards', name: 'Flashcards' },
  { slug: 'watch-later', name: 'Watch Later' },
  { slug: 'notes', name: 'Notes' },
  { slug: 'connectors', name: 'Connectors' },
  { slug: 'university', name: 'University & People' },
  { slug: 'ai', name: 'AI Features' },
  { slug: 'focus', name: 'Focus Timer' },
];

const TAB_SLUG_MAP = Object.fromEntries(TAB_SLUGS.flatMap(({ slug, name }) => [
  [slug, name],
  // aliases
  ...(slug === 'watch-later' ? [['watch', name]] : []),
  ...(slug === 'focus' ? [['focus-timer', name]] : []),
]));

const TAB_NAME_TO_SLUG = Object.fromEntries(TAB_SLUGS.flatMap(({ slug, name }) => [
  [name, slug],
  [slug, slug],
]));

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
  const subPath = location.pathname.replace(/^\/dashboard\/?/, '').toLowerCase() || 'overview';
  const activeTab = TAB_SLUG_MAP[subPath] || 'Overview';

  const handleSelectTab = (tabName: string) => {
    const slug = TAB_NAME_TO_SLUG[tabName] || 'overview';
    navigate(`/dashboard/${slug}`);
    setIsMobileMenuOpen(false);
  };

  // Theme state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useLocalStorageState<boolean>('sakido_theme_mode', () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Persistent Collapsible Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorageState<boolean>('sakido_sidebar_collapsed', false);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  // Focus timer overlay state & initial parameters
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState<boolean>(false);
  const [focusConfig, setFocusConfig] = useState<FocusSessionConfig>({
    mode: 'normal',
    durationMinutes: 25,
    pomodoroRatio: '5:1',
    pomoFocusMinutes: 25,
    pomoBreakMinutes: 5,
    pomodoroCycles: 4,
  });

  const handleStartFocusSession = (config: FocusSessionConfig) => {
    setFocusConfig(config);
    setIsFocusTimerOpen(true);
  };

  // Mobile sidebar drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Banner image state with safe localStorage persistence
  const [bannerImageUrl, setBannerImageUrl] = useLocalStorageState<string>(
    'sakido_banner_url',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200'
  );
  const [isEditingBanner, setIsEditingBanner] = useState<boolean>(false);
  const [newBannerInput, setNewBannerInput] = useState<string>('');

  // Live time & date state
  const [now, setNow] = useState<Date>(new Date());

  // Focus stats — daily minutes and streak, persisted in localStorage
  const today = new Date().toISOString().split('T')[0];
  const [focusStats, setFocusStats] = useLocalStorageState<{
    date: string;
    completedMinutesToday: number;
    streakDays: number;
    lastStreakDate: string;
  }>('sakido_focus_stats', {
    date: today,
    completedMinutesToday: 0,
    streakDays: 0,
    lastStreakDate: '',
  });

  // Reset daily minutes if it's a new day and persist to localStorage
  const resolvedFocusStats = React.useMemo(() => {
    if (focusStats.date !== today) {
      return { ...focusStats, date: today, completedMinutesToday: 0 };
    }
    return focusStats;
  }, [focusStats, today]);

  useEffect(() => {
    if (focusStats.date !== today) {
      setFocusStats((prev) => ({ ...prev, date: today, completedMinutesToday: 0 }));
    }
  }, [focusStats.date, today, setFocusStats]);

  const handleFocusComplete = useCallback((minutes: number) => {
    setFocusStats(prev => {
      const isNewDay = prev.date !== today;
      const prevMinutes = isNewDay ? 0 : prev.completedMinutesToday;
  const yesterday = normalizeToISODate(new Date(Date.now() - 86400000));
      const streakContinues = prev.lastStreakDate === yesterday || prev.lastStreakDate === today;
      const newStreak = streakContinues ? (prev.lastStreakDate === today ? prev.streakDays : prev.streakDays + 1) : 1;
      return {
        date: today,
        completedMinutesToday: prevMinutes + minutes,
        streakDays: newStreak,
        lastStreakDate: today,
      };
    });
  }, [today, setFocusStats]);

  // App data state (persisted per user session with debouncing for high-frequency edits)
  const [classes, setClasses] = useLocalStorageState<any[]>('sakido_classes', []);
  const [tasks, setTasks] = useLocalStorageState<any[]>('sakido_tasks', [], 300);
  const [watchLater, setWatchLater] = useLocalStorageState<any[]>('sakido_watch', []);
  const [notes, setNotes] = useLocalStorageState<any[]>('sakido_notes', [], 300);
  const [flashcards, setFlashcards] = useLocalStorageState<Flashcard[]>('sakido_flashcards', [
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
  ], 300);

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

  // Connectors OAuth status — localStorage as optimistic local cache, google_tokens DB as source of truth.
  // On mount we fetch the DB and override localStorage so all devices stay in sync.
  const [connectors, setConnectors] = useLocalStorageState<{
    googleCalendar: boolean;
    googleDrive: boolean;
    gmail: boolean;
  }>('sakido_connectors', { googleCalendar: false, googleDrive: false, gmail: false });

  // Gate: ensures mount sync completes before OAuth callback writes connector state.
  // Prevents the race where mount sync reads stale DB flags and overwrites fresh
  // OAuth-set flags (Issue 5 in audit).
  const [mountSynced, setMountSynced] = useState(false);

  // Sync connector state from DB on mount — fixes cross-device visibility.
  // All three service flags are stored as columns on google_tokens.
  useEffect(() => {
    if (!currentUser?.id) {
      setMountSynced(true);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMountSynced(true);
      return;
    }

    // Wrap in Promise.resolve() because Supabase .then() returns PromiseLike
    // (which lacks .finally()).
    Promise.resolve(
      supabase
        .from('google_tokens')
        .select('google_calendar_connected, google_drive_connected, gmail_connected')
        .eq('user_id', currentUser.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.warn('[connectors] DB sync failed:', error.message);
            return;
          }
          if (!data) return; // no row = never connected, keep localStorage as-is
          const fromDB = {
            googleCalendar: Boolean(data.google_calendar_connected),
            googleDrive: Boolean(data.google_drive_connected),
            gmail: Boolean(data.gmail_connected),
          };
          setConnectors(prev => {
            const changed = (Object.keys(fromDB) as (keyof typeof fromDB)[])
              .some(k => prev[k] !== fromDB[k]);
            if (!changed) return prev;
            console.log('[connectors] DB sync:', fromDB);
            return { ...prev, ...fromDB };
          });
        })
    ).finally(() => setMountSynced(true));
  }, [currentUser?.id]);

  // Bulk sync helper: push all existing Sakido events to Google Calendar
  const bulkSyncEventsToGCal = async (accessToken: string) => {
    try {
      const savedEvents = localStorage.getItem('sakido_events');
      if (!savedEvents) return;

      const allEvents: any[] = JSON.parse(savedEvents);
      if (!allEvents.length) return;

      // Deduplicate: only sync unique base events (skip recurring child IDs like "123-1", "123-2")
      const seen = new Set<string>();
      const uniqueEvents = allEvents.filter((ev) => {
        const baseId = ev.id.includes('-') ? ev.id.split('-').slice(0, -1).join('-') : ev.id;
        // But keep each individual occurrence for non-recurring or if id is numeric (base)
        if (seen.has(ev.id)) return false;
        seen.add(ev.id);
        return true;
      });

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let synced = 0;
      let failed = 0;

      for (const ev of uniqueEvents) {
        try {
          const isoDate = normalizeToISODate(ev.date);
          const startDt = safeCreateDateTime(isoDate, ev.startTime || '09:00');
          const endDt = safeCreateDateTime(isoDate, ev.endTime || '10:00');

          // Skip events with invalid dates
          if (!startDt || !endDt) continue;

          // Resolve target Google Calendar ID
          const evCal = calendars.find((c: any) => c.id === ev.calendarId);
          const targetGcalId = evCal?.googleCalendarId || 'primary';

          const gcalPayload: any = {
            summary: `[Sakido] ${ev.title}`,
            description: `Bulk-synced from Sakido Academic Portal (${ev.type || 'Event'})`,
            start: { dateTime: startDt.toISOString(), timeZone: tz },
            end: { dateTime: endDt.toISOString(), timeZone: tz },
          };

          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetGcalId)}/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(gcalPayload),
            }
          );

          if (res.ok) {
            synced++;
          } else {
            failed++;
            // If 401 on first event, token is bad — stop trying
            if (res.status === 401 && synced === 0) {
              console.warn('Bulk sync: token expired on first event, aborting');
              break;
            }
          }
        } catch {
          failed++;
        }
      }

      if (synced > 0) {
        setConnectorNotice(`🟢 Bulk-synced ${synced} existing Sakido event${synced > 1 ? 's' : ''} to Google Calendar!${failed > 0 ? ` (${failed} failed)` : ''}`);
      }
    } catch (err) {
      console.warn('Bulk sync error:', err);
    }
  };

  // Google Drive Visible Folder 2-Way Sync for Sakido Notes
  const syncNotesToGoogleDrive = async (updatedNotes: any[], accessToken: string) => {
    try {
      let token = accessToken;

      // 1. Search for existing "Sakido Notes" folder in Google Drive root
      const searchFolder = async (tok: string) => {
        return fetch(
          "https://www.googleapis.com/drive/v3/files?q=name%3D'Sakido%20Notes'%20and%20mimeType%3D'application/vnd.google-apps.folder'%20and%20trashed%3Dfalse",
          { headers: { Authorization: `Bearer ${tok}` } }
        );
      };

      let folderSearchRes = await searchFolder(token);

      // Handle 401 token refresh — use getOrRefresh for Drive service
      if (folderSearchRes.status === 401) {
        const freshToken = await getOrRefresh('googleDrive', () => refreshGoogleToken('googleDrive'));
        if (freshToken) {
          token = freshToken;
          folderSearchRes = await searchFolder(token);
        }
      }

      let folderId = null;
      if (folderSearchRes.ok) {
        const folderData = await folderSearchRes.json();
        if (folderData.files && folderData.files.length > 0) {
          folderId = folderData.files[0].id;
        }
      }

      // 2. If folder doesn't exist, create "Sakido Notes" folder
      if (!folderId) {
        const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Sakido Notes',
            mimeType: 'application/vnd.google-apps.folder',
          }),
        });

        if (createFolderRes.ok) {
          const folderObj = await createFolderRes.json();
          folderId = folderObj.id;
        }
      }

      if (!folderId) {
        setConnectorNotice('⚠️ Could not access "Sakido Notes" folder in Google Drive. Ensure Google Drive API is enabled.');
        return;
      }

      // 3. Search for "sakido_notes_backup.json" inside "Sakido Notes" folder
      const fileSearchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name%3D'sakido_notes_backup.json'%20and%20'${folderId}'%20in%20parents%20and%20trashed%3Dfalse`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let fileId = null;
      if (fileSearchRes.ok) {
        const fileData = await fileSearchRes.json();
        if (fileData.files && fileData.files.length > 0) {
          fileId = fileData.files[0].id;
        }
      }

      const fileContent = JSON.stringify(updatedNotes, null, 2);
      const metadata = {
        name: 'sakido_notes_backup.json',
        mimeType: 'application/json',
        parents: [folderId],
      };

      let uploadRes;
      if (fileId) {
        uploadRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: fileContent,
          }
        );
      } else {
        const formData = new FormData();
        formData.append(
          'metadata',
          new Blob([JSON.stringify(metadata)], { type: 'application/json' })
        );
        formData.append('file', new Blob([fileContent], { type: 'application/json' }));

        uploadRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );
      }

      if (uploadRes.ok) {
        setConnectorNotice(`🟢 Synced to visible "Sakido Notes" folder in your Google Drive!`);
      } else {
        const rawUploadErr = await uploadRes.text().catch(() => '');
        setConnectorNotice(`⚠️ Drive file write returned status ${uploadRes.status}: ${rawUploadErr}`);
      }
    } catch (err: any) {
      console.warn('Google Drive Notes sync error:', err);
      setConnectorNotice(`⚠️ Sakido note saved locally, but Drive sync failed: ${err?.message || err}`);
    }
  };

  // Debounced Google Drive sync to prevent sequential API call bursts during note editing
  const driveSyncTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSyncNotesToGoogleDrive = useCallback((updatedNotes: any[]) => {
    if (!connectors.googleDrive) return;
    const token = getProviderToken('googleDrive');
    if (!token) return;

    if (driveSyncTimeoutRef.current) {
      clearTimeout(driveSyncTimeoutRef.current);
    }

    driveSyncTimeoutRef.current = setTimeout(() => {
      syncNotesToGoogleDrive(updatedNotes, token);
    }, 2500);
  }, [connectors.googleDrive]);

  // Cross-tab token update listener — other tabs signal fresh tokens via BroadcastChannel
  useEffect(() => {
    const cleanup = listenForTokenUpdates((service) => {
      console.log(`[connectors] Token updated in another tab: ${service}`);
      // Generation guard already handles preventing stale token use
    });
    return cleanup;
  }, []);

  // Verify pending connector ONLY after user completes OAuth authorization callback.
  // Waits for mountSync to complete first so it never overwrites fresh OAuth-set
  // flags with stale DB data from the mount read. Broadcasts token updates to
  // other tabs to prevent cross-tab races.
  useEffect(() => {
    if (!mountSynced) return; // wait for mount sync to complete first

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
            const service = pending as GoogleService;
            if (session.provider_token) {
              setProviderToken(service, session.provider_token);
              // Broadcast to other tabs so they invalidate cached tokens
              broadcastTokenUpdate(service);
            }
            if ((session as any).provider_refresh_token) {
              const supabase = getSupabaseClient();
              const flagCol = pending === 'googleCalendar' ? 'google_calendar_connected'
                : pending === 'googleDrive' ? 'google_drive_connected'
                : 'gmail_connected';
              const tokenCol = pending === 'googleCalendar' ? 'calendar_refresh_token'
                : pending === 'googleDrive' ? 'drive_refresh_token'
                : 'gmail_refresh_token';
              // Single upsert — write to the correct per-service token column
              supabase?.from('google_tokens').upsert({
                user_id: session.user.id,
                [tokenCol]: (session as any).provider_refresh_token,
                [flagCol]: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' }).then(({ error }) => {
                if (error) console.warn('[connectors] token+flag upsert failed:', error.message);
                else {
                  console.log('[connectors] token+flag saved:', flagCol);
                  // Broadcast after DB write completes
                  broadcastTokenUpdate(service);
                }
              });
            }
            setConnectors((prev) => ({ ...prev, [pending]: true }));
            const serviceNames: Record<string, string> = {
              googleCalendar: 'Google Calendar',
              googleDrive: 'Google Drive',
              gmail: 'Gmail Notifications',
            };
            setConnectorNotice(`Successfully connected ${serviceNames[pending] || pending}! Syncing existing events...`);

            // Bulk sync all existing Sakido events to Google Calendar on reconnect
            if (pending === 'googleCalendar' && session.provider_token) {
              // Slight delay to let the UI update first
              setTimeout(() => bulkSyncEventsToGCal(session.provider_token!), 500);
            }
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
  }, [mountSynced]);

  // Custom events state for Academic Calendar with debounced persistence
  const [events, setEvents] = useLocalStorageState<any[]>('sakido_events', [], 300);

  // Calendars state for calendar management
  const [calendars, setCalendars] = useLocalStorageState<any[]>('sakido_calendars', [], 300);

  // Run migration to add calendarId to existing events
  useMigrateToCalendars(events, setEvents, calendars, setCalendars);

  // OAuth scope check for calendar management
  const [hasCalendarManagementScope, setHasCalendarManagementScope] = useState<boolean>(false);

  const checkCalendarScope = useCallback(async () => {
    if (!connectors.googleCalendar) {
      setHasCalendarManagementScope(false);
      return false;
    }
    try {
      const token = await getOrRefresh('googleCalendar', () => refreshGoogleToken('googleCalendar'));
      if (!token) return false;
      const res = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      const scopes: string[] = typeof data.scope === 'string' ? data.scope.split(' ') : [];
      const hasScope = scopes.includes('https://www.googleapis.com/auth/calendar');
      setHasCalendarManagementScope(hasScope);
      return hasScope;
    } catch {
      setHasCalendarManagementScope(false);
      return false;
    }
  }, [connectors.googleCalendar]);

  useEffect(() => {
    if (connectors.googleCalendar) {
      checkCalendarScope();
    }
  }, [connectors.googleCalendar, checkCalendarScope]);

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('09:00');
  const [newEventEndTime, setNewEventEndTime] = useState('10:00');
  const [newEventType, setNewEventType] = useState('Exam');
  const [newEventRecurrence, setNewEventRecurrence] = useState<string>('none');

  // Calendar Month State
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Calendar View Mode ('month' | 'week' | 'day')
  const [calendarViewMode, setCalendarViewMode] = useLocalStorageState<'month' | 'week' | 'day'>('sakido_calendar_view', 'week');

  // Week view state for unified calendar
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return monday;
  });

  // Track last used calendar for smart defaults
  const [lastUsedCalendarId, setLastUsedCalendarId] = useState<string>('cal-personal');

  // Track events being edited (locked from 60s poll overwrite)
  const [editingEventIds, setEditingEventIds] = useState<Set<string>>(new Set());

  // In-App Video Player Modal state
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title: string;
    url: string;
    course?: string;
  } | null>(null);

  // Single shared helper — gets a fresh Google access token via server JWT validation.
  // The server reads the refresh token from DB; the client never touches it.
  // Now accepts a service param to fetch the correct per-service token.
  const refreshGoogleToken = useCallback(async (service: GoogleService): Promise<string | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    // Generation snapshot: if the user signs out while this refresh is in-flight,
    // invalidateGeneration() bumps the counter and this write must be discarded.
    const gen = getGeneration();

    try {
      const res = await fetch('/api/refresh-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Only disconnect on hard failures — revoked or missing refresh token.
        // Transient errors (500, 429, network blip) must NOT wipe connector state.
        const hardFail = body.error === 'reconnect_required' || body.error === 'invalid_grant';
        if (hardFail) {
          // Clear only this service, not all three — server already cleared DB
          setConnectors((prev) => ({ ...prev, [service]: false }));
          clearProviderToken(service);
        }
        return null;
      }

      const data = await res.json();
      if (data.access_token && gen === getGeneration()) {
        setProviderToken(service, data.access_token, data.expires_in);
        return data.access_token;
      }
      return null;
    } catch (err) {
      console.warn('Error refreshing Google token:', err);
      return null;
    }
  }, []);

  // Generic helper for authenticated Google API requests with automatic 401 token refresh.
  // service param routes to the correct token column — defaults to 'googleCalendar' since
  // most callers are Calendar; Drive callers pass 'googleDrive' explicitly.
  const executeGoogleApi = useCallback(async (
    apiCall: (accessToken: string) => Promise<Response>,
    service: GoogleService = 'googleCalendar'
  ): Promise<Response | null> => {
    // getOrRefresh coalesces concurrent callers for the same service into one network request
    let token = await getOrRefresh(service, () => refreshGoogleToken(service));
    if (!token) return null;

    try {
      let res = await apiCall(token);

      // Token expired mid-session — clear cache and refresh once, then retry
      if (res.status === 401) {
        clearProviderToken(service);
        token = await getOrRefresh(service, () => refreshGoogleToken(service));
        if (!token) return null;
        res = await apiCall(token);
      }

      return res;
    } catch (err) {
      console.warn('Google API execution error:', err);
      return null;
    }
  }, [refreshGoogleToken]);

  // Fetch Google Calendar list and merge into sakido_calendars (ponytail: one-shot on connect)
  const fetchGoogleCalendarList = useCallback(async () => {
    if (!connectors.googleCalendar) return;
    try {
      const res = await executeGoogleApi((token) =>
        fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      if (!res?.ok) return;
      const data = await res.json();
      const gCals = (data.items || [])
        .filter((c: any) => !c.id.endsWith('#holiday@group.v.calendar.google.com'))
        .map((c: any, i: number) => ({
          id: `gcal-${c.id}`,
          name: c.summary || c.id,
          color: c.backgroundColor || ['#4285f4','#34a853','#fbbc04','#ea4335','#8e24aa','#039be5','#f6bf26','#33b679','#e67c73','#616161'][i % 10],
          visible: true,
          source: 'google' as const,
          googleCalendarId: c.id,
          isDefault: c.primary || false,
        }));
      setCalendars(prev => {
        const localOnly = prev.filter(c => c.source === 'sakido');
        const existingGoogleIds = new Set(prev.filter(c => c.source === 'google').map((c: any) => c.googleCalendarId));
        const newGoogle = gCals.filter((c: any) => !existingGoogleIds.has(c.googleCalendarId));
        return [...localOnly, ...prev.filter(c => c.source === 'google'), ...newGoogle];
      });
    } catch (e) {
      console.warn('Google Calendar list fetch failed:', e);
    }
  }, [connectors.googleCalendar, executeGoogleApi, setCalendars]);

  useEffect(() => {
    fetchGoogleCalendarList();
  }, [fetchGoogleCalendarList]);

  // Remote Google events remain separate from local Sakido events. Linked local events
  // are overlaid at render time so local edits and sync state never target a hidden copy.
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);

  const fetchGoogleEvents = useCallback(async () => {
    if (!connectors.googleCalendar) {
      setGoogleCalendarEvents([]);
      return;
    }

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const timeMin = new Date(year, month, -7, 0, 0, 0).toISOString();
    const timeMax = new Date(year, month + 1, 7, 23, 59, 59).toISOString();

    // Fetch events from all visible Google Calendars (ponytail: parallel fetch)
    const googleCals = calendars.filter(c => c.source === 'google' && c.visible && c.googleCalendarId);
    if (googleCals.length === 0) {
      // Fallback: fetch from primary only
      googleCals.push({ id: 'google-calendar', googleCalendarId: 'primary', name: 'Primary' } as any);
    }

    const allFetched: any[] = [];
    for (const gCal of googleCals) {
      try {
        const calId = gCal.googleCalendarId;
        const res = await executeGoogleApi((accessToken) =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
        );

        if (!res?.ok) continue;

        const data = await res.json();
        const fetched = (data.items || [])
          .filter((item: any) => item.status !== 'cancelled')
          .map((item: any) => {
            const isAllDay = !item.start?.dateTime;
            let dateStr = '';
            let endDateStr: string | undefined = undefined;
            let startTime: string | undefined = undefined;
            let endTime: string | undefined = undefined;

            if (isAllDay) {
              // All-day event: start.date = "YYYY-MM-DD"
              dateStr = item.start?.date || '';
              const rawEnd = item.end?.date;
              if (rawEnd) {
                // Google Calendar uses exclusive end date for all-day events (+1 day).
                // Subtract 1 day to get Sakido's inclusive end date.
                const inclusiveEnd = formatDate(addDays(parseDate(rawEnd), -1));
                if (inclusiveEnd !== dateStr) {
                  endDateStr = inclusiveEnd;
                }
              }
            } else {
              // Timed event: start.dateTime is an ISO string. Parse into local system time!
              const startDt = new Date(item.start.dateTime);
              dateStr = formatDate(startDt);
              startTime = `${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}`;

              if (item.end?.dateTime) {
                const endDt = new Date(item.end.dateTime);
                const endFormattedDate = formatDate(endDt);
                endTime = `${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`;
                if (endFormattedDate !== dateStr) {
                  endDateStr = endFormattedDate;
                }
              }
            }

            return {
              id: `gcal-${item.id}`,
              gcalId: item.id,
              gcalRecurringEventId: item.recurringEventId,
              gcalOriginalStartTime: item.originalStartTime?.dateTime || item.originalStartTime?.date,
              title: item.summary?.replace(/^\[Sakido\]\s*/, '') || 'Google Calendar Event',
              date: dateStr,
              endDate: endDateStr,
              startTime,
              endTime,
              time: isAllDay ? 'All Day' : `${startTime} - ${endTime}`,
              type: 'Google Cal',
              location: item.location || 'Google Sync',
              description: item.description || '',
              calendarId: gCal.id, // Use the Sakido calendar ID, not hardcoded 'google-calendar'
              isAllDay,
              syncStatus: 'synced' as const,
              gcalCalendarId: calId, // Store the actual Google Calendar ID for sync targeting
            };
          });

        allFetched.push(...fetched);
      } catch (e) {
        console.warn(`Google Calendar fetch failed for ${gCal.name}:`, e);
      }
    }
    const fetched = allFetched;

    setGoogleCalendarEvents((previous) => {
      const previousById = new Map(previous.map((event) => [event.id, event]));
      return fetched.map((event: any) =>
        editingEventIds.has(event.id) ? previousById.get(event.id) || event : event
      );
    });

    // A recurrence POST returns the series master. Once Google expands it, bind
    // each local occurrence to its distinct instance ID for single-event edits.
    setEvents((previous) => previous.map((event) => {
      if (event.gcalId || !event.gcalRecurringEventId || editingEventIds.has(event.id)) return event;
      const instance = fetched.find((remote: any) =>
        remote.gcalRecurringEventId === event.gcalRecurringEventId &&
        remote.date === event.date &&
        remote.startTime === event.startTime
      );
      return instance
        ? { ...event, gcalId: instance.gcalId, syncStatus: 'synced' as const }
        : event;
    }));
  }, [connectors.googleCalendar, calendarMonth, editingEventIds, executeGoogleApi, calendars]);

  useEffect(() => {
    fetchGoogleEvents();

    if (!connectors.googleCalendar) return;

    // Automatic polling every 60 seconds for live 2-way sync, paused on hidden tabs
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        fetchGoogleEvents();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [connectors.googleCalendar, calendarMonth, fetchGoogleEvents]);

  // Keyboard shortcuts for week navigation (j/k/t or arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (calendarViewMode !== 'week') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        setSelectedWeekStart(prev => addDays(prev, -7));
      } else if (e.key === 'ArrowRight' || e.key === 'k') {
        e.preventDefault();
        setSelectedWeekStart(prev => addDays(prev, 7));
      } else if (e.key === 't') {
        e.preventDefault();
        setSelectedWeekStart(startOfWeek(new Date()));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calendarViewMode]);

  // Live Google Drive "Sakido Notes" folder auto-fetch & sync
  useEffect(() => {
    if (!connectors.googleDrive) return;

    const fetchGoogleNotes = async () => {
      let token = getProviderToken('googleDrive');
      if (!token) return;

      try {
        const folderRes = await fetch(
          "https://www.googleapis.com/drive/v3/files?q=name%3D'Sakido%20Notes'%20and%20mimeType%3D'application/vnd.google-apps.folder'%20and%20trashed%3Dfalse",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (folderRes.status === 401) {
          const freshToken = await getOrRefresh('googleDrive', () => refreshGoogleToken('googleDrive'));
          if (freshToken) {
            token = freshToken;
          }
        }

        if (folderRes.ok) {
          const folderData = await folderRes.json();
          if (folderData.files && folderData.files.length > 0) {
            const folderId = folderData.files[0].id;
            const fileRes = await fetch(
              `https://www.googleapis.com/drive/v3/files?q=name%3D'sakido_notes_backup.json'%20and%20'${folderId}'%20in%20parents%20and%20trashed%3Dfalse`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (fileRes.ok) {
              const fileData = await fileRes.json();
              if (fileData.files && fileData.files.length > 0) {
                const fileId = fileData.files[0].id;
                const contentRes = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                if (contentRes.ok) {
                  const remoteNotes = await contentRes.json();
                  if (Array.isArray(remoteNotes) && remoteNotes.length > 0) {
                    setNotes(remoteNotes);
                    try {
                      localStorage.setItem('sakido_notes', JSON.stringify(remoteNotes));
                    } catch {}
                    setConnectorNotice(`🟢 Synced ${remoteNotes.length} notes from "Sakido Notes" folder in Google Drive!`);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Live Drive Notes fetch notice:', err);
      }
    };

    fetchGoogleNotes();
  }, [connectors.googleDrive]);

  const prefersReducedMotion = React.useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Time conversion helpers for drag interactions
  const parseTime = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (min: number): string => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const snapToQuarter = (min: number): number => Math.round(min / 15) * 15;

  const clientYToTime = (clientY: number, containerTop: number): string => {
    const offsetPx = clientY - containerTop;
    const minutesFromTop = (offsetPx / 52) * 60;
    const snappedMinutes = snapToQuarter(minutesFromTop + 7 * 60);
    return minutesToTime(Math.max(7 * 60, Math.min(22 * 60, snappedMinutes)));
  };

  const syncEventToGoogleCalendar = async (event: any, newStartTime?: string, newEndTime?: string) => {
    if (!connectors.googleCalendar) return;

    const startTime = newStartTime || event.startTime;
    const endTime = newEndTime || event.endTime;
    const title = event.title || 'Untitled Event';
    const date = event.date;

    // Resolve the Google Calendar ID for this event's calendar
    const cal = calendars.find((c: any) => c.id === event.calendarId);
    const gcalCalId = cal?.googleCalendarId || 'primary'; // ponytail: fallback to primary

    try {
      // Build event body (supports all-day and multi-day events)
      const buildEventBody = () => {
        const body: any = {
          summary: `[Sakido] ${title}`,
        };

        // All-day events use {date} format, timed events use {dateTime}
        if (event.isAllDay) {
          body.start = { date };
          // Google uses an exclusive end date, including one-day all-day events.
          const googleEndDate = event.endDate || date;
          body.end = { date: formatDate(addDays(parseDate(googleEndDate), 1)) };
        } else {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          body.start = { dateTime: `${date}T${startTime}:00`, timeZone: tz };
          body.end = { dateTime: `${date}T${endTime}:00`, timeZone: tz };
        }

        return body;
      };

      // Use gcalId if available (ponytail: skip title search when we have ID)
      if (event.gcalId) {
        const eventBody = buildEventBody();
        const patchRes = await executeGoogleApi((accessToken) =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalCalId)}/events/${event.gcalId}`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(eventBody),
            }
          )
        );
        if (!patchRes || !patchRes.ok) {
          setConnectorNotice(`⚠️ Sync failed: ${patchRes?.status || 'network error'}`);
          setEvents(prev => prev.map(e => e.id === event.id ? { ...e, syncStatus: 'failed' } : e));
          return;
        }
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, syncStatus: 'synced' } : e));
        return;
      }

      // Fallback: search by title (for old events without gcalId)
      const dayStart = safeCreateDateTime(date, '00:00');
      const dayEnd = safeCreateDateTime(date, '23:59');
      if (!dayStart || !dayEnd) return;

      const searchRes = await executeGoogleApi((accessToken) =>
        fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalCalId)}/events?q=${encodeURIComponent(`[Sakido] ${title}`)}&timeMin=${encodeURIComponent(dayStart.toISOString())}&timeMax=${encodeURIComponent(dayEnd.toISOString())}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
      );
      if (!searchRes || !searchRes.ok) {
        setConnectorNotice(`⚠️ Sync search failed: ${searchRes?.status || 'network error'}`);
        return;
      }
      const searchData = await searchRes.json();
      const existingEvent = searchData.items?.[0];

      const eventBody = buildEventBody();

      if (existingEvent) {
        const patchRes = await executeGoogleApi((accessToken) =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalCalId)}/events/${existingEvent.id}`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(eventBody),
            }
          )
        );
        if (!patchRes || !patchRes.ok) {
          setConnectorNotice(`⚠️ Sync update failed: ${patchRes?.status || 'network error'}`);
          setEvents(prev => prev.map(e => e.id === event.id ? { ...e, syncStatus: 'failed' } : e));
          return;
        }
        // Store gcalId if missing + mark synced
        const patchData = await patchRes.json();
        if (patchData.id && !event.gcalId) {
          setEvents(prev => prev.map(e => e.id === event.id ? { ...e, gcalId: patchData.id, syncStatus: 'synced' } : e));
        } else {
          setEvents(prev => prev.map(e => e.id === event.id ? { ...e, syncStatus: 'synced' } : e));
        }
      } else {
        const postRes = await executeGoogleApi((accessToken) =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcalCalId)}/events`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(eventBody),
            }
          )
        );
        if (!postRes || !postRes.ok) {
          setConnectorNotice(`⚠️ Sync create failed: ${postRes?.status || 'network error'}`);
          setEvents(prev => prev.map(e => e.id === event.id ? { ...e, syncStatus: 'failed' } : e));
          return;
        }
        // Store gcalId from response + mark synced
        const postData = await postRes.json();
        if (postData.id) {
          setEvents(prev => prev.map(e => e.id === event.id ? { ...e, gcalId: postData.id, syncStatus: 'synced' } : e));
        }
      }
    } catch (err) {
      setConnectorNotice(`⚠️ Sync error: ${err instanceof Error ? err.message : 'unknown'}`);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, syncStatus: 'failed' } : e));
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const title = newEventTitle.trim();
    let date = normalizeToISODate(newEventDate.trim());

    // Fallback: if newEventDate was not manually changed in input, use active day inspector date or today
    if (!newEventDate.trim() && activeDayInspector?.dateStr) {
      date = normalizeToISODate(activeDayInspector.dateStr);
    }
    if (!date) {
      date = normalizeToISODate(new Date());
    }

    const startTime = newEventStartTime.trim() || '09:00';
    const endTime = newEventEndTime.trim() || '10:00';

    // Validate: time range must be 00:00-24:00
    const startMin = parseTime(startTime);
    const endMin = parseTime(endTime);
    if (startMin < 0 || startMin >= 1440 || endMin <= 0 || endMin > 1440) {
      setConnectorNotice('⚠️ Event times must be between 00:00 and 24:00.');
      return;
    }
    if (endMin <= startMin) {
      setConnectorNotice('⚠️ End time must be after start time. Multi-day events are not supported.');
      return;
    }

    const type = newEventType;
    const recurrence = newEventRecurrence;

    // Resolve calendarId from type via TYPE_TO_CALENDAR_MAP (ponytail: reuse existing map)
    const calendarId = TYPE_TO_CALENDAR_MAP[type] || 'cal-personal';

    const baseEv = {
      id: Date.now().toString(),
      title,
      date,
      startTime,
      endTime,
      time: `${startTime} - ${endTime}`,
      type,
      recurrence,
      calendarId,
    };

    // Helper to generate recurring events for local schedule
    const generateEventsList = (base: typeof baseEv) => {
      if (recurrence === 'none') return [base];
      const list = [base];
      let limit = 8;
      if (recurrence === 'daily') limit = 14;
      if (recurrence === 'weekday') limit = 15;
      if (recurrence === 'monthly') limit = 4;

      const curr = safeCreateDateTime(date, startTime) || new Date();
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
        const dateStr = normalizeToISODate(curr);
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
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startDt = safeCreateDateTime(date, startTime);
      const endDt = safeCreateDateTime(date, endTime);

      // Resolve target Google Calendar ID from the event's calendar
      const targetCal = calendars.find((c: any) => c.id === calendarId);
      const targetGcalId = targetCal?.googleCalendarId || 'primary';

      if (!startDt || !endDt) {
        setConnectorNotice(`⚠️ Event saved locally, but invalid date/time format (${date} ${startTime}-${endTime}) prevented Google Calendar sync.`);
      } else {
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

        try {
          const res = await executeGoogleApi((accessToken) =>
            fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetGcalId)}/events`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(gcalPayload),
            })
          );

          if (res && res.ok) {
            const created = await res.json();
            // ponytail: recurring POST returns master; store master ID + marker for instance binding
            if (created.id) {
              setEvents(prev => prev.map(e =>
                newEvents.some(ne => ne.id === e.id)
                  ? {
                      ...e,
                      gcalId: recurrence === 'none' ? created.id : undefined,
                      gcalRecurringEventId: recurrence !== 'none' ? created.id : undefined,
                      syncStatus: 'synced' as const // Mark as synced immediately after POST
                    }
                  : e
              ));
            }
            setConnectorNotice(`🟢 Event "${title}" (${startTime}-${endTime}) posted live to your Google Calendar!`);
            await fetchGoogleEvents();
          } else if (res) {
            const rawErrText = await res.text().catch(() => '');
            let errDetail = rawErrText;
            try {
              const parsed = JSON.parse(rawErrText);
              errDetail = parsed?.error?.message || rawErrText;
            } catch {}
            console.warn('Google Calendar API POST status:', res.status, rawErrText);
            if (res.status === 403) {
              setConnectorNotice(`⚠️ Insufficient permissions (403). Please go to Connectors tab and click "Disconnect / Reauth" to grant full Google Calendar permissions.`);
            } else {
              setConnectorNotice(`⚠️ Event saved locally, but Google Calendar API returned ${res.status}: ${errDetail || 'Unknown API error'}`);
            }
          }
        } catch (err: any) {
          console.warn('Google Calendar POST notice:', err);
          setConnectorNotice(`⚠️ Event saved locally, but Google Calendar API request failed: ${err?.message || err}`);
        }
      }
    }

    setNewEventTitle('');
    setNewEventDate('');
  };

  const handleDeleteEvent = async (id: string) => {
    // Case A: Deleting a Google Calendar imported event (starts with 'gcal-')
    if (id.startsWith('gcal-')) {
      const gcalEventId = id.replace('gcal-', '');
      setGoogleCalendarEvents((prev) => prev.filter((ev) => ev.id !== id));

      if (connectors.googleCalendar) {
        // Resolve the Google Calendar ID for this event
        const ev = googleCalendarEvents.find((e: any) => e.id === id);
        const evCal = calendars.find((c: any) => c.id === ev?.calendarId);
        const targetGcalId = evCal?.googleCalendarId || 'primary';

        try {
          const res = await executeGoogleApi((accessToken) =>
            fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetGcalId)}/events/${encodeURIComponent(gcalEventId)}`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            )
          );

          if (res && (res.ok || res.status === 204)) {
            setConnectorNotice('🟢 Deleted live from Google Calendar!');
            await fetchGoogleEvents();
          } else if (res) {
            setConnectorNotice(`⚠️ Removed locally, but Google Calendar API returned ${res.status}`);
          }
        } catch (err: any) {
          console.warn('GCal delete error:', err);
        }
      }
      return;
    }

    // Case B: Deleting a local Sakido event (and matching Google Calendar event if synced)
    const targetEv = events.find((ev) => ev.id === id);
    setEvents((prev) => prev.filter((ev) => ev.id !== id));

    if (targetEv && connectors.googleCalendar) {
      // Resolve target Google Calendar ID for this event
      const targetCal = calendars.find((c: any) => c.id === targetEv.calendarId);
      const targetGcalId = targetCal?.googleCalendarId || 'primary';

      try {
        const searchTitle = targetEv.title.startsWith('[Sakido]') ? targetEv.title : `[Sakido] ${targetEv.title}`;
        const searchRes = await executeGoogleApi((accessToken) =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetGcalId)}/events?q=${encodeURIComponent(targetEv.title)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
        );

        if (searchRes && searchRes.ok) {
          const searchData = await searchRes.json();
          const matched = (searchData.items || []).find(
            (item: any) => item.summary === searchTitle || item.summary === targetEv.title
          );

          if (matched?.id) {
            const delRes = await executeGoogleApi((accessToken) =>
              fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetGcalId)}/events/${encodeURIComponent(matched.id)}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              )
            );

            if (delRes && (delRes.ok || delRes.status === 204)) {
              setConnectorNotice(`🟢 Event "${targetEv.title}" deleted from Sakido & Google Calendar!`);
              await fetchGoogleEvents();
            }
          } else {
            setConnectorNotice(`🟢 Event "${targetEv.title}" removed from Sakido schedule.`);
          }
        }
      } catch (err) {
        console.warn('Sync delete notice:', err);
      }
    } else {
      setConnectorNotice(`🟢 Event "${targetEv?.title || 'Event'}" removed from Sakido schedule.`);
    }
  };

  // Calendar management handlers
  const handleToggleCalendarVisibility = (calendarId: string) => {
    setCalendars(prev => prev.map(c => c.id === calendarId ? { ...c, visible: !c.visible } : c));
  };

  const handleRenameCalendar = (calendarId: string, newName: string) => {
    setCalendars(prev => prev.map(c => c.id === calendarId ? { ...c, name: newName } : c));
  };

  const handleDeleteCalendar = (calendarId: string) => {
    const calendar = calendars.find(c => c.id === calendarId);
    const eventCount = events.filter(e => e.calendarId === calendarId).length;
    if (eventCount > 0 && !window.confirm(`Delete "${calendar?.name}" and ${eventCount} event(s)?`)) return;
    setCalendars(prev => prev.filter(c => c.id !== calendarId));
    setEvents(prev => prev.filter(e => e.calendarId !== calendarId));
  };

  const handleCreateCalendar = (name: string, color: string) => {
    const newCal = {
      id: `cal-${Date.now()}`,
      name,
      color,
      visible: true,
      source: 'sakido' as const
    };
    setCalendars(prev => [...prev, newCal]);
  };

  const visibleCalendars = [
    ...calendars.filter(c => c.visible).map(c => c.id),
    ...(connectors.googleCalendar ? ['google-calendar'] : [])
  ];

  // Form states
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassProf, setNewClassProf] = useState('');
  const [newClassTime, setNewClassTime] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskGrade, setNewTaskGrade] = useState('');
  const [newTaskCourse, setNewTaskCourse] = useState('');
  const [newTaskCourseId, setNewTaskCourseId] = useState(''); // Step 1: courseId reference
  const [newTaskDueDate, setNewTaskDueDate] = useState(''); // Step 1: due date

  const [newWatchTitle, setNewWatchTitle] = useState('');
  const [newWatchUrl, setNewWatchUrl] = useState('');
  const [newWatchCourse, setNewWatchCourse] = useState('');

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCourse, setNewNoteCourse] = useState('');
  const [newNoteCourseId, setNewNoteCourseId] = useState(''); // Step 1: courseId reference
  const [newNoteColor, setNewNoteColor] = useState<string>('default');
  const [newNoteIsChecklist, setNewNoteIsChecklist] = useState<boolean>(false);
  const [newNoteChecklistRaw, setNewNoteChecklistRaw] = useState<string>('');
  const [noteTabFilter, setNoteTabFilter] = useState<'active' | 'archived'>('active');
  const [selectedNoteTag, setSelectedNoteTag] = useState<string>('all');

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

  // Detail Modal States
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);

  const [connectingService, setConnectingService] = useState<string | null>(null);
  const [connectorNotice, setConnectorNotice] = useState<string | null>(null);

  // Auto-dismiss notification toast after 6 seconds
  useEffect(() => {
    if (connectorNotice) {
      const timer = setTimeout(() => {
        setConnectorNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [connectorNotice]);

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

  // Sync dark mode class on document element
  useEffect(() => {
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

  // Banner editing with file upload & URL support
  const handleFileUploadBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File is too large (max 8MB). Please select a smaller GIF or image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setNewBannerInput(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    const url = newBannerInput.trim();
    if (url) {
      setBannerImageUrl(url);
      setIsEditingBanner(false);
      setNewBannerInput('');
      setConnectorNotice('🟢 Banner wallpaper updated!');
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

    // Step 1: Use courseId reference instead of freeform text
    const selectedCourse = classes.find(c => c.id === newTaskCourseId);

    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        grade: newTaskGrade.trim(),
        courseId: newTaskCourseId || null,
        courseName: selectedCourse?.name || 'General',
        courseColor: selectedCourse?.color || '#6f4627',
        course: selectedCourse?.code || 'General', // Legacy field for existing code
        status: 'todo',
        completed: false,
        dueDate: newTaskDueDate || null, // Step 1: ISO date string
      },
    ]);
    setNewTaskTitle('');
    setNewTaskGrade('');
    setNewTaskCourseId('');
    setNewTaskDueDate('');
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === 'completed' || t.completed ? 'todo' : 'completed',
              completed: !(t.status === 'completed' || t.completed),
            }
          : t
      )
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleUpdateTask = (updatedTask: any) => {
    setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(null);
  };

  const handleAddSubtask = (taskId: string, subtaskTitle: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id === taskId) {
        const newSubtask = { id: Date.now().toString(), title: subtaskTitle, completed: false };
        return { ...t, subtasks: [...(t.subtasks || []), newSubtask] };
      }
      return t;
    }));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id === taskId) {
        const updatedSubtasks = (t.subtasks || []).map((st: any) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    }));
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id === taskId) {
        return { ...t, subtasks: (t.subtasks || []).filter((st: any) => st.id !== subtaskId) };
      }
      return t;
    }));
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

  // Notes Handlers (Google Keep style with 2-way Google Drive AppData sync)
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    let checklistItems: { id: string; text: string; completed: boolean }[] = [];
    if (newNoteIsChecklist && newNoteChecklistRaw.trim()) {
      checklistItems = newNoteChecklistRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text, idx) => ({
          id: `${Date.now()}-${idx}`,
          text,
          completed: false,
        }));
    }

    // Step 1: Use courseId reference instead of freeform text
    const selectedCourse = classes.find(c => c.id === newNoteCourseId);

    const newNote = {
      id: Date.now().toString(),
      title: newNoteTitle.trim(),
      content: newNoteContent.trim() || (newNoteIsChecklist ? '' : 'No additional details provided.'),
      courseId: newNoteCourseId || null,
      courseName: selectedCourse?.name || 'General',
      courseColor: selectedCourse?.color || '#6f4627',
      course: selectedCourse?.code || 'General', // Legacy field for existing code
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: newNoteColor || 'default',
      pinned: false,
      archived: false,
      isChecklist: newNoteIsChecklist,
      checklistItems,
    };

    setNotes((prev) => {
      const updated = [newNote, ...prev];
      debouncedSyncNotesToGoogleDrive(updated);
      return updated;
    });

    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteCourseId('');
    setNewNoteColor('default');
    setNewNoteIsChecklist(false);
    setNewNoteChecklistRaw('');
    setConnectorNotice('🟢 Note saved & synced!');
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      debouncedSyncNotesToGoogleDrive(updated);
      return updated;
    });
    setConnectorNotice('🟢 Note deleted.');
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  const handleUpdateNote = (updatedNote: any) => {
    setNotes((prev) => {
      const updated = prev.map((n) => n.id === updatedNote.id ? updatedNote : n);
      debouncedSyncNotesToGoogleDrive(updated);
      return updated;
    });
    setSelectedNote(null);
    setConnectorNotice('🟢 Note updated!');
  };

  const handleTogglePinNote = (id: string) => {
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
      debouncedSyncNotesToGoogleDrive(updated);
      return updated;
    });
  };

  const handleToggleArchiveNote = (id: string) => {
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, archived: !n.archived } : n));
      debouncedSyncNotesToGoogleDrive(updated);
      return updated;
    });
  };

  const handleToggleChecklistItem = (noteId: string, itemId: string) => {
    setNotes((prev) => {
      const updated = prev.map((n) => {
        if (n.id !== noteId) return n;
        const updatedItems = (n.checklistItems || []).map((item: any) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        return { ...n, checklistItems: updatedItems };
      });
      debouncedSyncNotesToGoogleDrive(updated);
      return updated;
    });
  };

  // OAuth Connector Handler
  const handleConnectOAuth = async (serviceKey: 'googleCalendar' | 'googleDrive' | 'gmail', isReauthorization: boolean = false) => {
    // If currently connecting, clicking again cancels the pending state immediately
    if (connectingService === serviceKey && !isReauthorization) {
      setConnectingService(null);
      localStorage.removeItem('sakido_pending_connector');
      return;
    }

    const scopeMap = {
      googleCalendar: 'https://www.googleapis.com/auth/calendar',
      googleDrive: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile',
      gmail: 'https://www.googleapis.com/auth/gmail.readonly',
    };

    const serviceNames = {
      googleCalendar: 'Google Calendar',
      googleDrive: 'Google Drive & Notes',
      gmail: 'Gmail Notifications',
    };

    // Handle Disconnect Action
    if (connectors[serviceKey] && !isReauthorization) {
      const supabase = getSupabaseClient();

      // Compute allOff SYNCHRONOUSLY (before any async call) to avoid stale closure.
      // connectors at this point is the state at click time — guaranteed correct for same-tab.
      const flagCol = serviceKey === 'googleCalendar' ? 'google_calendar_connected'
        : serviceKey === 'googleDrive' ? 'google_drive_connected'
        : 'gmail_connected';
      const allOff = !Object.values({ ...connectors, [serviceKey]: false }).some(Boolean);

      // Optimistic local state update (synchronous, before async DB work)
      // Per-service tokens: only clear this service's cached token
      clearProviderToken(serviceKey);
      setConnectors((prev) => ({ ...prev, [serviceKey]: false }));
      setConnectorNotice(`Disconnected ${serviceNames[serviceKey]}.`);
      setConnectingService(null);

      // DB operations (async — use pre-computed allOff for same-tab correctness)
      supabase?.auth.getSession().then(({ data }) => {
        if (!data?.session?.user?.id) return;
        const uid = data.session.user.id;

        if (!allOff) {
          // Some other service is still connected — clear this flag AND this service's token column
          const tokenCol = serviceKey === 'googleCalendar' ? 'calendar_refresh_token'
            : serviceKey === 'googleDrive' ? 'drive_refresh_token'
            : 'gmail_refresh_token';
          supabase.from('google_tokens').update({ [flagCol]: false, [tokenCol]: null, updated_at: new Date().toISOString() })
            .eq('user_id', uid)
            .then(({ error }) => { if (error) console.warn('[connectors] flag clear failed:', error.message); });
        } else {
          // This was the last connected service. Cross-tab safety: verify from DB before deleting.
          supabase.from('google_tokens')
            .select('google_calendar_connected, google_drive_connected, gmail_connected')
            .eq('user_id', uid)
            .maybeSingle()
            .then(({ data: dbState, error }) => {
              if (error) {
                console.warn('[connectors] DB re-read failed before delete:', error.message);
                return;
              }
              const dbAllOff = !dbState || (
                !dbState.google_calendar_connected &&
                !dbState.google_drive_connected &&
                !dbState.gmail_connected
              );
              if (dbAllOff) {
                // DB confirms all flags are false — safe to delete the row
                supabase.from('google_tokens').delete().eq('user_id', uid)
                  .then(({ error: delError }) => {
                    if (delError) console.warn('[connectors] row delete failed:', delError.message);
                  });
              } else {
                // Another tab reconnected in the meantime — clear this flag AND this service's token column
                const tokenCol = serviceKey === 'googleCalendar' ? 'calendar_refresh_token'
                  : serviceKey === 'googleDrive' ? 'drive_refresh_token'
                  : 'gmail_refresh_token';
                supabase.from('google_tokens').update({ [flagCol]: false, [tokenCol]: null, updated_at: new Date().toISOString() })
                  .eq('user_id', uid)
                  .then(({ error: updError }) => {
                    if (updError) console.warn('[connectors] flag clear failed:', updError.message);
                  });
              }
            });
        }
      });
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
    if (activeTab === 'Overview') {
      return (
        <DashboardView
          profile={{
            name: currentUser?.name || 'Alex Chen',
            major: 'Computer Science',
            university: 'Stanford University',
            term: 'Spring 2026',
            avatarUrl: currentUser?.avatarUrl || '',
            completedMinutesToday: resolvedFocusStats.completedMinutesToday,
            dailyGoalMinutes: 60,
            tasksCompletedToday: tasks.filter(t => t.status === 'completed').length,
            streakDays: resolvedFocusStats.streakDays,
          }}
          tasks={tasks}
          courses={classes}
          schedule={events}
          onNavigate={(tab) => handleSelectTab(tab)}
          onToggleTaskStatus={(id) => handleToggleTask(id)}
          onStartFocusWithTask={(title) => handleStartFocusSession({ mode: 'normal', durationMinutes: 25, pomodoroRatio: '5:1', pomoFocusMinutes: 25, pomoBreakMinutes: 5, pomodoroCycles: 4 })}
          onQuickAddTask={() => handleSelectTab('Tasks & Grades')}
        />
      );
    }

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
            {classes.map((c) => {
              const courseTasks = tasks.filter(t => t.courseId === c.id);
              const activeTasks = courseTasks.filter(t => !t.completed);

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCourse(c)}
                  className="p-5 border border-outline-variant/40 rounded-xl bg-surface-container-low dark:bg-[#251e19] shadow-xs flex flex-col justify-between relative group hover:border-primary-container/60 hover:shadow-md transition-all cursor-pointer"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }}
                    className="absolute top-4 right-4 text-secondary/60 hover:text-error transition-colors p-1"
                    title="Remove course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-surface-container-high dark:bg-[#342a23] text-primary dark:text-primary-fixed-dim">
                        {c.code}
                      </span>
                      {activeTasks.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-mono font-bold">
                          {activeTasks.length} active
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-bold text-lg text-on-surface leading-snug pr-8">
                      {c.name}
                    </h4>
                    <p className="text-xs text-secondary dark:text-secondary-fixed-dim mt-1">
                      {c.professor || c.instructor || 'No instructor'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5" /> {c.time || c.schedule || 'No schedule'}
                    </span>
                    <span className="font-medium text-on-surface-variant">{c.room || 'TBD'}</span>
                  </div>
                </div>
              );
            })}
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

      // ponytail: overlay Google events with linked local events (local wins for gcalId match)
      const localByGcalId = new Map(
        events.filter(e => e.gcalId).map(e => [e.gcalId, e])
      );

      const googleWithOverlay = googleCalendarEvents.map(google => {
        const local = localByGcalId.get(google.gcalId);
        return local || google;
      });

      const unmatchedLocal = events.filter(e => !e.gcalId);
      const allEvents = connectors.googleCalendar
        ? [...googleWithOverlay, ...unmatchedLocal]
        : events;

      return (
        <div className="col-span-12 lg:col-span-8 flex gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          {/* Left Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            <MiniMonthPicker
              selectedWeekStart={selectedWeekStart}
              onWeekSelect={setSelectedWeekStart}
              onRangeSelect={(startDate, endDate) => {
                // For drag-select range: set week view to start of the selected range
                setSelectedWeekStart(startDate);
                setCalendarViewMode('week');
              }}
              events={allEvents}
              visibleCalendars={visibleCalendars}
            />
            <CalendarList
              calendars={calendars}
              onToggleVisibility={handleToggleCalendarVisibility}
              onRename={handleRenameCalendar}
              onDelete={handleDeleteCalendar}
              onCreate={handleCreateCalendar}
            />
          </div>

          {/* Main Calendar Area */}
          <div className="flex-1 flex flex-col gap-6">
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

          {/* Re-authorization Banner */}
          {connectors.googleCalendar && !hasCalendarManagementScope && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <strong>Calendar management features available.</strong> Re-authorize Google Calendar to create and manage calendars.
              </p>
              <button
                onClick={() => handleConnectOAuth('googleCalendar', true)}
                className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-container transition-colors text-sm font-medium"
              >
                Re-authorize
              </button>
            </div>
          )}

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
                Month View
              </button>
              <button
                type="button"
                onClick={() => setCalendarViewMode('week')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  calendarViewMode === 'week'
                    ? 'bg-[#8b5e3c] text-white shadow-2xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Week View
              </button>
            </div>

            {connectors.googleCalendar && (
              <button
                type="button"
                onClick={async () => {
                  setConnectorNotice('Refreshing Google Calendar sync...');
                  await fetchGoogleEvents();
                  setConnectorNotice('🟢 Live Google Calendar synchronized!');
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

          {calendarViewMode === 'week' ? (
            /* Week Grid View */
            <>
              {/* Week Navigation Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <button
                  onClick={() => setSelectedWeekStart(prev => addDays(prev, -7))}
                  className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center gap-1">
                  <div className="text-base font-semibold text-on-surface">
                    {formatDate(selectedWeekStart)} - {formatDate(addDays(selectedWeekStart, 6))}
                  </div>
                  <button
                    onClick={() => setSelectedWeekStart(startOfWeek(new Date()))}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Today
                  </button>
                </div>

                <button
                  onClick={() => setSelectedWeekStart(prev => addDays(prev, 7))}
                  className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
                  aria-label="Next week"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <WeekGrid
                selectedWeekStart={selectedWeekStart}
                events={allEvents}
                calendars={calendars}
                visibleCalendars={visibleCalendars}
                onEventUpdate={async (event) => {
                  setEvents(prev => prev.map(e => e.id === event.id ? { ...event, syncStatus: 'pending' } : e));
                  await syncEventToGoogleCalendar(event);
                }}
                onEventCreate={(event) => {
                  // Pending drag-created events are only synced after the user saves them.
                  setEvents(prev => [...prev, event]);
                }}
                setEvents={setEvents}
                lastUsedCalendarId={lastUsedCalendarId}
                setLastUsedCalendarId={setLastUsedCalendarId}
                onEditingStart={(eventId) => {
                  setEditingEventIds(prev => new Set(prev).add(eventId));
                }}
                onEditingEnd={(eventId) => {
                  setEditingEventIds(prev => {
                    const next = new Set(prev);
                    next.delete(eventId);
                    return next;
                  });
                }}
              />
            </>
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

                  const matchedEvents = allEvents.filter((e) => e.date === dateStr);
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

        </div>
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
              <select
                value={newTaskCourseId}
                onChange={(e) => setNewTaskCourseId(e.target.value)}
                className="flex-1 border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface focus:outline-hidden focus:border-primary-container"
              >
                <option value="">Select Course (Optional)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} - {cls.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest text-on-surface focus:outline-hidden focus:border-primary-container"
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
            {filteredTasks.map((t) => {
              // Format due date nicely
              const formatDueDate = (dateStr: string | null) => {
                if (!dateStr) return 'No due date';
                const date = new Date(dateStr);
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                if (dateStr === today.toISOString().split('T')[0]) return 'Today';
                if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
                if (date < today) return <span className="text-error font-bold">Overdue</span>;
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              };

              // Priority colors
              const priorityColors = {
                urgent: 'text-error',
                high: 'text-orange-500',
                medium: 'text-yellow-600',
                low: 'text-green-600'
              };

              const statusColors = {
                todo: 'bg-gray-100 text-gray-700',
                in_progress: 'bg-blue-100 text-blue-700',
                submitted: 'bg-purple-100 text-purple-700',
                completed: 'bg-green-100 text-green-700'
              };

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 border border-outline-variant/40 rounded-xl bg-surface-container-low hover:border-outline-variant hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setSelectedTask(t)}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      // stopPropagation must live on click, not onChange — the
                      // click still bubbles to the parent and opens the detail
                      // modal on every toggle otherwise.
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggleTask(t.id)}
                      className="w-5 h-5 accent-[#8b5e3c] cursor-pointer rounded shrink-0"
                    />
                    {t.courseColor && (
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: t.courseColor }}></div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {t.priority && t.priority !== 'medium' && (
                          <AlertCircle className={`w-3.5 h-3.5 ${priorityColors[t.priority as keyof typeof priorityColors]} shrink-0`} />
                        )}
                        <span
                          className={`text-sm font-medium text-on-surface truncate ${
                            t.completed ? 'line-through text-secondary/70' : ''
                          }`}
                        >
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-secondary font-mono">
                          {t.courseName || t.course || 'General'}
                        </span>
                        <span className="text-xs text-secondary">•</span>
                        <span className="text-xs text-secondary">{formatDueDate(t.dueDate)}</span>
                        {t.status && t.status !== 'todo' && (
                          <>
                            <span className="text-xs text-secondary">•</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[t.status as keyof typeof statusColors]}`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {t.grade && (
                      <span className="px-2.5 py-1 rounded-md bg-surface-container-high font-mono text-xs font-bold text-primary">
                        {t.grade}%
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(t.id);
                      }}
                      className="text-secondary/50 hover:text-error transition-colors p-1"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

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

    if (activeTab === 'Focus Timer' || activeTab === 'Focus') {
      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <FocusTimerView
            onStartFocusSession={handleStartFocusSession}
          />
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
      const NOTE_COLOR_MAP: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
        default: {
          bg: 'bg-surface-container-low dark:bg-[#251e19]',
          border: 'border-outline-variant/40',
          badge: 'bg-surface-container-high dark:bg-[#342a23] text-primary dark:text-primary-fixed-dim',
          dot: 'bg-stone-400',
        },
        amber: {
          bg: 'bg-amber-500/10 dark:bg-amber-950/30',
          border: 'border-amber-500/40',
          badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500',
        },
        emerald: {
          bg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
          border: 'border-emerald-500/40',
          badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500',
        },
        sky: {
          bg: 'bg-sky-500/10 dark:bg-sky-950/30',
          border: 'border-sky-500/40',
          badge: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
          dot: 'bg-sky-500',
        },
        rose: {
          bg: 'bg-rose-500/10 dark:bg-rose-950/30',
          border: 'border-rose-500/40',
          badge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
          dot: 'bg-rose-500',
        },
        purple: {
          bg: 'bg-purple-500/10 dark:bg-purple-950/30',
          border: 'border-purple-500/40',
          badge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
          dot: 'bg-purple-500',
        },
      };

      const filteredNotes = notes.filter((n) => {
        // Tab filter: active vs archived
        if (noteTabFilter === 'active' && n.archived) return false;
        if (noteTabFilter === 'archived' && !n.archived) return false;
        // Tag filter
        if (selectedNoteTag !== 'all' && n.course?.toLowerCase() !== selectedNoteTag.toLowerCase()) return false;
        // Search query
        if (notesSearchQuery.trim()) {
          const q = notesSearchQuery.toLowerCase();
          const titleMatch = n.title?.toLowerCase().includes(q);
          const contentMatch = n.content?.toLowerCase().includes(q);
          const courseMatch = n.course?.toLowerCase().includes(q);
          return titleMatch || contentMatch || courseMatch;
        }
        return true;
      });

      const pinnedNotes = filteredNotes.filter((n) => n.pinned);
      const otherNotes = filteredNotes.filter((n) => !n.pinned);

      // Extract unique tags for tag pill filter
      const allTags = Array.from(new Set(notes.map((n) => n.course).filter(Boolean)));

      return (
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-display text-2xl font-bold text-on-surface">Notes & Study Scratchpad</h3>
                {connectors.googleDrive && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Google Drive Cloud Sync Active
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary dark:text-secondary-fixed-dim mt-0.5">
                Lecture summaries, colored checklists, and study scratchpad backed up to your Google Drive account
              </p>
            </div>

            {/* Active vs Archived View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-high dark:bg-[#201915] border border-outline-variant/40 shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setNoteTabFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  noteTabFilter === 'active' ? 'bg-[#8b5e3c] text-white font-bold shadow-2xs' : 'text-secondary hover:text-on-surface'
                }`}
              >
                Notes ({notes.filter((n) => !n.archived).length})
              </button>
              <button
                onClick={() => setNoteTabFilter('archived')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  noteTabFilter === 'archived' ? 'bg-[#8b5e3c] text-white font-bold shadow-2xs' : 'text-secondary hover:text-on-surface'
                }`}
              >
                <Archive className="w-3.5 h-3.5" /> Archive ({notes.filter((n) => n.archived).length})
              </button>
            </div>
          </div>

          {/* Add Note Form (Google Keep style) */}
          <form onSubmit={handleAddNote} className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#201915] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-secondary font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Take a Note...
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewNoteIsChecklist(!newNoteIsChecklist)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                    newNoteIsChecklist
                      ? 'bg-primary/10 border-primary text-primary font-bold'
                      : 'border-outline-variant/50 text-secondary hover:text-on-surface'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Checklist
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note Title..."
                required
                className="border border-outline-variant/50 rounded-xl p-3 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container font-medium"
              />
              <select
                value={newNoteCourseId}
                onChange={(e) => setNewNoteCourseId(e.target.value)}
                className="border border-outline-variant/50 rounded-xl p-3 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-hidden focus:border-primary-container"
              >
                <option value="">Select Course (Optional)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} - {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {newNoteIsChecklist ? (
              <textarea
                rows={3}
                value={newNoteChecklistRaw}
                onChange={(e) => setNewNoteChecklistRaw(e.target.value)}
                placeholder="Enter checklist items (one per line)...&#10;• Review Chapter 4 slides&#10;• Complete problem set 2&#10;• Email professor about office hours"
                className="border border-outline-variant/50 rounded-xl p-3 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container resize-none font-mono text-xs leading-relaxed"
              ></textarea>
            ) : (
              <textarea
                rows={3}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Note details, lecture concepts, study scratchpad..."
                className="border border-outline-variant/50 rounded-xl p-3 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container resize-none leading-relaxed"
              ></textarea>
            )}

            {/* Color Palette Selector & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-secondary flex items-center gap-1 mr-1">
                  <Palette className="w-3.5 h-3.5" /> Theme:
                </span>
                {Object.keys(NOTE_COLOR_MAP).map((cKey) => (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => setNewNoteColor(cKey)}
                    className={`w-5 h-5 rounded-full ${NOTE_COLOR_MAP[cKey].dot} border-2 transition-all cursor-pointer ${
                      newNoteColor === cKey ? 'border-primary ring-2 ring-primary/40 scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    title={`Color: ${cKey}`}
                  ></button>
                ))}
              </div>

              <button
                type="submit"
                className="bg-[#8b5e3c] hover:bg-[#6f4627] text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Save to Keep Notes
              </button>
            </div>
          </form>

          {/* Search Bar & Tag Filter Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                value={notesSearchQuery}
                onChange={(e) => setNotesSearchQuery(e.target.value)}
                placeholder="Search notes by title, tag, or checklist item..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#1a1411] text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedNoteTag('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    selectedNoteTag === 'all'
                      ? 'bg-primary/20 text-primary font-bold border border-primary/30'
                      : 'bg-surface-container-high text-secondary hover:text-on-surface'
                  }`}
                >
                  #all
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedNoteTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                      selectedNoteTag === tag
                        ? 'bg-primary/20 text-primary font-bold border border-primary/30'
                        : 'bg-surface-container-high text-secondary hover:text-on-surface'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold font-mono text-secondary uppercase tracking-widest flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-primary rotate-45" /> Pinned Notes ({pinnedNotes.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pinnedNotes.map((n) => {
                  const style = NOTE_COLOR_MAP[n.color || 'default'] || NOTE_COLOR_MAP.default;
                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNote(n)}
                      className={`p-5 border ${style.border} ${style.bg} rounded-2xl shadow-xs flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer`}
                    >
                      <div className="flex items-center gap-1 absolute top-4 right-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTogglePinNote(n.id); }}
                          className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="Unpin note"
                        >
                          <Pin className="w-4 h-4 fill-current rotate-45" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleArchiveNote(n.id); }}
                          className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                          title={n.archived ? 'Unarchive note' : 'Archive note'}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }}
                          className="p-1.5 rounded-lg text-secondary/60 hover:text-error transition-colors cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2 pr-24">
                          <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md ${style.badge}`}>
                            {n.courseName || n.course}
                          </span>
                          <span className="text-[10px] text-secondary font-mono">{n.date}</span>
                        </div>

                        <h4 className="font-display font-bold text-base text-on-surface mb-2 pr-24">
                          {n.title}
                        </h4>

                        {n.isChecklist && n.checklistItems?.length ? (
                          <div className="space-y-1.5 my-2">
                            {n.checklistItems.map((item: any) => (
                              <label
                                key={item.id}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => handleToggleChecklistItem(n.id, item.id)}
                                  className="rounded border-outline-variant text-primary focus:ring-primary w-3.5 h-3.5"
                                />
                                <span className={item.completed ? 'line-through text-secondary' : ''}>
                                  {item.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-secondary dark:text-secondary-fixed-dim leading-relaxed line-clamp-4 whitespace-pre-wrap">
                            {n.content}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Others / Active Notes Section */}
          <div className="space-y-3">
            {pinnedNotes.length > 0 && otherNotes.length > 0 && (
              <div className="text-xs font-bold font-mono text-secondary uppercase tracking-widest">
                Others ({otherNotes.length})
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherNotes.map((n) => {
                const style = NOTE_COLOR_MAP[n.color || 'default'] || NOTE_COLOR_MAP.default;
                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNote(n)}
                    className={`p-5 border ${style.border} ${style.bg} rounded-2xl shadow-xs flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer`}
                  >
                    <div className="flex items-center gap-1 absolute top-4 right-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTogglePinNote(n.id); }}
                        className="p-1.5 rounded-lg text-secondary/60 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Pin note to top"
                      >
                        <Pin className="w-4 h-4 rotate-45" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleArchiveNote(n.id); }}
                        className="p-1.5 rounded-lg text-secondary/60 hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                        title={n.archived ? 'Unarchive note' : 'Archive note'}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }}
                        className="p-1.5 rounded-lg text-secondary/60 hover:text-error transition-colors cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2 pr-24">
                        <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md ${style.badge}`}>
                          {n.courseName || n.course}
                        </span>
                        <span className="text-[10px] text-secondary font-mono">{n.date}</span>
                      </div>

                      <h4 className="font-display font-bold text-base text-on-surface mb-2 pr-24">
                        {n.title}
                      </h4>

                      {n.isChecklist && n.checklistItems?.length ? (
                        <div className="space-y-1.5 my-2">
                          {n.checklistItems.map((item: any) => (
                            <label
                              key={item.id}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleToggleChecklistItem(n.id, item.id)}
                                className="rounded border-outline-variant text-primary focus:ring-primary w-3.5 h-3.5"
                              />
                              <span className={item.completed ? 'line-through text-secondary' : ''}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-secondary dark:text-secondary-fixed-dim leading-relaxed line-clamp-4 whitespace-pre-wrap">
                          {n.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {filteredNotes.length === 0 && (
            <div className="w-full h-40 border border-outline-variant/50 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 text-secondary p-6">
              <FileText className="w-8 h-8 text-primary-container" />
              <span className="text-sm font-medium">No notes found</span>
              <p className="text-xs text-secondary/70">
                {noteTabFilter === 'archived' ? 'Your archived notes folder is empty.' : 'Write a new note or checklist above to get started.'}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'Connectors') {
      return (
        <div className="col-span-12 lg:col-span-8 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-6 lg:pt-0">
          <ConnectorsView
            connectors={{
              ...connectors,
              accountEmail: currentUser?.email,
            }}
            connectingService={connectingService}
            connectorNotice={connectorNotice}
            onConnect={(serviceKey) => handleConnectOAuth(serviceKey)}
            onDisconnect={(serviceKey) => handleConnectOAuth(serviceKey)}
            onDismissNotice={() => setConnectorNotice(null)}
            executeGoogleApi={executeGoogleApi}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex w-full min-h-screen bg-surface text-on-surface font-body transition-colors duration-200">
      {/* Global Toast Notice Banner */}
      {connectorNotice && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] max-w-md w-[calc(100vw-2rem)] p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-[#251e19] text-on-surface shadow-2xl backdrop-blur-md flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 text-xs leading-relaxed">
            <span className="font-bold text-primary block mb-0.5">Sync & Service Notice</span>
            {connectorNotice}
          </div>
          <button
            onClick={() => setConnectorNotice(null)}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors text-xs shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* Sidebar Navigation - Collapsible Layout */}
      <nav
        className={`fixed top-0 left-0 h-screen bg-surface-container-low border-r border-outline-variant/30 flex flex-col z-50 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Scrollable Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col no-scrollbar">
          {/* Unified Brand & Collapse Header Row */}
          <div className="mb-6 flex items-center justify-between shrink-0 px-2 pb-4 border-b border-outline-variant/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <SakidoLogo size="w-7 h-7" />
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex flex-col justify-center">
                  <h1 className="font-display text-lg font-bold tracking-tight text-on-surface leading-tight truncate">
                    Sakido
                  </h1>
                  <span className="text-[10px] text-secondary font-mono leading-none tracking-wide">
                    Productivity Portal
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container text-secondary hover:text-on-surface transition-colors cursor-pointer shrink-0"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* Student Section */}
          {!isSidebarCollapsed && (
            <div className="mb-2 text-[11px] font-bold text-secondary uppercase tracking-wider font-mono shrink-0 px-2">
              Student Workspace
            </div>
          )}
          <ul className="space-y-1 mb-6 shrink-0">
            {[
              { name: 'Overview', icon: LayoutDashboard },
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
                    title={isSidebarCollapsed ? item.name : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center px-2' : ''
                    } ${
                      isActive
                        ? 'text-primary font-bold bg-surface-container border border-primary-container/20 shadow-2xs'
                        : 'text-secondary hover:text-on-surface hover:bg-surface-container/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Integrations Section */}
          {!isSidebarCollapsed && (
            <div className="mb-2 text-[11px] font-bold text-secondary uppercase tracking-wider font-mono shrink-0 px-2">
              Integrations
            </div>
          )}
          <ul className="space-y-1 mb-6 shrink-0">
            <li>
              <button
                onClick={() => handleSelectTab('Connectors')}
                title={isSidebarCollapsed ? "Connectors" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center px-2' : ''
                } ${
                  activeTab === 'Connectors'
                    ? 'text-primary font-bold bg-surface-container border border-primary-container/20 shadow-2xs'
                    : 'text-secondary hover:text-on-surface hover:bg-surface-container/60'
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Connectors</span>}
              </button>
            </li>
          </ul>

          {/* Focus Section */}
          {!isSidebarCollapsed && (
            <div className="mb-2 text-[11px] font-bold text-secondary uppercase tracking-wider font-mono shrink-0 px-2">
              Focus
            </div>
          )}
          <ul className="space-y-1 mb-6 shrink-0">
            <li>
              <button
                onClick={() => handleSelectTab('Focus Timer')}
                title={isSidebarCollapsed ? "Focus Timer" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center px-2' : ''
                } ${
                  activeTab === 'Focus Timer'
                    ? 'text-primary font-bold bg-surface-container border border-primary-container/20 shadow-2xs'
                    : 'text-secondary hover:text-on-surface hover:bg-surface-container/60'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Focus Timer</span>}
              </button>
            </li>
          </ul>

          {/* Modules Section */}
          {!isSidebarCollapsed && (
            <div className="mb-2 text-[11px] font-bold text-secondary uppercase tracking-wider font-mono shrink-0 px-2">
              Modules
            </div>
          )}
          <ul className="space-y-1 mb-6 shrink-0">
            {['University & People', 'AI Features'].map((item) => (
              <li key={item}>
                <button
                  onClick={() => handleSelectTab(item)}
                  title={isSidebarCollapsed ? item : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isSidebarCollapsed ? 'justify-center px-2' : ''
                  } ${
                    activeTab === item
                      ? 'text-primary font-bold bg-surface-container border border-primary-container/20 shadow-2xs'
                      : 'text-secondary hover:text-on-surface hover:bg-surface-container/60'
                  }`}
                >
                  <Info className="w-4 h-4 text-secondary/60 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{item}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer User Info */}
        <div className="border-t border-outline-variant/30 px-3 py-3.5 bg-surface-container-low flex items-center justify-between shrink-0 shadow-xs">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 min-w-0 hover:bg-surface-container/80 p-1.5 rounded-xl transition-all cursor-pointer text-left flex-1"
            title={userName}
          >
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center overflow-hidden shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-4 h-4 text-secondary" />
              )}
            </div>
            {!isSidebarCollapsed && <span className="text-xs font-bold text-on-surface truncate">{userName}</span>}
          </button>

          {!isSidebarCollapsed && onSignOut && (
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

      {/* Mobile Thumb-Zone Close Button */}
      {isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-on-primary shadow-xl flex items-center justify-center border border-white/20 active:scale-95 transition-all cursor-pointer"
          aria-label="Close Mobile Menu"
          title="Close Mobile Menu"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {/* Main Container with dynamic Sidebar Offset */}
      <main className={`flex-1 flex flex-col min-h-screen pt-16 lg:pt-0 w-full overflow-x-hidden transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
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

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-12 gap-8 flex-1">
            {/* Left Column (Clock & Real Date Widget - STRICTLY SCOPED TO OVERVIEW) */}
            {activeTab === 'Overview' && (
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                <div className="p-6 rounded-2xl border border-outline-variant/40 bg-surface-container-low shadow-2xs flex flex-col gap-5">
                  <div className="flex items-center gap-5">
                    {/* Sleek Minimalist Analog Clock */}
                    <div className="relative w-28 h-28 rounded-full border border-outline-variant/50 bg-surface-container-lowest dark:bg-[#1f1915] flex items-center justify-center shrink-0 shadow-inner">
                      {/* Minimalist 12, 3, 6, 9 Ticks */}
                      <div className="absolute top-2 w-0.5 h-2 bg-outline-variant/60 rounded-full" />
                      <div className="absolute bottom-2 w-0.5 h-2 bg-outline-variant/60 rounded-full" />
                      <div className="absolute left-2 h-0.5 w-2 bg-outline-variant/60 rounded-full" />
                      <div className="absolute right-2 h-0.5 w-2 bg-outline-variant/60 rounded-full" />

                      {/* Hour Hand */}
                      <div
                        className="absolute bottom-1/2 left-1/2 w-1 h-8 bg-on-surface rounded-full origin-bottom transition-transform duration-200"
                        style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }}
                      />

                      {/* Minute Hand */}
                      <div
                        className="absolute bottom-1/2 left-1/2 w-0.5 h-11 bg-primary rounded-full origin-bottom transition-transform duration-200"
                        style={{ transform: `translateX(-50%) rotate(${minuteDeg}deg)` }}
                      />

                      {/* Second Hand */}
                      <div
                        className="absolute bottom-1/2 left-1/2 w-[1px] h-12 bg-amber-500 rounded-full origin-bottom transition-transform duration-100"
                        style={{ transform: `translateX(-50%) rotate(${secondDeg}deg)` }}
                      />

                      {/* Center Dot */}
                      <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface-container-lowest z-10" />
                    </div>

                    {/* Real Date Display */}
                    <div className="text-left min-w-0">
                      <p className="font-mono text-[11px] uppercase tracking-widest text-primary font-bold">
                        {now.toLocaleDateString('en-US', { weekday: 'long' })}
                      </p>
                      <p className="font-display font-bold text-xl text-on-surface mt-0.5 tracking-tight truncate">
                        {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </p>
                      <p className="font-mono text-xs text-secondary mt-1 tracking-wide">
                        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Real Dynamic Academic Summary */}
                  <div className="w-full pt-4 border-t border-outline-variant/20 grid grid-cols-2 gap-3 text-center sm:text-left font-mono">
                    <div>
                      <span className="text-[10px] uppercase text-secondary font-bold">Active Courses</span>
                      <p className="font-display font-bold text-xl text-on-surface mt-0.5">{classes.length}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-secondary font-bold">Pending Tasks</span>
                      <p className="font-display font-bold text-xl text-on-surface mt-0.5">
                        {tasks.filter((t) => t.status !== 'completed' && t.status !== 'submitted').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Tab Content View */}
            <div className={`transition-all duration-150 ${activeTab === 'Overview' ? 'col-span-12 lg:col-span-8' : 'col-span-12'}`}>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Banner Cover Modal */}
      {isEditingBanner && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-xl text-on-surface">Change Banner Wallpaper</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Upload any local image/GIF file, paste a link, or pick from curated aesthetic animated GIFs
                </p>
              </div>
              <button
                onClick={() => setIsEditingBanner(false)}
                className="text-secondary hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="flex flex-col gap-4">
              {/* Option 1: File Upload */}
              <div className="p-4 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low/40 flex flex-col items-center justify-center gap-2.5 text-center">
                <input
                  type="file"
                  id="banner-file-input"
                  accept="image/*,image/gif"
                  onChange={handleFileUploadBanner}
                  className="hidden"
                />
                <label
                  htmlFor="banner-file-input"
                  className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-4 h-4 text-primary" /> Upload GIF or Image File
                </label>
                <span className="text-[11px] text-secondary">Supports GIF, PNG, JPG, WebP (max 8MB)</span>
              </div>

              {/* Option 2: Custom URL Input */}
              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Or Paste Custom GIF / Image Link
                </label>
                <input
                  type="text"
                  value={newBannerInput}
                  onChange={(e) => setNewBannerInput(e.target.value)}
                  placeholder="https://media.giphy.com/media/.../giphy.gif"
                  className="w-full border border-outline-variant/50 rounded-xl p-3 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Option 3: Curated Preset GIFs & Wallpapers */}
              <div>
                <div className="text-xs font-mono font-semibold text-secondary mb-2 flex items-center justify-between">
                  <span>Curated Aesthetic Preset GIFs & Wallpapers</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      name: 'Lofi Study Room (GIF)',
                      url: 'https://media.giphy.com/media/l41K3o5TzDQktX14Y/giphy.gif',
                    },
                    {
                      name: 'Cozy Rain Desk (GIF)',
                      url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdndnMWc3NG1nd3k1NDB3dnBnNHJpY2oxMHB6cWdhaHlnanhyNDN3ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif',
                    },
                    {
                      name: 'Pixel Art Desk (GIF)',
                      url: 'https://media.giphy.com/media/d4ce1n86Fq7X5R1D7/giphy.gif',
                    },
                    {
                      name: 'Zen Forest (GIF)',
                      url: 'https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif',
                    },
                    {
                      name: 'Modern Architecture',
                      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
                    },
                    {
                      name: 'Essentialist Workspace',
                      url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800',
                    },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewBannerInput(preset.url)}
                      className={`h-20 rounded-xl overflow-hidden border transition-all relative group cursor-pointer ${
                        newBannerInput === preset.url
                          ? 'border-primary ring-2 ring-primary/40 scale-[1.02]'
                          : 'border-outline-variant/40 hover:border-primary/60'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-end p-1.5">
                        <span className="text-[10px] font-mono text-white font-medium truncate w-full text-left">
                          {preset.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsEditingBanner(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#8b5e3c] hover:bg-[#6f4627] text-white shadow-xs transition-colors cursor-pointer"
                >
                  Save Wallpaper
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
                  {currentUser?.email}
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
                    { key: 'gmail', label: 'Gmail' },
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
                          {ev.id && (
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

      {/* Focus Timer fullscreen overlay */}
      {isFocusTimerOpen && (
        <FocusTimer
          config={focusConfig}
          onClose={() => setIsFocusTimerOpen(false)}
          onComplete={handleFocusComplete}
        />
      )}

      {/* Detail Modals */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          courses={classes}
          onClose={() => setSelectedTask(null)}
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={handleToggleSubtask}
          onDeleteSubtask={handleDeleteSubtask}
        />
      )}

      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          courses={classes}
          onClose={() => setSelectedNote(null)}
          onSave={handleUpdateNote}
          onDelete={handleDeleteNote}
          onTogglePin={handleTogglePinNote}
          onToggleArchive={handleToggleArchiveNote}
          onToggleChecklistItem={handleToggleChecklistItem}
        />
      )}

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          tasks={tasks}
          notes={notes}
          onClose={() => setSelectedCourse(null)}
          onSelectTask={(task) => setSelectedTask(task)}
          onSelectNote={(note) => setSelectedNote(note)}
        />
      )}
    </div>
  );
};
