/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  CheckSquare,
  Clock,
  Trash2,
  Calendar,
  AlertCircle,
  BookOpen,
  Check,
  AlertTriangle,
  ListTodo,
  Edit2,
  ChevronRight,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskPriority, TaskType } from '../../types';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { TaskModal } from '../../components/tasks/TaskModal';
import { TaskDetailModal } from '../../components/tasks/TaskDetailModal';

type SortOption = 'dueDateAsc' | 'dueDateDesc' | 'priorityDesc' | 'hoursDesc' | 'hoursAsc';

export function TasksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tasks,
    subjects,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompleted,
  } = usePlanner();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [sortBy, setSortBy] = useState<SortOption>('dueDateAsc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Quick stats
  const activeCount = tasks.filter((t) => t.status !== 'completed').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalRemainingHours = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((acc, t) => acc + t.remainingHours, 0);

  // Priority counts for quick scanning (active tasks)
  const urgentCount = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    const diff = (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diff <= 2;
  }).length;

  const highPriorityCount = tasks.filter(
    (t) => t.status !== 'completed' && (t.priority === 'high' || t.priority === 'urgent')
  ).length;
  const mediumPriorityCount = tasks.filter(
    (t) => t.status !== 'completed' && t.priority === 'medium'
  ).length;
  const lowPriorityCount = tasks.filter(
    (t) => t.status !== 'completed' && t.priority === 'low'
  ).length;

  const overdueCount = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    const diff = (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diff < 0;
  }).length;

  // Filtering and Sorting
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const sub = subjects.find((s) => s.id === t.subjectId);
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
          const matchSub = sub ? sub.code.toLowerCase().includes(q) || sub.name.toLowerCase().includes(q) : false;
          if (!matchTitle && !matchNotes && !matchSub) return false;
        }

        // Subject filter
        if (subjectFilter !== 'all' && t.subjectId !== subjectFilter) {
          return false;
        }

        // Priority filter
        if (priorityFilter !== 'all') {
          if (priorityFilter === 'high_urgent') {
            if (t.priority !== 'high' && t.priority !== 'urgent') return false;
          } else if (t.priority !== priorityFilter) {
            return false;
          }
        }

        // Type filter
        if (typeFilter !== 'all' && t.type !== typeFilter) {
          return false;
        }

        // Status filter
        if (statusFilter === 'active' && t.status === 'completed') {
          return false;
        }
        if (statusFilter === 'completed' && t.status !== 'completed') {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'dueDateAsc') {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === 'dueDateDesc') {
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        if (sortBy === 'hoursDesc') {
          return b.remainingHours - a.remainingHours;
        }
        if (sortBy === 'hoursAsc') {
          return a.remainingHours - b.remainingHours;
        }
        if (sortBy === 'priorityDesc') {
          const pOrder: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return pOrder[b.priority] - pOrder[a.priority];
        }
        return 0;
      });
  }, [tasks, subjects, searchQuery, subjectFilter, priorityFilter, typeFilter, statusFilter, sortBy]);

  const handleOpenAdd = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'>, id?: string) => {
    if (id) {
      updateTask(id, taskData);
    } else {
      addTask(taskData);
    }
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    updateTask(taskId, { subtasks: updatedSubtasks });
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!window.confirm(`Delete "${task?.title || 'this assignment'}" and its scheduled study blocks?`)) return;
    deleteTask(taskId);
  };

  return (
    <div className="space-y-6 max-w-[1440px] w-full pb-16 font-sans">
      {/* =========================================================================
          1. HEADER & ACTION STRIP
         ========================================================================= */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-1">
            Curriculum Work Queue · {user?.term || 'Current Term'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Assignments & Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl font-medium leading-relaxed">
            Prioritized work queue with estimated study hours, subtasks, and deadline tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleOpenAdd}
            disabled={subjects.length === 0}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Assignment
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. METRIC WELLS / WORKLOAD SUMMARY RIBBON
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 surface-base rounded-2xl shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Active In Queue
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
              {activeCount} tasks
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl surface-inset text-sky-700 flex items-center justify-center font-bold border border-sky-200/60">
            <ListTodo className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 surface-base rounded-2xl shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Workload Remaining
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-sky-850">
              {totalRemainingHours.toFixed(1)}h
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl surface-inset text-cyan-700 flex items-center justify-center font-bold border border-cyan-200/60">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 surface-base rounded-2xl shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Due &lt; 48 Hours
            </div>
            <div className={`text-2xl font-extrabold font-mono tabular-nums ${urgentCount > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
              {urgentCount} urgent
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl surface-inset text-amber-700 flex items-center justify-center font-bold border border-amber-200/60">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 surface-base rounded-2xl shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Completed Tasks
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700">
              {completedCount} done
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl surface-inset text-emerald-700 flex items-center justify-center font-bold border border-emerald-200/60">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. SEARCH, FILTERS & SORTING CONTROLS
         ========================================================================= */}
      <div className="p-4 surface-base rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by assignment title, syllabus notes, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs surface-inset rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
            />
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center text-xs surface-inset rounded-xl overflow-hidden shrink-0 p-1 font-bold border border-slate-200/80">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({tasks.length})
            </button>
          </div>
        </div>

        {/* Quick Priority Scanner Ribbon */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mr-1">
            Priority Scan:
          </span>
          <button
            type="button"
            onClick={() => setPriorityFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              priorityFilter === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'surface-inset text-slate-600 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            All Priorities
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === 'high_urgent' ? 'all' : 'high_urgent')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              priorityFilter === 'high_urgent' || priorityFilter === 'high' || priorityFilter === 'urgent'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/80'
            }`}
            title="Filter by High & Urgent priority"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                priorityFilter === 'high_urgent' || priorityFilter === 'high' || priorityFilter === 'urgent'
                  ? 'bg-white'
                  : 'bg-rose-500'
              }`}
            />
            <span>High / Urgent</span>
            <span
              className={`text-[10px] font-mono px-1 rounded ${
                priorityFilter === 'high_urgent' || priorityFilter === 'high' || priorityFilter === 'urgent'
                  ? 'bg-rose-700/80 text-white'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {highPriorityCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === 'medium' ? 'all' : 'medium')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              priorityFilter === 'medium'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80'
            }`}
            title="Filter by Medium priority"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                priorityFilter === 'medium' ? 'bg-white' : 'bg-amber-500'
              }`}
            />
            <span>Medium</span>
            <span
              className={`text-[10px] font-mono px-1 rounded ${
                priorityFilter === 'medium'
                  ? 'bg-amber-700/80 text-white'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {mediumPriorityCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === 'low' ? 'all' : 'low')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              priorityFilter === 'low'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80'
            }`}
            title="Filter by Low priority"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                priorityFilter === 'low' ? 'bg-white' : 'bg-emerald-500'
              }`}
            />
            <span>Low</span>
            <span
              className={`text-[10px] font-mono px-1 rounded ${
                priorityFilter === 'low'
                  ? 'bg-emerald-700/80 text-white'
                  : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {lowPriorityCount}
            </span>
          </button>
        </div>

        {/* Dropdown Filters & Sorter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Subject Filter */}
          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-1.5 surface-inset rounded-lg text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-slate-200/80"
            >
              <option value="all">All Courses ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-1.5 surface-inset rounded-lg text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-slate-200/80"
            >
              <option value="all">All Priorities</option>
              <option value="high_urgent">High & Urgent (Rose)</option>
              <option value="urgent">Urgent Only (Rose)</option>
              <option value="high">High Only (Rose)</option>
              <option value="medium">Medium Priority (Amber)</option>
              <option value="low">Low Priority (Emerald)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 surface-inset rounded-lg text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-slate-200/80"
            >
              <option value="all">All Types</option>
              <option value="assignment">Assignments</option>
              <option value="problem_set">Problem Sets</option>
              <option value="paper">Papers & Essays</option>
              <option value="reading">Readings</option>
              <option value="exam_prep">Exam Prep</option>
              <option value="project_milestone">Milestones</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-1.5 surface-inset rounded-lg text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-slate-200/80"
            >
              <option value="dueDateAsc">Sort: Deadline (Earliest)</option>
              <option value="dueDateDesc">Sort: Deadline (Latest)</option>
              <option value="priorityDesc">Sort: Highest Priority</option>
              <option value="hoursDesc">Sort: Most Hours Needed</option>
              <option value="hoursAsc">Sort: Quickest (Least Hours)</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. WORK-QUEUE LIST (ACTIONABLE TABLE-LIST DESIGN)
         ========================================================================= */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6 text-sky-600" />}
          title={tasks.length === 0 ? 'No tasks yet — add an assignment or exam' : 'No deliverables match these filters'}
          description={
            subjects.length === 0
              ? 'Add your first enrolled course before recording assignments, exams, readings, or project deadlines.'
              : tasks.length === 0
              ? 'Record your first deadline so StudyFlow can calculate workload and build a study plan.'
              : 'Try adjusting your course, status, priority, or search filters.'
          }
          actionLabel={subjects.length === 0 ? 'Add Your First Course' : tasks.length === 0 ? 'Add Assignment or Exam' : undefined}
          onAction={
            subjects.length === 0
              ? () => navigate('/subjects')
              : tasks.length === 0
              ? handleOpenAdd
              : undefined
          }
        />
      ) : (
        <div className="surface-base rounded-2xl shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {/* Command Center Column Header - establishes clean vertical alignment lanes */}
          <div className="hidden md:flex items-center justify-between px-5 py-2.5 bg-slate-50/90 border-b border-slate-200/90 text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-500 select-none">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="w-5 shrink-0" aria-hidden="true" />
              <span className="w-24 shrink-0 text-center">Priority Tier</span>
              <span className="w-20 shrink-0 text-center">Course</span>
              <span className="truncate">Deliverable & Syllabus Scope</span>
            </div>
            <div className="flex items-center gap-5 shrink-0 text-right">
              <span className="w-32 text-left">Deadline Horizon</span>
              <span className="w-28 text-right">Study Workload</span>
              <span className="w-20 text-center">Actions</span>
            </div>
          </div>

          {filteredTasks.map((task) => {
            const subject = subjects.find((s) => s.id === task.subjectId);
            const isCompleted = task.status === 'completed';
            const category = subject?.colorKey || 'cs';

            const dueDateObj = new Date(task.dueDate);
            const daysLeft = Math.ceil(
              (dueDateObj.getTime() - Date.now()) / (1000 * 3600 * 24)
            );
            const isUrgent = daysLeft <= 2 && daysLeft >= 0 && !isCompleted;
            const isOverdue = daysLeft < 0 && !isCompleted;

            const progressPercent = Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  ((task.estimatedHours - task.remainingHours) / (task.estimatedHours || 1)) * 100
                )
              )
            );

            // Priority border color & subtle hover styles
            const priorityStyles = isCompleted
              ? {
                  border: 'border-l-slate-300',
                  hoverBg: 'hover:bg-slate-100/60',
                  hoverBorder: 'hover:border-l-slate-400',
                  bg: 'bg-slate-50/60 opacity-80',
                }
              : task.priority === 'urgent'
              ? {
                  border: 'border-l-rose-600',
                  hoverBg: 'hover:bg-rose-50/30',
                  hoverBorder: 'hover:border-l-rose-700',
                  bg: isOverdue ? 'bg-rose-50/20' : 'bg-white',
                }
              : task.priority === 'high'
              ? {
                  border: 'border-l-rose-500',
                  hoverBg: 'hover:bg-rose-50/25',
                  hoverBorder: 'hover:border-l-rose-600',
                  bg: isOverdue ? 'bg-rose-50/15' : 'bg-white',
                }
              : task.priority === 'medium'
              ? {
                  border: 'border-l-amber-500',
                  hoverBg: 'hover:bg-amber-50/25',
                  hoverBorder: 'hover:border-l-amber-600',
                  bg: isUrgent ? 'bg-amber-50/15' : 'bg-white',
                }
              : {
                  border: 'border-l-emerald-500',
                  hoverBg: 'hover:bg-emerald-50/20',
                  hoverBorder: 'hover:border-l-emerald-600',
                  bg: 'bg-white',
                };

            return (
              <div
                key={task.id}
                className={`group p-4 sm:px-5 sm:py-4 transition-all duration-150 ease-out border-l-4 sm:border-l-[5px] hover:shadow-2xs relative hover:z-1 ${priorityStyles.bg} ${priorityStyles.border} ${priorityStyles.hoverBg} ${priorityStyles.hoverBorder}`}
              >
                {/* Desktop Grid Layout (md and up) */}
                <div className="hidden md:flex items-center justify-between gap-4">
                  {/* Left: Checkbox + Aligned Priority + Aligned Course + Title & Details */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleTaskCompleted(task.id)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50/50'
                      }`}
                      aria-label={isCompleted ? 'Mark task incomplete' : 'Mark task complete'}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Dedicated Aligned Priority Indicator Lane */}
                    <div className="w-24 shrink-0 flex items-center justify-center">
                      <PriorityBadge
                        priority={task.priority}
                        size="sm"
                        showCode
                        className="w-full justify-center font-mono shadow-2xs"
                      />
                    </div>

                    {/* Dedicated Aligned Course Badge Lane */}
                    <div className="w-20 shrink-0 flex items-center justify-center">
                      <Badge
                        variant="subject"
                        category={category}
                        className="w-full justify-center font-mono text-[11px] font-bold"
                      >
                        {subject?.code || 'Course'}
                      </Badge>
                    </div>

                    {/* Deliverable Title & Scope (Flex-1) */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className={`text-left text-sm font-bold tracking-tight leading-snug cursor-pointer group-hover:text-sky-900 transition-colors block truncate w-full ${
                          isCompleted ? 'line-through text-slate-400 font-medium' : 'text-slate-900'
                        }`}
                        title="Click to view assignment specifications and subtasks"
                      >
                        {task.title}
                      </button>

                      {/* Syllabus notes preview or checkpoints snippet */}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {task.notes && (
                          <span className="truncate max-w-sm font-medium text-slate-500">
                            {task.notes}
                          </span>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="font-mono text-[10px] text-slate-500 shrink-0 font-bold bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/80">
                            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} checkpoints
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Aligned Deadline + Workload + Actions */}
                  <div className="flex items-center gap-5 shrink-0 text-right">
                    {/* Aligned Deadline Horizon Lane */}
                    <div className="w-32 shrink-0 text-left space-y-0.5">
                      <div
                        className={`font-mono text-xs tabular-nums font-bold flex items-center gap-1.5 ${
                          isOverdue
                            ? 'text-rose-700'
                            : isUrgent
                            ? 'text-amber-800'
                            : 'text-slate-600'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {dueDateObj.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isOverdue ? (
                          <span className="font-mono text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            Overdue
                          </span>
                        ) : isUrgent ? (
                          <span className="font-mono text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            {daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-slate-400 capitalize">
                            {task.type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Aligned Workload Lane */}
                    <div className="w-28 shrink-0 text-right space-y-1">
                      <div className="font-mono tabular-nums text-xs font-bold text-slate-900 surface-inset px-2.5 py-1 rounded-lg border border-slate-200/90 inline-block shadow-2xs">
                        {isCompleted ? 'Finished' : `${task.remainingHours.toFixed(1)}h left`}
                      </div>

                      <div className="w-20 h-1.5 rounded-full surface-inset overflow-hidden ml-auto border border-slate-200/80">
                        <div
                          className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-sky-500'}`}
                          style={{ width: `${isCompleted ? 100 : progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Aligned Action Controls Lane */}
                    <div className="w-20 shrink-0 flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(task)}
                        className="text-slate-400 hover:text-sky-600 p-1.5 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Edit assignment"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View details"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile / Compact Responsive View (< md) */}
                <div className="md:hidden space-y-3">
                  {/* Top Meta Strip: Priority + Course + Deadline */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} size="xs" showCode />
                      <Badge variant="subject" category={category} className="font-mono text-[10px]">
                        {subject?.code || 'Course'}
                      </Badge>
                    </div>

                    <div
                      className={`font-mono text-[11px] tabular-nums font-bold flex items-center gap-1 ${
                        isOverdue
                          ? 'text-rose-700'
                          : isUrgent
                          ? 'text-amber-800'
                          : 'text-slate-600'
                      }`}
                    >
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {dueDateObj.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {isOverdue && (
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1 rounded font-extrabold">
                          Overdue
                        </span>
                      )}
                      {isUrgent && (
                        <span className="text-[9px] bg-amber-100 text-amber-900 px-1 rounded font-extrabold">
                          {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Checkbox + Title */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTaskCompleted(task.id)}
                      className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'border-slate-300 hover:border-sky-500 bg-white'
                      }`}
                      aria-label={isCompleted ? 'Mark task incomplete' : 'Mark task complete'}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className={`text-left text-sm font-bold tracking-tight leading-snug cursor-pointer block ${
                          isCompleted ? 'line-through text-slate-400 font-medium' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </button>

                      {task.notes && (
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Workload & Quick Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-slate-900 font-bold surface-inset px-2 py-0.5 rounded text-[11px]">
                        {isCompleted ? 'Finished' : `${task.remainingHours.toFixed(1)}h left`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        of {task.estimatedHours.toFixed(1)}h
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(task)}
                        className="text-slate-400 hover:text-sky-600 p-1.5 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          5. MODALS
         ========================================================================= */}
      {/* Add / Edit Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        subjects={subjects}
        taskToEdit={editingTask}
        onSave={handleSaveTask}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        subject={subjects.find((s) => s.id === selectedTask?.subjectId)}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={(task) => {
          setSelectedTask(null);
          handleOpenEdit(task);
        }}
        onDelete={(taskId) => {
          handleDeleteTask(taskId);
          setSelectedTask(null);
        }}
        onToggleComplete={(taskId) => {
          toggleTaskCompleted(taskId);
          // Update selected task reference
          setSelectedTask((prev) =>
            prev && prev.id === taskId
              ? {
                  ...prev,
                  status: prev.status === 'completed' ? 'in_progress' : 'completed',
                  remainingHours: prev.status === 'completed' ? prev.estimatedHours : 0,
                }
              : prev
          );
        }}
        onToggleSubtask={(taskId, subtaskId) => {
          handleToggleSubtask(taskId, subtaskId);
          setSelectedTask((prev) => {
            if (!prev || prev.id !== taskId || !prev.subtasks) return prev;
            return {
              ...prev,
              subtasks: prev.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              ),
            };
          });
        }}
      />
    </div>
  );
}
