import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  Check,
  X,
  Calendar as CalendarIcon,
  BookOpen,
  Video,
  CheckSquare,
  GripVertical,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  MoreVertical,
  ArrowRight,
  Clock,
  Tag as TagIcon,
  AlertCircle,
  Bookmark
} from 'lucide-react';
import { Task, Course, ScheduleEvent } from '../../types';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';

export interface KanbanItem {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done';
  sourceType: 'task' | 'calendar' | 'class' | 'watch_later' | 'custom';
  sourceId?: string;
  color?: string;
  dueDate?: string;
  timePeriod?: {
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    syncToCalendar?: boolean;
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tag?: string;
  url?: string;
  createdAt: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  courses: Course[];
  schedule: ScheduleEvent[];
  watchLater: any[];
  onNavigate?: (tabName: string) => void;
  onUpdateEvents?: React.Dispatch<React.SetStateAction<any[]>>;
  onUpdateTasks?: React.Dispatch<React.SetStateAction<any[]>>;
}

const DEFAULT_COLORS: Record<KanbanItem['sourceType'], string> = {
  task: '#6f4627',
  calendar: '#265763',
  class: '#10b981',
  watch_later: '#f59e0b',
  custom: '#8b5e3c',
};

// Icon selector for card types
const getItemIcon = (sourceType: KanbanItem['sourceType']) => {
  switch (sourceType) {
    case 'task':
      return <CheckSquare className="w-3 h-3 shrink-0" />;
    case 'calendar':
      return <CalendarIcon className="w-3 h-3 shrink-0" />;
    case 'class':
      return <BookOpen className="w-3 h-3 shrink-0" />;
    case 'watch_later':
      return <Video className="w-3 h-3 shrink-0" />;
    default:
      return <Bookmark className="w-3 h-3 shrink-0" />;
  }
};

const renderPriorityBadge = (priority?: KanbanItem['priority']) => {
  if (!priority) return null;
  switch (priority) {
    case 'urgent':
      return (
        <span className="flex items-center gap-1 font-body-sm text-[10px] uppercase font-bold text-error bg-error-container/80 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded-full shrink-0 border border-error/30">
          <AlertCircle className="w-3 h-3 text-error dark:text-red-400 shrink-0" /> URGENT
        </span>
      );
    case 'high':
      return (
        <span className="flex items-center gap-1 font-body-sm text-[10px] uppercase font-bold text-amber-800 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full shrink-0 border border-amber-500/30">
          HIGH
        </span>
      );
    case 'medium':
      return (
        <span className="flex items-center gap-1 font-body-sm text-[10px] uppercase font-bold text-secondary bg-secondary-container dark:bg-surface-container-high dark:text-secondary px-2 py-0.5 rounded-full shrink-0 border border-outline-variant/30">
          MED
        </span>
      );
    case 'low':
      return (
        <span className="flex items-center gap-1 font-body-sm text-[10px] uppercase font-medium text-on-surface-variant bg-surface-container-high dark:bg-surface-container px-2 py-0.5 rounded-full shrink-0 border border-outline-variant/30">
          LOW
        </span>
      );
    default:
      return null;
  }
};

const syncKanbanWithGlobalState = (
  items: KanbanItem[],
  onUpdateEvents?: React.Dispatch<React.SetStateAction<any[]>>,
  onUpdateTasks?: React.Dispatch<React.SetStateAction<any[]>>
) => {
  // 1. Sync Calendar Events (for items with timePeriod and syncToCalendar enabled)
  let currentEvents: any[] = [];
  try {
    const rawEvents = localStorage.getItem('sakido_events');
    currentEvents = rawEvents ? JSON.parse(rawEvents) : [];
  } catch {
    currentEvents = [];
  }

  const nonKanbanEvents = currentEvents.filter(
    (e: any) => !e.id?.startsWith('kanban-event-') && !e.sourceKanbanId
  );

  const kanbanEvents = items
    .filter((item) => item.timePeriod?.startDate && item.timePeriod?.syncToCalendar)
    .map((item) => ({
      id: `kanban-event-${item.id}`,
      title: item.title,
      date: item.timePeriod!.startDate!,
      startTime: item.timePeriod!.startTime || '09:00',
      endTime: item.timePeriod!.endTime || '10:00',
      type: 'Event',
      calendarId: 'cal-personal',
      color: item.status === 'done' ? '#10b981' : (item.priority === 'urgent' ? '#dc2626' : (item.color || '#8b5cf6')),
      priority: item.priority || 'medium',
      isUrgent: item.priority === 'urgent',
      kanbanStatus: item.status,
      completed: item.status === 'done',
      status: item.status === 'done' ? 'completed' : 'scheduled',
      sourceKanbanId: item.id,
    }));

  const updatedEvents = [...nonKanbanEvents, ...kanbanEvents];
  try {
    localStorage.setItem('sakido_events', JSON.stringify(updatedEvents));
  } catch (err) {
    console.warn('Failed to save sakido_events:', err);
  }
  if (onUpdateEvents) {
    onUpdateEvents(updatedEvents);
  }

  // 2. Sync Overview Tasks (for ALL Kanban cards)
  let currentTasks: any[] = [];
  try {
    const rawTasks = localStorage.getItem('sakido_tasks');
    currentTasks = rawTasks ? JSON.parse(rawTasks) : [];
  } catch {
    currentTasks = [];
  }

  const nonKanbanTasks = currentTasks.filter(
    (t: any) => !t.id?.startsWith('kanban-task-') && !t.sourceKanbanId
  );

  const kanbanTasks = items.map((item) => ({
    id: `kanban-task-${item.id}`,
    title: item.title,
    description: item.description || '',
    courseId: 'c-kanban',
    courseName: item.tag ? `Kanban • ${item.tag}` : 'Kanban Board',
    courseColor: item.color || '#8b5cf6',
    dueDate: item.timePeriod?.startDate || item.dueDate || new Date().toISOString().split('T')[0],
    priority: item.priority || 'medium',
    status: item.status === 'done' ? 'completed' : item.status === 'doing' ? 'in_progress' : 'todo',
    completed: item.status === 'done',
    createdAt: item.createdAt || new Date().toISOString(),
    sourceKanbanId: item.id,
  }));

  const updatedTasks = [...nonKanbanTasks, ...kanbanTasks];
  try {
    localStorage.setItem('sakido_tasks', JSON.stringify(updatedTasks));
  } catch (err) {
    console.warn('Failed to save sakido_tasks:', err);
  }
  if (onUpdateTasks) {
    onUpdateTasks(updatedTasks);
  }
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks = [],
  courses = [],
  schedule = [],
  watchLater = [],
  onNavigate,
  onUpdateEvents,
  onUpdateTasks,
}) => {
  // Persistent Kanban items state (no hardcoded cards)
  const [boardItems, setBoardItems] = useLocalStorageState<KanbanItem[]>('sakido_kanban_board', []);

  // Card Expand / Collapse state
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllCards = () => {
    setExpandedCardIds(new Set(boardItems.map((i) => i.id)));
  };

  const collapseAllCards = () => {
    setExpandedCardIds(new Set());
  };

  // Sync Kanban items with global events & tasks reactively
  useEffect(() => {
    syncKanbanWithGlobalState(boardItems, onUpdateEvents, onUpdateTasks);
  }, [boardItems, onUpdateEvents, onUpdateTasks]);

  // Drag & drop state feedback
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'todo' | 'doing' | 'done' | null>(null);

  // Active tab for the bottom Import Dock
  const [importDockTab, setImportDockTab] = useState<'tasks' | 'calendar' | 'classes' | 'watch_later'>('tasks');
  const [importSearch, setImportSearch] = useState<string>('');

  // Editing Item state
  const [editingItem, setEditingItem] = useState<KanbanItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // New Custom Task Modal state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newTargetStatus, setNewTargetStatus] = useState<'todo' | 'doing' | 'done'>('todo');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTag, setNewTag] = useState<string>('');
  const [hasTimePeriod, setHasTimePeriod] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(false);

  // --- Handlers for Board Actions ---

  const handleAddItem = (status: 'todo' | 'doing' | 'done') => {
    setNewTargetStatus(status);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
    setNewTag('');
    setHasTimePeriod(false);
    setStartDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('10:00');
    setSyncToCalendar(true);
    setIsAddingNew(true);
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: KanbanItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      status: newTargetStatus,
      sourceType: 'custom',
      color: '#6f4627',
      priority: newPriority,
      tag: newTag.trim() || undefined,
      timePeriod: hasTimePeriod && startDate ? {
        startDate,
        startTime,
        endTime,
        syncToCalendar,
      } : undefined,
      createdAt: new Date().toISOString(),
    };

    setBoardItems((prev) => [newItem, ...prev]);
    setIsAddingNew(false);
  };

  const handleDeleteItem = (id: string) => {
    setBoardItems((prev) => prev.filter((item) => item.id !== id));
    if (editingItem?.id === id) setEditingItem(null);
    setActiveMenuId(null);
  };

  const handleMoveStatus = (id: string, newStatus: 'todo' | 'doing' | 'done') => {
    setBoardItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    setActiveMenuId(null);
  };

  const handleSaveEditedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title.trim()) return;

    setBoardItems((prev) =>
      prev.map((item) => (item.id === editingItem.id ? editingItem : item))
    );
    setEditingItem(null);
  };

  // --- Native HTML5 Drag and Drop Handlers ---

  const handleDragStartCard = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(id);
  };

  const handleDragStartImportItem = (e: React.DragEvent, itemData: any, sourceType: KanbanItem['sourceType']) => {
    const payload = JSON.stringify({
      type: 'import_item',
      sourceType,
      item: itemData,
    });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOverColumn = (e: React.DragEvent, column: 'todo' | 'doing' | 'done') => {
    e.preventDefault();
    if (dragOverColumn !== column) {
      setDragOverColumn(column);
    }
  };

  const handleDragLeaveColumn = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDropOnColumn = (e: React.DragEvent, column: 'todo' | 'doing' | 'done') => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggedItemId(null);

    // 1. Card ID reorder/move
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      handleMoveStatus(cardId, column);
      return;
    }

    // 2. Import Dock Item payload
    const jsonStr = e.dataTransfer.getData('application/json');
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'import_item') {
          importItemToBoard(parsed.item, parsed.sourceType, column);
        }
      } catch (err) {
        console.warn('Failed to parse import drag payload:', err);
      }
    }
  };

  // Helper to import item from Dock
  const importItemToBoard = (
    rawItem: any,
    sourceType: KanbanItem['sourceType'],
    targetStatus: 'todo' | 'doing' | 'done' = 'todo'
  ) => {
    let title = '';
    let description = '';
    let url = '';
    let color = DEFAULT_COLORS[sourceType];
    let timePeriod: KanbanItem['timePeriod'] = undefined;

    if (sourceType === 'task') {
      title = rawItem.title || 'Untitled Task';
      description = rawItem.courseName ? `Course: ${rawItem.courseName}` : rawItem.description || '';
      color = rawItem.courseColor || DEFAULT_COLORS.task;
      if (rawItem.dueDate) {
        timePeriod = {
          startDate: rawItem.dueDate,
          startTime: '09:00',
          endTime: '10:00',
          syncToCalendar: false,
        };
      }
    } else if (sourceType === 'calendar') {
      title = rawItem.title || rawItem.summary || rawItem.courseName || 'Calendar Event';
      description = `${rawItem.date || ''} ${rawItem.startTime ? `(${rawItem.startTime} - ${rawItem.endTime || ''})` : ''}`.trim();
      color = rawItem.color || DEFAULT_COLORS.calendar;
      if (rawItem.date) {
        timePeriod = {
          startDate: rawItem.date,
          startTime: rawItem.startTime || '09:00',
          endTime: rawItem.endTime || '10:00',
          syncToCalendar: false,
        };
      }
    } else if (sourceType === 'class') {
      title = `${rawItem.code || ''} - ${rawItem.name || 'Course'}`.trim();
      description = rawItem.instructor ? `Instructor: ${rawItem.instructor} | Room: ${rawItem.room || 'N/A'}` : '';
      color = rawItem.color || DEFAULT_COLORS.class;
    } else if (sourceType === 'watch_later') {
      title = rawItem.title || 'Saved Video';
      description = rawItem.course ? `Resource for ${rawItem.course}` : 'Watch Later Resource';
      url = rawItem.url || '';
      color = DEFAULT_COLORS.watch_later;
    }

    const newItem: KanbanItem = {
      id: `imported-${sourceType}-${rawItem.id || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      description: description || undefined,
      status: targetStatus,
      sourceType,
      sourceId: String(rawItem.id || ''),
      color,
      url: url || undefined,
      timePeriod,
      createdAt: new Date().toISOString(),
    };

    setBoardItems((prev) => [newItem, ...prev]);
  };

  // Filtered import items based on search query
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => t.title?.toLowerCase().includes(importSearch.toLowerCase()));
  }, [tasks, importSearch]);

  const filteredSchedule = useMemo(() => {
    return schedule.filter(
      (s: any) =>
        (s.title || s.courseName || s.summary || '')
          .toLowerCase()
          .includes(importSearch.toLowerCase())
    );
  }, [schedule, importSearch]);

  const filteredCourses = useMemo(() => {
    return courses.filter(
      (c) =>
        c.code?.toLowerCase().includes(importSearch.toLowerCase()) ||
        c.name?.toLowerCase().includes(importSearch.toLowerCase())
    );
  }, [courses, importSearch]);

  const filteredWatchLater = useMemo(() => {
    return watchLater.filter(
      (w: any) =>
        w.title?.toLowerCase().includes(importSearch.toLowerCase()) ||
        w.course?.toLowerCase().includes(importSearch.toLowerCase())
    );
  }, [watchLater, importSearch]);

  // Set of source IDs already added to board for badge indicator
  const importedSourceIds = useMemo(() => {
    return new Set(boardItems.map((i) => i.sourceId).filter(Boolean));
  }, [boardItems]);

  const columns: Array<{ id: 'todo' | 'doing' | 'done'; label: string; icon: React.ReactNode }> = [
    { id: 'todo', label: 'TODO', icon: <Layers className="w-4 h-4 text-[#8b5e3c]" /> },
    { id: 'doing', label: 'DOING', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { id: 'done', label: 'DONE', icon: <Check className="w-4 h-4 text-emerald-500" /> },
  ];

  const isAllExpanded = boardItems.length > 0 && boardItems.every((i) => expandedCardIds.has(i.id));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header Strip (Styled to match design template) */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant/30 pb-4 mt-2">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-on-surface mb-1 tracking-tight">
            Kanban Task Board
          </h2>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Organize assignments, lectures, watch-later resources, and custom goals freely across columns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {boardItems.length > 0 && (
            <button
              onClick={isAllExpanded ? collapseAllCards : expandAllCards}
              className="px-4 py-2 border border-outline-variant text-on-surface font-body-sm font-semibold text-xs rounded-xl flex items-center gap-1.5 hover:bg-surface-container-low transition-colors cursor-pointer uppercase tracking-wider shadow-2xs"
            >
              {isAllExpanded ? (
                <>
                  <span>COLLAPSE ALL</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>EXPAND ALL</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          <button
            onClick={() => handleAddItem('todo')}
            className="px-4 py-2 bg-on-surface text-surface dark:bg-primary dark:text-on-primary font-body-sm font-semibold text-xs rounded-xl flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer uppercase tracking-wider shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>NEW CARD</span>
          </button>
        </div>
      </header>

      {/* 1. THREE KANBAN COLUMNS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => {
          const itemsInCol = boardItems.filter((i) => i.status === col.id);
          const isHovered = dragOverColumn === col.id;

          return (
            <section
              key={col.id}
              onDragOver={(e) => handleDragOverColumn(e, col.id)}
              onDragLeave={handleDragLeaveColumn}
              onDrop={(e) => handleDropOnColumn(e, col.id)}
              className={`flex flex-col bg-surface-container-lowest dark:bg-[#1a1411]/80 border rounded-2xl p-4 transition-all duration-200 min-h-[550px] ${
                isHovered
                  ? 'border-primary ring-2 ring-primary/20 bg-surface-container/85'
                  : 'border-outline-variant/40 hover:border-outline-variant/70'
              }`}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center mb-4 border-b border-outline-variant/30 pb-3 font-mono">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-on-surface">{col.icon}</span>
                  <h3 className="font-display font-bold text-sm text-on-surface uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <span className="bg-surface-container-high dark:bg-surface-container text-on-surface-variant font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-outline-variant/30">
                    {itemsInCol.length}
                  </span>
                </div>

                <button
                  onClick={() => handleAddItem(col.id)}
                  className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-container-high cursor-pointer"
                  title={`Add item to ${col.label}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Column Cards Container (No hardcoded cards - fully dynamic) */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-2 no-scrollbar max-h-[620px]">
                {itemsInCol.length === 0 ? (
                  <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-lowest/40 dark:bg-surface-container-lowest/10 p-6 text-center">
                    <p className="font-body-md text-xs font-medium text-secondary mb-2">Drop items here</p>
                    <button
                      onClick={() => handleAddItem(col.id)}
                      className="font-body-sm text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add card
                    </button>
                  </div>
                ) : (
                  itemsInCol.map((item) => {
                    const isDragging = draggedItemId === item.id;
                    const isExpanded = expandedCardIds.has(item.id);

                    return (
                      <article
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStartCard(e, item.id)}
                        className={`bg-surface-container-low dark:bg-[#201915] border border-outline-variant/40 hover:border-primary/80 rounded-2xl p-4 relative group transition-all duration-150 shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing ${
                          isDragging ? 'opacity-40 scale-95 border-primary' : ''
                        }`}
                        style={{
                          borderLeftWidth: '5px',
                          borderLeftColor: item.color || DEFAULT_COLORS[item.sourceType] || '#6f4627',
                        }}
                      >
                        <div className="flex flex-col gap-2 pl-1">
                          {/* Top Bar: Badges & Quick Action Controls */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span
                                className="flex items-center gap-1 font-body-sm text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 border"
                                style={{
                                  backgroundColor: `${item.color || '#6f4627'}20`,
                                  color: item.color || '#6f4627',
                                  borderColor: `${item.color || '#6f4627'}40`,
                                }}
                              >
                                {getItemIcon(item.sourceType)}
                                {item.sourceType.replace('_', ' ')}
                              </span>
                              {renderPriorityBadge(item.priority)}
                              {item.tag && (
                                <span className="flex items-center gap-1 font-body-sm text-[10px] uppercase font-semibold text-secondary bg-secondary-container dark:bg-surface-container-high px-2 py-0.5 rounded-full shrink-0 border border-outline-variant/30">
                                  <TagIcon className="w-2.5 h-2.5" /> {item.tag}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              {/* Expand / Collapse Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandCard(item.id);
                                }}
                                className="p-1 rounded-md hover:bg-surface-container-high text-secondary hover:text-on-surface cursor-pointer"
                                title={isExpanded ? "Collapse details" : "Expand details"}
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {/* Move Status Dropdown */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                  }}
                                  className="p-1 rounded-md hover:bg-surface-container-high text-secondary hover:text-on-surface cursor-pointer"
                                  title="Move status"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeMenuId === item.id && (
                                  <div className="absolute right-0 top-6 z-30 w-36 py-1 bg-surface-container-lowest dark:bg-[#251d18] border border-outline-variant/60 rounded-xl shadow-xl text-xs font-medium space-y-0.5">
                                    <div className="px-2 py-1 text-[10px] font-mono text-secondary uppercase border-b border-outline-variant/30">
                                      Move to
                                    </div>
                                    {(['todo', 'doing', 'done'] as const).map((st) => (
                                      <button
                                        key={st}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveStatus(item.id, st);
                                        }}
                                        disabled={item.status === st}
                                        className={`w-full text-left px-3 py-1.5 hover:bg-surface-container flex items-center justify-between cursor-pointer ${
                                          item.status === st ? 'text-primary font-bold bg-surface-container/50' : 'text-on-surface'
                                        }`}
                                      >
                                        <span className="uppercase font-mono text-xs">{st}</span>
                                        {item.status === st && <Check className="w-3 h-3 text-primary" />}
                                      </button>
                                    ))}
                                    <div className="border-t border-outline-variant/30 pt-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteItem(item.id);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-error-container/20 text-error flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Edit Button */}
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-1 rounded-md hover:bg-surface-container-high text-secondary hover:text-on-surface cursor-pointer"
                                title="Edit item"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h4
                            onClick={() => toggleExpandCard(item.id)}
                            className="font-body-lg font-medium text-on-surface text-sm leading-snug mt-1 cursor-pointer hover:text-primary transition-colors truncate"
                          >
                            {item.title}
                          </h4>

                          {/* Description Preview */}
                          {item.description && (
                            <p className={`font-body-sm text-xs text-on-surface-variant leading-relaxed ${isExpanded ? 'whitespace-pre-wrap mt-1' : 'line-clamp-2'}`}>
                              {item.description}
                            </p>
                          )}

                          {/* Time Period & Calendar Link */}
                          {item.timePeriod?.startDate && (
                            <div className="flex justify-between items-center border-t border-outline-variant/30 pt-2 mt-2">
                              <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-xs">
                                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{item.timePeriod.startDate}</span>
                                {item.timePeriod.startTime && (
                                  <span>({item.timePeriod.startTime})</span>
                                )}
                              </div>
                              {item.timePeriod.syncToCalendar && (
                                <span className="font-body-sm uppercase text-on-surface-variant hover:text-primary transition-colors text-[10px] font-medium bg-surface-container-high dark:bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/30">
                                  CALENDAR
                                </span>
                              )}
                            </div>
                          )}

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/30 text-[10px] text-secondary font-mono mt-1">
                              <span className="flex items-center gap-1">
                                <GripVertical className="w-3 h-3 text-secondary/40 cursor-grab" />
                                Created {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:underline font-semibold flex items-center gap-1"
                                >
                                  Open <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* 2. BOTTOM IMPORT DOCK PANEL */}
      <section className="bg-surface-container-lowest dark:bg-[#1a1411]/60 border border-outline-variant/40 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="font-headline-md font-display font-bold text-lg text-on-surface mb-1">
              Import Items from Sakido Workspace
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Drag elements directly into any column above, or click ADD to append to your board.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              placeholder="Search items to import..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest dark:bg-[#201915] border border-outline-variant/50 rounded-xl focus:border-primary focus:outline-none font-body-sm text-xs text-on-surface transition-colors"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-outline-variant/30 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'tasks', label: 'Tasks & Grades', icon: CheckSquare, count: filteredTasks.length },
            { id: 'calendar', label: 'Calendar Events', icon: CalendarIcon, count: filteredSchedule.length },
            { id: 'classes', label: 'Classes & Courses', icon: BookOpen, count: filteredCourses.length },
            { id: 'watch_later', label: 'Watch Later', icon: Video, count: filteredWatchLater.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = importDockTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setImportDockTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 font-body-sm font-semibold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-primary text-on-primary border-primary shadow-2xs font-bold'
                    : 'bg-surface-container-lowest dark:bg-[#201915] hover:bg-surface-container-low text-on-surface-variant border-outline-variant/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-black/15 dark:bg-white/20' : 'bg-surface-container-high'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Import List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* TAB 1: TASKS */}
          {importDockTab === 'tasks' &&
            (filteredTasks.length === 0 ? (
              <div className="col-span-full p-6 text-center text-xs text-secondary border border-dashed border-outline-variant/40 rounded-xl">
                No matching tasks found in Sakido workspace.
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isImported = importedSourceIds.has(String(t.id));
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStartImportItem(e, t, 'task')}
                    className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-2xl bg-surface-container-lowest dark:bg-[#1d1714] hover:bg-surface-container-low transition-colors group cursor-grab active:cursor-grabbing shadow-2xs gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        readOnly
                        className="mt-1 rounded text-primary focus:ring-primary bg-surface border-outline-variant cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-body-md font-medium text-xs text-on-surface truncate">{t.title}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] font-body-sm text-on-surface-variant mt-0.5 truncate">
                          <span>Task</span>
                          <span className="w-1 h-1 rounded-full bg-outline-variant shrink-0"></span>
                          <span className="truncate">{t.courseName || 'General'}</span>
                          {t.dueDate && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-outline-variant shrink-0"></span>
                              <span className="shrink-0">Due: {t.dueDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => importItemToBoard(t, 'task', 'todo')}
                      className="px-2.5 py-1 border border-outline-variant/50 text-on-surface font-body-sm font-semibold uppercase rounded-lg flex items-center gap-1 hover:bg-surface-container-high transition-colors text-[10px] shrink-0 cursor-pointer"
                    >
                      {isImported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isImported ? 'ADDED' : 'ADD'}</span>
                    </button>
                  </div>
                );
              })
            ))}

          {/* TAB 2: CALENDAR EVENTS */}
          {importDockTab === 'calendar' &&
            (filteredSchedule.length === 0 ? (
              <div className="col-span-full p-6 text-center text-xs text-secondary border border-dashed border-outline-variant/40 rounded-xl">
                No matching calendar events found in Sakido workspace.
              </div>
            ) : (
              filteredSchedule.map((s: any) => {
                const isImported = importedSourceIds.has(String(s.id));
                const title = s.title || s.summary || s.courseName || 'Calendar Event';
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => handleDragStartImportItem(e, s, 'calendar')}
                    className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-2xl bg-surface-container-lowest dark:bg-[#1d1714] hover:bg-surface-container-low transition-colors group cursor-grab active:cursor-grabbing shadow-2xs gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <CalendarIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h4 className="font-body-md font-medium text-xs text-on-surface truncate">{title}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] font-body-sm text-on-surface-variant mt-0.5 truncate">
                          <span>Event</span>
                          <span className="w-1 h-1 rounded-full bg-outline-variant shrink-0"></span>
                          <span className="shrink-0">{s.date || 'Scheduled'} {s.startTime ? `(${s.startTime})` : ''}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => importItemToBoard(s, 'calendar', 'todo')}
                      className="px-2.5 py-1 border border-outline-variant/50 text-on-surface font-body-sm font-semibold uppercase rounded-lg flex items-center gap-1 hover:bg-surface-container-high transition-colors text-[10px] shrink-0 cursor-pointer"
                    >
                      {isImported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isImported ? 'ADDED' : 'ADD'}</span>
                    </button>
                  </div>
                );
              })
            ))}

          {/* TAB 3: CLASSES & COURSES */}
          {importDockTab === 'classes' &&
            (filteredCourses.length === 0 ? (
              <div className="col-span-full p-6 text-center text-xs text-secondary border border-dashed border-outline-variant/40 rounded-xl">
                No active classes found.
              </div>
            ) : (
              filteredCourses.map((c) => {
                const isImported = importedSourceIds.has(String(c.id));
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStartImportItem(e, c, 'class')}
                    className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-2xl bg-surface-container-lowest dark:bg-[#1d1714] hover:bg-surface-container-low transition-colors group cursor-grab active:cursor-grabbing shadow-2xs gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <BookOpen className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h4 className="font-body-md font-medium text-xs text-on-surface truncate">
                          {c.code} - {c.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] font-body-sm text-on-surface-variant mt-0.5 truncate">
                          <span>Course</span>
                          {c.instructor && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-outline-variant shrink-0"></span>
                              <span className="truncate">Instr: {c.instructor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => importItemToBoard(c, 'class', 'todo')}
                      className="px-2.5 py-1 border border-outline-variant/50 text-on-surface font-body-sm font-semibold uppercase rounded-lg flex items-center gap-1 hover:bg-surface-container-high transition-colors text-[10px] shrink-0 cursor-pointer"
                    >
                      {isImported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isImported ? 'ADDED' : 'ADD'}</span>
                    </button>
                  </div>
                );
              })
            ))}

          {/* TAB 4: WATCH LATER */}
          {importDockTab === 'watch_later' &&
            (filteredWatchLater.length === 0 ? (
              <div className="col-span-full p-6 text-center text-xs text-secondary border border-dashed border-outline-variant/40 rounded-xl">
                No saved videos in Watch Later.
              </div>
            ) : (
              filteredWatchLater.map((w: any) => {
                const isImported = importedSourceIds.has(String(w.id));
                return (
                  <div
                    key={w.id}
                    draggable
                    onDragStart={(e) => handleDragStartImportItem(e, w, 'watch_later')}
                    className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-2xl bg-surface-container-lowest dark:bg-[#1d1714] hover:bg-surface-container-low transition-colors group cursor-grab active:cursor-grabbing shadow-2xs gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Video className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h4 className="font-body-md font-medium text-xs text-on-surface truncate">{w.title}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] font-body-sm text-on-surface-variant mt-0.5 truncate">
                          <span>Resource</span>
                          <span className="w-1 h-1 rounded-full bg-outline-variant shrink-0"></span>
                          <span className="truncate">{w.course || 'Watch Later'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => importItemToBoard(w, 'watch_later', 'todo')}
                      className="px-2.5 py-1 border border-outline-variant/50 text-on-surface font-body-sm font-semibold uppercase rounded-lg flex items-center gap-1 hover:bg-surface-container-high transition-colors text-[10px] shrink-0 cursor-pointer"
                    >
                      {isImported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isImported ? 'ADDED' : 'ADD'}</span>
                    </button>
                  </div>
                );
              })
            ))}
        </div>
      </section>

      {/* 3. NEW CUSTOM ITEM MODAL */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest dark:bg-[#1f1915] border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-on-surface">Create New Card</h3>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg hover:bg-surface-container cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-4">
              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Research Paper Outline"
                  className="w-full border border-outline-variant/50 rounded-xl p-3 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Draft the initial outline for the paper..."
                  className="w-full border border-outline-variant/50 rounded-xl p-3 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Target Column */}
              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Column
                </label>
                <select
                  value={newTargetStatus}
                  onChange={(e) => setNewTargetStatus(e.target.value as any)}
                  className="w-full border border-outline-variant/50 rounded-xl p-2.5 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono cursor-pointer"
                >
                  <option value="todo">TODO</option>
                  <option value="doing">DOING</option>
                  <option value="done">DONE</option>
                </select>
              </div>

              {/* Priority & Tag Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full border border-outline-variant/50 rounded-xl p-2.5 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                    Tag / Label
                  </label>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g. History 301"
                    className="w-full border border-outline-variant/50 rounded-xl p-2.5 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Time Period Section */}
              <div className="pt-2 border-t border-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-on-surface flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasTimePeriod}
                      onChange={(e) => setHasTimePeriod(e.target.checked)}
                      className="rounded accent-primary w-4 h-4 cursor-pointer"
                    />
                    <span>Set Date & Time Period</span>
                  </label>
                </div>

                {hasTimePeriod && (
                  <div className="p-3 rounded-2xl bg-surface-container-high/40 border border-outline-variant/30 space-y-3">
                    <div>
                      <label className="text-[11px] font-mono text-secondary block mb-1">Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border border-outline-variant/50 rounded-xl p-2 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-mono text-secondary block mb-1">Start Time</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full border border-outline-variant/50 rounded-xl p-2 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-secondary block mb-1">End Time</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full border border-outline-variant/50 rounded-xl p-2 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 text-xs text-on-surface font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncToCalendar}
                        onChange={(e) => setSyncToCalendar(e.target.checked)}
                        className="rounded accent-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                        Sync event to Sakido Calendar
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:opacity-90 transition-all border border-primary cursor-pointer shadow-2xs uppercase tracking-wider"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest dark:bg-[#1f1915] border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-on-surface">
                Edit Card Details
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg hover:bg-surface-container cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedItem} className="space-y-4">
              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full border border-outline-variant/50 rounded-xl p-3 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full border border-outline-variant/50 rounded-xl p-3 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Status Column
                </label>
                <select
                  value={editingItem.status}
                  onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as any })}
                  className="w-full border border-outline-variant/50 rounded-xl p-2.5 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono cursor-pointer"
                >
                  <option value="todo">TODO</option>
                  <option value="doing">DOING</option>
                  <option value="done">DONE</option>
                </select>
              </div>

              {/* Priority & Tag Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                    Priority
                  </label>
                  <select
                    value={editingItem.priority || 'medium'}
                    onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as any })}
                    className="w-full border border-outline-variant/50 rounded-xl p-2.5 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                    Tag / Label
                  </label>
                  <input
                    type="text"
                    value={editingItem.tag || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, tag: e.target.value })}
                    placeholder="e.g. History 301"
                    className="w-full border border-outline-variant/50 rounded-xl p-2.5 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Time Period Section */}
              <div className="pt-2 border-t border-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-on-surface flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingItem.timePeriod?.startDate)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingItem({
                            ...editingItem,
                            timePeriod: {
                              startDate: new Date().toISOString().split('T')[0],
                              startTime: '09:00',
                              endTime: '10:00',
                              syncToCalendar: true,
                            },
                          });
                        } else {
                          setEditingItem({
                            ...editingItem,
                            timePeriod: undefined,
                          });
                        }
                      }}
                      className="rounded accent-primary w-4 h-4 cursor-pointer"
                    />
                    <span>Set Date & Time Period</span>
                  </label>
                </div>

                {editingItem.timePeriod?.startDate && (
                  <div className="p-3 rounded-2xl bg-surface-container-high/40 border border-outline-variant/30 space-y-3">
                    <div>
                      <label className="text-[11px] font-mono text-secondary block mb-1">Date</label>
                      <input
                        type="date"
                        value={editingItem.timePeriod.startDate || ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            timePeriod: { ...editingItem.timePeriod, startDate: e.target.value },
                          })
                        }
                        className="w-full border border-outline-variant/50 rounded-xl p-2 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-mono text-secondary block mb-1">Start Time</label>
                        <input
                          type="time"
                          value={editingItem.timePeriod.startTime || '09:00'}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              timePeriod: { ...editingItem.timePeriod, startTime: e.target.value },
                            })
                          }
                          className="w-full border border-outline-variant/50 rounded-xl p-2 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-secondary block mb-1">End Time</label>
                        <input
                          type="time"
                          value={editingItem.timePeriod.endTime || '10:00'}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              timePeriod: { ...editingItem.timePeriod, endTime: e.target.value },
                            })
                          }
                          className="w-full border border-outline-variant/50 rounded-xl p-2 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 text-xs text-on-surface font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingItem.timePeriod.syncToCalendar)}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            timePeriod: { ...editingItem.timePeriod, syncToCalendar: e.target.checked },
                          })
                        }
                        className="rounded accent-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                        Sync event to Sakido Calendar
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* URL */}
              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Resource URL (Optional)
                </label>
                <input
                  type="url"
                  value={editingItem.url || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-outline-variant/50 rounded-xl p-3 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => handleDeleteItem(editingItem.id)}
                  className="px-3 py-1.5 rounded-xl bg-error-container/20 text-error hover:bg-error-container/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-transparent"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Card
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:opacity-90 transition-all border border-primary cursor-pointer shadow-2xs uppercase tracking-wider"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
