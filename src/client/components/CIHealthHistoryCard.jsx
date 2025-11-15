import React, { useState, useEffect } from 'react';
import './AnalysisPage.css';

// Health Score Gauge Component
function HealthScoreGauge({ score }) {
  const radius = 36;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  const getHealthColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#f56565';
  };

  const getHealthLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Moderate';
    return 'Critical';
  };

  return (
    <div className="health-score-gauge">
      <svg className="gauge-svg" width="100" height="100" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={getHealthColor(score)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="gauge-progress"
        />
      </svg>
      <div className="gauge-center">
        <div className="gauge-score">{score}</div>
        <div className="gauge-label">{getHealthLabel(score)}</div>
      </div>
    </div>
  );
}

// Risk Indicator Card Component
function RiskIndicatorCard({ title, value, color, icon, description }) {
  return (
    <div className="risk-indicator-card">
      <div className="risk-indicator-header">
        <span className="risk-indicator-icon">{icon}</span>
        <span className="risk-indicator-title">{title}</span>
      </div>
      <div className="risk-indicator-value" style={{ color }}>
        {value}
      </div>
      <div className="risk-indicator-description">
        {description}
      </div>
      <div className="risk-indicator-bar">
        <div
          className="risk-indicator-fill"
          style={{
            backgroundColor: color,
            width: value === 'HIGH' ? '90%' : value === 'MEDIUM' ? '60%' : '20%'
          }}
        ></div>
      </div>
    </div>
  );
}

// Correlation Meter Component
function CorrelationMeter({ score }) {
  const maxScore = 20; // Based on our algorithm
  const percentage = Math.min((score / maxScore) * 100, 100);

  const getCorrelationColor = (score) => {
    if (score >= 15) return '#f56565'; // High correlation (red)
    if (score >= 8) return '#ed8936';  // Medium correlation (orange)
    return '#48bb78'; // Low correlation (green)
  };

  const getCorrelationLabel = (score) => {
    if (score >= 15) return 'Strong Correlation';
    if (score >= 8) return 'Moderate Correlation';
    return 'Weak Correlation';
  };

  return (
    <div className="correlation-meter">
      <div className="correlation-meter-value">
        {score}
      </div>
      <div className="correlation-meter-bar">
        <div
          className="correlation-meter-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: getCorrelationColor(score)
          }}
        ></div>
      </div>
      <div className="correlation-meter-label">
        {getCorrelationLabel(score)}
      </div>
    </div>
  );
}

