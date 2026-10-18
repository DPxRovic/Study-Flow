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
 * If the user is already authenticated, redirects them into their active workspace
 * so they don't unnecessarily see login screens.
 */
export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    // If returning from a redirected page, redirect there, otherwise go to their home workspace
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== '/login' && from !== '/register') {
      return <Navigate to={from} replace />;
    }
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
