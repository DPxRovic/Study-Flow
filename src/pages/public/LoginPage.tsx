/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Validate email format
  const validateEmail = (val: string) => {
    if (!val.trim()) {
      return 'Email address is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      return 'Please enter a valid university email address (e.g. name@university.edu).';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }
    setEmailError(null);

    if (!password) {
      setFormError('Please enter your account password.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setFormError(result.error || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      showToast(`Welcome back, ${result.user?.name || 'Student'}!`, 'success');

      // Check if user was redirected from a protected route
      const previousLocation = (location.state as any)?.from;
      const destination = previousLocation
        ? `${previousLocation.pathname || ''}${previousLocation.search || ''}${previousLocation.hash || ''}`
        : '';
      if (destination && destination !== '/login' && destination !== '/register') {
        navigate(destination, { replace: true });
      } else {
        navigate(result.user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      }
    } catch {
      setFormError('An unexpected network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Context */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Sign In to StudyFlow
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          Enter your university credentials to access your course timetable and study queue.
        </p>
      </div>

      {/* Error Alert Banner */}
      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">{formError}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="University Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(validateEmail(e.target.value));
          }}
          placeholder="e.g. m.lin@university.edu"
          error={emailError || undefined}
          required
          autoFocus
          autoComplete="email"
          disabled={loading}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800">
              Password <span className="text-rose-500">*</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
              className="w-full bg-white surface-inset border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 disabled:bg-slate-50 font-mono"
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
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-xs font-bold"
            loading={loading}
            disabled={!email || !password || loading}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Workspace
          </Button>
        </div>
      </form>

      {/* Register Link */}
      <div className="text-center text-xs text-slate-600 pt-1 font-medium">
        Don’t have a StudyFlow student account?{' '}
        <Link to="/register" className="font-bold text-sky-600 hover:text-sky-700 hover:underline">
          Create account
        </Link>
      </div>
    </div>
  );
}
