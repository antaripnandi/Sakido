import React, { useState } from 'react';
import { 
  CheckSquare, 
  Columns, 
  ListFilter, 
  Plus, 
  Search, 
  Clock, 
  Calendar, 
  Tag, 
  Check, 
  MoreHorizontal, 
  X,
  ChevronRight,
  Filter,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Task, Course, TaskStatus, TaskPriority } from '../../types';

interface TasksViewProps {
  tasks: Task[];
  courses: Course[];
  onToggleTaskStatus: (taskId: string) => void;
  onAddTask: (newTask: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (updated: Task) => void;
  onDeleteTask: (taskId: string) => void;
  isCreateModalOpen?: boolean;
  onRequestCloseModal?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  courses,
  onToggleTaskStatus,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isCreateModalOpen = false,
  onRequestCloseModal,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');
  
  // Selected task for Drawer view
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Local Create Task Modal state if triggered internally
  const [showCreateModal, setShowCreateModal] = useState(isCreateModalOpen);

  React.useEffect(() => {
    if (isCreateModalOpen) setShowCreateModal(true);
  }, [isCreateModalOpen]);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || 'course-1');
  const [newDueDate, setNewDueDate] = useState('Tomorrow, 11:59 PM');
  const [newPriority, setNewPriority] = useState<TaskPriority>('high');
  const [newEstMins, setNewEstMins] = useState(60);

  // Filter logic
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.courseName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourseFilter === 'all' || t.courseId === selectedCourseFilter;
    const matchesPriority = selectedPriorityFilter === 'all' || t.priority === selectedPriorityFilter;
    return matchesSearch && matchesCourse && matchesPriority;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const courseObj = courses.find(c => c.id === newCourseId) || courses[0];

    onAddTask({
      title: newTitle,
      description: newDesc,
      courseId: courseObj.id,
      courseName: courseObj.code,
      courseColor: courseObj.color,
      dueDate: newDueDate,
      priority: newPriority,
      status: 'todo',
      estimatedMinutes: newEstMins,
      subtasks: [],
    });

    setNewTitle('');
    setNewDesc('');
    setShowCreateModal(false);
    if (onRequestCloseModal) onRequestCloseModal();
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    const updatedTask = { ...task, subtasks: updatedSubtasks };
    onUpdateTask(updatedTask);
    if (activeTask && activeTask.id === taskId) {
      setActiveTask(updatedTask);
    }
  };

  const statusColumns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'To Do', color: 'border-zinc-300 dark:border-zinc-700' },
    { id: 'in_progress', label: 'In Progress', color: 'border-amber-400' },
    { id: 'submitted', label: 'Submitted', color: 'border-indigo-400' },
    { id: 'completed', label: 'Completed', color: 'border-emerald-500' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar: View Mode Switcher, Filters, Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-600 dark:text-zinc-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-600 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          {/* Course Filter */}
          <div className="relative">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* List / Board Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Kanban
            </button>
          </div>

          {/* New Task Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Homework
          </button>
        </div>
      </div>

      {/* Main View Display */}
      {viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                No assignments match your filter criteria.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setActiveTask(task)}
                  className="p-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors flex items-start gap-3.5 cursor-pointer group"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTaskStatus(task.id);
                    }}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      task.status === 'completed'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 bg-zinc-50 dark:bg-zinc-800'
                    }`}
                  >
                    {task.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase"
                        style={{ backgroundColor: `${task.courseColor}18`, color: task.courseColor }}
                      >
                        {task.courseName}
                      </span>

                      {task.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          Urgent
                        </span>
                      )}
                      {task.priority === 'high' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          High
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        {task.dueDate}
                      </span>
                    </div>

                    <h3 className={`text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 ${task.status === 'completed' ? 'line-through text-zinc-600' : ''}`}>
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    {task.tags && task.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {task.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statusColumns.map((col) => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div
                key={col.id}
                className="p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60 min-h-[400px] flex flex-col"
              >
                <div className="flex items-center justify-between pb-3 px-1 border-b border-zinc-200/80 dark:border-zinc-800 mb-3">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.color}`} />
                    {col.label}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setActiveTask(task)}
                      className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{ backgroundColor: `${task.courseColor}18`, color: task.courseColor }}
                        >
                          {task.courseName}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-medium">
                          {task.dueDate}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                        {task.title}
                      </h4>

                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium pt-1 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                          <span>Subtasks</span>
                          <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details Drawer */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full border-l border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <span
                  className="px-2.5 py-1 rounded-md text-xs font-semibold"
                  style={{ backgroundColor: `${activeTask.courseColor}18`, color: activeTask.courseColor }}
                >
                  {activeTask.courseName}
                </span>

                <button
                  onClick={() => setActiveTask(null)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {activeTask.title}
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  {activeTask.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-600 uppercase font-semibold">Due Date</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{activeTask.dueDate}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-600 uppercase font-semibold">Priority</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 capitalize">{activeTask.priority}</p>
                </div>
              </div>

              {/* Subtasks Checklist */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Subtasks & Action Items
                </h4>
                <div className="space-y-2">
                  {activeTask.subtasks && activeTask.subtasks.length > 0 ? (
                    activeTask.subtasks.map(sub => (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-xs text-zinc-800 dark:text-zinc-200"
                      >
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => handleToggleSubtask(activeTask.id, sub.id)}
                          className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={sub.completed ? 'line-through text-zinc-600' : ''}>
                          {sub.title}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-600 italic">No subtasks created for this item.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => {
                  onDeleteTask(activeTask.id);
                  setActiveTask(null);
                }}
                className="text-xs text-rose-600 hover:underline font-medium"
              >
                Delete Assignment
              </button>

              <button
                onClick={() => {
                  onToggleTaskStatus(activeTask.id);
                  setActiveTask(null);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Mark {activeTask.status === 'completed' ? 'Uncompleted' : 'Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                New Course Assignment
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  if (onRequestCloseModal) onRequestCloseModal();
                }}
                className="p-1 rounded-md text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS 201 Problem Set 4"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Key instructions or problems to solve..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Course
                  </label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Due Date
                  </label>
                  <input
                    type="text"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Estimated Time (Mins)
                  </label>
                  <input
                    type="number"
                    value={newEstMins}
                    onChange={(e) => setNewEstMins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    if (onRequestCloseModal) onRequestCloseModal();
                  }}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
