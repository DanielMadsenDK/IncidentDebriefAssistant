import React, { useState, useEffect } from 'react';
import IncidentAnalysisService from '../services/IncidentAnalysisService.js';
import './AnalysisPage.css';

export default function AnalysisPage({ incidentSysId, onNavigateToLanding }) {
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const analysisService = new IncidentAnalysisService();

  useEffect(() => {
    if (incidentSysId) {
      loadAnalysis();
    }
  }, [incidentSysId]);

  const loadAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call IncidentAnalysisUtils.generateIncidentAnalysis(sys_id) via service
      const result = await analysisService.analyzeIncident(incidentSysId);
      setAnalysisData(result);
    } catch (err) {
      setError('Failed to generate incident analysis. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="analysis-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Generating comprehensive incident analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Analysis Failed</h2>
          <p>{error}</p>
          <button onClick={onNavigateToLanding} className="back-button">
            Back to Landing
          </button>
        </div>
      </div>
    );
  }

  const incident = analysisData?.incident;
  const timeline = analysisData?.timeline || [];
  const debrief = analysisData?.debrief;

  return (
    <div className="analysis-page">
      {/* Header Card - Incident Metadata */}
      <div className="header-card">
        <div className="incident-header-content">
          <div className="incident-primary-info">
            <h1 className="incident-number">{incident?.number}</h1>
            <p className="incident-description">{incident?.short_description}</p>
          </div>
          
          <div className="incident-status-grid">
            <div className="status-item">
              <span className="status-label">State</span>
              <span className={`status-badge state-${incident?.state?.toLowerCase()?.replace(/\s+/g, '-')}`}>
                {incident?.state}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Priority</span>
              <span className={`status-badge priority-${incident?.priority?.toLowerCase()}`}>
                {incident?.priority}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Category</span>
              <span className="status-value">{incident?.category || 'N/A'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Assigned To</span>
              <span className="status-value">{incident?.assigned_to || 'Unassigned'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Assignment Group</span>
              <span className="status-value">{incident?.assignment_group || 'N/A'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Opened</span>
              <span className="status-value">{incident?.opened_at ? new Date(incident.opened_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Timeline Component */}
        <div className="timeline-section">
          <div className="timeline-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">📅</span>
                Incident Timeline
              </h2>
              <span className="timeline-count">{timeline.length} events</span>
            </div>
            
            <div className="timeline-container">
              {timeline.map((event, index) => (
                <TimelineEvent key={index} event={event} isLast={index === timeline.length - 1} />
              ))}
            </div>
          </div>
        </div>

        {/* Debrief Cards */}
        <div className="debrief-section">
          {/* Overview Card */}
          <div className="debrief-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">📋</span>
                Overview
              </h2>
            </div>
            <div className="card-content">
              <div className="overview-grid">
                <div className="overview-item">
                  <span className="overview-label">Root Cause</span>
                  <p className="overview-value">{analysisData?.rootCause || 'Analysis pending'}</p>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Impact Assessment</span>
                  <p className="overview-value">{analysisData?.impact || 'Assessment pending'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Taken Card */}
          <div className="debrief-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">🔧</span>
                Actions Taken
              </h2>
            </div>
            <div className="card-content">
              <div className="actions-grid">
                <div className="action-section">
                  <h4 className="section-title">Recommendations</h4>
                  <ul className="action-list">
                    {analysisData?.recommendations?.map((rec, index) => (
                      <li key={index} className="action-item">{rec}</li>
                    )) || <li className="no-data">No recommendations available</li>}
                  </ul>
                </div>
                <div className="action-section">
                  <h4 className="section-title">Prevention Measures</h4>
                  <ul className="action-list">
                    {analysisData?.preventionMeasures?.map((measure, index) => (
                      <li key={index} className="action-item">{measure}</li>
                    )) || <li className="no-data">No prevention measures identified</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Card */}
          <div className="debrief-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">📊</span>
                Metrics
              </h2>
            </div>
            <div className="card-content">
              <div className="metrics-grid">
                <MetricItem 
                  icon="⏱️"
                  label="Resolution Time"
                  value={debrief?.resolution_time?.display || 'N/A'}
                  status={debrief?.resolution_time?.is_resolved ? 'resolved' : 'active'}
                />
                <MetricItem 
                  icon="🔄"
                  label="Assignment Changes"
                  value={debrief?.handoff_count || 0}
                  subtitle={`${debrief?.groups_involved?.length || 0} groups involved`}
                />
                <MetricItem 
                  icon="💬"
                  label="Communication"
                  value={debrief?.note_count?.total || 0}
                  subtitle={`${debrief?.note_count?.comments || 0} comments, ${debrief?.note_count?.work_notes || 0} notes`}
                />
                <MetricItem 
                  icon="📈"
                  label="State Changes"
                  value={debrief?.state_changes || 0}
                  subtitle={`${debrief?.priority_changes || 0} priority changes`}
                />
                <MetricItem 
                  icon="⚡"
                  label="First Response"
                  value={debrief?.first_response_time?.display || 'No response'}
                  subtitle={debrief?.first_response_time?.response_by || ''}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Timeline Event Component
function TimelineEvent({ event, isLast }) {
  const getEventIcon = (event) => {
    switch (event.type) {
      case 'field_change':
        if (event.field === 'state') return '🔄';
        if (event.field === 'priority') return '⚡';
        if (event.field === 'assigned_to' || event.field === 'assignment_group') return '👤';
        return '✏️';
      case 'comment':
        return '💬';
      case 'work_note':
        return '📝';
      default:
        return '📌';
    }
  };

  const getEventColor = (event) => {
    switch (event.type) {
      case 'field_change': return '#0073e6';
      case 'comment': return '#28a745';
      case 'work_note': return '#ffc107';
      default: return '#6c757d';
    }
  };

  return (
    <div className="timeline-event">
      <div className="timeline-marker" style={{ backgroundColor: getEventColor(event) }}>
        <span className="timeline-icon">{getEventIcon(event)}</span>
      </div>
      {!isLast && <div className="timeline-connector"></div>}
      
      <div className="timeline-content">
        <div className="timeline-header">
          <span className="timeline-time">
            {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString()}
          </span>
          <span className="timeline-user">{event.user}</span>
        </div>
        
        <div className="timeline-body">
          {event.type === 'field_change' ? (
            <span className="timeline-change">{event.change_description}</span>
          ) : (
            <div className="timeline-note">
              <div className="note-type">{event.type === 'comment' ? 'Comment' : 'Work Note'}</div>
              <div className="note-content">
                {event.content.length > 200 ? 
                  event.content.substring(0, 200) + '...' : 
                  event.content
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Metric Item Component
function MetricItem({ icon, label, value, subtitle, status }) {
  return (
    <div className="metric-item">
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      {status && <div className={`metric-status ${status}`}>{status}</div>}
    </div>
  );
}