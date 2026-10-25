/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface GuestRouteProps {
  children?: React.ReactNode;
}

/**
 * Route wrapper for public authentication pages (Login, Register, Forgot Password).
 * If initializing, waits for session status.
 * If user is already authenticated, redirects them into their active workspace.
 */
export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    // If returning from a redirected page, redirect there, otherwise go to their home workspace
    const previousLocation = (location.state as any)?.from;
    const from = previousLocation
      ? `${previousLocation.pathname || ''}${previousLocation.search || ''}${previousLocation.hash || ''}`
      : '';
    if (from && from !== '/login' && from !== '/register') {
      return <Navigate to={from} replace />;
    }
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
