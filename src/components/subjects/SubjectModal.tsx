/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Subject, SubjectCategory } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { BookOpen, MapPin, User, Clock, FileText } from 'lucide-react';
import { SUBJECT_CATEGORY_STYLES } from '../../theme/tokens';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectToEdit?: Subject | null;
  onSave: (subjectData: Omit<Subject, 'id'>, id?: string) => void;
}

export function SubjectModal({
  isOpen,
  onClose,
  subjectToEdit,
  onSave,
}: SubjectModalProps) {
  const isEditing = !!subjectToEdit;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [credits, setCredits] = useState('4');
  const [weeklyTargetHours, setWeeklyTargetHours] = useState('8');
  const [colorKey, setColorKey] = useState<SubjectCategory>('stem');
  const [classroom, setClassroom] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [syllabusUrl, setSyllabusUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (subjectToEdit) {
      setCode(subjectToEdit.code);
      setName(subjectToEdit.name);
      setInstructor(subjectToEdit.instructor);
      setCredits(subjectToEdit.credits.toString());
      setWeeklyTargetHours(subjectToEdit.weeklyTargetHours.toString());
      setColorKey(subjectToEdit.colorKey);
      setClassroom(subjectToEdit.classroom || '');
      setClassSchedule(subjectToEdit.classSchedule || '');
      setOfficeHours(subjectToEdit.officeHours || '');
      setSyllabusUrl(subjectToEdit.syllabusUrl || '');
    } else {
      setCode('');
      setName('');
      setInstructor('');
      setCredits('4');
      setWeeklyTargetHours('8');
      setColorKey('stem');
      setClassroom('');
      setClassSchedule('');
      setOfficeHours('');
      setSyllabusUrl('');
    }
    setErrors({});
  }, [subjectToEdit, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!code.trim()) {
      errs.code = 'Course code is required (e.g. CS 201, MATH 241).';
    }
    if (!name.trim()) {
      errs.name = 'Course title is required.';
    }
    const cr = parseInt(credits, 10);
    if (isNaN(cr) || cr < 1 || cr > 12) {
      errs.credits = 'Credit hours must be between 1 and 12.';
    }
    const target = parseFloat(weeklyTargetHours);
    if (isNaN(target) || target < 1 || target > 40) {
      errs.weeklyTargetHours = 'Weekly target hours must be between 1h and 40h.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const subjectData: Omit<Subject, 'id'> = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      instructor: instructor.trim() || 'TBD',
      credits: parseInt(credits, 10),
      weeklyTargetHours: parseFloat(weeklyTargetHours),
      colorKey,
      classroom: classroom.trim() || undefined,
      classSchedule: classSchedule.trim() || undefined,
      officeHours: officeHours.trim() || undefined,
      syllabusUrl: syllabusUrl.trim() || undefined,
    };

    onSave(subjectData, subjectToEdit ? subjectToEdit.id : undefined);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Enrolled Course' : 'Enroll New Subject / Course'}
      description="Add syllabus metadata and study hour targets to your semester schedule."
      maxWidth="lg"
      icon={<BookOpen className="w-4 h-4" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Course Code and Course Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Course Code"
            placeholder="e.g. CS 201"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
            }}
            error={errors.code}
            required
            autoFocus
          />

          <div className="sm:col-span-2">
            <Input
              label="Course Title"
              placeholder="e.g. Data Structures & Algorithms"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={errors.name}
              required
            />
          </div>
        </div>

        {/* Credits, Weekly Target, Discipline Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Credit Hours"
            type="number"
            min="1"
            max="12"
            value={credits}
            onChange={(e) => {
              setCredits(e.target.value);
              if (errors.credits) setErrors((prev) => ({ ...prev, credits: '' }));
            }}
            error={errors.credits}
            required
          />

          <Input
            label="Weekly Study Target (h)"
            type="number"
            step="0.5"
            min="1"
            max="40"
            value={weeklyTargetHours}
            onChange={(e) => {
              setWeeklyTargetHours(e.target.value);
              if (errors.weeklyTargetHours) setErrors((prev) => ({ ...prev, weeklyTargetHours: '' }));
            }}
            error={errors.weeklyTargetHours}
            required
          />

          <Select
            label="Academic Discipline"
            value={colorKey}
            onChange={(e) => setColorKey(e.target.value as SubjectCategory)}
            options={[
              { label: 'Computer Science (Cyan)', value: 'cs' },
              { label: 'Mathematics & STEM (Blue)', value: 'stem' },
              { label: 'Natural Sciences (Emerald)', value: 'science' },
              { label: 'Humanities & Lit (Gold)', value: 'humanities' },
              { label: 'Social Sciences (Coral)', value: 'social' },
              { label: 'Arts & Electives (Violet)', value: 'arts' },
            ]}
          />
        </div>

        {/* Instructor */}
        <Input
          label="Lead Professor / Instructor"
          placeholder="e.g. Dr. Elena Vance"
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
        />

        {/* Logistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Classroom Location"
            placeholder="e.g. Turing Hall 104"
            value={classroom}
            onChange={(e) => setClassroom(e.target.value)}
          />

          <Input
            label="Class Schedule"
            placeholder="e.g. Tue/Thu 10:00 - 11:30 AM"
            value={classSchedule}
            onChange={(e) => setClassSchedule(e.target.value)}
          />

          <Input
            label="Office Hours Schedule"
            placeholder="e.g. Tue/Thu 2:00 - 3:30 PM"
            value={officeHours}
            onChange={(e) => setOfficeHours(e.target.value)}
          />
        </div>

        {/* Syllabus URL / Link */}
        <Input
          label="Syllabus or Course Portal Link (Optional)"
          placeholder="e.g. https://canvas.university.edu/courses/cs201"
          value={syllabusUrl}
          onChange={(e) => setSyllabusUrl(e.target.value)}
        />

        {/* Modal Actions */}
        <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isEditing ? 'Save Changes' : 'Enroll Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
