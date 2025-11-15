import React, { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import AnalysisPage from './components/AnalysisPage.jsx';
import './app.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [incidentSysId, setIncidentSysId] = useState(null);

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sysId = urlParams.get('sys_id');
    
    if (sysId) {
      setIncidentSysId(sysId);
      setCurrentPage('analysis');
    } else {
      setCurrentPage('landing');
    }

    // Set up global navigate function as requested
    window.navigate = {
      to: (page, params = {}) => {
        if (page === 'analysis' && params.sys_id) {
          setIncidentSysId(params.sys_id);
          setCurrentPage('analysis');
          
          // Update URL without page reload
          const newUrl = new URL(window.location);
          newUrl.searchParams.set('sys_id', params.sys_id);
          window.history.pushState({}, '', newUrl);
        } else if (page === 'landing') {
          setCurrentPage('landing');
          setIncidentSysId(null);
          
          // Update URL without page reload
          const newUrl = new URL(window.location);
          newUrl.searchParams.delete('sys_id');
          window.history.pushState({}, '', newUrl);
        }
      }
    };

    // Cleanup function to remove global navigate
    return () => {
      delete window.navigate;
    };
  }, []);

  const navigateToAnalysis = (sysId) => {
    window.navigate.to('analysis', { sys_id: sysId });
  };

  const navigateToLanding = () => {
    window.navigate.to('landing');
  };

  return (
    <div className="app">
      <main className="app-main">
        {currentPage === 'landing' ? (
          <LandingPage onNavigateToAnalysis={navigateToAnalysis} />
        ) : (
          <AnalysisPage
            incidentSysId={incidentSysId}
            onNavigateToLanding={navigateToLanding}
          />
        )}
      </main>
    </div>
  );
}
