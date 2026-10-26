/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  BookOpen,
  Clock,
  User,
  MapPin,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { CatalogCourse, Subject, Task } from '../../types';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';
import { SubjectModal } from '../../components/subjects/SubjectModal';
import { SubjectDetailModal } from '../../components/subjects/SubjectDetailModal';
import { TaskModal } from '../../components/tasks/TaskModal';
import { TaskDetailModal } from '../../components/tasks/TaskDetailModal';
import { Modal } from '../../components/ui/Modal';
import { subjectService } from '../../services/subjectService';

export function SubjectsPage() {
  const { user } = useAuth();
  const {
    subjects,
    tasks,
    addSubject,
    updateSubject,
    deleteSubject,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompleted,
    reopenTaskAcceptance,
  } = usePlanner();

  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [selectedCatalogCourseId, setSelectedCatalogCourseId] = useState('');
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Quick Task Creation for a Subject
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [preselectedSubjectId, setPreselectedSubjectId] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Course aggregate calculations
  const totalCredits = subjects.reduce((acc, s) => acc + s.credits, 0);
  const totalWeeklyTargetHours = subjects.reduce((acc, s) => acc + s.weeklyTargetHours, 0);
  const totalActiveTasks = tasks.filter((t) => t.status !== 'completed').length;
  const totalRemainingHours = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((acc, t) => acc + t.remainingHours, 0);

  const handleOpenAdd = async () => {
    setEditingSubject(null);
    setIsCatalogLoading(true);
    setIsSubjectModalOpen(true);
    try {
      const courses = await subjectService.catalog();
      const enrolledIds = new Set(subjects.map((subject) => subject.catalogCourseId));
      const available = courses.filter((course) => !enrolledIds.has(course.id));
      setCatalog(available);
      setSelectedCatalogCourseId(available[0]?.id || '');
    } finally {
      setIsCatalogLoading(false);
    }
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (subjectData: Omit<Subject, 'id'>, id?: string) => {
    if (id) {
      const permittedUpdates = user?.role === 'professor'
        ? {
            instructor: subjectData.instructor,
            colorKey: subjectData.colorKey,
            weeklyTargetHours: subjectData.weeklyTargetHours,
            classroom: subjectData.classroom,
            classSchedule: subjectData.classSchedule,
            officeHours: subjectData.officeHours,
          }
        : {
            colorKey: subjectData.colorKey,
            weeklyTargetHours: subjectData.weeklyTargetHours,
          };
      updateSubject(id, permittedUpdates);
    }
  };

  const handleTakeSubject = async () => {
    if (!selectedCatalogCourseId) return;
    const created = await addSubject({ catalogCourseId: selectedCatalogCourseId });
    if (created) setIsSubjectModalOpen(false);
  };

  const handleAddTaskForSubject = (subId: string) => {
    setPreselectedSubjectId(subId);
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task?.subtasks) return;
    updateTask(taskId, {
      subtasks: task.subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
      ),
    });
  };

  const handleDeleteSubject = (subjectId: string) => {
    const subject = subjects.find((item) => item.id === subjectId);
    const relatedTaskCount = tasks.filter((task) => task.subjectId === subjectId).length;
    if (!window.confirm(
      `Drop ${subject?.code || 'this course'}? This also removes ${relatedTaskCount} related task${relatedTaskCount === 1 ? '' : 's'} and their study sessions.`
    )) return;
    deleteSubject(subjectId);
  };

  return (
    <div className="space-y-7 max-w-[1440px] w-full pb-16 font-sans">
      {/* =========================================================================
          1. HEADER & ENROLLMENT SUMMARY
         ========================================================================= */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-1">
            Curriculum Structure · {user?.term || 'Current Term'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {user?.role === 'professor' ? 'Faculty Load & Subjects' : 'Enrolled Courses & Subjects'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl font-medium leading-relaxed">
            {user?.role === 'professor'
              ? 'Manage faculty course logistics and weekly planning targets.'
              : 'Manage weekly study targets for subjects approved in the institutional catalog.'}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          icon={<Plus className="w-4 h-4" />}
        >
          {user?.role === 'professor' ? 'Add Faculty Load' : 'Take Subject'}
        </Button>
      </div>

      {/* =========================================================================
          2. SEMESTER ACADEMIC METRIC WELLS
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 surface-base rounded-2xl shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Enrolled Courses
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
              {subjects.length} courses
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl surface-inset text-sky-700 flex items-center justify-center font-bold border border-sky-200/60">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 surface-base rounded-2xl shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Credit Hours
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-sky-850">
              {totalCredits} credits
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl surface-inset text-cyan-700 flex items-center justify-center font-bold border border-cyan-200/60">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 surface-base rounded-2xl shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Target Study Hours
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
              {totalWeeklyTargetHours}h / wk
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl surface-inset text-emerald-700 flex items-center justify-center font-bold border border-emerald-200/60">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 surface-base rounded-2xl shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Active Deliverables
            </div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-850">
              {totalActiveTasks} tasks
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl surface-inset text-amber-700 flex items-center justify-center font-bold border border-amber-200/60">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. COURSE CATALOG LIST / GRID (COLLEGIATE BINDER STYLE)
         ========================================================================= */}
      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6 text-sky-600" />}
          title={user?.role === 'professor' ? 'Add your first faculty course' : 'Take your first subject'}
          description="Choose an administrator-approved course from the institutional curriculum catalog."
          actionLabel={user?.role === 'professor' ? 'Add Faculty Load' : 'Take Subject'}
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subjects.map((sub) => {
            const courseTasks = tasks.filter((t) => t.subjectId === sub.id && t.status !== 'completed');
            const completedCourseTasks = tasks.filter((t) => t.subjectId === sub.id && t.status === 'completed');
            const remainingHours = courseTasks.reduce((acc, t) => acc + t.remainingHours, 0);
            const style = SUBJECT_CATEGORY_STYLES[sub.colorKey];

            return (
              <div
                key={sub.id}
                className="p-5 sm:p-6 surface-binder rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative space-y-4 border-l-4"
                style={{ borderLeftColor: style.dot }}
              >
                {/* Category Top Accent Ribbon */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${style.accentBar}`} />

                <div className="space-y-3 pt-1">
                  {/* Top row: Category Badge, Credits & Action Menu */}
                  <div className="flex items-center justify-between">
                    <Badge variant="subject" category={sub.colorKey}>
                      {sub.code}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono tabular-nums font-extrabold text-slate-800 surface-inset px-2.5 py-0.5 rounded-md border border-slate-200/60">
                        {sub.credits} credits
                      </span>
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="text-slate-400 hover:text-sky-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit course"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Course Name & Instructor */}
                  <div>
                    <button
                      onClick={() => setSelectedSubject(sub)}
                      className="text-left text-lg font-extrabold text-slate-900 leading-snug hover:text-sky-700 transition-colors block cursor-pointer"
                    >
                      {sub.name}
                    </button>
                    <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sub.instructor}</span>
                    </div>
                  </div>

                  {/* Logistics: Classroom Location & Office Hours */}
                  <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 surface-inset p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{sub.classroom || 'Main Quad Lecture Hall'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{sub.officeHours || 'By appointment'}</span>
                    </div>
                  </div>

                  {/* Active Course Deliverables snippet */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <span>Upcoming Deliverables ({courseTasks.length})</span>
                      <span className="font-mono tabular-nums text-sky-850 font-bold">
                        {remainingHours.toFixed(1)}h required
                      </span>
                    </div>

                    {courseTasks.length > 0 ? (
                      <div className="space-y-1">
                        {courseTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className="text-xs text-slate-800 flex items-center justify-between gap-2 surface-inset px-2.5 py-1.5 rounded-lg border border-slate-200/70"
                          >
                            <span className="truncate font-semibold">{t.title}</span>
                            <span className="font-mono tabular-nums text-sky-850 text-[11px] font-bold shrink-0">
                              {t.remainingHours.toFixed(1)}h
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic surface-inset p-2 rounded-lg border border-slate-200/60">
                        No active assignments pending for this course.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Study Target, Detail trigger & Delete */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Study Target: </span>
                    <span className="font-mono tabular-nums font-extrabold text-slate-900">
                      {sub.weeklyTargetHours}h / week
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedSubject(sub)}
                      icon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      View Course
                    </Button>

                    <button
                      onClick={() => handleDeleteSubject(sub.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Drop course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          4. MODALS
         ========================================================================= */}
      {/* Subject Enrollment / Edit Modal */}
      <Modal
        isOpen={isSubjectModalOpen && !editingSubject}
        onClose={() => setIsSubjectModalOpen(false)}
        title={user?.role === 'professor' ? 'Add Faculty Load' : 'Take Subject'}
        description="Only courses created by a campus administrator are available here."
        maxWidth="lg"
        icon={<BookOpen className="w-4 h-4" />}
      >
        <div className="space-y-4">
          {isCatalogLoading ? (
            <p className="text-sm text-slate-500">Loading institutional catalog...</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-slate-600">No additional active courses are available. Ask an administrator to add one to the curriculum catalog.</p>
          ) : (
            <select
              value={selectedCatalogCourseId}
              onChange={(event) => setSelectedCatalogCourseId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {catalog.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title} ({course.credits} credits)
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={() => setIsSubjectModalOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!selectedCatalogCourseId || isCatalogLoading} onClick={handleTakeSubject}>
              {user?.role === 'professor' ? 'Add to Faculty Load' : 'Take Subject'}
            </Button>
          </div>
        </div>
      </Modal>

      <SubjectModal
        isOpen={isSubjectModalOpen && !!editingSubject}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
        }}
        subjectToEdit={editingSubject}
        onSave={handleSaveSubject}
      />

      {/* Subject Detail Modal */}
      <SubjectDetailModal
        subject={selectedSubject}
        tasks={tasks}
        isOpen={!!selectedSubject}
        onClose={() => setSelectedSubject(null)}
        onEdit={(sub) => {
          setSelectedSubject(null);
          handleOpenEdit(sub);
        }}
        onDelete={(subId) => {
          handleDeleteSubject(subId);
          setSelectedSubject(null);
        }}
        onAddTaskForSubject={(subId) => {
          handleAddTaskForSubject(subId);
        }}
        onSelectTask={setSelectedTask}
      />

      {/* Task Creation Modal Pre-linked to Subject */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        subjects={subjects}
        taskToEdit={editingTask}
        defaultSubjectId={preselectedSubjectId}
        onSave={(taskData, id) => {
          if (id) updateTask(id, taskData);
          else addTask(taskData);
        }}
      />

      <TaskDetailModal
        task={selectedTask}
        subject={subjects.find((subject) => subject.id === selectedTask?.subjectId)}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={(task) => {
          setEditingTask(task);
          setPreselectedSubjectId(task.subjectId);
          setIsTaskModalOpen(true);
        }}
        onDelete={(taskId) => {
          if (window.confirm('Delete this assignment? This cannot be undone.')) {
            deleteTask(taskId);
          }
        }}
        onToggleComplete={toggleTaskCompleted}
        onReopenAcceptance={reopenTaskAcceptance}
        onToggleSubtask={handleToggleSubtask}
      />
    </div>
  );
}
