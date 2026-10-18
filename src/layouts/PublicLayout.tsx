/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, GraduationCap } from 'lucide-react';

export function PublicLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-academic-canvas text-slate-900 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Public Top Bar with Frosted Glass and Inset Highlight */}
      <header className="h-16 surface-base border-t-0 border-x-0 border-b border-slate-200/90 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-sky-700 to-cyan-600 bg-clip-text text-transparent leading-none">
                StudyFlow
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                Collegiate Atelier
              </span>
            </div>
          </Link>

          {/* Academic Term Tag */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            <span>Fall 2026 Academic Term</span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
          <Link to="/" className="hover:text-sky-700 transition-colors">
            Overview
          </Link>
          <a href="#scheduling-engine" className="hover:text-sky-700 transition-colors">
            Deterministic Engine
          </a>
          <a href="#anti-cram" className="hover:text-sky-700 transition-colors">
            Anti-Cram Rhythm
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {isAuthenticated ? (
            <Button
              variant="primary"
              onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {user?.role === 'admin' ? 'Admin Console' : 'Open Workspace'}
            </Button>
          ) : (
            <>
              <Link
                to="/login"
                className="btn-tactile-secondary hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-slate-700 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-tactile-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-xl"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200/90 surface-base bg-white/95 py-8 px-4 md:px-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
              SF
            </div>
            <span className="font-bold text-slate-900">StudyFlow Academic Atelier</span>
            <span>·</span>
            <span>A colorful, student-first study planner & assignment scheduler</span>
          </div>
          <div className="flex items-center gap-4 font-semibold text-slate-600">
            {isAuthenticated ? (
              <>
                <Link
                  to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="hover:text-sky-700 transition-colors font-bold text-sky-800"
                >
                  {user?.role === 'admin' ? 'Admin Console' : 'Student Dashboard'}
                </Link>
                <Link to="/settings" className="hover:text-sky-700 transition-colors">
                  Preferences
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-sky-700 transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="hover:text-sky-700 transition-colors">
                  Create Account
                </Link>
                <Link to="/forgot-password" className="hover:text-sky-700 transition-colors">
                  Password Recovery
                </Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
