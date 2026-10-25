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
import {
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Mail,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

type ResetStep = 'EMAIL_ENTRY' | 'CODE_VERIFICATION' | 'NEW_PASSWORD' | 'SUCCESS';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, verifyResetCode, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<ResetStep>('EMAIL_ENTRY');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Field validation
  const validateEmail = (val: string) => {
    if (!val.trim()) return 'University email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      return 'Please enter a valid university email address (e.g. student@university.edu).';
    }
    return null;
  };

  const validateCode = (val: string) => {
    if (!val.trim()) return 'Verification code is required.';
    if (!/^\d{6}$/.test(val.trim())) {
      return 'Verification code must be exactly 6 digits.';
    }
    return null;
  };

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required.';
    if (val.length < 8) return 'Password must be at least 8 characters long.';
    return null;
  };

  // STEP 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setStep('CODE_VERIFICATION');
        showToast('Verification code sent! Please check your university inbox.', 'info');
      } else {
        setErrorMessage(res.message || 'Unable to request verification code.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'An error occurred while requesting verification code. Please retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify 6-digit Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const codeErr = validateCode(code);
    if (codeErr) {
      setErrorMessage(codeErr);
      return;
    }

    setLoading(true);
    try {
      const res = await verifyResetCode(email, code);
      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setStep('NEW_PASSWORD');
        showToast('Code verified! Choose your new secure password.', 'success');
      } else {
        setErrorMessage(res.message || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code.');
      if (err.message && err.message.includes('attempt')) {
        const match = err.message.match(/(\d+)\s+attempt/);
        if (match) setAttemptsRemaining(parseInt(match[1], 10));
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Submit New Password
  const handleSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const passErr = validatePassword(newPassword);
    if (passErr) {
      setErrorMessage(passErr);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (!resetToken) {
      setErrorMessage('Session expired. Please request a new verification code.');
      setStep('EMAIL_ENTRY');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email, resetToken, newPassword);
      if (res.success) {
        setStep('SUCCESS');
        showToast('Password updated! You can now sign in.', 'success');
      } else {
        setErrorMessage(res.message || 'Could not reset password. Please retry.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please request a new code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {step === 'EMAIL_ENTRY' && 'Reset Your Password'}
          {step === 'CODE_VERIFICATION' && 'Enter 6-Digit Code'}
          {step === 'NEW_PASSWORD' && 'Set New Password'}
          {step === 'SUCCESS' && 'Password Reset Complete'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          {step === 'EMAIL_ENTRY' &&
            'Enter your registered university email to receive a secure 6-digit recovery code.'}
          {step === 'CODE_VERIFICATION' &&
            `A 6-digit verification code was dispatched to ${email}.`}
          {step === 'NEW_PASSWORD' &&
            'Your identity has been verified. Create a new strong password for your account.'}
          {step === 'SUCCESS' &&
            'Your account password has been updated in PostgreSQL. You can now sign in.'}
        </p>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">
            {errorMessage}
            {attemptsRemaining !== null && attemptsRemaining === 0 && (
              <div className="mt-1 font-bold">
                Please request a fresh code to continue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 1: Email Entry */}
      {step === 'EMAIL_ENTRY' && (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <Input
            label="University Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. m.lin@university.edu"
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
            Send Verification Code
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

      {/* STAGE 2: 6-Digit Code Verification */}
      {step === 'CODE_VERIFICATION' && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 flex items-center justify-between">
            <span className="font-medium truncate">Sending to: {email}</span>
            <button
              type="button"
              onClick={() => {
                setStep('EMAIL_ENTRY');
                setCode('');
                setErrorMessage(null);
              }}
              className="text-sky-700 hover:text-sky-900 font-bold underline ml-2 cursor-pointer text-[11px]"
            >
              Change
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              6-Digit Security Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="000000"
              className="w-full text-center tracking-[0.5em] font-mono text-2xl font-extrabold py-3 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
              required
              autoFocus
              disabled={loading}
            />
            <p className="text-[11px] text-slate-500 font-medium">
              Code expires in 10 minutes. Check your spam folder if not received.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-xs font-bold"
            loading={loading}
            disabled={code.length !== 6 || loading}
            icon={<KeyRound className="w-4 h-4" />}
          >
            Verify Security Code
          </Button>

          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={loading}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resend code</span>
            </button>

            <Link
              to="/login"
              className="font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {/* STAGE 3: New Password Entry */}
      {step === 'NEW_PASSWORD' && (
        <form onSubmit={handleSubmitNewPassword} className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">6-Digit Code Verified Successfully</span>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full text-xs font-medium py-2.5 px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white pr-10"
                required
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full text-xs font-medium py-2.5 px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-xs font-bold"
            loading={loading}
            disabled={!newPassword || !confirmPassword || loading}
            icon={<Lock className="w-4 h-4" />}
          >
            Update Account Password
          </Button>
        </form>
      )}

      {/* STAGE 4: Success Confirmation */}
      {step === 'SUCCESS' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Password Successfully Reset</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              Your account password has been updated in Neon PostgreSQL. The reset authorization token has been safely invalidated.
            </p>
          </div>

          <Button
            variant="primary"
            className="w-full py-2.5 text-xs font-bold"
            onClick={() => navigate('/login', { replace: true })}
          >
            Sign In with New Password →
          </Button>
        </div>
      )}
    </div>
  );
}
