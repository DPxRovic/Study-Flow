/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  children?: React.ReactNode;
}

/**
 * Ensures user is authenticated before allowing access.
 * If unauthenticated, redirects to /login and saves requested location.
 * If user has insufficient role (e.g. student accessing /admin), redirects to /dashboard.
 */
export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // If a non-admin student attempts to visit admin pages, redirect to student dashboard
    if (requiredRole === 'admin' && user?.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
