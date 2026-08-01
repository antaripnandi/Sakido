import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, AlertCircle, CheckSquare } from 'lucide-react';

interface TaskDetailModalProps {
  task: any;
  courses: any[];
  onClose: () => void;
  onSave: (task: any) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  courses,
  onClose,
  onSave,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask
}) => {
  const [editedTask, setEditedTask] = useState(task);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleSave = () => {
    const selectedCourse = courses.find(c => c.id === editedTask.courseId);
    onSave({
      ...editedTask,
      courseName: selectedCourse?.name || 'General',
      courseColor: selectedCourse?.color || '#6f4627',
      course: selectedCourse?.code || 'General'
    });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
    // Refresh edited task with new subtask
    setEditedTask((prev: any) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface-container-lowest dark:bg-[#201915] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest dark:bg-[#201915] border-b border-outline-variant/40 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-on-surface">Task Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="w-full border border-outline-variant/50 rounded-lg p-3 text-base bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-hidden focus:border-primary-container"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
              Description
            </label>
            <textarea
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              rows={4}
              placeholder="Add more details about this task..."
              className="w-full border border-outline-variant/50 rounded-lg p-3 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container resize-none"
            />
          </div>

          {/* Course, Due Date, Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                Course
              </label>
              <select
                value={editedTask.courseId || ''}
                onChange={(e) => setEditedTask({ ...editedTask, courseId: e.target.value })}
                className="w-full border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-hidden focus:border-primary-container"
              >
                <option value="">No Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={editedTask.dueDate || ''}
                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                className="w-full border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-hidden focus:border-primary-container"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                Grade %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={editedTask.grade || ''}
                onChange={(e) => setEditedTask({ ...editedTask, grade: e.target.value })}
                placeholder="Optional"
                className="w-full border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container font-mono"
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                Priority
              </label>
              <select
                value={editedTask.priority || 'medium'}
                onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                className="w-full border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-hidden focus:border-primary-container"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                Status
              </label>
              <select
                value={editedTask.status || 'todo'}
                onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })}
                className="w-full border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface focus:outline-hidden focus:border-primary-container"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Subtasks
            </label>

            {/* Existing Subtasks */}
            <div className="space-y-2 mb-3">
              {(editedTask.subtasks || []).map((st: any) => (
                <div key={st.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-high/50">
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={() => onToggleSubtask(task.id, st.id)}
                    className="w-4 h-4 accent-[#8b5e3c] cursor-pointer rounded"
                  />
                  <span className={`flex-1 text-sm ${st.completed ? 'line-through text-secondary' : 'text-on-surface'}`}>
                    {st.title}
                  </span>
                  <button
                    onClick={() => onDeleteSubtask(task.id, st.id)}
                    className="p-1 text-secondary/50 hover:text-error transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add a subtask..."
                className="flex-1 border border-outline-variant/50 rounded-lg p-2 text-sm bg-surface-container-lowest dark:bg-[#1a1411] text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#8b5e3c] hover:bg-[#6f4627] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-surface-container-lowest dark:bg-[#201915] border-t border-outline-variant/40 p-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm('Delete this task permanently?')) {
                onDelete(task.id);
              }
            }}
            className="px-4 py-2 text-error hover:bg-error/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Task
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant/50 hover:bg-surface-container-high rounded-lg text-sm font-medium text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#8b5e3c] hover:bg-[#6f4627] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NoteDetailModalProps {
  note: any;
  courses: any[];
  onClose: () => void;
  onSave: (note: any) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onToggleChecklistItem: (noteId: string, itemId: string) => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  courses,
  onClose,
  onSave,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onToggleChecklistItem
}) => {
  const [editedNote, setEditedNote] = useState(note);

  const handleSave = () => {
    const selectedCourse = courses.find(c => c.id === editedNote.courseId);
    onSave({
      ...editedNote,
      courseName: selectedCourse?.name || 'General',
      courseColor: selectedCourse?.color || '#6f4627',
      course: selectedCourse?.code || 'General'
    });
  };

  const NOTE_COLOR_MAP: any = {
    default: { bg: 'bg-surface-container-low', dot: 'bg-gray-400' },
    red: { bg: 'bg-red-50 dark:bg-red-950/20', dot: 'bg-red-500' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/20', dot: 'bg-orange-500' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/20', dot: 'bg-yellow-500' },
    green: { bg: 'bg-green-50 dark:bg-green-950/20', dot: 'bg-green-500' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/20', dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/20', dot: 'bg-purple-500' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`${NOTE_COLOR_MAP[editedNote.color || 'default'].bg} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 backdrop-blur-sm bg-white/80 dark:bg-[#201915]/80 border-b border-outline-variant/40 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-on-surface">Note Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={editedNote.title}
              onChange={(e) => setEditedNote({ ...editedNote, title: e.target.value })}
              className="w-full text-2xl font-bold bg-transparent border-none text-on-surface focus:outline-hidden placeholder:text-secondary/60"
              placeholder="Note title..."
            />
          </div>

          {/* Course */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
              Course / Tag
            </label>
            <select
              value={editedNote.courseId || ''}
              onChange={(e) => setEditedNote({ ...editedNote, courseId: e.target.value })}
              className="w-full border border-outline-variant/50 rounded-lg p-2.5 text-sm bg-white/50 dark:bg-[#1a1411]/50 text-on-surface focus:outline-hidden focus:border-primary-container"
            >
              <option value="">No Course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>

          {/* Content or Checklist */}
          {editedNote.isChecklist ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                Checklist Items
              </label>
              <div className="space-y-2">
                {(editedNote.checklistItems || []).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/50 dark:bg-[#1a1411]/50">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => onToggleChecklistItem(note.id, item.id)}
                      className="w-5 h-5 accent-[#8b5e3c] cursor-pointer rounded"
                    />
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-secondary' : 'text-on-surface'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                Content
              </label>
              <textarea
                value={editedNote.content || ''}
                onChange={(e) => setEditedNote({ ...editedNote, content: e.target.value })}
                rows={10}
                placeholder="Write your note here..."
                className="w-full border border-outline-variant/50 rounded-lg p-3 text-sm bg-white/50 dark:bg-[#1a1411]/50 text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary-container resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
              Note Color
            </label>
            <div className="flex gap-2">
              {Object.keys(NOTE_COLOR_MAP).map((colorKey) => (
                <button
                  key={colorKey}
                  onClick={() => setEditedNote({ ...editedNote, color: colorKey })}
                  className={`w-8 h-8 rounded-full ${NOTE_COLOR_MAP[colorKey].dot} border-2 transition-all ${
                    editedNote.color === colorKey ? 'border-on-surface scale-110' : 'border-transparent'
                  }`}
                  title={colorKey}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 backdrop-blur-sm bg-white/80 dark:bg-[#201915]/80 border-t border-outline-variant/40 p-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => onTogglePin(note.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                note.pinned ? 'bg-primary text-white' : 'border border-outline-variant/50 text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {note.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => onToggleArchive(note.id)}
              className="px-3 py-2 border border-outline-variant/50 hover:bg-surface-container-high rounded-lg text-sm font-medium text-on-surface transition-colors"
            >
              {note.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this note permanently?')) {
                  onDelete(note.id);
                }
              }}
              className="px-3 py-2 text-error hover:bg-error/10 rounded-lg text-sm font-medium transition-colors"
            >
              Delete
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant/50 hover:bg-surface-container-high rounded-lg text-sm font-medium text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#8b5e3c] hover:bg-[#6f4627] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CourseDetailModalProps {
  course: any;
  tasks: any[];
  notes: any[];
  onClose: () => void;
  onSelectTask: (task: any) => void;
  onSelectNote: (note: any) => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  tasks,
  notes,
  onClose,
  onSelectTask,
  onSelectNote
}) => {
  const linkedTasks = tasks.filter(t => t.courseId === course.id);
  const linkedNotes = notes.filter(n => n.courseId === course.id);
  const activeTasks = linkedTasks.filter(t => !t.completed);
  const completedTasks = linkedTasks.filter(t => t.completed && t.grade);
  const avgGrade = completedTasks.length > 0
    ? Math.round(completedTasks.reduce((sum, t) => sum + parseFloat(t.grade || 0), 0) / completedTasks.length)
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface-container-lowest dark:bg-[#201915] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with course color */}
        <div
          className="sticky top-0 p-6 border-b border-outline-variant/40 flex items-center justify-between"
          style={{ backgroundColor: course.color + '20' }}
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }}></div>
              <h2 className="text-3xl font-bold text-on-surface">{course.code}</h2>
            </div>
            <p className="text-lg text-secondary mt-1">{course.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Course Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-container-high/50">
              <div className="text-xs text-secondary font-mono mb-1">Instructor</div>
              <div className="text-sm font-medium">{course.professor || course.instructor || 'N/A'}</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-high/50">
              <div className="text-xs text-secondary font-mono mb-1">Room</div>
              <div className="text-sm font-medium">{course.room || 'N/A'}</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-high/50">
              <div className="text-xs text-secondary font-mono mb-1">Schedule</div>
              <div className="text-sm font-medium">{course.time || course.schedule || 'N/A'}</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-high/50">
              <div className="text-xs text-secondary font-mono mb-1">Credits</div>
              <div className="text-sm font-medium">{course.credits || 3}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-secondary font-mono mb-1">Active Tasks</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{activeTasks.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="text-xs text-secondary font-mono mb-1">Completed</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{completedTasks.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <div className="text-xs text-secondary font-mono mb-1">Avg Grade</div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {avgGrade !== null ? `${avgGrade}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div>
            <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
              <CheckSquare className="w-5 h-5" /> Tasks ({linkedTasks.length})
            </h3>
            <div className="space-y-2">
              {linkedTasks.length === 0 ? (
                <p className="text-sm text-secondary italic p-4 bg-surface-container-high/30 rounded-lg">
                  No tasks linked to this course yet.
                </p>
              ) : (
                linkedTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => {
                      onClose();
                      onSelectTask(task);
                    }}
                    className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        readOnly
                        className="w-4 h-4 accent-[#8b5e3c] rounded"
                      />
                      <span className={`text-sm ${task.completed ? 'line-through text-secondary' : 'text-on-surface font-medium'}`}>
                        {task.title}
                      </span>
                    </div>
                    {task.grade && (
                      <span className="text-xs font-mono font-bold text-primary">{task.grade}%</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h3 className="text-lg font-bold text-on-surface mb-3">📝 Notes ({linkedNotes.length})</h3>
            <div className="space-y-2">
              {linkedNotes.length === 0 ? (
                <p className="text-sm text-secondary italic p-4 bg-surface-container-high/30 rounded-lg">
                  No notes linked to this course yet.
                </p>
              ) : (
                linkedNotes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => {
                      onClose();
                      onSelectNote(note);
                    }}
                    className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/40 cursor-pointer transition-all"
                  >
                    <div className="font-medium text-sm text-on-surface mb-1">{note.title}</div>
                    {note.content && (
                      <p className="text-xs text-secondary line-clamp-2">{note.content}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface-container-lowest dark:bg-[#201915] border-t border-outline-variant/40 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#8b5e3c] hover:bg-[#6f4627] text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
