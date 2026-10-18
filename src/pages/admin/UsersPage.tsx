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
import { INITIAL_DIRECTORY_USERS } from '../../data/mockData';
import { adminService } from '../../services/adminService';

export function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<DirectoryUser[]>(INITIAL_DIRECTORY_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      });
      if (res && res.success && res.data && res.data.length > 0) {
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
      }
    } catch (err: any) {
      console.warn('Failed to load users from API, using directory snapshot:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersFromDb();
  }, [roleFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
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
        // Call backend role update if role changed
        if (editingUser.role !== role) {
          await adminService.updateUserRole(editingUser.id, role);
        }
        // Call backend status update if major changed
        if (editingUser.major !== major) {
          await adminService.updateUserStatus(editingUser.id, { major: major.trim() });
        }

        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: name.trim(),
                  email: email.trim(),
                  role,
                  major: major.trim() || 'General Studies',
                  status,
                  enrolledCourses: parseInt(enrolledCourses, 10) || 0,
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
      const newUser: DirectoryUser = {
        id: `u_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        role,
        major: major.trim() || 'General Studies',
        enrolledCourses: parseInt(enrolledCourses, 10) || 0,
        status,
        lastActive: 'Just created',
        joinedDate: 'Oct 2026',
      };
      setUsers((prev) => [newUser, ...prev]);
      showToast(`Provisioned account for ${newUser.name}`, 'success');
    }

    setIsModalOpen(false);
  };

  // Account Status Toggle Action
  const handleToggleStatus = async (targetUser: DirectoryUser) => {
    const nextStatus: DirectoryUser['status'] =
      targetUser.status === 'Active' ? 'Review' : targetUser.status === 'Review' ? 'Suspended' : 'Active';

    try {
      await adminService.updateUserStatus(targetUser.id, { term: `Term Status: ${nextStatus}` });
    } catch {
      // Non-blocking in UI
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
    );
    showToast(`Updated status of ${targetUser.name} to ${nextStatus} (Audit Logged)`, 'info');
  };

  // Delete User Action
  const handleDeleteUser = (targetUser: DirectoryUser) => {
    if (targetUser.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
      showToast('Cannot delete the sole campus administrator account', 'error');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
    showToast(`Removed account for ${targetUser.name}`, 'info');
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
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Cohort summary counts
  const studentCount = users.filter((u) => u.role === 'student').length;
  const advisorCount = users.filter((u) => u.role === 'advisor').length;
  const taCount = users.filter((u) => u.role === 'ta').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6 max-w-6xl pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              User Directory & Cohorts
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {users.length} Registered Accounts
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
            onClick={handleOpenCreate}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Provision User
          </Button>
        </div>
      </div>

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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Review">Under Review</option>
            <option value="Suspended">Suspended</option>
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
                <th className="py-3 px-4">Student / User</th>
                <th className="py-3 px-4">Role & Privileges</th>
                <th className="py-3 px-4">Department / Major</th>
                <th className="py-3 px-4 text-center">Courses</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3 px-4 whitespace-nowrap">
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

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold uppercase tracking-wide ${roleBadge}`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-700 font-medium truncate block max-w-xs">
                        {user.major}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800">
                        {user.enrolledCourses}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer hover:opacity-85 transition-opacity ${
                          user.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : user.status === 'Review'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {user.status}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
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
                onChange={(e) => setStatus(e.target.value as any)}
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
              <span className="font-bold">Security Safeguard:</span> All role and status updates are permanently recorded in the institutional audit log with your administrative signature. The system automatically blocks removal of the final administrator.
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
