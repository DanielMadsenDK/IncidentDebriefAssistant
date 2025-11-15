import React, { useState, useEffect } from 'react';
import './AnalysisPage.css';

export default function CIHealthHistoryCard({ incident, onLoad }) {
  const [ciHealth, setCIHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCIHealth = async () => {
      try {
        // Import service dynamically to avoid circular dependencies
        const { default: IncidentAnalysisService } = await import('../services/IncidentAnalysisService.js');
        const service = new IncidentAnalysisService();

        const healthData = await service.getCIHealthHistory(incident.sys_id, 48); // 48 hours pre-incident

        setCIHealth(healthData);
        if (onLoad) onLoad(healthData);

      } catch (err) {
        console.error('CI health history load error:', err);
        setError(err.message || 'Failed to load CI health data');
        setCIHealth(null);
      } finally {
        setLoading(false);
      }
    };

    if (incident?.sys_id && incident?.cmdb_ci) {
      loadCIHealth();
    } else {
      setLoading(false);
      setCIHealth(null);
      if (onLoad) onLoad({ error: 'No CI associated with incident' });
    }
  }, [incident?.sys_id, incident?.cmdb_ci]);

  if (!incident?.cmdb_ci) {
    return (
      <div className="debrief-card">
        <div className="card-header">
          <h2 className="card-title">🏥 CI Health History</h2>
        </div>
        <div className="card-content">
          <p className="text-muted">No Configuration Item associated with this incident.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="debrief-card">
        <div className="card-header">
          <h2 className="card-title">🏥 CI Health History</h2>
        </div>
        <div className="card-content">
          <div className="loading">Loading CI health analysis...</div>
        </div>
      </div>
    );
  }

  if (error || !ciHealth?.success) {
    return (
      <div className="debrief-card">
        <div className="card-header">
          <h2 className="card-title">🏥 CI Health History</h2>
        </div>
        <div className="card-content">
          <div className="error">
            Error: {error || ciHealth?.error || 'Failed to load CI health data'}
          </div>
        </div>
      </div>
    );
  }

  const healthData = ciHealth.data;
  if (!healthData) {
    return (
      <div className="debrief-card">
        <div className="card-header">
          <h2 className="card-title">🏥 CI Health History</h2>
        </div>
        <div className="card-content">
          <p className="text-muted">No CI health data available.</p>
        </div>
      </div>
    );
  }

  const getStressLevelColor = (level) => {
    switch (level) {
      case 'high': return '#f56565';
      case 'medium': return '#ed8936';
      default: return '#48bb78';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#f56565';
  };

  return (
    <div className="debrief-card">
      <div className="card-header">
        <h2 className="card-title">
          🏥 CI Health History
          <span className="metric-badge" style={{ backgroundColor: getHealthScoreColor(healthData.stress_indicators?.health_score || 0) }}>
            Health: {healthData.stress_indicators?.health_score || 0}/100
          </span>
        </h2>
      </div>
      <div className="card-content">
        <div className="ci-health-info">
          {/* CI Basic Information */}
          <div className="ci-section">
            <h4>Configuration Item</h4>
            <div className="ci-details-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{healthData.ci_info.name || 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Class:</span>
                <span className="detail-value">{healthData.ci_info.class || 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{healthData.ci_info.operational_status || 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Discovered:</span>
                <span className="detail-value">{healthData.ci_info.last_discovered || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Analysis Time Window */}
          <div className="ci-section">
            <h4>Analysis Window</h4>
            <div className="timeline-info">
              <div>Pre-incident: {healthData.health_analysis.time_window.pre_incident_hours} hours</div>
              <div>Incident occurred: {new Date(healthData.health_analysis.time_window.incident_opened_at * 1000).toLocaleString()}</div>
            </div>
          </div>

          {/* Stress Indicators */}
          <div className="ci-section">
            <h4>CI Stress Indicators</h4>
            <div className="stress-indicators-grid">
              <div className="indicator-item">
                <span className="indicator-label">Overload:</span>
                <span className="indicator-value" style={{ color: getStressLevelColor(healthData.stress_indicators?.overload_indicator) }}>
                  {healthData.stress_indicators?.overload_indicator?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <div className="indicator-item">
                <span className="indicator-label">Stability Risk:</span>
                <span className="indicator-value" style={{ color: getStressLevelColor(healthData.stress_indicators?.stability_risk) }}>
                  {healthData.stress_indicators?.stability_risk?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <div className="indicator-item">
                <span className="indicator-label">Correlation Score:</span>
                <span className="indicator-value">{healthData.correlation_score || 0}</span>
              </div>
            </div>

            {healthData.stress_indicators?.correlation_insights?.length > 0 && (
              <div className="insight-list">
                <h5>Key Insights:</h5>
                <ul>
                  {healthData.stress_indicators.correlation_insights.map((insight, index) => (
                    <li key={index} className="insight-item">{insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Related Activity */}
          <div className="ci-section">
            <h4>Related Activity (During Analysis Window)</h4>
            <div className="activity-grid">
              <div className="activity-count">
                <span className="activity-label">Other Incidents:</span>
                <span className="activity-value">{healthData.related_activity?.pre_incident_incidents?.length || 0}</span>
              </div>
              <div className="activity-count">
                <span className="activity-label">Change Requests:</span>
                <span className="activity-value">{healthData.related_activity?.related_change_requests?.length || 0}</span>
              </div>
              <div className="activity-count">
                <span className="activity-label">SLA Breaches:</span>
                <span className="activity-value" style={{ color: healthData.related_activity?.sla_events?.filter(s => s.breached).length > 0 ? '#f56565' : '#48bb78' }}>
                  {healthData.related_activity?.sla_events?.filter(s => s.breached).length || 0}
                </span>
              </div>
            </div>

            {healthData.related_activity?.pre_incident_incidents?.length > 0 && (
              <div className="incidents-list">
                <h5>Other Incidents on Same CI:</h5>
                <div className="incidents-table">
                  {healthData.related_activity.pre_incident_incidents.slice(0, 5).map((inc, idx) => (
                    <div key={idx} className="incident-row">
                      <span className="incident-number">{inc.number}</span>
                      <span className="incident-priority">P{inc.priority}</span>
                      <span className="incident-state">{inc.state}</span>
                      <span className="incident-summary">{inc.short_description?.substring(0, 50) || ''}</span>
                    </div>
                  ))}
                  {healthData.related_activity.pre_incident_incidents.length > 5 && (
                    <div className="show-more">... and {healthData.related_activity.pre_incident_incidents.length - 5} more</div>
                  )}
                </div>
              </div>
            )}

            {healthData.related_activity?.related_change_requests?.length > 0 && (
              <div className="changes-list">
                <h5>Change Requests During Period:</h5>
                <div className="changes-table">
                  {healthData.related_activity.related_change_requests.slice(0, 3).map((change, idx) => (
                    <div key={idx} className="change-row">
                      <span className="change-number">{change.number}</span>
                      <span className="change-type">{change.type}</span>
                      <span className="change-state">{change.state}</span>
                    </div>
                  ))}
                  {healthData.related_activity.related_change_requests.length > 3 && (
                    <div className="show-more">... and {healthData.related_activity.related_change_requests.length - 3} more changes</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
