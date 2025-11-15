import React, { useState, useEffect, useCallback, useRef } from 'react';
import IncidentSearchService from '../services/IncidentSearchService';
import './LandingPage.css';

// Custom debounce function to replace lodash.debounce
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// IconBackground component using CSS instead of react-icons
const IconBackground = ({ children, color }) => (
  <div className={`result-icon-bg ${color}`}>
    {children}
  </div>
);

export default function LandingPage({ onNavigateToAnalysis }) {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const searchSectionRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [searchService] = useState(() => new IncidentSearchService());

  // Function to get icon by incident priority/state
  const getIconByIncidentType = (incident) => {
    const priority = parseInt(incident.priority) || 4;
    const state = incident.state;

    // Use priority for color coding (lower number = higher priority)
    if (priority === 1) {
      return (
        <IconBackground color="icon-bg-critical">
          ⚠️
        </IconBackground>
      );
    } else if (priority === 2) {
      return (
        <IconBackground color="icon-bg-high">
          🚨
        </IconBackground>
      );
    } else if (state === '6' || state === '7') { // Resolved or Closed
      return (
        <IconBackground color="icon-bg-resolved">
          ✅
        </IconBackground>
      );
    } else if (state === '2') { // In Progress
      return (
        <IconBackground color="icon-bg-progress">
          🔄
        </IconBackground>
      );
    } else { // New or other states
      return (
        <IconBackground color="icon-bg-new">
          📋
        </IconBackground>
      );
    }
  };

  const searchIncidents = useCallback(
    debounce((searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      searchService.searchIncidents(searchQuery)
        .then(incidents => {
          console.log('Search results:', incidents);
          const safeResults = incidents || [];
          // Limit to first 7 results like the template
          setResults(safeResults.slice(0, 7));
          setIsSearching(false);
        })
        .catch(error => {
          console.error('Search error:', error);
          setError('Search failed: ' + error.message);
          setResults([]);
          setIsSearching(false);
        });
    }, 300),
    [searchService]
  );

  useEffect(() => {
    // If the input still reflects the currently selected incident, don't re-search
    if (selectedIncident && query.startsWith(selectedIncident.number)) {
      setIsOpen(false);
      setResults([]);
      return;
    }

    if (query.length > 2) {
      searchIncidents(query);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
      setError(null);
    }
  }, [query, searchIncidents, selectedIncident]);

  // Auto-scroll to search results when they arrive
  useEffect(() => {
    if (results.length > 0 && !isSearching && searchSectionRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        searchSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 100);
    }
  }, [results.length, isSearching]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      const selected = results[selectedIndex];
      handleResultClick(selected);
    }
  };

  const handleResultClick = (incident) => {
    setSelectedIncident(incident);
    setQuery(`${incident.number} - ${incident.short_description}`);
    setResults([]);
    setIsOpen(false);
    setRecentSearches(prev => [incident, ...prev.slice(0, 4)]);
    setSelectedIndex(-1);
    setError(null);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

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
          <h1 className="hero-title">
            Incident Debrief
            <span className="hero-accent">Assistant</span>
          </h1>
          <p className="hero-subtitle">
            Transform incident investigations with deterministic data processing, intelligent timeline reconstruction, and actionable insights powered by advanced analysis algorithms.
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section" ref={searchSectionRef}>
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
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search incidents by number, description, or keywords..."
                className="search-input"
                aria-label="Search input"
                role="searchbox"
              />
              {query && (
                <button
                  onClick={handleClear}
                  className="clear-button"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
              {isSearching && <div className="search-loader">⏳</div>}
            </div>

            {/* Search Results Panel */}
            {isOpen && (results.length > 0 || query.trim()) && (
              <div
                ref={resultsRef}
                className="results-panel"
                role="listbox"
              >
                {results.length > 0 ? (
                  <div className="results-list">
                    {results.map((incident, index) => (
                      <div
                        key={`incident-${incident.sys_id}`}
                        className={`result-item ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={() => handleResultClick(incident)}
                        role="option"
                        aria-selected={selectedIndex === index}
                      >
                        <div className="result-icon">
                          {getIconByIncidentType(incident)}
                        </div>
                        <div className="result-content">
                          <div className="result-title">
                            {incident.number}
                          </div>
                          <div className="result-subtitle">
                            {incident.short_description}
                          </div>
                          <div className="result-meta-row">
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
                            {incident.assignment_group_display && (
                              <span className="group-badge">
                                {incident.assignment_group_display}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isSearching && query.trim() && (
                    <div className="no-results-content">
                      <div className="no-results-icon">🔍</div>
                      <p className="no-results-text">No incidents found matching "{query}"</p>
                      <p className="no-results-hint">Try different keywords or check the incident number format</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {recentSearches.length > 0 && !query && (
            <div className="recent-searches">
              <h3 className="recent-title">Recent Searches</h3>
              <div className="recent-list">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleResultClick(search)}
                    className="recent-item"
                  >
                    {search.number || search.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                <h3>Analysis Summary</h3>
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
    </div>
  );
}
