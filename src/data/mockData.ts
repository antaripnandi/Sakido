import { Course, Task, Note, ScheduleEvent, Habit, UserProfile } from '../types';

export const initialProfile: UserProfile = {
  name: 'Alex Rivera',
  major: 'Computer Science & Mathematics',
  university: 'Stanford University',
  term: 'Fall 2026 • Quarter 1',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  dailyGoalMinutes: 180,
  completedMinutesToday: 110,
  tasksCompletedToday: 4,
  streakDays: 14,
};

export const initialCourses: Course[] = [
  {
    id: 'course-1',
    code: 'CS 201',
    name: 'Data Structures & Algorithms',
    instructor: 'Dr. Evelyn Vance',
    room: 'Gates Building 104',
    color: '#3b82f6', // Blue
    schedule: 'Mon, Wed 10:00 AM - 11:30 AM',
    credits: 4,
    gradeTarget: 'A',
    currentGrade: '94.5%',
    progress: 78,
  },
  {
    id: 'course-2',
    code: 'MATH 204',
    name: 'Linear Algebra & Applications',
    instructor: 'Prof. David Chen',
    room: 'Sloan Hall 220',
    color: '#8b5cf6', // Purple
    schedule: 'Tue, Thu 01:15 PM - 02:45 PM',
    credits: 4,
    gradeTarget: 'A',
    currentGrade: '91.2%',
    progress: 65,
  },
  {
    id: 'course-3',
    code: 'PHYS 101',
    name: 'Physics I: Classical Mechanics',
    instructor: 'Dr. Marcus Thorne',
    room: 'Hewlett Teaching Hub 102',
    color: '#f59e0b', // Amber
    schedule: 'Mon, Wed, Fri 09:00 AM - 09:50 AM',
    credits: 4,
    gradeTarget: 'A-',
    currentGrade: '88.7%',
    progress: 60,
  },
  {
    id: 'course-4',
    code: 'ENG 102',
    name: 'Technical Writing & Communication',
    instructor: 'Prof. Sarah Jenkins',
    room: 'Lathrop Library 208',
    color: '#10b981', // Emerald
    schedule: 'Tue, Thu 10:00 AM - 11:30 AM',
    credits: 3,
    gradeTarget: 'A',
    currentGrade: '96.0%',
    progress: 82,
  },
  {
    id: 'course-5',
    code: 'BIO 110',
    name: 'Introduction to Molecular Genetics',
    instructor: 'Dr. Aris Thorne',
    room: 'Gilbert Bio Hall 11',
    color: '#ec4899', // Pink
    schedule: 'Wed, Fri 02:00 PM - 03:30 PM',
    credits: 3,
    gradeTarget: 'B+',
    currentGrade: '86.4%',
    progress: 50,
  },
];

