import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Check,
  Send,
  FileText,
  Play,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  BookOpen
} from 'lucide-react';
import {
  ClassroomCourse,
  ClassroomCourseWork,
  ClassroomStudentSubmission,
  ClassroomAnnouncement,
  ClassroomTopic,
  ClassroomConfig,
  DEFAULT_CLASSROOM_CONFIG,
  ExecuteGoogleApiFn,
  syncClassroomHubData,
  turnInClassroomSubmission,
  parseClassroomDueDate,
  formatClassroomDeadline,
  mapCourseWorkToSakidoTask,
  ClassroomHubData
} from '../../lib/googleClassroom';

interface ClassroomHubProps {
  isConnected: boolean;
  onConnectClassroom: () => void;
  executeGoogleApi?: ExecuteGoogleApiFn;
  onImportToTasks?: (tasks: any[]) => void;
  onWatchVideo?: (video: { id: string; title: string; url: string; course?: string }) => void;
  config?: Partial<ClassroomConfig>;
  compact?: boolean;
}

export const ClassroomHub: React.FC<ClassroomHubProps> = ({
  isConnected,
  onConnectClassroom,
  executeGoogleApi,
  onImportToTasks,
  onWatchVideo,
  config = {},
  compact = false,
}) => {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CLASSROOM_CONFIG, ...config }), [config]);

  // Data states
  const [hubData, setHubData] = useState<ClassroomHubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Filter states
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'assignments' | 'announcements' | 'materials'>('assignments');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'turned_in' | 'graded' | 'late'>('all');

  // Interactive submission states
  const [turningInId, setTurningInId] = useState<string | null>(null);
  const [expandedWorkId, setExpandedWorkId] = useState<string | null>(null);
  const [selectedToImport, setSelectedToImport] = useState<Set<string>>(new Set());

  // Cached data key in localStorage for persistence & offline resilience
  const CACHE_KEY = 'sakido_classroom_cache';

  // Restore cached data on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setHubData(JSON.parse(cached));
      }
    } catch {
      // cache read fallback
    }
  }, []);

  // Fetch / Sync function
  const handleSync = useCallback(async () => {
    if (!isConnected || !executeGoogleApi) return;
    setLoading(true);
    setSyncNotice(null);

    try {
      const data = await syncClassroomHubData(executeGoogleApi, mergedConfig);
      setHubData(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setSyncNotice(`Synced ${data.courses.length} courses at ${data.lastSyncedAt}`);
    } catch (err: any) {
      setSyncNotice(`Sync warning: ${err.message || 'Check network connection'}`);
    } finally {
      setLoading(false);
    }
  }, [isConnected, executeGoogleApi, mergedConfig]);

  // Initial sync trigger when connected and cache is empty
  useEffect(() => {
    if (isConnected && !hubData && !loading) {
      handleSync();
    }
  }, [isConnected]);

  // Course map for quick lookups
  const courseMap = useMemo(() => {
    const map = new Map<string, ClassroomCourse>();
    hubData?.courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [hubData?.courses]);

  // Flattened coursework array with enriched course and submission data
  const enrichedCourseWork = useMemo(() => {
    if (!hubData) return [];

    const list: Array<{
      work: ClassroomCourseWork;
      course?: ClassroomCourse;
      submission?: ClassroomStudentSubmission;
      parsedDue: Date | null;
      deadlineInfo: ReturnType<typeof formatClassroomDeadline>;
    }> = [];

    Object.entries(hubData.courseWork).forEach(([cId, cwList]) => {
      const course = courseMap.get(cId);
      cwList.forEach((cw) => {
        const subs = hubData.submissions[cw.id] || [];
        const sub = subs[0];
        const parsedDue = parseClassroomDueDate(cw.dueDate, cw.dueTime);
        const deadlineInfo = formatClassroomDeadline(parsedDue);

        list.push({
          work: cw,
          course,
          submission: sub,
          parsedDue,
          deadlineInfo,
        });
      });
    });

    return list;
  }, [hubData, courseMap]);

  // Filtered CourseWork list
  const filteredCourseWork = useMemo(() => {
    return enrichedCourseWork.filter((item) => {
      // Course filter
      if (selectedCourseId !== 'all' && item.work.courseId !== selectedCourseId) return false;

      // Status filter
      if (statusFilter === 'pending') {
        const isDone = item.submission?.state === 'TURNED_IN' || item.submission?.state === 'RETURNED';
        if (isDone) return false;
      } else if (statusFilter === 'turned_in') {
        if (item.submission?.state !== 'TURNED_IN') return false;
      } else if (statusFilter === 'graded') {
        if (item.submission?.state !== 'RETURNED') return false;
      } else if (statusFilter === 'late') {
        if (!item.submission?.late && !item.deadlineInfo.isOverdue) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.work.title.toLowerCase().includes(q);
        const descMatch = item.work.description?.toLowerCase().includes(q);
        const courseMatch = item.course?.name.toLowerCase().includes(q);
        return titleMatch || descMatch || courseMatch;
      }

      return true;
    });
  }, [enrichedCourseWork, selectedCourseId, statusFilter, searchQuery]);

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    if (!hubData) return [];
    const list: Array<{ ann: ClassroomAnnouncement; course?: ClassroomCourse }> = [];

    Object.entries(hubData.announcements).forEach(([cId, annList]) => {
      if (selectedCourseId !== 'all' && cId !== selectedCourseId) return;
      const course = courseMap.get(cId);
      annList.forEach((ann) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match = ann.text?.toLowerCase().includes(q) || course?.name.toLowerCase().includes(q);
          if (!match) return;
        }
        list.push({ ann, course });
      });
    });

    return list;
  }, [hubData, selectedCourseId, searchQuery, courseMap]);

  // Grade Statistics Calculation
  const stats = useMemo(() => {
    let totalAssignments = enrichedCourseWork.length;
    let completedCount = 0;
    let gradedCount = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;

    enrichedCourseWork.forEach((item) => {
      const state = item.submission?.state;
      if (state === 'TURNED_IN' || state === 'RETURNED') {
        completedCount++;
      }
      if (state === 'RETURNED' && item.submission?.assignedGrade !== undefined && item.work.maxPoints) {
        gradedCount++;
        totalScore += item.submission.assignedGrade;
        maxPossibleScore += item.work.maxPoints;
      }
    });

    const averagePercent = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : null;

    return {
      totalAssignments,
      completedCount,
      gradedCount,
      averagePercent,
    };
  }, [enrichedCourseWork]);

  // Turn in handler
  const handleTurnIn = async (item: typeof enrichedCourseWork[0]) => {
    if (!executeGoogleApi || !item.submission?.id) return;
    setTurningInId(item.work.id);

    try {
      const res = await turnInClassroomSubmission(
        executeGoogleApi,
        item.work.courseId,
        item.work.id,
        item.submission.id,
        mergedConfig
      );

      if (res.ok) {
        setSyncNotice(`Assignment "${item.work.title}" turned in successfully!`);
        // Optimistic local update
        setHubData((prev) => {
          if (!prev) return prev;
          const currentSubs = prev.submissions[item.work.id] || [];
          const updatedSubs = currentSubs.map((s) =>
            s.id === item.submission?.id ? { ...s, state: 'TURNED_IN' as const } : s
          );
          return {
            ...prev,
            submissions: { ...prev.submissions, [item.work.id]: updatedSubs },
          };
        });
      } else {
        setSyncNotice(`Notice: ${res.error || 'Submission could not be completed in-app.'}`);
      }
    } catch {
      setSyncNotice('Failed to turn in assignment.');
    } finally {
      setTurningInId(null);
    }
  };

  // Bulk import into Sakido Tasks
  const handleImportSelected = () => {
    if (!onImportToTasks) return;

    const targets = enrichedCourseWork.filter((item) => selectedToImport.has(item.work.id));
    const tasksToImport = targets.map((item) =>
      mapCourseWorkToSakidoTask(item.work, item.submission, item.course, mergedConfig)
    );

    onImportToTasks(tasksToImport);
    setSelectedToImport(new Set());
    setSyncNotice(`Imported ${tasksToImport.length} assignments into Sakido Tasks!`);
  };

  const handleSelectAllToImport = () => {
    if (selectedToImport.size === filteredCourseWork.length) {
      setSelectedToImport(new Set());
    } else {
      setSelectedToImport(new Set(filteredCourseWork.map((i) => i.work.id)));
    }
  };

  // Not connected view
  if (!isConnected) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl border border-outline-variant/40 bg-surface-container-low flex flex-col items-center justify-center text-center max-w-xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high p-3 border border-outline-variant/30 flex items-center justify-center mb-5">
          <img src="/logos/google-classroom.svg" alt="Google Classroom" className="w-10 h-10 object-contain" />
        </div>
        <h3 className="font-display text-2xl font-bold text-on-surface">Connect Google Classroom</h3>
        <p className="text-sm text-secondary mt-2 leading-relaxed">
          Sync your enrolled courses, homework deadlines, lecture slides, grades, and professor announcements directly into Sakido.
        </p>
        <div className="mt-4 flex flex-col gap-2 text-xs text-secondary/80 text-left bg-surface-container/60 p-4 rounded-xl border border-outline-variant/20 w-full">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Auto-populate courses, deadlines, and grades</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Catch stream announcements & cancellations</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Direct deep-links to assignments & 1-click turn in</span>
          </div>
        </div>
        <button
          onClick={onConnectClassroom}
          className="mt-6 px-6 py-3 rounded-xl bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <img src="/logos/google-classroom.svg" alt="" className="w-4 h-4" />
          <span>Connect Google Classroom</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Top Header & Sync Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high p-1.5 border border-outline-variant/30 flex items-center justify-center shrink-0">
              <img src="/logos/google-classroom.svg" alt="" className="w-full h-full object-contain" />
            </div>
            <h2 className="font-display text-2xl font-bold text-on-surface">Google Classroom Hub</h2>
            {loading && (
              <span className="text-xs text-primary font-mono animate-pulse flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing...
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Real-time feed of active enrolled courses, assignments, deadlines, and professor stream updates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSync}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-outline-variant/50 hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center gap-2 transition-colors cursor-pointer"
            title="Refresh Classroom data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Sync Notice Alert */}
      {syncNotice && (
        <div className="p-3.5 rounded-xl border border-primary/30 bg-surface-container-low text-xs text-on-surface flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button
            onClick={() => setSyncNotice(null)}
            className="text-secondary hover:text-on-surface font-mono text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low flex flex-col">
          <span className="text-[11px] font-mono text-secondary uppercase tracking-wider">Courses</span>
          <span className="text-2xl font-bold font-display text-on-surface mt-1">
            {hubData?.courses.length ?? 0}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low flex flex-col">
          <span className="text-[11px] font-mono text-secondary uppercase tracking-wider">Assignments</span>
          <span className="text-2xl font-bold font-display text-on-surface mt-1">
            {stats.totalAssignments}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low flex flex-col">
          <span className="text-[11px] font-mono text-secondary uppercase tracking-wider">Turned In</span>
          <span className="text-2xl font-bold font-display text-emerald-500 mt-1">
            {stats.completedCount}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low flex flex-col">
          <span className="text-[11px] font-mono text-secondary uppercase tracking-wider">Class Average</span>
          <span className="text-2xl font-bold font-display text-primary mt-1">
            {stats.averagePercent !== null ? `${stats.averagePercent}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Enrolled Courses Filter Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCourseId('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium shrink-0 transition-all cursor-pointer ${
            selectedCourseId === 'all'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container-high text-secondary hover:text-on-surface'
          }`}
        >
          All Classes ({enrichedCourseWork.length})
        </button>

        {hubData?.courses.map((course) => {
          const count = hubData.courseWork[course.id]?.length || 0;
          const isSelected = selectedCourseId === course.id;

          return (
            <button
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-high text-secondary hover:text-on-surface'
              }`}
            >
              <span>{course.name}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-surface-container text-secondary'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tabs (Assignments vs Announcements) */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('assignments')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'assignments'
                ? 'bg-surface-container-high text-on-surface border border-outline-variant/50'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>Coursework ({filteredCourseWork.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('announcements')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'announcements'
                ? 'bg-surface-container-high text-on-surface border border-outline-variant/50'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-primary" />
            <span>Stream Announcements ({filteredAnnouncements.length})</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface placeholder:text-secondary/50 focus:outline-hidden focus:border-primary w-44 sm:w-56"
            />
          </div>

          {activeSubTab === 'assignments' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">To Do / Pending</option>
              <option value="turned_in">Turned In</option>
              <option value="graded">Graded</option>
              <option value="late">Late / Overdue</option>
            </select>
          )}
        </div>
      </div>

      {/* Bulk Import Action Bar (Only visible when items match) */}
      {activeSubTab === 'assignments' && onImportToTasks && filteredCourseWork.length > 0 && (
        <div className="p-3 rounded-2xl bg-surface-container-high/60 border border-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all-classroom"
              checked={selectedToImport.size > 0 && selectedToImport.size === filteredCourseWork.length}
              onChange={handleSelectAllToImport}
              className="rounded accent-primary cursor-pointer w-4 h-4"
            />
            <label htmlFor="select-all-classroom" className="text-xs text-secondary font-medium cursor-pointer">
              Select all visible ({filteredCourseWork.length})
            </label>
          </div>

          <div className="flex items-center gap-2">
            {selectedToImport.size > 0 && (
              <span className="text-xs text-primary font-mono font-medium">
                {selectedToImport.size} selected
              </span>
            )}
            <button
              onClick={handleImportSelected}
              disabled={selectedToImport.size === 0}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-opacity shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Import to Sakido Tasks</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeSubTab === 'assignments' ? (
        <div className="flex flex-col gap-3">
          {filteredCourseWork.map((item) => {
            const isDone = item.submission?.state === 'TURNED_IN' || item.submission?.state === 'RETURNED';
            const isGraded = item.submission?.state === 'RETURNED' && item.submission?.assignedGrade !== undefined;
            const isExpanded = expandedWorkId === item.work.id;
            const isSelected = selectedToImport.has(item.work.id);

            return (
              <div
                key={item.work.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDone
                    ? 'border-outline-variant/30 bg-surface-container-low/40 opacity-90'
                    : 'border-outline-variant/50 bg-surface-container-low shadow-2xs hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {onImportToTasks && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedToImport((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.work.id)) next.delete(item.work.id);
                            else next.add(item.work.id);
                            return next;
                          });
                        }}
                        className="rounded accent-primary cursor-pointer w-4 h-4 mt-1 shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Top Badges */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-primary font-bold">
                          {item.course?.name || 'Classroom'}
                        </span>

                        {isGraded ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {item.submission?.assignedGrade}/{item.work.maxPoints} pts
                          </span>
                        ) : isDone ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Turned In
                          </span>
                        ) : item.deadlineInfo.isOverdue ? (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                            Assigned
                          </span>
                        )}

                        {item.work.maxPoints !== undefined && !isGraded && (
                          <span className="text-secondary">{item.work.maxPoints} points</span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-display font-bold text-base text-on-surface mt-1.5 break-words">
                        {item.work.title}
                      </h4>

                      {/* Due Date & Details */}
                      <div className="flex items-center gap-4 text-xs text-secondary font-mono mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          {item.deadlineInfo.dateStr}
                          {item.deadlineInfo.timeStr && ` • ${item.deadlineInfo.timeStr}`}
                        </span>

                        {item.work.materials && item.work.materials.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-secondary shrink-0" />
                            {item.work.materials.length} attachment{item.work.materials.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Expandable Description */}
                      {isExpanded && item.work.description && (
                        <div className="mt-3 p-3 rounded-xl bg-surface-container/50 border border-outline-variant/20 text-xs text-secondary whitespace-pre-line leading-relaxed">
                          {item.work.description}
                        </div>
                      )}

                      {/* Attachments List */}
                      {isExpanded && item.work.materials && item.work.materials.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                          <span className="text-[11px] font-mono text-secondary uppercase font-semibold">
                            Materials & Resources:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.work.materials.map((mat, mIdx) => {
                              const driveFile = (mat as any).driveFile;
                              const yt = (mat as any).youtubeVideo;
                              const link = (mat as any).link;

                              if (driveFile) {
                                return (
                                  <a
                                    key={mIdx}
                                    href={driveFile.alternateLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-xl bg-surface-container border border-outline-variant/30 hover:border-primary/50 text-xs text-on-surface flex items-center gap-2 truncate"
                                  >
                                    <FileText className="w-4 h-4 text-primary shrink-0" />
                                    <span className="truncate">{driveFile.title}</span>
                                    <ExternalLink className="w-3 h-3 text-secondary shrink-0 ml-auto" />
                                  </a>
                                );
                              }

                              if (yt) {
                                return (
                                  <div
                                    key={mIdx}
                                    className="p-2 rounded-xl bg-surface-container border border-outline-variant/30 text-xs text-on-surface flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <Play className="w-4 h-4 text-red-500 shrink-0" />
                                      <span className="truncate">{yt.title}</span>
                                    </div>
                                    {onWatchVideo && (
                                      <button
                                        onClick={() =>
                                          onWatchVideo({
                                            id: yt.id,
                                            title: yt.title,
                                            url: yt.alternateLink,
                                            course: item.course?.name,
                                          })
                                        }
                                        className="text-[11px] font-mono font-bold text-primary hover:underline shrink-0"
                                      >
                                        Watch in Sakido
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                              if (link) {
                                return (
                                  <a
                                    key={mIdx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-xl bg-surface-container border border-outline-variant/30 hover:border-primary/50 text-xs text-on-surface flex items-center gap-2 truncate"
                                  >
                                    <ExternalLink className="w-4 h-4 text-secondary shrink-0" />
                                    <span className="truncate">{link.title || link.url}</span>
                                  </a>
                                );
                              }

                              return null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Expand/Collapse Toggle */}
                    <button
                      onClick={() => setExpandedWorkId(isExpanded ? null : item.work.id)}
                      className="p-1.5 rounded-lg hover:bg-surface-container-high text-secondary hover:text-on-surface cursor-pointer"
                      title={isExpanded ? 'Collapse' : 'View details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Turn In Button */}
                    {!isDone && item.submission?.id && (
                      <button
                        onClick={() => handleTurnIn(item)}
                        disabled={turningInId === item.work.id}
                        className="px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50 cursor-pointer"
                        title="Mark as turned in via Google Classroom"
                      >
                        {turningInId === item.work.id ? 'Turning in...' : 'Turn In'}
                      </button>
                    )}

                    {/* Open in Classroom Direct Link */}
                    {item.work.alternateLink && (
                      <a
                        href={item.work.alternateLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors cursor-pointer"
                        title="Open in Google Classroom"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCourseWork.length === 0 && (
            <div className="p-12 rounded-2xl border border-outline-variant/30 border-dashed text-center flex flex-col items-center justify-center gap-2 text-secondary">
              <CheckCircle2 className="w-8 h-8 text-primary" />
              <span className="text-sm font-semibold">No coursework found</span>
              <p className="text-xs text-secondary/70 max-w-sm">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try clearing your search query or status filter.'
                  : 'All caught up! No active assignments found for the selected courses.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Announcements Stream */
        <div className="flex flex-col gap-3">
          {filteredAnnouncements.map(({ ann, course }) => (
            <div
              key={ann.id}
              className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-low flex flex-col gap-3 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono font-bold text-primary px-2.5 py-0.5 rounded-md bg-surface-container-high">
                  {course?.name || 'Classroom Stream'}
                </span>
                {ann.updateTime && (
                  <span className="text-[11px] font-mono text-secondary">
                    {new Date(ann.updateTime).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-on-surface whitespace-pre-line leading-relaxed">
                {ann.text}
              </p>

              {ann.alternateLink && (
                <div className="pt-1 flex justify-end">
                  <a
                    href={ann.alternateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View on Classroom</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}

          {filteredAnnouncements.length === 0 && (
            <div className="p-12 rounded-2xl border border-outline-variant/30 border-dashed text-center flex flex-col items-center justify-center gap-2 text-secondary">
              <Send className="w-8 h-8 text-primary" />
              <span className="text-sm font-semibold">No announcements yet</span>
              <p className="text-xs text-secondary/70">
                Professor notices and stream updates will appear here automatically.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
