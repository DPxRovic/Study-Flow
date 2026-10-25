/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [major, setMajor] = useState('');
  const [term, setTerm] = useState('Fall 2026');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field errors
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const validateEmail = (val: string) => {
    if (!val.trim()) return 'University email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      return 'Please enter a valid university email address (e.g. name@university.edu).';
    }
    return null;
  };

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required.';
    if (val.length < 8) return 'Password must be at least 8 characters long.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    let confErr: string | null = null;

    if (password !== confirmPassword) {
      confErr = 'Passwords do not match.';
    }

    setEmailError(emailErr);
    setPasswordError(passErr);
    setConfirmError(confErr);

    if (emailErr || passErr || confErr) {
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name,
        email,
        password,
        major,
        term,
      });

      if (!result.success) {
        setFormError(result.error || 'Registration failed. Please check the information provided.');
        setLoading(false);
        return;
      }

      showToast(`Account created! Welcome to StudyFlow, ${name.trim()}!`, 'success');
      navigate('/subjects', { replace: true });
    } catch {
      setFormError('An unexpected error occurred during account creation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Student Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          Set up your academic profile to generate realistic, anti-cram study schedules.
        </p>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">{formError}</div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Full Name"
          placeholder="e.g. Jordan Reed"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          disabled={loading}
        />

        <Input
          label="University Email"
          type="email"
          placeholder="e.g. j.reed@university.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(validateEmail(e.target.value));
          }}
          error={emailError || undefined}
          required
          autoComplete="email"
          disabled={loading}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Major / Discipline"
            placeholder="e.g. Mechanical Eng."
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            disabled={loading}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Academic Term
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              disabled={loading}
              className="w-full bg-white surface-inset border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-medium"
            >
              <option value="Fall 2026">Fall 2026</option>
              <option value="Spring 2027">Spring 2027</option>
              <option value="Summer 2026">Summer 2026</option>
            </select>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-800">
            Password <span className="text-slate-400 font-normal">(min. 8 characters)</span>
            <span className="text-rose-500 ml-1">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(validatePassword(e.target.value));
              }}
              placeholder="••••••••"
              required
              minLength={8}
              disabled={loading}
              autoComplete="new-password"
              className={`w-full bg-white surface-inset border rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 font-mono ${
                passwordError
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:border-sky-600 focus:ring-sky-500/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{passwordError}</span>
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-800">
            Confirm Password
            <span className="text-rose-500 ml-1">*</span>
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmError && e.target.value === password) setConfirmError(null);
            }}
            placeholder="••••••••"
            required
            disabled={loading}
            autoComplete="new-password"
            className={`w-full bg-white surface-inset border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 font-mono ${
              confirmError
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-200 focus:border-sky-600 focus:ring-sky-500/20'
            }`}
          />
          {confirmError && (
            <p className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{confirmError}</span>
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-xs font-bold"
            loading={loading}
            disabled={!name || !email || !password || !confirmPassword || loading}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Create Account & Launch Planner
          </Button>
        </div>
      </form>

      {/* Sign In Link */}
      <div className="text-center text-xs text-slate-600 pt-1 font-medium">
        Already have a StudyFlow account?{' '}
        <Link to="/login" className="font-bold text-sky-600 hover:text-sky-700 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
