import React, { useState } from 'react';
import {
  Layers,
  Plus,
  RotateCw,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  BookOpen,
  Sparkles,
  ChevronRight,
  Brain,
  Zap,
  Calendar,
  X
} from 'lucide-react';
import { Course, Flashcard, calculateSM2 } from '../../types';

interface FlashcardModuleProps {
  courses: Course[];
  flashcards: Flashcard[];
  onUpdateCard: (card: Flashcard) => void;
  onAddCard: (cardData: { classId: string; className: string; classColor: string; front: string; back: string }) => void;
  onDeleteCard: (id: string) => void;
}

export const FlashcardModule: React.FC<FlashcardModuleProps> = ({
  courses,
  flashcards,
  onUpdateCard,
  onAddCard,
  onDeleteCard
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | 'all'>('all');
  const [activeStudyDeckId, setActiveStudyDeckId] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isAddCardOpen, setIsAddCardOpen] = useState<boolean>(false);
  const [newFront, setNewFront] = useState<string>('');
  const [newBack, setNewBack] = useState<string>('');
  const [newClassId, setNewClassId] = useState<string>(courses[0]?.id || '');

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const isCardDue = (card: Flashcard) => card.nextReviewDate <= todayStr;

  const filteredCards = selectedClassId === 'all'
    ? flashcards
    : flashcards.filter(c => c.classId === selectedClassId);

  const activeDeckCards = activeStudyDeckId === 'all'
    ? flashcards
    : flashcards.filter(c => c.classId === activeStudyDeckId);

  const dueStudyCards = activeDeckCards.filter(isCardDue);
  const currentStudyCard = dueStudyCards[currentCardIndex];

  const getEarliestUpcomingDate = (cards: Flashcard[]) => {
    const upcoming = cards.filter(c => c.nextReviewDate > todayStr);
    if (upcoming.length === 0) return null;
    const sorted = [...upcoming].sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
    return sorted[0].nextReviewDate;
  };

  const handleRating = (quality: 0 | 1 | 2 | 3) => {
    if (!currentStudyCard) return;
    const updated = calculateSM2(currentStudyCard, quality);
    onUpdateCard(updated);
    setIsFlipped(false);
    if (currentCardIndex >= dueStudyCards.length - 1) {
      setCurrentCardIndex(0);
    }
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim() || !newClassId) return;
    const targetCourse = courses.find(c => c.id === newClassId);
    onAddCard({
      classId: newClassId,
      className: targetCourse ? targetCourse.code : 'General',
      classColor: targetCourse ? targetCourse.color : '#8b5e3c',
      front: newFront.trim(),
      back: newBack.trim()
    });
    setNewFront('');
    setNewBack('');
    setIsAddCardOpen(false);
  };

  // Study View
  if (activeStudyDeckId !== null) {
    const earliestNext = getEarliestUpcomingDate(activeDeckCards);

    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveStudyDeckId(null);
              setIsFlipped(false);
              setCurrentCardIndex(0);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer"
          >
            <span>← Back to Decks</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-secondary">SM-2 Spaced Repetition</span>
          </div>
        </div>

        {/* Study Card Interface */}
        {dueStudyCards.length > 0 && currentStudyCard ? (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-surface-container-high p-4 rounded-xl border border-outline-variant/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#8b5e3c]" />
                <span className="text-xs font-semibold text-on-surface">
                  Reviewing {currentStudyCard.className}
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-secondary">
                Card {currentCardIndex + 1} of {dueStudyCards.length} due today
              </span>
            </div>

            {/* Flashcard Container */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative min-h-[320px] sm:min-h-[380px] w-full rounded-2xl border border-outline-variant/60 bg-surface-container-low p-8 sm:p-12 flex flex-col justify-between items-center text-center shadow-lg cursor-pointer transition-all duration-300 hover:border-primary/40 group"
            >
              {/* Card Badge Header */}
              <div className="w-full flex items-center justify-between text-xs text-secondary">
                <span
                  className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold text-white"
                  style={{ backgroundColor: currentStudyCard.classColor }}
                >
                  {currentStudyCard.className}
                </span>
                <span className="font-mono text-[11px]">
                  {isFlipped ? 'Answer (Back)' : 'Question (Front)'}
                </span>
              </div>

              {/* Card Body Text */}
              <div className="my-auto py-8 max-w-xl">
                <p className="text-xl sm:text-2xl font-semibold leading-relaxed text-on-surface">
                  {isFlipped ? currentStudyCard.back : currentStudyCard.front}
                </p>
                {!isFlipped && (
                  <p className="mt-4 text-xs text-secondary font-medium">
                    (Click anywhere or button below to reveal answer)
                  </p>
                )}
              </div>

              {/* Reveal Action Prompt */}
              {!isFlipped && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="px-6 py-2.5 bg-on-surface text-surface rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer"
                >
                  Show Answer
                </button>
              )}
            </div>

            {/* SM-2 Rating Buttons */}
            {isFlipped && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <p className="text-center text-xs font-medium text-secondary">
                  How well did you remember this card?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button onClick={() => handleRating(0)} className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-all cursor-pointer active:scale-95 flex flex-col items-center gap-1">
                    <span className="font-bold text-sm">Again</span>
                    <span className="text-[10px] opacity-75 font-mono">1 day</span>
                  </button>
                  <button onClick={() => handleRating(1)} className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs transition-all cursor-pointer active:scale-95 flex flex-col items-center gap-1">
                    <span className="font-bold text-sm">Hard</span>
                    <span className="text-[10px] opacity-75 font-mono">1 day</span>
                  </button>
                  <button onClick={() => handleRating(2)} className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-all cursor-pointer active:scale-95 flex flex-col items-center gap-1">
                    <span className="font-bold text-sm">Good</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {currentStudyCard.repetitions === 0 ? '1 day' : currentStudyCard.repetitions === 1 ? '6 days' : `${Math.round(currentStudyCard.interval * currentStudyCard.easeFactor)} days`}
                    </span>
                  </button>
                  <button onClick={() => handleRating(3)} className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs transition-all cursor-pointer active:scale-95 flex flex-col items-center gap-1">
                    <span className="font-bold text-sm">Easy</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {currentStudyCard.repetitions === 0 ? '1 day' : currentStudyCard.repetitions === 1 ? '6 days' : `${Math.round(currentStudyCard.interval * (currentStudyCard.easeFactor + 0.15))} days`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* All Caught Up State */
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-on-surface">You're all caught up!</h3>
            <p className="text-sm text-secondary max-w-md mx-auto">
              {earliestNext
                ? `No cards are due right now. Your next review session is scheduled for ${earliestNext}.`
                : 'No cards are due for review right now.'}
            </p>
            <button
              onClick={() => setActiveStudyDeckId(null)}
              className="mt-4 px-6 py-2.5 bg-[#8b5e3c] text-white rounded-xl text-xs font-semibold hover:bg-[#6f4627] transition-all cursor-pointer"
            >
              Back to Decks Overview
            </button>
          </div>
        )}
      </div>
    );
  }

  // Decks & Cards Overview
  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Flashcard Decks</h2>
          <p className="text-xs text-secondary">
            Spaced repetition memory review powered by the SM-2 algorithm.
          </p>
        </div>
        <button
          onClick={() => setIsAddCardOpen(true)}
          disabled={courses.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 bg-on-surface text-surface rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>New Flashcard</span>
        </button>
      </div>

      {/* Class Filter Tabs */}
      {courses.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedClassId('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedClassId === 'all'
                ? 'bg-on-surface text-surface font-semibold'
                : 'bg-surface-container-high text-secondary hover:text-on-surface'
            }`}
          >
            All Decks ({flashcards.length})
          </button>
          {courses.map((course) => {
            const courseCards = flashcards.filter(c => c.classId === course.id);
            return (
              <button
                key={course.id}
                onClick={() => setSelectedClassId(course.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                  selectedClassId === course.id
                    ? 'bg-on-surface text-surface font-semibold'
                    : 'bg-surface-container-high text-secondary hover:text-on-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }} />
                <span>{course.code} ({courseCards.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State: No Classes */}
      {courses.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-on-surface">No decks yet — add a class first</h3>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            Flashcard decks are organized by your enrolled courses. Add a course in the My Courses section to start building decks.
          </p>
        </div>
      ) : (
        /* Deck Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses
            .filter(course => selectedClassId === 'all' || selectedClassId === course.id)
            .map((course) => {
              const deckCards = flashcards.filter(c => c.classId === course.id);
              const dueCount = deckCards.filter(isCardDue).length;
              return (
                <div
                  key={course.id}
                  className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2.5 py-0.5 rounded-md font-mono text-[11px] font-semibold text-white"
                        style={{ backgroundColor: course.color }}
                      >
                        {course.code}
                      </span>
                      {dueCount > 0 && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          {dueCount} Due
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm text-on-surface">{course.name}</h3>
                    <p className="text-xs text-secondary">
                      {deckCards.length} {deckCards.length === 1 ? 'card' : 'cards'} total
                    </p>
                  </div>
                  <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between">
                    <button
                      onClick={() => setActiveStudyDeckId(course.id)}
                      disabled={deckCards.length === 0}
                      className="px-4 py-2 bg-[#8b5e3c] text-white rounded-xl text-xs font-semibold hover:bg-[#6f4627] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{dueCount > 0 ? `Study (${dueCount} Due)` : 'Review Deck'}</span>
                    </button>
                    <span className="text-[11px] font-mono text-secondary">
                      {dueCount === 0 && deckCards.length > 0 ? 'Caught Up' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Cards List Section */}
      {filteredCards.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-outline-variant/30">
          <h3 className="text-sm font-semibold text-on-surface">
            Card Repository ({filteredCards.length})
          </h3>
          <div className="space-y-2">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0"
                      style={{ backgroundColor: card.classColor }}
                    >
                      {card.className}
                    </span>
                    <span className="font-semibold text-on-surface truncate">Q: {card.front}</span>
                  </div>
                  <p className="text-secondary truncate">A: {card.back}</p>
                </div>
                <div className="flex items-center gap-4 text-secondary font-mono text-[11px] shrink-0">
                  <span>Interval: {card.interval}d</span>
                  <span>Next: {card.nextReviewDate}</span>
                  <button
                    onClick={() => onDeleteCard(card.id)}
                    className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title="Delete Card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Flashcard Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-on-surface">Create New Flashcard</h3>
              <button
                onClick={() => setIsAddCardOpen(false)}
                className="text-secondary hover:text-on-surface cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-on-surface-variant">Target Course</label>
                <select
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface-container-low text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-on-surface-variant">Front Side (Question / Term)</label>
                <textarea
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. What is the time complexity of QuickSort average case?"
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface-container-low text-xs text-on-surface placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-on-surface-variant">Back Side (Answer / Definition)</label>
                <textarea
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="e.g. O(N log N)"
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface-container-low text-xs text-on-surface placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCardOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/50 text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container-high cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#8b5e3c] text-white rounded-xl text-xs font-semibold hover:bg-[#6f4627] transition-all cursor-pointer"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
