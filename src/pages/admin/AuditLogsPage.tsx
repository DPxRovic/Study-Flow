/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  UserCheck,
  Megaphone,
  BookOpen,
  Settings,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { AuditLogRecord, AuditCategory } from '../../types';
import { adminService, AuditStatsResponse } from '../../services/adminService';

export function AuditLogsPage() {
  const { showToast } = useToast();

  // Data State
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [stats, setStats] = useState<AuditStatsResponse['stats'] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Modal State for Inspecting Single Record
  const [selectedRecord, setSelectedRecord] = useState<AuditLogRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch audit records & stats from backend
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Calculate date filters if any
      let startDate: string | undefined;
      const now = new Date();
      if (dateRangeFilter === 'today') {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
      } else if (dateRangeFilter === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
      } else if (dateRangeFilter === 'month') {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      }

      const [logsRes, statsRes] = await Promise.all([
        adminService.getAuditLogs({
          page,
          limit,
          category: selectedCategory,
          action: selectedAction,
          search: search.trim() || undefined,
          startDate,
          order: sortOrder,
        }),
        adminService.getAuditStats().catch(() => null),
      ]);

      if (logsRes && logsRes.success) {
        setLogs(logsRes.data || []);
        setTotalCount(logsRes.meta?.total || 0);
        setTotalPages(logsRes.meta?.totalPages || 1);
      }

      if (statsRes && statsRes.success) {
        setStats(statsRes.stats);
      }

      if (isManualRefresh) {
        showToast('Audit trail reloaded from PostgreSQL records', 'info');
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      showToast(err.message || 'Failed to retrieve audit trail from server', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit, selectedCategory, selectedAction, sortOrder, dateRangeFilter]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Inspect record in modal
  const handleInspect = async (log: AuditLogRecord) => {
    try {
      // Attempt strictly scoped single record fetch to verify read-only integrity
      const singleRes = await adminService.getAuditLogById(log.id);
      if (singleRes.success && singleRes.data) {
        setSelectedRecord(singleRes.data);
      } else {
        setSelectedRecord(log);
      }
    } catch {
      setSelectedRecord(log);
    }
    setIsModalOpen(true);
  };

  // Export audit logs as compliance JSON/CSV
  const handleExportJson = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      institution: 'StudyFlow Campus Governance',
      scope: 'Immutable Administrative Audit Trail',
      totalRecords: logs.length,
      records: logs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported audit trail for governance compliance', 'success');
  };

  // Category styling helper
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'user_management':
        return {
          label: 'User Management',
          icon: <UserCheck className="w-3 h-3 text-sky-600" />,
          classes: 'bg-sky-50 text-sky-800 border-sky-200/90',
        };
      case 'security':
        return {
          label: 'Security & Policy',
          icon: <Lock className="w-3 h-3 text-emerald-600" />,
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        };
      case 'broadcast':
        return {
          label: 'Broadcasts',
          icon: <Megaphone className="w-3 h-3 text-purple-600" />,
          classes: 'bg-purple-50 text-purple-800 border-purple-200/90',
        };
      case 'curriculum':
        return {
          label: 'Curriculum',
          icon: <BookOpen className="w-3 h-3 text-amber-600" />,
          classes: 'bg-amber-50 text-amber-800 border-amber-200/90',
        };
      case 'system':
      default:
        return {
          label: 'System',
          icon: <Settings className="w-3 h-3 text-slate-600" />,
          classes: 'bg-slate-50 text-slate-800 border-slate-200/90',
        };
    }
  };

  // Action badge styling helper
  const getActionBadge = (action: string) => {
    if (action.includes('DELETE')) {
      return 'bg-rose-50 text-rose-800 border-rose-200/80 font-mono text-[10px] uppercase font-bold';
    }
    if (action.includes('ROLE') || action.includes('STATUS')) {
      return 'bg-sky-50 text-sky-800 border-sky-200/80 font-mono text-[10px] uppercase font-bold';
    }
    if (action.includes('CREATE')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-mono text-[10px] uppercase font-bold';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200 font-mono text-[10px] uppercase font-bold';
  };

  return (
    <div className="space-y-6 max-w-6xl pb-16 font-sans">
      {/* 1. Header & Quick Actions */}
      <div className="border-b border-slate-200/90 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              Security & Compliance
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Immutable Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-amber-600" />
            <span>Governance & Audit Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium leading-relaxed">
            Strictly scoped, append-only records of sensitive actions across the campus environment: user role updates, account status changes, announcement removals, and system policies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadData(true)}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Log
          </Button>
        </div>
      </div>

      {/* 2. Key Audit Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4.5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Total Logged Events</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {stats ? stats.totalLogs : totalCount}
          </div>
          <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-emerald-200/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>PostgreSQL Verified</span>
          </div>
        </div>

        <div className="p-4.5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>User Account Changes</span>
            <UserCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {stats ? stats.byCategory.user_management : '-'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Role elevations & term status
          </div>
        </div>

        <div className="p-4.5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Campus Broadcast Actions</span>
            <Megaphone className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {stats ? stats.byCategory.broadcast : '-'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Announcements & broadcasts
          </div>
        </div>

        <div className="p-4.5 surface-base rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Policy & Curriculum</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {stats ? stats.byCategory.security + stats.byCategory.curriculum + stats.byCategory.system : '-'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Fatigue cap & calendar rules
          </div>
        </div>
      </div>

      {/* 3. Search & Interactive Filter Controls */}
      <div className="surface-base rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by admin name, email, target entity, or action keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-medium text-slate-700"
            >
              <option value="all">All Categories</option>
              <option value="user_management">User Management</option>
              <option value="security">Security & Policy</option>
              <option value="broadcast">Campus Broadcasts</option>
              <option value="curriculum">Master Curriculum</option>
              <option value="system">System Governance</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-medium text-slate-700"
            >
              <option value="all">All Action Types</option>
              <option value="USER_ROLE_UPDATE">Role Elevation</option>
              <option value="USER_STATUS_CHANGE">Status Changes</option>
              <option value="ANNOUNCEMENT_CREATE">Broadcasts Created</option>
              <option value="ANNOUNCEMENT_DELETE">Broadcasts Removed</option>
              <option value="SETTINGS_UPDATE">Policy Adjustments</option>
              <option value="CURRICULUM_UPDATE">Curriculum Pacing</option>
            </select>
          </div>

          {/* Date Presets */}
          <div className="w-full sm:w-36">
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-medium text-slate-700"
            >
              <option value="all">All Time</option>
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            title="Toggle chronological sort order"
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>

        {/* Active Filters Pill Bar */}
        {(selectedCategory !== 'all' || selectedAction !== 'all' || search || dateRangeFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Active filters:</span>
            {selectedCategory !== 'all' && (
              <span className="bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-md font-medium text-[11px] inline-flex items-center gap-1">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('all')} className="hover:text-amber-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedAction !== 'all' && (
              <span className="bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-md font-medium text-[11px] inline-flex items-center gap-1">
                Action: {selectedAction}
                <button onClick={() => setSelectedAction('all')} className="hover:text-amber-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="bg-sky-50 text-sky-900 border border-sky-200/80 px-2 py-0.5 rounded-md font-medium text-[11px] inline-flex items-center gap-1">
                Query: "{search}"
                <button onClick={() => setSearch('')} className="hover:text-sky-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedAction('all');
                setSearch('');
                setDateRangeFilter('all');
              }}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold ml-1"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* 4. Audit Records Table */}
      <div className="surface-base rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Audit Event Log
            </h2>
            <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold">
              {totalCount} Total
            </span>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Page {page} of {Math.max(1, totalPages)}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Retrieving audit log entries from PostgreSQL...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No matching audit records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try modifying your search criteria or resetting filters to review institutional security events.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedAction('all');
                setSearch('');
                setDateRangeFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const catBadge = getCategoryBadge(log.category);
                  const formattedTime = new Date(log.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-amber-50/30 transition-colors group cursor-pointer"
                      onClick={() => handleInspect(log)}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formattedTime}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded border ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md border font-semibold text-[11px] inline-flex items-center gap-1 ${catBadge.classes}`}>
                          {catBadge.icon}
                          <span>{catBadge.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <div className="font-bold text-slate-900">{log.adminName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.adminEmail}</div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        <p className="text-slate-700 font-medium truncate group-hover:text-slate-900">
                          {log.details || '—'}
                        </p>
                        {log.targetType && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Target: {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspect(log);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Inspect audit record"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Bar */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span className="text-slate-400 font-mono text-[11px] ml-2">
              Showing {logs.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, totalCount)} of {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-mono text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
              {page} / {Math.max(1, totalPages)}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Single Audit Record Inspection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Audit Record Verification & Inspection"
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    {selectedRecord.action}
                  </div>
                  <div className="text-[11px] text-amber-800 font-mono font-medium">
                    Category: {selectedRecord.category}
                  </div>
                </div>
              </div>

              <span className="text-[10px] uppercase font-mono font-bold bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded shadow-2xs">
                Tamper-Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Event UUID
                </span>
                <span className="font-mono text-[11px] text-slate-800 select-all font-semibold">
                  {selectedRecord.id}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Timestamp (ISO / UTC)
                </span>
                <span className="font-mono text-[11px] text-slate-800 select-all font-semibold">
                  {selectedRecord.timestamp}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Acting Administrator
                </span>
                <div className="font-bold text-slate-900">{selectedRecord.adminName}</div>
                <div className="text-[10px] font-mono text-slate-500">{selectedRecord.adminEmail}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Originating IP Address
                </span>
                <span className="font-mono text-[11px] text-slate-800 font-semibold">
                  {selectedRecord.ipAddress || '127.0.0.1 (Local Verified)'}
                </span>
              </div>

              {selectedRecord.targetType && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Target Entity Type
                  </span>
                  <span className="font-bold text-slate-900">{selectedRecord.targetType}</span>
                </div>
              )}

              {selectedRecord.targetId && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Target Entity ID
                  </span>
                  <span className="font-mono text-[11px] text-slate-800 select-all">
                    {selectedRecord.targetId}
                  </span>
                </div>
              )}
            </div>

            {/* Event Description Payload */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 block">
                Detailed Event Audit Payload
              </span>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 font-mono text-xs leading-relaxed select-all">
                {selectedRecord.details || 'No additional payload metadata recorded.'}
              </div>
            </div>

            {/* Compliance Guarantee Notice */}
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200/90 text-[11px] text-slate-500 leading-normal flex items-start gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                This audit log is governed by strict institutional integrity guarantees. Administrative audit records are append-only and cannot be altered or removed through user APIs.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
