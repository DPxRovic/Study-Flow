/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, ArrowLeft, AlertCircle, Mail, RotateCcw } from 'lucide-react';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [accountFound, setAccountFound] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (val: string) => {
    if (!val.trim()) return 'University email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      return 'Please enter a valid university email address.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError(null);
    setLoading(true);

    try {
      const result = await requestPasswordReset(email);
      setAccountFound(result.emailExists);
      setSubmitted(true);
    } catch {
      setEmailError('An error occurred during reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAgain = () => {
    setSubmitted(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Reset Your Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          Enter your registered university email to receive recovery instructions.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          {accountFound ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Reset Instructions Simulated</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium">
                In this frontend phase, an active registered student account was verified for <strong className="text-slate-900">{email}</strong>.
              </p>
              <div className="p-3 bg-white rounded-xl border border-emerald-200/80 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-emerald-900">Simulated Development Recovery Note:</div>
                <div>Default student password is <code className="font-mono bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-bold">studyflow2026</code>.</div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>No Registered Account Found</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium">
                We could not find an existing student or faculty account for <strong className="text-slate-900">{email}</strong>.
              </p>
              <div className="pt-1 flex items-center gap-3">
                <Link
                  to="/register"
                  className="font-bold text-sky-700 hover:text-sky-800 hover:underline"
                >
                  Create new student account →
                </Link>
              </div>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <Link to="/login" className="block">
              <Button variant="primary" className="w-full py-2.5 text-xs font-bold">
                Return to Sign In
              </Button>
            </Link>

            <button
              onClick={handleResetAgain}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 py-1.5 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try a different email address</span>
            </button>
          </div>
        </div>
      ) : (
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
            disabled={loading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-xs font-bold"
            loading={loading}
            disabled={!email || loading}
            icon={<Mail className="w-4 h-4" />}
          >
            Send Recovery Instructions
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