// Activity Metric Card Component
function ActivityMetricCard({ icon, label, value, color, trend }) {
  return (
    <div className="activity-metric-card">
      <div className="activity-metric-icon" style={{ color }}>
        {icon}
      </div>
      <div className="activity-metric-content">
        <div className="activity-metric-value">{value}</div>
        <div className="activity-metric-label">{label}</div>
        <div className="activity-metric-trend">{trend}</div>
      </div>
      <div className="activity-metric-indicator">
        <div
          className="activity-metric-dot"
          style={{ backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
}

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
    <div className="ci-health-premium-card">
      {/* Premium Header Banner */}
      <div className="ci-health-header-banner">
        <div className="ci-health-header-overlay">
          <div className="ci-health-header-content">
            <div className="ci-health-header-primary">
              <span className="ci-health-icon-pulse">💻</span>
              <div className="ci-health-header-titles">
                <h2 className="ci-health-main-title">Configuration Item Health Analysis</h2>
                <p className="ci-health-subtitle">{healthData.ci_info.name || 'Unknown Configuration Item'}</p>
              </div>
            </div>
            <HealthScoreGauge score={healthData.stress_indicators?.health_score || 0} />
          </div>

          {/* Time Window Indicator */}
          <div className="ci-health-timeline-indicator">
            <div className="timeline-window-badge">
              <span className="window-icon">⏰</span>
              <span className="window-text">
                {healthData.health_analysis.time_window.pre_incident_hours}hr analysis window
              </span>
            </div>
            <div className="incident-marker">
              <span className="marker-dot"></span>
              <span className="marker-label">Incident at {new Date(healthData.health_analysis.time_window.incident_opened_at * 1000).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Animated gradient border */}
        <div className="ci-health-header-glow"></div>
      </div>

      {/* Main Dashboard Content */}
      <div className="ci-health-content-wrapper">
        {/* CI Details Ribbon */}
        <div className="ci-details-ribbon">
          <div className="ci-detail-item">
            <span className="ci-detail-icon">🏷️</span>
            <span className="ci-detail-label">Class:</span>
            <span className="ci-detail-value">{healthData.ci_info.class || 'Unknown'}</span>
          </div>
          <div className="ci-detail-item">
            <span className="ci-detail-icon">⚡</span>
            <span className="ci-detail-label">Status:</span>
            <span className={`ci-detail-value status-${healthData.ci_info.operational_status?.toLowerCase()}`}>
              {healthData.ci_info.operational_status || 'Unknown'}
            </span>
          </div>
          <div className="ci-detail-item">
            <span className="ci-detail-icon">🔄</span>
            <span className="ci-detail-label">Install Status:</span>
            <span className="ci-detail-value status-installed">
              {healthData.ci_info.install_status || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Risk Assessment Panel */}
        <div className="ci-risk-assessment-panel">
          <h3 className="risk-panel-title">
            <span className="risk-panel-icon">🎯</span>
            Risk Assessment Dashboard
          </h3>

          <div className="risk-indicators-grid">
            <RiskIndicatorCard
              title="Overload Indicator"
              value={healthData.stress_indicators?.overload_indicator?.toUpperCase() || 'UNKNOWN'}
              color={getStressLevelColor(healthData.stress_indicators?.overload_indicator)}
              icon="📊"
              description="Current incident concurrency level"
            />
            <RiskIndicatorCard
              title="Stability Risk"
              value={healthData.stress_indicators?.stability_risk?.toUpperCase() || 'UNKNOWN'}
              color={getStressLevelColor(healthData.stress_indicators?.stability_risk)}
              icon="⚖️"
              description="Change activity and SLA pressure"
            />
          </div>

          {/* Correlation Score */}
          <div className="correlation-score-display">
            <div className="correlation-header">
              <span className="correlation-icon">🔗</span>
              <span className="correlation-title">Activity Correlation Score</span>
            </div>
            <CorrelationMeter score={healthData.correlation_score || 0} />
            <p className="correlation-description">
              Weighted score based on incident frequency, changes, and SLA breaches during analysis window
            </p>
          </div>
        </div>

        {/* Activity Analysis Section */}
        <div className="ci-activity-analysis-section">
          <h3 className="activity-section-title">
            <span className="activity-section-icon">📈</span>
            Activity Correlation Analysis
          </h3>

          <div className="activity-metrics-dashboard">
            <ActivityMetricCard
              icon="🚨"
              label="Concurrent Incidents"
              value={healthData.related_activity?.pre_incident_incidents?.length || 0}
              color="#f56565"
              trend="incidents affecting same CI"
            />
            <ActivityMetricCard
              icon="🔧"
              label="Change Requests"
              value={healthData.related_activity?.related_change_requests?.length || 0}
              color="#ed8936"
              trend="changes during window"
            />
            <ActivityMetricCard
              icon="⏱️"
              label="SLA Breaches"
              value={healthData.related_activity?.sla_events?.filter(s => s.breached).length || 0}
              color="#dc3545"
              trend="service level violations"
            />
          </div>
        </div>

        {/* Insights Panel */}
        {healthData.stress_indicators?.correlation_insights?.length > 0 && (
          <div className="ci-insights-panel">
            <h3 className="insights-panel-title">
              <span className="insights-panel-icon">💡</span>
              AI-Generated Insights
            </h3>

            <div className="insights-list">
              {healthData.stress_indicators.correlation_insights.map((insight, index) => (
                <div key={index} className="insight-card">
                  <div className="insight-icon">🎯</div>
                  <div className="insight-content">
                    <p className="insight-text">{insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incident Details Gallery */}
        {healthData.related_activity?.pre_incident_incidents?.length > 0 && (
          <div className="incident-gallery-section">
            <h3 className="gallery-section-title">
              <span className="gallery-section-icon">📋</span>
              Related Incidents Gallery
              <span className="gallery-count">({healthData.related_activity.pre_incident_incidents.length})</span>
            </h3>

            <div className="incident-cards-grid">
              {healthData.related_activity.pre_incident_incidents.slice(0, 6).map((inc, idx) => (
                <div key={idx} className="incident-card">
                  <div className="incident-card-header">
                    <span className="incident-card-number">{inc.number}</span>
                    <span className={`incident-card-priority priority-${inc.priority}`}>
                      P{inc.priority}
                    </span>
                  </div>
                  <div className="incident-card-state">
                    <span className={`state-badge state-${inc.state?.toLowerCase()?.replace(/\s+/g, '-')}`}>
                      {inc.state}
                    </span>
                  </div>
                  <div className="incident-card-description">
                    <p>{inc.short_description?.substring(0, 80) || 'No description available'}</p>
                  </div>
                  <div className="incident-card-meta">
                    <span className="incident-card-time">
                      {new Date(inc.opened_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {healthData.related_activity.pre_incident_incidents.length > 6 && (
              <div className="gallery-show-more">
                <span className="show-more-icon">📚</span>
                <span className="show-more-text">
                  View all {healthData.related_activity.pre_incident_incidents.length} incidents...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
