import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Layers,
  MoreVertical,
  ArrowRight
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
  url?: string;
  createdAt: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  courses: Course[];
  schedule: ScheduleEvent[];
  watchLater: any[];
  onNavigate?: (tabName: string) => void;
}

const DEFAULT_COLORS: Record<KanbanItem['sourceType'], string> = {
  task: '#6366f1',
  calendar: '#3b82f6',
  class: '#10b981',
  watch_later: '#f59e0b',
  custom: '#8b5cf6',
};

// Clean minimalist icon selector to replace raw emojis
const getItemIcon = (sourceType: KanbanItem['sourceType']) => {
  switch (sourceType) {
    case 'task':
      return <CheckSquare className="w-3.5 h-3.5" />;
    case 'calendar':
      return <CalendarIcon className="w-3.5 h-3.5" />;
    case 'class':
      return <BookOpen className="w-3.5 h-3.5" />;
    case 'watch_later':
      return <Video className="w-3.5 h-3.5" />;
    default:
      return <Layers className="w-3.5 h-3.5" />;
  }
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks = [],
  courses = [],
  schedule = [],
  watchLater = [],
  onNavigate,
}) => {
  // Persistent Kanban items state
  const [boardItems, setBoardItems] = useLocalStorageState<KanbanItem[]>('sakido_kanban_board', []);

  // Drag & drop state feedback
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'todo' | 'doing' | 'done' | null>(null);

  // Active tab for the bottom Import Dock
  const [importDockTab, setImportDockTab] = useState<'tasks' | 'calendar' | 'classes' | 'watch_later'>('tasks');
  const [importSearch, setImportSearch] = useState<string>('');

  // Editing Item state
  const [editingItem, setEditingItem] = useState<KanbanItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // New Custom Task Modal / Inline state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newTargetStatus, setNewTargetStatus] = useState<'todo' | 'doing' | 'done'>('todo');

  // --- Handlers for Board Actions ---

  const handleAddItem = (status: 'todo' | 'doing' | 'done') => {
    setNewTargetStatus(status);
    setNewTitle('');
    setNewDescription('');
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
      color: '#8b5cf6',
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

    // 1. Check for card ID reorder/move
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      handleMoveStatus(cardId, column);
      return;
    }

    // 2. Check for Import Dock Item payload
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

    if (sourceType === 'task') {
      title = rawItem.title || 'Untitled Task';
      description = rawItem.courseName ? `Course: ${rawItem.courseName}` : rawItem.description || '';
      color = rawItem.courseColor || DEFAULT_COLORS.task;
    } else if (sourceType === 'calendar') {
      title = rawItem.title || rawItem.summary || rawItem.courseName || 'Calendar Event';
      description = `${rawItem.date || ''} ${rawItem.startTime ? `(${rawItem.startTime} - ${rawItem.endTime || ''})` : ''}`.trim();
      color = rawItem.color || DEFAULT_COLORS.calendar;
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-2xl font-bold text-on-surface tracking-tight">
              Kanban Task Board
            </h2>
          </div>
          <p className="text-xs text-secondary font-medium mt-1">
            Organize assignments, lectures, watch-later resources, and custom goals freely across columns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddItem('todo')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 font-semibold text-xs transition-all border border-primary cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            New Card
          </button>
        </div>
      </div>

      {/* 1. THREE KANBAN COLUMNS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => {
          const itemsInCol = boardItems.filter((i) => i.status === col.id);
          const isHovered = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOverColumn(e, col.id)}
              onDragLeave={handleDragLeaveColumn}
              onDrop={(e) => handleDropOnColumn(e, col.id)}
              className={`flex flex-col rounded-2xl border transition-all duration-200 bg-surface-container-low/60 dark:bg-[#1a1411]/60 p-4 min-h-[500px] ${
                isHovered
                  ? 'border-primary ring-2 ring-primary/20 bg-surface-container/85'
                  : 'border-outline-variant/40 hover:border-outline-variant/70'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/30 font-mono">
                <div className="flex items-center gap-2">
                  <span className="shrink-0">{col.icon}</span>
                  <span className="text-xs font-bold tracking-widest text-on-surface uppercase">
                    {col.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-high text-secondary border border-outline-variant/30">
                    {itemsInCol.length}
                  </span>
                </div>

                <button
                  onClick={() => handleAddItem(col.id)}
                  className="p-1 rounded-lg hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors cursor-pointer"
                  title={`Add item to ${col.label}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1 no-scrollbar">
                {itemsInCol.length === 0 ? (
                  <div className="h-36 rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-lowest/40 dark:bg-surface-container-lowest/10 flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs font-medium text-secondary">Drop items here</p>
                    <button
                      onClick={() => handleAddItem(col.id)}
                      className="mt-2 text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add card
                    </button>
                  </div>
                ) : (
                  itemsInCol.map((item) => {
                    const isDragging = draggedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStartCard(e, item.id)}
                        className={`group relative p-4 rounded-xl border bg-surface-container-lowest dark:bg-[#201915] transition-all duration-150 shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing border-outline-variant/30 hover:border-outline-variant/80 ${
                          isDragging ? 'opacity-40 scale-95 border-primary' : ''
                        }`}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: item.color || DEFAULT_COLORS[item.sourceType] || '#8b5cf6',
                        }}
                      >
                        {/* Type Icon & Quick Actions */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-secondary shrink-0 select-none">
                              {getItemIcon(item.sourceType)}
                            </span>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono shrink-0"
                              style={{
                                backgroundColor: `${item.color || '#8b5cf6'}18`,
                                color: item.color || '#8b5cf6',
                              }}
                            >
                              {item.sourceType.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* Mobile / Keyboard Move Menu Button */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                }}
                                className="p-1 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface cursor-pointer"
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
                                      <span className="capitalize">{st}</span>
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
                              className="p-1 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface cursor-pointer"
                              title="Edit item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-semibold text-on-surface leading-snug line-clamp-2">
                          {item.title}
                        </h4>

                        {/* Description / Subtitle */}
                        {item.description && (
                          <p className="text-xs text-secondary font-normal mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Footer Badges & External Link */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-outline-variant/20 text-[11px] text-secondary">
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <GripVertical className="w-3 h-3 text-secondary/40 cursor-grab" />
                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. BOTTOM IMPORT DOCK */}
      <div className="p-6 rounded-2xl border border-outline-variant/40 bg-surface-container-low/60 dark:bg-surface-container-low/20 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
          <div>
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              Import Items from Sakido Workspace
            </h3>
            <p className="text-xs text-secondary font-medium mt-0.5">
              Drag elements directly into any column above, or click + to append to your board.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              placeholder="Search items to import..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Multi-Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-primary text-on-primary border-primary shadow-2xs font-bold'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-secondary hover:text-on-surface border-outline-variant/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20 font-mono">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#1d1714] hover:border-outline-variant/80 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-secondary shrink-0">
                        {getItemIcon('task')}
                      </span>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-on-surface truncate">{t.title}</h5>
                        <p className="text-[11px] text-secondary font-mono truncate">
                          {t.courseName || 'General Task'} {t.dueDate ? `• Due: ${t.dueDate}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => importItemToBoard(t, 'task', 'todo')}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-secondary text-xs font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer border border-transparent hover:border-primary"
                    >
                      {isImported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span className="text-[10px] uppercase font-mono">{isImported ? 'Added' : 'Add'}</span>
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
                    className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#1d1714] hover:border-outline-variant/80 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-secondary shrink-0">
                        {getItemIcon('calendar')}
                      </span>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-on-surface truncate">{title}</h5>
                        <p className="text-[11px] text-secondary font-mono truncate">
                          {s.date || 'Scheduled'} {s.startTime ? `(${s.startTime})` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => importItemToBoard(s, 'calendar', 'todo')}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-secondary text-xs font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer border border-transparent hover:border-primary"
                    >
                      {isImported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span className="text-[10px] uppercase font-mono">{isImported ? 'Added' : 'Add'}</span>
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
                    className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#1d1714] hover:border-outline-variant/80 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-secondary shrink-0">
                        {getItemIcon('class')}
                      </span>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-on-surface truncate">
                          {c.code} - {c.name}
                        </h5>
                        <p className="text-[11px] text-secondary font-mono truncate">
                          {c.instructor ? `Instr: ${c.instructor}` : 'Course item'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => importItemToBoard(c, 'class', 'todo')}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-secondary text-xs font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer border border-transparent hover:border-primary"
                    >
                      {isImported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span className="text-[10px] uppercase font-mono">{isImported ? 'Added' : 'Add'}</span>
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
                    className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#1d1714] hover:border-outline-variant/80 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-secondary shrink-0">
                        {getItemIcon('watch_later')}
                      </span>
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-on-surface truncate">{w.title}</h5>
                        <p className="text-[11px] text-secondary font-mono truncate">
                          {w.course || 'Resource'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => importItemToBoard(w, 'watch_later', 'todo')}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-secondary text-xs font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer border border-transparent hover:border-primary"
                    >
                      {isImported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
                      <span className="text-[10px] uppercase font-mono">{isImported ? 'Added' : 'Add'}</span>
                    </button>
                  </div>
                );
              })
            ))}
        </div>
      </div>

      {/* 3. NEW CUSTOM ITEM MODAL */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
                  placeholder="e.g. Prepare presentation slides"
                  className="w-full border border-outline-variant/50 rounded-xl p-3 text-xs bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-secondary block mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add details, links, or notes..."
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
                  <option value="todo">📌 TODO</option>
                  <option value="doing">⚡ DOING</option>
                  <option value="done">✅ DONE</option>
                </select>
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
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:opacity-90 transition-all border border-primary cursor-pointer shadow-2xs"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
                  rows={3}
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
                  <option value="todo">📌 TODO</option>
                  <option value="doing">⚡ DOING</option>
                  <option value="done">✅ DONE</option>
                </select>
              </div>

              {/* URL (optional) */}
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
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:opacity-90 transition-all border border-primary cursor-pointer shadow-2xs"
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