export const initialTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Implement Red-Black Tree Rotation Benchmark',
    description: 'Write C++ implementation for left and right tree rotations and benchmark performance against standard AVL tree implementation.',
    courseId: 'course-1',
    courseName: 'CS 201',
    courseColor: '#3b82f6',
    dueDate: 'Today, 11:59 PM',
    priority: 'urgent',
    status: 'in_progress',
    estimatedMinutes: 90,
    tags: ['Programming', 'Assignment 4'],
    subtasks: [
      { id: 'st-1', title: 'Write node structures and helper functions', completed: true },
      { id: 'st-2', title: 'Implement left and right rotation logic', completed: true },
      { id: 'st-3', title: 'Write unit tests for edge cases', completed: false },
      { id: 'st-4', title: 'Generate runtime comparison chart', completed: false },
    ],
    createdAt: '2026-07-25',
  },
  {
    id: 'task-2',
    title: 'Problem Set 5: Eigenvalues & Singular Value Decomposition',
    description: 'Complete problems 1 through 8 on Page 142. Focus on diagonalizing 3x3 symmetric matrices.',
    courseId: 'course-2',
    courseName: 'MATH 204',
    courseColor: '#8b5cf6',
    dueDate: 'Tomorrow, 05:00 PM',
    priority: 'high',
    status: 'todo',
    estimatedMinutes: 120,
    tags: ['Problem Set', 'Math'],
    subtasks: [
      { id: 'st-5', title: 'Solve problems 1-4 (Eigenvalues)', completed: false },
      { id: 'st-6', title: 'Solve problems 5-8 (SVD reduction)', completed: false },
    ],
    createdAt: '2026-07-26',
  },
  {
    id: 'task-3',
    title: 'Draft Technical Proposal for Smart Campus App',
    description: 'Structure 5-page proposal detailing architecture, system diagram, user flows, and tech stack specification.',
    courseId: 'course-4',
    courseName: 'ENG 102',
    courseColor: '#10b981',
    dueDate: 'Jul 30, 2026',
    priority: 'medium',
    status: 'in_progress',
    estimatedMinutes: 60,
    tags: ['Draft', 'Writing'],
    subtasks: [
      { id: 'st-7', title: 'Outline Executive Summary & Problem Statement', completed: true },
      { id: 'st-8', title: 'Create System Architecture Diagram', completed: false },
    ],
    createdAt: '2026-07-24',
  },
  {
    id: 'task-4',
    title: 'Physics Lab 3: Rotational Dynamics Data Analysis',
    description: 'Plot torque vs angular acceleration graphs in Python using matplotlib and calculate moment of inertia.',
    courseId: 'course-3',
    courseName: 'PHYS 101',
    courseColor: '#f59e0b',
    dueDate: 'Jul 31, 2026',
    priority: 'low',
    status: 'todo',
    estimatedMinutes: 45,
    tags: ['Lab Report', 'Python'],
    createdAt: '2026-07-26',
  },
  {
    id: 'task-5',
    title: 'Read Chapter 8: CRISPR & Gene Editing Techniques',
    description: 'Annotate key mechanisms of Cas9 cleavage and guide RNA design principles.',
    courseId: 'course-5',
    courseName: 'BIO 110',
    courseColor: '#ec4899',
    dueDate: 'Aug 02, 2026',
    priority: 'low',
    status: 'todo',
    estimatedMinutes: 40,
    tags: ['Reading', 'Biology'],
    createdAt: '2026-07-27',
  },
  {
    id: 'task-6',
    title: 'Review Hash Table Collision Strategies Notes',
    description: 'Chaining vs Open Addressing (Linear Probing vs Quadratic Probing vs Double Hashing).',
    courseId: 'course-1',
    courseName: 'CS 201',
    courseColor: '#3b82f6',
    dueDate: 'Yesterday',
    priority: 'medium',
    status: 'completed',
    estimatedMinutes: 30,
    tags: ['Review', 'Flashcards'],
    createdAt: '2026-07-23',
  },
  {
    id: 'task-7',
    title: 'Submit Midterm Course Feedback Survey',
    description: 'Quick 5-minute anonymous survey on course pacing and lab resources.',
    courseId: 'course-4',
    courseName: 'ENG 102',
    courseColor: '#10b981',
    dueDate: 'Yesterday',
    priority: 'low',
    status: 'submitted',
    estimatedMinutes: 10,
    tags: ['Admin'],
    createdAt: '2026-07-22',
  },
];

