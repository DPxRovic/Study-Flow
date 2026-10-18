/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center max-w-lg mx-auto my-8 space-y-3 shadow-lg surface-card">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-2xs">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            {this.props.fallbackTitle || 'Something went wrong in this view'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {this.state.error?.message ||
              'A rendering issue occurred. You can safely retry or return to the dashboard.'}
          </p>
          <div className="pt-2">
            <Button
              onClick={this.handleReset}
              variant="secondary"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Retry View
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
