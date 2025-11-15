import React, { useState, useEffect } from 'react';
import IncidentSearchService from '../services/IncidentSearchService';
import './LandingPage.css';

export default function LandingPage({ onNavigateToAnalysis }) {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [searchService] = useState(() => new IncidentSearchService());

  // Search for incidents when search term changes
  useEffect(() => {
    // If the input still reflects the currently selected incident, don't re-search
    if (selectedIncident && searchTerm.startsWith(selectedIncident.number)) {
      setShowDropdown(false);
      setSearchResults([]);
      return;
    }

    if (searchTerm.length > 2) {
      setIsSearching(true);
      setError(null);
      
      searchService.searchIncidents(searchTerm)
        .then(results => {
          console.log('Search results:', results); // Debug log
          const safeResults = results || [];
          setSearchResults(safeResults);
          setIsSearching(false);
          // Only show dropdown when there are results to choose from
          setShowDropdown(safeResults.length > 0);
        })
        .catch(error => {
          console.error('Search error:', error);
          setError('Search failed: ' + error.message);
          setIsSearching(false);
          setSearchResults([]);
          setShowDropdown(false);
        });
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setError(null);
    }
  }, [searchTerm, searchService, selectedIncident]);

  const handleAnalyze = () => {
    if (selectedIncident) {
      // Use navigate.to as requested
      if (window.navigate) {
        window.navigate.to('analysis', { sys_id: selectedIncident.sys_id });
      } else {
        // Fallback to the parent component's navigation
        onNavigateToAnalysis(selectedIncident.sys_id);
      }
    }
  };

  const handleIncidentSelect = (incident) => {
    try {
      setSelectedIncident(incident);
      setSearchTerm(incident.number + ' - ' + incident.short_description);
      // Clear results and hide panel so the button remains visible
      setSearchResults([]);
      setShowDropdown(false);
      setError(null);
    } catch (error) {
      console.error('Error selecting incident:', error);
      setError('Failed to select incident');
    }
  };

  const handleInputChange = (e) => {
    try {
      setSearchTerm(e.target.value);
      setError(null);
    } catch (error) {
      console.error('Error updating search term:', error);
    }
  };

  const handleInputFocus = () => {
    try {
      if (searchResults.length > 0) {
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Error on input focus:', error);
    }
  };

  const handleInputBlur = () => {
    try {
      // Delay hiding to allow click on dropdown items
      setTimeout(() => setShowDropdown(false), 150);
    } catch (error) {
      console.error('Error on input blur:', error);
    }
  };

  const getStateColor = (state) => {
    try {
      const stateColors = {
        '1': '#ffc107', // New - Yellow
        '2': '#17a2b8', // In Progress - Blue
        '3': '#6c757d', // On Hold - Gray
        '6': '#28a745', // Resolved - Green
        '7': '#28a745', // Closed - Green
      };
      return stateColors[state] || '#6c757d';
    } catch (error) {
      console.error('Error getting state color:', error);
      return '#6c757d';
    }
  };

  const getPriorityColor = (priority) => {
    try {
      const priorityColors = {
        '1': '#dc3545', // Critical - Red
        '2': '#fd7e14', // High - Orange
        '3': '#ffc107', // Moderate - Yellow
        '4': '#28a745', // Low - Green
      };
      return priorityColors[priority] || '#6c757d';
    } catch (error) {
      console.error('Error getting priority color:', error);
      return '#6c757d';
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-gradient-bg"></div>
        <div className="hero-content">
          <div className="hero-badge">🔬 Advanced Incident Intelligence</div>
          <h1 className="hero-title">
            Incident Debrief
            <span className="hero-accent">Assistant</span>
          </h1>
          <p className="hero-subtitle">
            Transform incident investigations with deterministic data processing, intelligent timeline reconstruction, and actionable insights powered by advanced analysis algorithms.
          </p>
          <div className="hero-metrics">
            <div className="metric-item">
              <span className="metric-value">98%</span>
              <span className="metric-label">Analysis Accuracy</span>
            </div>
            <div className="metric-item">
              <span className="metric-value">Under 30s</span>
              <span className="metric-label">Response Time</span>
            </div>
            <div className="metric-item">
              <span className="metric-value">24/7</span>
              <span className="metric-label">Always Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="features-section">
        <div className="features-container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-description">
            Our deterministic analysis engine processes every incident through multiple layers of intelligent insights, delivering comprehensive debriefs that drive operational excellence.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <div className="icon-bg">📊</div>
              </div>
              <div className="feature-content">
                <h3>Timeline Reconstruction</h3>
                <p>Complete chronological analysis of all incident events, field changes, and communication patterns across the entire lifecycle.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <div className="icon-bg">📈</div>
              </div>
              <div className="feature-content">
                <h3>Debrief Metrics</h3>
                <p>Advanced performance metrics including resolution time, assignment changes, communication volume, and SLA compliance tracking.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <div className="icon-bg">🔍</div>
              </div>
              <div className="feature-content">
                <h3>Root Cause Detection</h3>
                <p>Intelligent pattern recognition and automated root cause analysis based on historical data, journal entries, and field change history.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <div className="icon-bg">💡</div>
              </div>
              <div className="feature-content">
                <h3>Actionable Insights</h3>
                <p>Data-driven recommendations for process improvement, prevention measures, and operational excellence initiatives.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <h2 className="search-title">Start Investigation</h2>
          <p className="search-subtitle">Find and analyze any incident with our intelligent search engine</p>

          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          <div className="search-input-wrapper">
            <div className="search-input-container">
              <div className="search-icon">🔍</div>
              <input
                type="text"
                className="search-input"
                placeholder="Search incidents by number, description, or keywords..."
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              {isSearching && <div className="search-loader">⏳</div>}
            </div>

            {/* Search Results Panel */}
            {showDropdown && searchResults && searchResults.length > 0 && (
              <div className="results-panel">
                <div className="results-header">
                  <span className="results-count">{searchResults.length} results found</span>
                </div>
                <div className="results-list">
                  {searchResults.slice(0, 8).map((incident) => {
                    if (!incident || !incident.sys_id) return null;

                    return (
                      <div
                        key={incident.sys_id}
                        className="result-item"
                        onClick={() => handleIncidentSelect(incident)}
                      >
                        <div className="result-primary">
                          <span className="incident-number">{incident.number || 'Unknown'}</span>
                          <span className="incident-description-text">
                            {incident.short_description || 'No description available'}
                          </span>
                        </div>
                        <div className="result-meta">
                          <div className="status-badges">
                            <span
                              className="status-badge"
                              style={{ backgroundColor: getStateColor(incident.state) }}
                            >
                              {incident.state_display || 'Unknown'}
                            </span>
                            <span
                              className="priority-badge"
                              style={{ backgroundColor: getPriorityColor(incident.priority) }}
                            >
                              P{incident.priority || '?'}
                            </span>
                          </div>
                          {incident.assignment_group_display && (
                            <span className="assignment-group">
                              <span className="group-icon">🏢</span>
                              {incident.assignment_group_display}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {showDropdown && searchResults && searchResults.length === 0 && !isSearching && searchTerm.length > 2 && !selectedIncident && (
              <div className="results-panel empty-results">
                <div className="no-results-content">
                  <div className="no-results-icon">🔍</div>
                  <p className="no-results-text">No incidents found matching "{searchTerm}"</p>
                  <p className="no-results-hint">Try different keywords or check the incident number format</p>
                </div>
              </div>
            )}
          </div>

          <div className="action-area">
            <button
              className="analyze-cta"
              onClick={handleAnalyze}
              disabled={!selectedIncident}
            >
              <span className="cta-text">Analyze Incident</span>
              <span className="cta-icon">→</span>
            </button>

            {selectedIncident && (
              <div className="selection-confirm">
                <div className="selected-icon">✅</div>
                <div className="selected-details">
                  <span className="selected-label">Ready to analyze:</span>
                  <span className="selected-incident">
                    {selectedIncident.number} - {selectedIncident.short_description}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
