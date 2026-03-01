import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { LayoutProvider } from './components/LayoutContext';
import ProtectedRoute from './components/ProtectedRoute';

import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';

import HomeDashboard from './pages/HomeDashboard';
import Statistics from './pages/Statistics';
import UserProfile from './pages/UserProfile';
import Notifications from './pages/Notifications';
import Chat from './pages/Chat';

const App: React.FC = () => {
  return (
    <LayoutProvider>
      <Routes>
        {/* Public routes (no Layout) */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes (NO Layout - own UI) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Protected routes (WITH Layout - edited pages) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <HomeDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <Layout>
                <Statistics />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user"
          element={
            <ProtectedRoute>
              <Layout>
                <UserProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <Notifications />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Layout>
                <Chat />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Redirect to welcome for any unknown route */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </LayoutProvider>
  );
};

export default App;
