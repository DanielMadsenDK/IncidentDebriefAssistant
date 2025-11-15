import React, { useState, useEffect, useRef } from 'react';
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

  // Scroll to top when analysis page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
            Back
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
      {/* Premium Back Button */}
      <button onClick={onNavigateToLanding} className="analysis-back-button">
        ← Back
      </button>

      {/* Main Analysis Container */}
      <div className="analysis-card">
        {/* Premium Floating Header */}
        <div className="header-card">
          <div className="incident-header-content">
            <div className="incident-primary-info">
              <div className="incident-summary-badge">📋 Incident Analysis Report</div>
              <h1 className="incident-number" data-text={incident?.number}>{incident?.number}</h1>
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

        {/* Premium Content Sections */}
        <div className="content-grid">
          {/* Key Metrics Section */}
          <div className="debrief-card">
            <div className="card-header">
              <h2 className="card-title">
                📊 Key Performance Metrics
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

          {/* Comprehensive Timeline Section */}
          <div className="timeline-section">
            <div className="timeline-card">
              <div className="card-header">
                <h2 className="card-title">
                  🕐 Incident Timeline
                </h2>
                <span className="timeline-count">{timeline.length} events</span>
              </div>

              <div className="horizontal-timeline-container">
                <HorizontalTimeline timelineData={timeline} />
              </div>
            </div>
          </div>

          {/* Analysis & Recommendations */}
          <div className="debrief-section">
            {/* Root Cause Analysis */}
            <div className="debrief-card">
              <div className="card-header">
                <h2 className="card-title">
                  🔍 Analysis Summary
                </h2>
              </div>
              <div className="card-content">
                <div className="overview-grid">
                  <div className="overview-item">
                    <span className="overview-label">Root Cause Analysis</span>
                    <p className="overview-value">{analysisData?.rootCause || 'Analysis pending'}</p>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Business Impact Assessment</span>
                    <p className="overview-value">{analysisData?.impact || 'Assessment pending'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actionable Insights */}
            <div className="debrief-card">
              <div className="card-header">
                <h2 className="card-title">
                  💡 Actionable Insights
                </h2>
              </div>
              <div className="card-content">
                <div className="actions-grid">
                  <div className="action-section">
                    <h4 className="section-title">📋 Immediate Recommendations</h4>
                    <ul className="action-list">
                      {analysisData?.recommendations?.map((rec, index) => (
                        <li key={index} className="action-item">💡 {rec}</li>
                      )) || <li className="no-data">No recommendations available</li>}
                    </ul>
                  </div>
                  <div className="action-section">
                    <h4 className="section-title">🛡️ Prevention Measures</h4>
                    <ul className="action-list">
                      {analysisData?.preventionMeasures?.map((measure, index) => (
                        <li key={index} className="action-item">🛡️ {measure}</li>
                      )) || <li className="no-data">No prevention measures identified</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Horizontal Timeline Component
function HorizontalTimeline({ timelineData }) {
  const [expandedId, setExpandedId] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const timelineRef = useRef(null);

  // Helper function to get icons
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

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setContainerWidth(timelineRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Transform timeline data into timeline items
  const timelineItems = timelineData.map((event, index) => {
    const type = event.type;
    let title, company, duration, description, achievements, icon;

    if (type === 'field_change') {
      title = event.change_description;
      company = event.user;
      duration = new Date(event.timestamp).toLocaleDateString();
      description = `${event.field} change`;
      achievements = [];
      icon = getEventIcon(event);
    } else {
      // Comment or work note
      title = type === 'comment' ? 'Comment Added' : 'Work Note Added';
      company = event.user;
      duration = new Date(event.timestamp).toLocaleDateString();
      description = event.content.length > 100
        ? event.content.substring(0, 100) + '...'
        : event.content;
      achievements = event.content.length > 100 ? [event.content.substring(100)] : [];
      icon = type === 'comment' ? '💬' : '📝';
    }

    return {
      id: index,
      type: type,
      title: title,
      company: company,
      duration: duration,
      description: description,
      achievements: achievements,
      icon: icon,
      timestamp: event.timestamp
    };
  });

  // Calculate positions based on time
  const getPosition = (timestamp) => {
    if (timelineData.length <= 1) return 0;

    const times = timelineData.map(event => new Date(event.timestamp).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const currentTime = new Date(timestamp).getTime();

    const containerPadding = 120; // Account for event card widths
    const availableWidth = Math.max(0, containerWidth - containerPadding);

    if (maxTime === minTime) return 0;
    return ((currentTime - minTime) / (maxTime - minTime)) * availableWidth;
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (timelineItems.length === 0) {
    return <div className="no-timeline-data">No timeline events available</div>;
  }

  return (
    <div className="horizontal-timeline" ref={(el) => { timelineRef.current = el; }}>
      {/* Main timeline bar */}
      <div className="horizontal-timeline-bar"></div>

      {/* Timeline events */}
      <div className="horizontal-timeline-events">
        {timelineItems.map((item, index) => (
          <div
            key={item.id}
            className="horizontal-timeline-event-item"
            style={{
              left: `${getPosition(item.timestamp)}px`,
              top: index % 2 === 0 ? '-100px' : '20px'
            }}
          >
            {/* Timeline node */}
            <div className="horizontal-timeline-node">
              <div className="horizontal-timeline-dot">
                <span className="horizontal-timeline-icon">{item.icon}</span>
              </div>
            </div>

            {/* Content card */}
            <div className="horizontal-timeline-card">
              <div
                className="horizontal-event-card"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="horizontal-event-header">
                  <span className="horizontal-event-icon">{item.icon}</span>
                  <h3 className="horizontal-event-title">{item.title}</h3>
                </div>
                <p className="horizontal-event-company">{item.company}</p>
                <p className="horizontal-event-duration">{item.duration}</p>
                <p className="horizontal-event-description">{item.description}</p>

                {/* Expandable achievements */}
                <div
                  className="horizontal-event-achievements"
                  style={{
                    maxHeight: expandedId === item.id ? '500px' : '0',
                    opacity: expandedId === item.id ? 1 : 0,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {item.achievements && item.achievements.length > 0 && (
                    <div className="horizontal-achievements-list">
                      <h4 className="horizontal-achievements-title">Full Content:</h4>
                      {item.achievements.map((achievement, i) => (
                        <p key={i} className="horizontal-achievement-item">{achievement}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
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
    <div className="timeline-item">
      {!isLast && <div className="timeline-line"></div>}

      <div className="timeline-node">
        <div
          className="timeline-dot"
          style={{ backgroundColor: getEventColor(event) }}
        >
          <span className="timeline-icon">{getEventIcon(event)}</span>
        </div>
      </div>

      <div className="timeline-content">
        <div className="timeline-header">
          <span className="timeline-user">{event.user}</span>
          <span className="timeline-time">
            {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="timeline-body">
          {event.type === 'field_change' ? (
            <div className="timeline-change">
              <span className="change-text">{event.change_description}</span>
              <span className="event-type-badge">{event.type.replace('_', ' ')}</span>
            </div>
          ) : (
            <div className="timeline-note">
              <div className="note-header">
                <span className="note-type">{event.type === 'comment' ? '💭 Comment' : '📝 Work Note'}</span>
              </div>
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
