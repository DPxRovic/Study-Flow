/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Download, RotateCcw, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { usePlanner } from '../../context/PlannerContext';
import { useToast } from '../../context/ToastContext';

export function SettingsPage() {
  const { user, updateUserPreferences } = useAuth();
  const {
    refreshData,
    tasks,
    subjects,
    sessions,
    availability,
    notifications,
    announcements,
    journalEntries,
  } = usePlanner();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [major, setMajor] = useState(user?.major || '');
  const [term, setTerm] = useState(user?.term || '');
  const [sessionMinutes, setSessionMinutes] = useState(user?.defaultSessionMinutes?.toString() || '50');
  const [dailyCap, setDailyCap] = useState(user?.targetDailyStudyCapHours?.toString() || '5.5');
  const [breakMinutes, setBreakMinutes] = useState(user?.preferredBreakMinutes?.toString() || '10');
  const [studyTime, setStudyTime] = useState(user?.preferredStudyTime || 'afternoon');
  const [bufferMinutes, setBufferMinutes] = useState(user?.bufferMinutes?.toString() || '15');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserPreferences({
        name,
        major,
        term,
        defaultSessionMinutes: Number(sessionMinutes),
        targetDailyStudyCapHours: Number(dailyCap),
        preferredBreakMinutes: Number(breakMinutes),
        preferredStudyTime: studyTime as any,
        bufferMinutes: Number(bufferMinutes),
      });
      showToast('Student settings saved successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Unable to save student settings', 'error');
    }
  };

  const handleExportData = () => {
    const backup = {
      user,
      tasks,
      subjects,
      sessions,
      availability,
      notifications,
      announcements,
      journalEntries,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyFlow_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported complete study data as JSON', 'success');
  };

  return (
    <div className="space-y-7 max-w-[1440px] w-full pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Student Preferences & Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Configure default study session durations, fatigue safeguards, and account parameters.
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Academic Profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Student Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Major / Program"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Input
            label="Current Term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            required
          />
          <Input
            label="Default Session Length (mins)"
            type="number"
            min="25"
            max="120"
            step="5"
            value={sessionMinutes}
            onChange={(e) => setSessionMinutes(e.target.value)}
            required
          />
          <Input
            label="Daily Study Cap (hours)"
            type="number"
            min="2"
            max="12"
            step="0.5"
            value={dailyCap}
            onChange={(e) => setDailyCap(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Input
            label="Break Between Sessions (mins)"
            type="number"
            min="5"
            max="30"
            step="5"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(e.target.value)}
            required
          />
          <Select
            label="Preferred Study Window"
            value={studyTime}
            onChange={(e) => setStudyTime(e.target.value as any)}
            options={[
              { label: 'Morning (8am – 12pm)', value: 'morning' },
              { label: 'Afternoon (12pm – 5pm)', value: 'afternoon' },
              { label: 'Evening (5pm – 10pm)', value: 'evening' },
              { label: 'Flexible (Any Open Block)', value: 'flexible' },
            ]}
          />
          <Input
            label="Post-Class Buffer (mins)"
            type="number"
            min="0"
            max="60"
            step="5"
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(e.target.value)}
            required
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button type="submit" variant="primary" icon={<Save className="w-3.5 h-3.5" />}>
            Save Preferences
          </Button>
        </div>
      </form>

      {/* Data Management Section */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <h2 className="text-base font-bold text-slate-900">Data Management</h2>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Download your course data or reload the latest planner records saved to your account.
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <Button
            variant="secondary"
            onClick={handleExportData}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export All Data (JSON)
          </Button>
          <Button
            variant="secondary"
            onClick={refreshData}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reload Account Data
          </Button>
        </div>
      </div>
    </div>
  );
}
