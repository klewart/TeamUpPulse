import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CreateTeam from './pages/CreateTeam';
import BrowseTeams from './pages/BrowseTeams';
import RecommendedTeams from './pages/RecommendedTeams';
import TeamDetails from './pages/TeamDetails';
import TeamChat from './pages/TeamChat';
import TeamTasks from './pages/TeamTasks';
import TeamFeedback from './pages/TeamFeedback';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="create-team" element={
              <ProtectedRoute>
                <CreateTeam />
              </ProtectedRoute>
            } />
            <Route path="teams" element={
              <ProtectedRoute>
                <BrowseTeams />
              </ProtectedRoute>
            } />
            <Route path="recommendations" element={
              <ProtectedRoute>
                <RecommendedTeams />
              </ProtectedRoute>
            } />
            <Route path="team/:id" element={
              <ProtectedRoute>
                <TeamDetails />
              </ProtectedRoute>
            } />
            <Route path="team/:id/chat" element={
              <ProtectedRoute>
                <TeamChat />
              </ProtectedRoute>
            } />
            <Route path="team/:id/tasks" element={
              <ProtectedRoute>
                <TeamTasks />
              </ProtectedRoute>
            } />
            <Route path="team/:id/feedback" element={
              <ProtectedRoute>
                <TeamFeedback />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
