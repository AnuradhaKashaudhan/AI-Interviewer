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
import CareerIntelligencePage from './pages/CareerIntelligencePage.jsx';
import SystemDesignPage from './pages/SystemDesignPage.jsx';
import SystemDesignDrillPage from './pages/SystemDesignDrillPage.jsx';
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
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ats-checker" element={<ProtectedRoute featureName="ATS Checker"><ATSCheckerPage /></ProtectedRoute>} />
            <Route path="/ats-checker/fix" element={<ProtectedRoute featureName="ATS Checker"><ATSFixItPage /></ProtectedRoute>} />
            <Route path="/coding-profile" element={<ProtectedRoute featureName="Coding Profile"><CodingProfilePage /></ProtectedRoute>} />
            <Route path="/career-intelligence" element={<ProtectedRoute featureName="AI Career Intelligence"><CareerIntelligencePage /></ProtectedRoute>} />
            <Route path="/system-design" element={<ProtectedRoute featureName="System Design"><SystemDesignPage /></ProtectedRoute>} />
            <Route path="/system-design/drill/:sessionId" element={<ProtectedRoute featureName="System Design"><SystemDesignDrillPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/interview/new" element={<ProtectedRoute featureName="Mock Interview"><InterviewSetupPage /></ProtectedRoute>} />
            
            {/* Razorpay & Billing Protected Routes */}
            <Route path="/upgrade" element={<UpgradePage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/failed" element={<PaymentFailedPage />} />
            <Route path="/billing" element={<BillingPage />} />
          </Route>
          {/* Protected Routes outside AppShell */}
          <Route path="/interview" element={<ProtectedRoute featureName="Mock Interview"><InterviewPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </ATSProvider>
  </Router>
  );
}

export default App;