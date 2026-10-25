/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Bell,
  Calendar,
  Trash2,
  Edit2,
  Pin,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Filter,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Announcement } from '../../types';

export function AnnouncementsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = usePlanner();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'important' | 'normal'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'critical'>('normal');
  const [targetCohort, setTargetCohort] = useState<'all' | 'stem' | 'humanities' | 'undergrad'>('all');
  const [pinned, setPinned] = useState(false);
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
    setPriority('normal');
    setTargetCohort('all');
    setPinned(false);
    setStatus('published');
    setValidationError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setPriority(ann.priority);
    setTargetCohort(ann.targetCohort);
    setPinned(Boolean(ann.pinned));
    setStatus(ann.status === 'draft' ? 'draft' : 'published');
    setValidationError(null);
    setIsModalOpen(true);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Announcement title cannot be empty.');
      return;
    }
    if (!content.trim()) {
      setValidationError('Announcement content body is required.');
      return;
    }

    if (editingAnnouncement) {
      const succeeded = await updateAnnouncement(editingAnnouncement.id, {
        title: title.trim(),
        content: content.trim(),
        priority,
        targetCohort,
        pinned,
        status,
      });
      if (!succeeded) return;
    } else {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        author: user?.name || 'Department Dean',
        priority,
        targetCohort,
        pinned,
        status,
      };
      const succeeded = await addAnnouncement(payload);
      if (!succeeded) return;
    }

    setIsModalOpen(false);
  };

  // Quick Action: Toggle Publish / Draft
  const handleTogglePublish = async (ann: Announcement) => {
    const nextStatus = ann.status === 'draft' ? 'published' : 'draft';
    await updateAnnouncement(ann.id, { status: nextStatus });
  };

  // Quick Action: Toggle Pinned
  const handleTogglePin = async (ann: Announcement) => {
    await updateAnnouncement(ann.id, { pinned: !ann.pinned });
  };

  // Quick Action: Delete
  const handleDelete = async (ann: Announcement) => {
    if (!window.confirm(`Delete announcement "${ann.title}"? This cannot be undone.`)) return;
    await deleteAnnouncement(ann.id);
  };

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      const annStatus = ann.status || 'published';
      const matchesSearch =
        search.trim() === '' ||
        ann.title.toLowerCase().includes(search.toLowerCase()) ||
        ann.content.toLowerCase().includes(search.toLowerCase()) ||
        ann.author.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || annStatus === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ann.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [announcements, search, statusFilter, priorityFilter]);

  // Cohort Stats
  const publishedCount = announcements.filter((a) => (a.status || 'published') === 'published').length;
  const draftCount = announcements.filter((a) => a.status === 'draft').length;
  const criticalCount = announcements.filter((a) => a.priority === 'critical').length;

  return (
    <div className="space-y-6 max-w-[1440px] w-full pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              Campus Broadcast System
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {publishedCount} Published · {draftCount} Drafts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Institutional Announcements
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Broadcast official notices, library operating schedules, registration milestones, and critical campus alerts to student dashboard feeds.
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
            Compose Broadcast
          </Button>
        </div>
      </div>

      {/* Broadcast Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Active Broadcasts</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            {publishedCount}
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Unpublished Drafts</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            {draftCount}
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Critical Alerts</div>
          <div className="text-xl font-extrabold font-mono text-rose-800 tabular-nums">
            {criticalCount}
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Audience Reach</div>
          <div className="text-xl font-extrabold font-mono text-sky-800 tabular-nums">
            Cohort Filtered
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="surface-base p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search broadcasts by title, content, or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts Only</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="important">Important</option>
            <option value="normal">Normal</option>
          </select>

          {(search || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="text-xs text-sky-700 hover:text-sky-850 font-bold px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Announcements List Container */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span>Broadcast Feed & History</span>
          <span className="font-mono text-slate-400">({filteredAnnouncements.length})</span>
        </h2>

        {filteredAnnouncements.length === 0 ? (
          <div className="surface-base rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900">No broadcasts found</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No institutional notices match your search filters. Compose a new campus announcement to update student dashboards.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              Compose First Broadcast
            </Button>
          </div>
        ) : (
          <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {filteredAnnouncements.map((ann) => {
              const isDraft = ann.status === 'draft';
              return (
                <div
                  key={ann.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${
                    isDraft ? 'bg-slate-50/50' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 shadow-2xs ${
                        ann.priority === 'critical'
                          ? 'bg-rose-50 border border-rose-200 text-rose-700'
                          : ann.priority === 'important'
                          ? 'bg-amber-50 border border-amber-200 text-amber-700'
                          : 'bg-sky-50 border border-sky-100 text-sky-700'
                      }`}
                    >
                      <Megaphone className="w-4 h-4" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>

                        {ann.pinned && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-extrabold border border-sky-200 font-mono uppercase tracking-wider flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" />
                            <span>Pinned</span>
                          </span>
                        )}

                        {ann.priority === 'critical' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-extrabold border border-rose-200 font-mono uppercase tracking-wider">
                            Critical Alert
                          </span>
                        )}
                        {ann.priority === 'important' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-extrabold border border-amber-200 font-mono uppercase tracking-wider">
                            Important
                          </span>
                        )}

                        {isDraft && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold border border-slate-300 font-mono uppercase tracking-wider">
                            Draft (Unpublished)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {ann.content}
                      </p>

                      <div className="text-[11px] text-slate-400 font-medium pt-1 flex flex-wrap items-center gap-2">
                        <span>Broadcast by {ann.author}</span>
                        <span>·</span>
                        <span className="uppercase">Audience: {ann.targetCohort}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">{ann.publishedAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                    <button
                      onClick={() => handleTogglePin(ann)}
                      className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        ann.pinned
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'
                      }`}
                      title={ann.pinned ? 'Unpin Announcement' : 'Pin to Top'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleTogglePublish(ann)}
                      className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        isDraft
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                      title={isDraft ? 'Publish to Student Feeds' : 'Unpublish to Draft'}
                    >
                      {isDraft ? <Eye className="w-3.5 h-3.5 text-amber-800" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(ann)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-sky-700 hover:border-sky-200 hover:bg-sky-50 transition-all cursor-pointer"
                      title="Edit Announcement"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(ann)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAnnouncement ? 'Edit Campus Announcement' : 'Compose Campus Announcement'}
        description="Broadcast official announcements and policy updates to enrolled students."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          <Input
            label="Announcement Title"
            placeholder="e.g. Science Library 24-Hour Study Rooms Open for Midterms"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              options={[
                { label: 'Normal Notification', value: 'normal' },
                { label: 'Important Notice', value: 'important' },
                { label: 'Critical Campus Alert', value: 'critical' },
              ]}
            />

            <Select
              label="Target Student Audience"
              value={targetCohort}
              onChange={(e) => setTargetCohort(e.target.value as any)}
              options={[
                { label: 'All Students & Faculty', value: 'all' },
                { label: 'STEM & Engineering Students', value: 'stem' },
                { label: 'Humanities & Social Sciences', value: 'humanities' },
                { label: 'Undergraduate Cohort Only', value: 'undergrad' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Notice Content Body
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="State the academic policy, room availability hours, or deadline details clearly..."
              className="w-full p-3 text-xs bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Select
              label="Publication State"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { label: 'Publish Immediately', value: 'published' },
                { label: 'Save as Draft', value: 'draft' },
              ]}
            />

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="pin_checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="pin_checkbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                Pin to top of student feeds
              </label>
            </div>
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
              {editingAnnouncement
                ? 'Save Changes'
                : status === 'draft'
                ? 'Save Draft'
                : 'Broadcast Announcement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
