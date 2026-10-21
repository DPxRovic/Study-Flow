/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient';

export interface ProgressSummaryResponse {
  success: boolean;
  data: {
    metrics: {
      totalTasks: number;
      completedTasks: number;
      activeTasks: number;
      completionPercentage: number;
      totalEstimatedHours: number;
      totalRemainingHours: number;
      totalCompletedWorkloadHours: number;
      totalSessionsCount: number;
      completedSessions: number;
      outstandingSessions: number;
      missedSessions: number;
      loggedHours: number;
      targetDailyStudyCapHours: number;
    };
    subjectWorkload: Array<{
      subject: any;
      totalTasks: number;
      completedTasks: number;
      remainingTasks: number;
      estimatedHours: number;
      completedHours: number;
      remainingHours: number;
      targetWeeklyHours: number;
      scheduledWeeklyHours: number;
      loggedWeeklyHours: number;
      attentionLevel: 'healthy' | 'on_track' | 'needs_attention';
      attentionReason?: string;
    }>;
    imminentDeadlines: Array<{
      id: string;
      title: string;
      dueDate: string;
      remainingHours: number;
      priority: string;
      subjectId: string;
    }>;
    overdueDeliverables: Array<{
      id: string;
      title: string;
      dueDate: string;
      remainingHours: number;
      priority: string;
      subjectId: string;
    }>;
  };
}

export const progressService = {
  async getSummary(startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const qs = query.toString();
    return apiClient.get<ProgressSummaryResponse>(`/progress/summary${qs ? `?${qs}` : ''}`);
  },
};
