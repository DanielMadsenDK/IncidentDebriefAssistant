import React, { useState, useEffect, useRef } from 'react';
import IncidentAnalysisService from '../services/IncidentAnalysisService.js';
import CIHealthHistoryCard from './CIHealthHistoryCard';
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
                {/* New enhanced metrics */}
                {debrief?.resolution_quality && (
                  <MetricItem
                    icon="🏆"
                    label="Resolution Quality"
                    value={`${debrief.resolution_quality.score || 0}/100`}
                    subtitle={debrief.resolution_quality.factors?.[0] || ''}
                  />
                )}
                {debrief?.hierarchy_complexity && (
                  <MetricItem
                    icon="🔗"
                    label="Hierarchy Complexity"
                    value={`${debrief.hierarchy_complexity.score || 0}/10`}
                    subtitle={debrief.hierarchy_complexity.factors?.[0] || ''}
                  />
                )}
                {debrief?.sla_compliance_score && (
                  <MetricItem
                    icon="⏱️"
                    label="SLA Compliance"
                    value={`${debrief.sla_compliance_score.score || 0}%`}
                    subtitle={debrief.sla_compliance_score.factors?.join(', ') || ''}
                  />
                )}
                {incident?.close_code && (
                  <MetricItem
                    icon="📋"
                    label="Close Code"
                    value={incident.close_code}
                    subtitle={`Reopens: ${incident.reopen_count || 0}`}
                  />
                )}
                {incident?.problem_link && (
                  <MetricItem
                    icon="🎯"
                    label="Problem Linked"
                    value={incident.problem_link.number || 'Linked'}
                    subtitle={incident.problem_link.state === 'Closed' ? 'Resolved problem' : 'Active problem'}
                  />
                )}
                {incident?.ci_impact_network && incident.ci_impact_network.primary_ci && (
                  <MetricItem
                    icon="🔬"
                    label="CI Network Analysis"
                    value={`Impact: ${incident.ci_impact_network.impact_score || 0}/10`}
                    subtitle={`${incident.ci_impact_network.dependencies?.length || 0} dependencies, ${(incident.ci_impact_network.impacted_services || []).length} services`}
                  />
                )}
                {incident?.change_interventions && incident.change_interventions.related_changes?.length > 0 && (
                  <MetricItem
                    icon="🔧"
                    label="Change Interventions"
                    value={incident.change_interventions.changes_implemented || 0}
                    subtitle={`${incident.change_interventions.related_changes.length} changes linked`}
                  />
                )}
                {incident?.assignee_workload && (
                  <MetricItem
                    icon="⚖️"
                    label="Assignment Workload"
                    value={`${incident.assignee_workload.overall_score || 0}/100`}
                    subtitle={`${incident.assignee_workload.assignee_history?.length || 0} assignment events`}
                  />
                )}
                {incident?.categorization_quality && (
                  <MetricItem
                    icon="🏷️"
                    label="Category Confidence"
                    value={`${incident.categorization_quality.confidence_score || 0}%`}
                    subtitle={`${(incident.categorization_quality.suggestions || []).length} improvement suggestions`}
                  />
                )}
                {incident?.ci_details && (
                  <MetricItem
                    icon="💻"
                    label="Configuration Item"
                    value={incident.ci_details.name || 'N/A'}
                    subtitle={`Class: ${incident.ci_details.class || 'Unknown'}`}
                  />
                )}
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
            {/* Related Records */}
            {(incident?.hierarchy?.has_parent || incident?.problem_link || incident?.ci_details || incident?.sla_compliance?.length > 0) && (
              <RelatedRecordsCard incident={incident} />
            )}

            {/* CI Health History */}
            <CIHealthHistoryCard incident={incident} />

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

  // Sort timeline data chronologically
  const sortedTimelineData = [...timelineData].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  // Transform timeline data into timeline items
  const timelineItems = sortedTimelineData.map((event, index) => {
    const type = event.type;
    let title, subtitle, duration, description, achievements, icon;

    if (type === 'field_change') {
      title = event.change_description;
      subtitle = event.user;
      duration = new Date(event.timestamp).toLocaleDateString();
      description = type.replace('_', ' ').toUpperCase();
      achievements = [];
      icon = getEventIcon(event);
    } else {
      // Comment or work note
      title = type === 'comment' ? 'Comment Added' : 'Work Note Added';
      subtitle = event.user;
      duration = new Date(event.timestamp).toLocaleDateString();
      description = event.content.length > 150
        ? event.content.substring(0, 150) + '...'
        : event.content;
      achievements = event.content.length > 150 ? [event.content.substring(150)] : [];
      icon = type === 'comment' ? '💬' : '📝';
    }

    return {
      id: index,
      type: type,
      title: title,
      subtitle: subtitle,
      duration: duration,
      description: description,
      achievements: achievements,
      icon: icon,
      timestamp: event.timestamp
    };
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (timelineItems.length === 0) {
    return <div className="no-timeline-data">No timeline events available</div>;
  }

  return (
    <div className="horizontal-timeline-container">
      {/* Scrollable timeline viewport */}
      <div className="horizontal-timeline-viewport">
        <div className="horizontal-timeline-events-container">
          {timelineItems.map((item) => (
            <div key={item.id} className="horizontal-timeline-item">
              {/* Timeline point */}
              <div className="horizontal-timeline-point">
                <div className="horizontal-timeline-dot">
                  <span className="horizontal-timeline-icon">{item.icon}</span>
                </div>
              </div>

              {/* Event card */}
              <div className="horizontal-timeline-card">
                <div
                  className="horizontal-event-card"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="horizontal-event-header">
                    <span className="horizontal-event-icon">{item.icon}</span>
                    <h3 className="horizontal-event-title">{item.title}</h3>
                  </div>
                  <p className="horizontal-event-subtitle">{item.subtitle}</p>
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

      {/* Timeline bar connector */}
      <div className="horizontal-timeline-bar"></div>
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

// Related Records Card Component
function RelatedRecordsCard({ incident }) {
  return (
    <div className="debrief-card">
      <div className="card-header">
        <h2 className="card-title">
          🔗 Related Records
        </h2>
      </div>
      <div className="card-content">
        <div className="related-records-grid">
          {incident?.hierarchy?.has_parent && incident.hierarchy.parent_incident && (
            <div className="related-record-item">
              <div className="related-record-icon">⬆️</div>
              <div className="related-record-info">
                <div className="related-record-label">Parent Incident</div>
                <div className="related-record-value">{incident.hierarchy.parent_incident.number}</div>
                <div className="related-record-meta">
                  {incident.hierarchy.parent_incident.state} • {new Date(incident.hierarchy.parent_incident.opened_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {incident?.hierarchy?.child_count > 0 && (
            <div className="related-record-item">
              <div className="related-record-icon">⬇️</div>
              <div className="related-record-info">
                <div className="related-record-label">Child Incidents</div>
                <div className="related-record-value">{incident.hierarchy.child_count} incidents</div>
                <div className="related-record-meta">Spawned during resolution</div>
              </div>
            </div>
          )}

          {incident?.problem_link && (
            <div className="related-record-item">
              <div className="related-record-icon">🎯</div>
              <div className="related-record-info">
                <div className="related-record-label">Problem Record</div>
                <div className="related-record-value">{incident.problem_link.number}</div>
                <div className="related-record-meta">
                  {incident.problem_link.state} • {new Date(incident.problem_link.opened_at).toLocaleDateString()}
                  {incident.problem_link.resolved_at && ` · Resolved ${new Date(incident.problem_link.resolved_at).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          )}

          {incident?.ci_details && (
            <div className="related-record-item">
              <div className="related-record-icon">💻</div>
              <div className="related-record-info">
                <div className="related-record-label">Configuration Item</div>
                <div className="related-record-value">{incident.ci_details.name}</div>
                <div className="related-record-meta">
                  {incident.ci_details.class} • {incident.ci_details.install_status}
                  {incident.ci_details.impact && ` • Impact: ${incident.ci_details.impact}/5`}
                </div>
              </div>
            </div>
          )}

          {incident?.sla_compliance?.length > 0 && (
            <div className="related-record-item">
              <div className="related-record-icon">⏱️</div>
              <div className="related-record-info">
                <div className="related-record-label">SLA Records</div>
                <div className="related-record-value">{incident.sla_compliance.length} attached</div>
                <div className="related-record-meta">
                  {incident.sla_compliance.filter(sla => sla.stage === 'Breached').length} breached
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
