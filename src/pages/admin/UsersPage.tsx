/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  UserCheck,
  Shield,
  Filter,
  User,
  GraduationCap,
  Briefcase,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Mail,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { UserRole, DirectoryUser } from '../../types';
import { adminService } from '../../services/adminService';

export function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('StudyFlow2026!#');
  const [role, setRole] = useState<UserRole>('student');
  const [major, setMajor] = useState('');
  const [status, setStatus] = useState<'Active' | 'Review' | 'Suspended'>('Active');
  const [enrolledCourses, setEnrolledCourses] = useState('4');

  // Load real users from PostgreSQL
  const loadUsersFromDb = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getUsers({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 25,
      });
      if (res && res.success) {
        // Map database records into DirectoryUser format
        const dbUsers: DirectoryUser[] = res.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role.toLowerCase() as UserRole,
          major: u.major || 'General Studies',
          enrolledCourses: u.enrolledCourses || 0,
          status: 'Active',
          lastActive: 'Recently active',
          joinedDate: new Date(u.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        }));
        setUsers(dbUsers);
        setTotalPages(res.meta?.totalPages || 1);
        setTotalUsers(res.meta?.total || 0);
      }
    } catch (err: any) {
      setUsers([]);
      showToast(err.message || 'Failed to load the user directory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadUsersFromDb, 250);
    return () => clearTimeout(timer);
  }, [roleFilter, search, page]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, search]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('StudyFlow2026!#');
    setRole('student');
    setMajor('');
    setStatus('Active');
    setEnrolledCourses('4');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: DirectoryUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setMajor(user.major);
    setStatus(user.status);
    setEnrolledCourses(String(user.enrolledCourses));
    setIsModalOpen(true);
  };

  // Save (Create or Edit with backend audit logging)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Name and university email are required', 'error');
      return;
    }

    if (editingUser) {
      try {
        const response = await adminService.updateUser(editingUser.id, {
          role,
          name: name.trim(),
          major: major.trim() || 'General Studies',
        });
        const saved = response.data;

        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: saved.name,
                  role: saved.role,
                  major: saved.major,
                }
              : u
          )
        );
        showToast(`Updated account and recorded audit log for ${name.trim()}`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to update user role or status', 'error');
        return;
      }
    } else {
      try {
        await adminService.provisionUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          major: major.trim() || 'General Studies',
          password: password.trim() || 'StudyFlow2026!#',
        });
        showToast(`Provisioned account for ${name.trim()} and recorded audit log`, 'success');
        await loadUsersFromDb();
      } catch (err: any) {
        showToast(err.message || 'Failed to provision account', 'error');
        return;
      }
    }

    setIsModalOpen(false);
  };

  // Account Status Toggle Action
  const handleToggleStatus = async (_targetUser: DirectoryUser) => {
    showToast('Account suspension is unavailable until server-side account status is supported.', 'error');
  };

  // Delete User Action
  const handleDeleteUser = async (targetUser: DirectoryUser) => {
    if (!window.confirm(`Are you sure you want to permanently delete the account for ${targetUser.name} (${targetUser.email})?`)) {
      return;
    }
    try {
      await adminService.deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setTotalUsers((prev) => Math.max(0, prev - 1));
      showToast(`Permanently deleted user account for ${targetUser.name}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error');
    }
  };

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        search.trim() === '' ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.major.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // Cohort summary counts
  const studentCount = users.filter((u) => u.role === 'student').length;
  const advisorCount = users.filter((u) => u.role === 'advisor').length;
  const taCount = users.filter((u) => u.role === 'ta').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6 max-w-[1440px] w-full pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              User Directory & Cohorts
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {totalUsers} Registered Accounts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            User & Student Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl font-medium leading-relaxed">
            Manage student cohorts, teaching assistants, faculty advisors, and departmental permissions. Role adjustments are audited in PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/audit">
            <Button variant="secondary" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}>
              Audit Logs
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            + Provision Account
          </Button>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <span className="font-mono text-slate-600">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Cohort Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Enrolled Undergrads</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            {studentCount}
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Teaching Assistants</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            {taCount}
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Faculty Advisors</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">
            {advisorCount}
          </div>
        </div>
        <div className="surface-base p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-slate-500 font-medium text-[11px]">Campus Administrators</div>
          <div className="text-xl font-extrabold font-mono text-amber-800 tabular-nums">
            {adminCount}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="surface-base p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, university email, or major/department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="ta">Teaching Assistants</option>
            <option value="advisor">Faculty Advisors</option>
            <option value="admin">Administrators</option>
          </select>

          <button
            onClick={() => loadUsersFromDb()}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
            title="Reload from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student / User</th>
                <th className="py-3.5 px-4 w-44">Role & Privileges</th>
                <th className="py-3.5 px-4">Department / Major</th>
                <th className="py-3.5 px-3 text-center w-24">Courses</th>
                <th className="py-3.5 px-3 text-center w-28">Status</th>
                <th className="py-3.5 px-5 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const roleBadge =
                  user.role === 'admin'
                    ? 'bg-amber-50 text-amber-800 border-amber-200/90'
                    : user.role === 'advisor'
                    ? 'bg-purple-50 text-purple-800 border-purple-200/90'
                    : user.role === 'ta'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200/90'
                    : 'bg-sky-50 text-sky-800 border-sky-200/90';

                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase border border-slate-200">
                          {user.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{user.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold uppercase tracking-wide ${roleBadge}`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 font-medium break-words block max-w-sm">
                        {user.major}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800">
                        {user.enrolledCourses}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-50 text-slate-500 border-slate-200"
                        title="Account standing is managed by server policies"
                      >
                        Active
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Permissions & Major"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="De-provision user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Manage Account: ${editingUser.name}` : 'Provision Institutional Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jordan Reed"
            required
          />

          <Input
            label="University Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. j.reed@university.edu"
            disabled={!!editingUser}
            helperText={editingUser ? 'Email addresses are immutable once provisioned' : undefined}
            required
          />

          {!editingUser && (
            <Input
              label="Temporary Initial Password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. StudyFlow2026!#"
              helperText="Default initial password is StudyFlow2026!# if left unmodified"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Account Role & Privileges
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-medium text-slate-800"
              >
                <option value="student">Student (Standard Access)</option>
                <option value="ta">Teaching Assistant (TA)</option>
                <option value="advisor">Faculty Academic Advisor</option>
                <option value="admin">Campus Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Account Standing Status
              </label>
              <select
                value={status}
                disabled
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-medium text-slate-800"
              >
                <option value="Active">Active</option>
                <option value="Review">Under Review</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <Input
            label="Academic Major / Department"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="e.g. Cognitive Science & AI"
          />

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900 leading-relaxed">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Security Safeguard:</span> Role and academic profile updates are committed atomically and recorded in the institutional audit log. Account suspension is disabled until it has server-side support.
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingUser ? 'Save & Audit Changes' : 'Provision Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