export const initialNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Balanced Binary Search Trees & Red-Black Invariants',
    courseId: 'course-1',
    courseName: 'CS 201',
    courseColor: '#3b82f6',
    updatedAt: '2 hours ago',
    tags: ['Algorithms', 'Trees', 'Lecture 12'],
    isPinned: true,
    type: 'lecture',
    content: `
# Balanced Binary Search Trees (BST)

## 1. Why Self-Balancing?
Standard BST operations (Search, Insert, Delete) take **O(h)** time where *h* is height. In worst-case degenerated tree (sorted insertion), *h* becomes *N*, yielding linear **O(N)** time. Self-balancing trees guarantee **h = O(log N)**.

## 2. Red-Black Tree Properties
Every node is colored either **Red** or **Black**.
1. **Root Property**: The root node is always Black.
2. **Red Property**: Red nodes cannot have Red children (No consecutive Red nodes).
3. **Black Height Invariant**: Every path from a node to any descendant null leaf contains the same number of Black nodes.
4. **Leaf Property**: All NIL leaves are Black.

> **Key Takeaway**: These invariants ensure that the longest path from the root to a leaf is no more than twice as long as the shortest path.

\`\`\`cpp
struct Node {
    int data;
    bool isRed;
    Node *left, *right, *parent;
};

void rotateLeft(Node* &root, Node* &pt) {
    Node *pt_right = pt->right;
    pt->right = pt_right->left;
    if (pt->right != NULL) pt->right->parent = pt;
    pt_right->parent = pt->parent;
    if (pt->parent == NULL) root = pt_right;
    else if (pt == pt->parent->left) pt->parent->left = pt_right;
    else pt->parent->right = pt_right;
    pt_right->left = pt;
    pt->parent = pt_right;
}
\`\`\`

## 3. Active Recall Review Questions
- What happens when inserting into a node with a Red uncle vs Black uncle?
- Why do we perform double rotations in LR / RL cases?
`,
  },
  {
    id: 'note-2',
    title: 'Vector Spaces, Basis, & Dimension Theorems',
    courseId: 'course-2',
    courseName: 'MATH 204',
    courseColor: '#8b5cf6',
    updatedAt: 'Yesterday',
    tags: ['Linear Algebra', 'Exam Prep'],
    isPinned: true,
    type: 'exam_prep',
    content: `
# Vector Spaces & Linear Independence

## 1. Subspace Definition
A subset $W$ of a vector space $V$ is a **subspace** if:
1. The zero vector $\\vec{0} \\in W$.
2. Closed under vector addition: $\\vec{u}, \\vec{v} \\in W \\implies \\vec{u} + \\vec{v} \\in W$.
3. Closed under scalar multiplication: $c \\in \\mathbb{R}, \\vec{u} \\in W \\implies c\\vec{u} \\in W$.

## 2. Fundamental Subspaces of Matrix A (m x n)
- **Column Space** $Col(A) \\subseteq \\mathbb{R}^m$: Span of pivot columns.
- **Null Space** $Null(A) \\subseteq \\mathbb{R}^n$: Solutions to $A\\vec{x} = \\vec{0}$.
- **Row Space** $Row(A) \\subseteq \\mathbb{R}^n$: Span of non-zero rows in RREF.

> **Rank-Nullity Theorem**: 
> $\\text{Rank}(A) + \\text{Nullity}(A) = n$ (Total number of columns).

## 3. Quick Formulas
- Eigenvalues: $\\det(A - \\lambda I) = 0$
- Trace Formula: $\\sum \\lambda_i = \\text{Tr}(A)$
- Determinant Product: $\\prod \\lambda_i = \\det(A)$
`,
  },
  {
    id: 'note-3',
    title: 'Rotational Kinematics & Moment of Inertia',
    courseId: 'course-3',
    courseName: 'PHYS 101',
    courseColor: '#f59e0b',
    updatedAt: '3 days ago',
    tags: ['Physics', 'Mechanics', 'Lab Note'],
    isPinned: false,
    type: 'lab',
    content: `
# Rotational Kinematics & Parallel Axis Theorem

## Key Formulas
- **Torque**: $\\vec{\\tau} = \\vec{r} \\times \\vec{F} = I \\vec{\\alpha}$
- **Angular Momentum**: $L = I \\omega$
- **Rotational Kinetic Energy**: $K_{rot} = \\frac{1}{2} I \\omega^2$

## Parallel Axis Theorem
$$ I = I_{cm} + M d^2 $$
Where $d$ is the perpendicular distance between the center of mass axis and the parallel rotation axis.

## Lab Setup Notes
- Ensure rotary motion sensor is calibrated to 360 pulses per revolution.
- Counterweight mass: $100\\text{g} \\pm 0.5\\text{g}$.
`,
  },
  {
    id: 'note-4',
    title: 'Structure of Technical Whitepapers & User Personas',
    courseId: 'course-4',
    courseName: 'ENG 102',
    courseColor: '#10b981',
    updatedAt: '4 days ago',
    tags: ['Writing', 'Templates'],
    isPinned: false,
    type: 'summary',
    content: `
# Technical Proposal Writing Framework

## Anatomy of a Great Tech Proposal
1. **Executive Summary**: High level value prop, target user, primary metric.
2. **Problem Statement**: Quantified current pain point.
3. **Proposed Solution**: Architecture design, functional specifications.
4. **Implementation Timeline**: Milestones, risk mitigation.
5. **Budget & Resource Requirements**: Infrastructure costs, maintenance.

> *Tip from Prof. Jenkins*: Never mix technical jargon with user value propositions. Keep engineering details in Section 3!
`,
  },
];

