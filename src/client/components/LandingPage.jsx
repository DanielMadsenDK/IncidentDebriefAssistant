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
    if (searchTerm.length > 2) {
      setIsSearching(true);
      setError(null);
      
      searchService.searchIncidents(searchTerm)
        .then(results => {
          console.log('Search results:', results); // Debug log
          setSearchResults(results || []);
          setShowDropdown(true);
          setIsSearching(false);
        })
        .catch(error => {
          console.error('Search error:', error);
          setError('Search failed: ' + error.message);
          setIsSearching(false);
          setSearchResults([]);
        });
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setError(null);
    }
  }, [searchTerm, searchService]);

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

  // Error boundary function
  const handleError = (error, errorInfo) => {
    console.error('Component error:', error, errorInfo);
    setError('Application error occurred. Please refresh the page.');
  };

  try {
    return (
      <div className="landing-page">
        <div className="hero-section">
          <h1 className="hero-title" data-text="Incident Debrief Assistant">Incident Debrief Assistant</h1>
          <p className="hero-subtitle">
            Comprehensive incident analysis and debrief tool powered by deterministic data processing
          </p>
        </div>

        <div className="explanation-section">
          <div className="explanation-content">
            <h2>How it works</h2>
            <p>
              Select an incident below to generate a comprehensive analysis including timeline reconstruction, 
              debrief metrics, root cause analysis, and actionable recommendations. All analysis is performed 
              using deterministic rules based on incident data, journal entries, and field change history.
            </p>
            
            <div className="features-grid">
              <div className="feature-item">
                <h3>📊 Timeline Analysis</h3>
                <p>Complete chronological view of all incident events</p>
              </div>
              <div className="feature-item">
                <h3>📈 Debrief Metrics</h3>
                <p>Resolution time, handoffs, communication volume</p>
              </div>
              <div className="feature-item">
                <h3>🔍 Root Cause Detection</h3>
                <p>Automated analysis of journal entries and patterns</p>
              </div>
              <div className="feature-item">
                <h3>💡 Recommendations</h3>
                <p>Actionable insights for process improvement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="incident-selection">
          <div className="selection-card">
            <h2>Select Incident for Analysis</h2>
            <p className="selection-instruction">
              Search by incident number or description to find the incident you want to analyze
            </p>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="picker-container">
              <div className="search-input-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Enter incident number (e.g., INC0000123) or search keywords..."
                  value={searchTerm}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                {isSearching && <div className="search-spinner">🔍 Searching...</div>}
              </div>

              {showDropdown && searchResults && searchResults.length > 0 && (
                <div className="search-dropdown">
                  {searchResults.slice(0, 10).map((incident) => {
                    if (!incident || !incident.sys_id) {
                      return null; // Skip invalid incidents
                    }
                    
                    return (
                      <div
                        key={incident.sys_id}
                        className="search-result-item"
                        onClick={() => handleIncidentSelect(incident)}
                      >
                        <div className="incident-header">
                          <span className="incident-number">{incident.number || 'Unknown'}</span>
                          <div className="incident-badges">
                            <span 
                              className="state-badge"
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
                        </div>
                        <div className="incident-description">{incident.short_description || 'No description available'}</div>
                        {incident.assignment_group_display && (
                          <div className="incident-assignment">Assigned to: {incident.assignment_group_display}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {showDropdown && searchResults && searchResults.length === 0 && !isSearching && searchTerm.length > 2 && (
                <div className="search-dropdown">
                  <div className="no-results">
                    <span className="no-results-icon">🔍</span>
                    No incidents found for "{searchTerm}"
                  </div>
                </div>
              )}
            </div>

            <div className="action-container">
              <button 
                className="analyze-button primary-button"
                onClick={handleAnalyze}
                disabled={!selectedIncident}
              >
                Analyze Incident
              </button>
              
              {selectedIncident && (
                <div className="selected-info">
                  <span className="selected-label">Selected:</span>
                  <span className="selected-incident">
                    {selectedIncident.number} - {selectedIncident.short_description}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    handleError(error);
    return (
      <div className="landing-page">
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>Please refresh the page and try again.</p>
        </div>
      </div>
    );
  }
}