import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
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
import UpgradePage from './pages/UpgradePage.jsx';
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx';
import PaymentFailedPage from './pages/PaymentFailedPage.jsx';
import BillingPage from './pages/BillingPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ATSProvider } from './context/ATSContext.jsx';

function App() {
  return (
    <Router>
      <ATSProvider>
        <ErrorBoundary>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/support" element={<SupportPage />} />
            
            {/* Protected Routes inside AppShell */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/ats-checker" element={<ProtectedRoute><ATSCheckerPage /></ProtectedRoute>} />
            <Route path="/ats-checker/fix" element={<ProtectedRoute><ATSFixItPage /></ProtectedRoute>} />
            <Route path="/coding-profile" element={<ProtectedRoute><CodingProfilePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/interview/new" element={<ProtectedRoute><InterviewSetupPage /></ProtectedRoute>} />
            
            {/* Razorpay & Billing Protected Routes */}
            <Route path="/upgrade" element={<ProtectedRoute><UpgradePage /></ProtectedRoute>} />
            <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
            <Route path="/payment/failed" element={<ProtectedRoute><PaymentFailedPage /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
          </Route>
          {/* Protected Routes outside AppShell */}
          <Route path="/interview" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </ATSProvider>
  </Router>
  );
}

export default App;