export const initialSchedule: ScheduleEvent[] = [
  // Monday
  { id: 'sch-1', courseId: 'course-3', courseCode: 'PHYS 101', courseName: 'Physics I', room: 'Hewlett 102', instructor: 'Dr. Thorne', dayOfWeek: 1, startTime: '09:00', endTime: '09:50', type: 'lecture', color: '#f59e0b' },
  { id: 'sch-2', courseId: 'course-1', courseCode: 'CS 201', courseName: 'Data Structures', room: 'Gates 104', instructor: 'Dr. Vance', dayOfWeek: 1, startTime: '10:00', endTime: '11:30', type: 'lecture', color: '#3b82f6' },
  { id: 'sch-3', courseId: 'course-1', courseCode: 'CS 201', courseName: 'Algorithms Lab', room: 'Gates B02', instructor: 'TA Marcus', dayOfWeek: 1, startTime: '14:00', endTime: '15:30', type: 'lab', color: '#3b82f6' },

  // Tuesday
  { id: 'sch-4', courseId: 'course-4', courseCode: 'ENG 102', courseName: 'Technical Writing', room: 'Lathrop 208', instructor: 'Prof. Jenkins', dayOfWeek: 2, startTime: '10:00', endTime: '11:30', type: 'lecture', color: '#10b981' },
  { id: 'sch-5', courseId: 'course-2', courseCode: 'MATH 204', courseName: 'Linear Algebra', room: 'Sloan 220', instructor: 'Prof. Chen', dayOfWeek: 2, startTime: '13:15', endTime: '14:45', type: 'lecture', color: '#8b5cf6' },

  // Wednesday
  { id: 'sch-6', courseId: 'course-3', courseCode: 'PHYS 101', courseName: 'Physics I', room: 'Hewlett 102', instructor: 'Dr. Thorne', dayOfWeek: 3, startTime: '09:00', endTime: '09:50', type: 'lecture', color: '#f59e0b' },
  { id: 'sch-7', courseId: 'course-1', courseCode: 'CS 201', courseName: 'Data Structures', room: 'Gates 104', instructor: 'Dr. Vance', dayOfWeek: 3, startTime: '10:00', endTime: '11:30', type: 'lecture', color: '#3b82f6' },
  { id: 'sch-8', courseId: 'course-5', courseCode: 'BIO 110', courseName: 'Molecular Genetics', room: 'Gilbert 11', instructor: 'Dr. Aris', dayOfWeek: 3, startTime: '14:00', endTime: '15:30', type: 'lecture', color: '#ec4899' },

  // Thursday
  { id: 'sch-9', courseId: 'course-4', courseCode: 'ENG 102', courseName: 'Technical Writing', room: 'Lathrop 208', instructor: 'Prof. Jenkins', dayOfWeek: 4, startTime: '10:00', endTime: '11:30', type: 'lecture', color: '#10b981' },
  { id: 'sch-10', courseId: 'course-2', courseCode: 'MATH 204', courseName: 'Linear Algebra', room: 'Sloan 220', instructor: 'Prof. Chen', dayOfWeek: 4, startTime: '13:15', endTime: '14:45', type: 'lecture', color: '#8b5cf6' },
  { id: 'sch-11', courseId: 'course-2', courseCode: 'MATH 204', courseName: 'Math Office Hours', room: 'Sloan 310', instructor: 'Prof. Chen', dayOfWeek: 4, startTime: '15:00', endTime: '16:30', type: 'office_hours', color: '#8b5cf6' },

  // Friday
  { id: 'sch-12', courseId: 'course-3', courseCode: 'PHYS 101', courseName: 'Physics I', room: 'Hewlett 102', instructor: 'Dr. Thorne', dayOfWeek: 5, startTime: '09:00', endTime: '09:50', type: 'lecture', color: '#f59e0b' },
  { id: 'sch-13', courseId: 'course-5', courseCode: 'BIO 110', courseName: 'Molecular Genetics', room: 'Gilbert 11', instructor: 'Dr. Aris', dayOfWeek: 5, startTime: '14:00', endTime: '15:30', type: 'lecture', color: '#ec4899' },
];

export const initialHabits: Habit[] = [
  {
    id: 'hb-1',
    name: 'LeetCode / Algorithmic Practice',
    category: 'study',
    targetDaysPerWeek: 5,
    completedDays: [true, true, true, true, false, false, false],
    streak: 12,
    color: '#3b82f6',
  },
  {
    id: 'hb-2',
    name: '30m Daily Lecture Note Review',
    category: 'study',
    targetDaysPerWeek: 7,
    completedDays: [true, true, true, true, true, false, false],
    streak: 19,
    color: '#8b5cf6',
  },
  {
    id: 'hb-3',
    name: 'Hydrate (2.5L Water)',
    category: 'health',
    targetDaysPerWeek: 7,
    completedDays: [true, true, true, true, true, true, false],
    streak: 28,
    color: '#06b6d4',
  },
  {
    id: 'hb-4',
    name: 'Gym / Physical Workout 45m',
    category: 'health',
    targetDaysPerWeek: 4,
    completedDays: [true, false, true, false, true, false, false],
    streak: 5,
    color: '#10b981',
  },
  {
    id: 'hb-5',
    name: 'Read 20 pages of non-fiction',
    category: 'mindset',
    targetDaysPerWeek: 6,
    completedDays: [true, true, false, true, true, false, false],
    streak: 4,
    color: '#f59e0b',
  },
];
