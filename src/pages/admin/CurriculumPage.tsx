/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit2,
  Clock,
  Award,
  Layers,
  GraduationCap,
  Users,
  Info,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { CatalogCourse } from '../../types';
import { INITIAL_CATALOG_COURSES } from '../../data/mockData';

export function CurriculumPage() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<CatalogCourse[]>(INITIAL_CATALOG_COURSES);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CatalogCourse | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [credits, setCredits] = useState('4');
  const [instructor, setInstructor] = useState('');
  const [expectedHours, setExpectedHours] = useState('8.0');
  const [description, setDescription] = useState('');
  const [syllabusOverview, setSyllabusOverview] = useState('');

  // Open Create
  const handleOpenCreate = () => {
    setEditingCourse(null);
    setCode('');
    setTitle('');
    setDepartment('Computer Science');
    setCredits('4');
    setInstructor('');
    setExpectedHours('8.0');
    setDescription('');
    setSyllabusOverview('');
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (course: CatalogCourse) => {
    setEditingCourse(course);
    setCode(course.code);
    setTitle(course.title);
    setDepartment(course.department);
    setCredits(String(course.credits));
    setInstructor(course.instructor);
    setExpectedHours(String(course.expectedWeeklyHours));
    setDescription(course.description || '');
    setSyllabusOverview(course.syllabusOverview || '');
    setIsModalOpen(true);
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      showToast('Course code and title are required', 'error');
      return;
    }

    if (editingCourse) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === editingCourse.id
            ? {
                ...c,
                code: code.trim().toUpperCase(),
                title: title.trim(),
                department,
                credits: parseInt(credits, 10) || 3,
                instructor: instructor.trim() || 'Staff Faculty',
                expectedWeeklyHours: parseFloat(expectedHours) || 6.0,
                description: description.trim(),
                syllabusOverview: syllabusOverview.trim(),
              }
            : c
        )
      );
      showToast(`Updated master syllabus for ${code.trim().toUpperCase()}`, 'success');
    } else {
      const newCourse: CatalogCourse = {
        id: `cat_${Date.now()}`,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        department,
        credits: parseInt(credits, 10) || 3,
        instructor: instructor.trim() || 'Staff Faculty',
        expectedWeeklyHours: parseFloat(expectedHours) || 6.0,
        description: description.trim(),
        syllabusOverview: syllabusOverview.trim(),
        activeEnrolledCount: 0,
      };
      setCourses([newCourse, ...courses]);
      showToast(`Added ${newCourse.code} to institutional curriculum`, 'success');
    }

    setIsModalOpen(false);
  };

  // Delete Course
  const handleDeleteCourse = (targetCourse: CatalogCourse) => {
    setCourses((prev) => prev.filter((c) => c.id !== targetCourse.id));
    showToast(`Removed ${targetCourse.code} from institutional catalog`, 'info');
  };

  // Departments List
  const departments = useMemo(() => {
    const set = new Set(courses.map((c) => c.department));
    return Array.from(set).sort();
  }, [courses]);

  // Filtered List
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        search.trim() === '' ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.department.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor.toLowerCase().includes(search.toLowerCase());

      const matchesDept = departmentFilter === 'all' || c.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [courses, search, departmentFilter]);

  // Total Credit hours
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              Curriculum Administration
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {courses.length} Master Courses
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Master Curriculum Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Manage institutional courses, credit standards, and baseline study expectations across academic departments. (Distinct from personal student schedules).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/audit">
            <Button variant="secondary" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}>
              Audit Trail
            </Button>
          </Link>
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Catalog Course
          </Button>
        </div>
      </div>

      {/* Institutional Curriculum Overview Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Approved Courses</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            {courses.length}
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Academic Departments</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            {departments.length}
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Total Credit Hours</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            {totalCredits} cr
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Catalog Pacing Model</div>
          <div className="text-xl font-extrabold font-mono text-sky-800 tabular-nums">
            2.0h / Credit
          </div>
        </div>
      </div>

      {/* Distinct Notice: Global Catalog vs Student Personal Subjects */}
      <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 flex items-start gap-3 shadow-2xs text-xs">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-slate-700 leading-relaxed font-medium">
          <strong className="text-sky-950 font-bold">Institutional Master Catalog Notice:</strong>{' '}
          Courses configured here define the institutional baseline (code, faculty lead, credit value, and benchmark weekly study hours) referenced when students enroll or advisors construct cohort syllabi. Student personal courses in the student view maintain separate individual color codes and room assignments.
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="surface-base p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter catalog by course code, title, lead faculty, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {(search || departmentFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setDepartmentFilter('all');
              }}
              className="text-xs text-sky-700 hover:text-sky-850 font-bold px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Courses Catalog Table */}
      <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {filteredCourses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900">No catalog courses match</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No institutional courses found matching your query. Clear filters or add a new course syllabus.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setDepartmentFilter('all');
              }}
            >
              Reset Filter
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Course Code & Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Faculty Lead</th>
                  <th className="py-3 px-4 text-center">Credit Weight</th>
                  <th className="py-3 px-4 text-center">Expected Study</th>
                  <th className="py-3 px-4 text-center">Enrolled Cohort</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Code & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-[12px] text-sky-850 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/80">
                          {c.code}
                        </span>
                        <div className="font-bold text-slate-900 text-[13px]">{c.title}</div>
                      </div>
                      {c.description && (
                        <p className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-1 max-w-md">
                          {c.description}
                        </p>
                      )}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {c.department}
                    </td>

                    {/* Instructor */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {c.instructor}
                    </td>

                    {/* Credits */}
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-900 font-bold">
                      {c.credits} cr
                    </td>

                    {/* Expected Study */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono tabular-nums text-sky-800 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200/70">
                        {c.expectedWeeklyHours}h / wk
                      </span>
                    </td>

                    {/* Active Enrolled */}
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-600 font-bold">
                      {c.activeEnrolledCount ? `${c.activeEnrolledCount} students` : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Course Syllabus"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Catalog Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Course Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? `Edit Course: ${editingCourse.code}` : 'Add Master Catalog Course'}
        description="Configure institutional curriculum standards, credit weighting, and study allocations."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Course Code"
              placeholder="e.g. CS 301"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
            />
            <div className="col-span-2">
              <Input
                label="Course Title"
                placeholder="e.g. Operating Systems Principles"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Academic Department"
              placeholder="e.g. Computer Science"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
            <Input
              label="Lead Faculty / Chair"
              placeholder="e.g. Dr. Barbara Liskov"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Credit Weight (cr)"
              type="number"
              min="1"
              max="6"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              required
            />
            <Input
              label="Expected Study Hours/Wk"
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={expectedHours}
              onChange={(e) => setExpectedHours(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Course Catalog Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of core curriculum objectives and prerequisite expectations..."
              className="w-full p-2.5 text-xs bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Syllabus Deliverables Overview
            </label>
            <textarea
              rows={2}
              value={syllabusOverview}
              onChange={(e) => setSyllabusOverview(e.target.value)}
              placeholder="e.g. 10 weekly problem sets, 2 midterm exams, 1 final paper..."
              className="w-full p-2.5 text-xs bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingCourse ? 'Save Course Syllabus' : 'Save Master Course'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
