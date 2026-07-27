import React, { useState } from 'react';
import { 
  BookOpen, 
  Pin, 
  Search, 
  Plus, 
  Tag, 
  Clock, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  X,
  Code,
  Share2
} from 'lucide-react';
import { Note, Course } from '../../types';

interface NotesViewProps {
  notes: Note[];
  courses: Course[];
  onAddNote: (newNote: Omit<Note, 'id' | 'updatedAt'>) => void;
  onUpdateNote: (updated: Note) => void;
  onDeleteNote: (noteId: string) => void;
  isCreateModalOpen?: boolean;
  onRequestCloseModal?: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  courses,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  isCreateModalOpen = false,
  onRequestCloseModal,
}) => {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note>(notes[0] || null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const [copied, setCopied] = useState(false);

  // Modal State for New Note
  const [showCreateModal, setShowCreateModal] = useState(isCreateModalOpen);

  React.useEffect(() => {
    if (isCreateModalOpen) setShowCreateModal(true);
  }, [isCreateModalOpen]);

  // Form State for New Note
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || 'course-1');
  const [newType, setNewType] = useState<Note['type']>('lecture');
  const [newContent, setNewContent] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('Algorithms, Lecture');

  const filteredNotes = notes.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || n.courseId === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const handleStartEdit = () => {
    if (!selectedNote) return;
    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedNote) return;
    const updated = {
      ...selectedNote,
      title: editTitle,
      content: editContent,
      updatedAt: 'Just now',
    };
    onUpdateNote(updated);
    setSelectedNote(updated);
    setIsEditing(false);
  };

  const handleCopyNote = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(selectedNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePin = (note: Note) => {
    const updated = { ...note, isPinned: !note.isPinned };
    onUpdateNote(updated);
    if (selectedNote && selectedNote.id === note.id) {
      setSelectedNote(updated);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const courseObj = courses.find(c => c.id === newCourseId) || courses[0];
    const tags = newTagsStr.split(',').map(t => t.trim()).filter(Boolean);

    const created: Omit<Note, 'id' | 'updatedAt'> = {
      title: newTitle,
      content: newContent || '# ' + newTitle + '\n\nStart typing notes...',
      courseId: courseObj.id,
      courseName: courseObj.code,
      courseColor: courseObj.color,
      tags: tags.length > 0 ? tags : ['Notes'],
      type: newType,
      isPinned: false,
    };

    onAddNote(created);
    setShowCreateModal(false);
    if (onRequestCloseModal) onRequestCloseModal();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-600 dark:text-zinc-400" />
            <input
              type="text"
              placeholder="Search course notes & formulas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-600 dark:placeholder-zinc-400 focus:outline-none"
            />
          </div>

          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New Note
        </button>
      </div>

      {/* Main Split Interface */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        {/* Left Column: Note Directory Cards */}
        <div className="overflow-y-auto space-y-2 pr-1">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-zinc-[500] text-xs font-medium">
              No notes found. Create your first lecture summary!
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = selectedNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note);
                    setIsEditing(false);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm ring-1 ring-zinc-900 dark:ring-zinc-100'
                      : 'bg-white/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ backgroundColor: `${note.courseColor}18`, color: note.courseColor }}
                    >
                      {note.courseName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      <span className="text-[10px] text-zinc-[500] font-medium">{note.updatedAt}</span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {note.title}
                  </h3>

                  <p className="text-[11px] text-zinc-[600] dark:text-zinc-[400] line-clamp-2 leading-relaxed">
                    {note.content.replace(/[#*`>-]/g, '').slice(0, 100)}...
                  </p>

                  <div className="flex items-center gap-1.5 pt-1">
                    {note.tags.map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-[500]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Apple / Notion Styled Note Reader & Editor */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden flex flex-col">
          {selectedNote ? (
            <>
              {/* Toolbar Header */}
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-semibold"
                    style={{ backgroundColor: `${selectedNote.courseColor}18`, color: selectedNote.courseColor }}
                  >
                    {selectedNote.courseName}
                  </span>
                  <span className="text-xs text-zinc-[500]">• Updated {selectedNote.updatedAt}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePin(selectedNote)}
                    title={selectedNote.isPinned ? 'Unpin' : 'Pin Note'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      selectedNote.isPinned
                        ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/50 dark:border-amber-800'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-[500] hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleCopyNote}
                    title="Copy Text"
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-[600] dark:text-zinc-[400] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {isEditing ? (
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 transition-colors"
                    >
                      Save Changes
                    </button>
                  ) : (
                    <button
                      onClick={handleStartEdit}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-[600] dark:text-zinc-[400] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onDeleteNote(selectedNote.id);
                      setSelectedNote(notes.find(n => n.id !== selectedNote.id) || null as unknown as Note);
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Reader / Editor Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xl font-bold bg-transparent border-b border-zinc-200 dark:border-zinc-800 pb-2 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <textarea
                      rows={16}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full font-mono text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="prose prose-zinc dark:prose-invert max-w-none text-xs leading-relaxed space-y-4">
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      {selectedNote.title}
                    </h1>

                    {/* Simple formatting renderer for notes */}
                    <div className="whitespace-pre-wrap font-sans text-zinc-800 dark:text-zinc-200 leading-relaxed space-y-3">
                      {selectedNote.content}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-[500]">
              <BookOpen className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-semibold">No note selected</p>
            </div>
          )}
        </div>
      </div>

      {/* New Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Create Course Note
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  if (onRequestCloseModal) onRequestCloseModal();
                }}
                className="p-1 rounded-md text-zinc-[500] hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red-Black Tree Rotation Properties"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
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
                    Note Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as Note['type'])}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="lecture">Lecture Notes</option>
                    <option value="exam_prep">Exam Review / Cheat Sheet</option>
                    <option value="summary">Chapter Summary</option>
                    <option value="lab">Lab Report Notes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Initial Content (Markdown format supported)
                </label>
                <textarea
                  rows={6}
                  placeholder="# Key Concepts&#10;&#10;- Point 1&#10;- Point 2"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none font-mono text-xs"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    if (onRequestCloseModal) onRequestCloseModal();
                  }}
                  className="px-4 py-2 rounded-xl text-zinc-[600] hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
