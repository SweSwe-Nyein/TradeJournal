import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/src/hooks/useAuth';
import { ProtectedRoute } from '@/src/components/auth/protected-route';
import { AppShell } from '@/src/components/layout/app-shell';
import { ErrorBoundary } from '@/src/components/layout/error-boundary';

import { LoginPage } from '@/src/components/auth/login-page';
import { SignupPage } from '@/src/components/auth/signup-page';
import { DashboardPage } from '@/src/app/dashboard/page';
import { TradesPage } from '@/src/app/trades/page';
import { TradeDetailPage } from '@/src/app/trades/detail-page';
import { CalendarPage } from '@/src/app/calendar/page';
import { AnalyticsPage } from '@/src/app/analytics/page';
import { JournalPage } from '@/src/app/journal/page';
import { JournalDetailPage } from '@/src/app/journal/detail-page';
import { StrategiesPage } from '@/src/app/strategies/page';
import { SettingsPage } from '@/src/app/settings/page';
import { ImportPage } from '@/src/app/import/page';
import { NotFoundPage } from '@/src/app/not-found/page';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/trades" element={<TradesPage />} />
                <Route path="/trades/:id" element={<TradeDetailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/journal" element={<JournalPage />} />
                <Route path="/journal/:date" element={<JournalDetailPage />} />
                <Route path="/strategies" element={<StrategiesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
