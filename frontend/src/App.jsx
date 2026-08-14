import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import HomePage from './pages/HomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import FeaturesPage from './pages/FeaturesPage.jsx';
import ATSCheckerPage from './pages/ATSCheckerPage.jsx';
import ATSFixItPage from './pages/ATSFixItPage.jsx';
import CodingProfilePage from './pages/CodingProfilePage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import SupportPage from './pages/SupportPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import InterviewSetupPage from './pages/InterviewSetupPage.jsx';
import InterviewPage from './InterviewPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/ats-checker" element={<ATSCheckerPage />} />
            <Route path="/ats-checker/fix" element={<ATSFixItPage />} />
            <Route path="/coding-profile" element={<CodingProfilePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/interview/new" element={<InterviewSetupPage />} />
          </Route>
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;