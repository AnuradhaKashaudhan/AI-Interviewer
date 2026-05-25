import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './LandingPage.jsx';
import InterviewPage from './InterviewPage.jsx';
import Navbar from './components/Navbar.jsx';

const AppRoutes = () => {
  const location = useLocation();
  const isInterviewPage = location.pathname === '/interview';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Sidebar - Handles its own desktop/mobile visibility */}
      {!isInterviewPage && <Navbar />}

      {/* Content Area - Shifts right only on desktop when not in interview */}
      <main className={`flex-grow relative ${!isInterviewPage ? 'lg:pl-72' : ''} transition-all duration-300`}>
        {/* Mobile Header Spacer */}
        {!isInterviewPage && <div className="lg:hidden h-16" />}

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/interview" element={<InterviewPage />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;