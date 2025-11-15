import React, { useState, useEffect } from 'react';
import './AnalysisPage.css';

// Metric Item Component (used locally in this component)
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
    <div className="debrief-card">
      <div className="card-header">
        <h2 className="card-title">
          💻 CI Health Analysis
          <span className="ci-health-score-badge" style={{
            backgroundColor: getHealthScoreColor(healthData.stress_indicators?.health_score || 0),
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '700',
            marginLeft: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <span>{healthData.stress_indicators?.health_score || 0}</span>
          </span>
        </h2>
      </div>
      <div className="card-content">
        <div className="ci-health-grid">
          {/* CI Configuration Details - Compact 2-column layout */}
          <div className="ci-config-header">
            <div className="config-column">
              <div className="config-label">Configuration Item</div>
              <div className="config-value ci-name">{healthData.ci_info.name || 'Unknown Configuration Item'}</div>
            </div>
            <div className="config-column">
              <div className="config-label">Analysis Window</div>
              <div className="config-value analysis-window">{healthData.health_analysis.time_window.pre_incident_hours} hours pre-incident</div>
            </div>
          </div>

          {/* Key Health Metrics */}
          <div className="metrics-grid">
            <MetricItem
              icon="📊"
              label="Overload Risk"
              value={healthData.stress_indicators?.overload_indicator?.toUpperCase() || 'UNKNOWN'}
              status={healthData.stress_indicators?.overload_indicator?.toLowerCase() || 'unknown'}
            />
            <MetricItem
              icon="⚖️"
              label="Stability Risk"
              value={healthData.stress_indicators?.stability_risk?.toUpperCase() || 'UNKNOWN'}
              status={healthData.stress_indicators?.stability_risk?.toLowerCase() || 'unknown'}
            />
            <MetricItem
              icon="🔗"
              label="Correlation Score"
              value={`${healthData.correlation_score || 0}/20`}
              subtitle="Activity correlation level"
            />
            <MetricItem
              icon="⚡"
              label="CI Class"
              value={healthData.ci_info.class || 'Unknown'}
              subtitle="Configuration item type"
            />
            <MetricItem
              icon="🚨"
              label="Concurrent Incidents"
              value={healthData.related_activity?.pre_incident_incidents?.length || 0}
              subtitle="Affecting same CI"
            />
            <MetricItem
              icon="🔧"
              label="Change Requests"
              value={healthData.related_activity?.related_change_requests?.length || 0}
              subtitle="During analysis window"
            />
          </div>

          {/* AI Insights */}
          {healthData.stress_indicators?.correlation_insights?.length > 0 && (
            <div className="actions-grid">
              <div className="action-section">
                <h4 className="section-title">💡 Key Health Insights</h4>
                <ul className="action-list">
                  {healthData.stress_indicators.correlation_insights.slice(0, 3).map((insight, index) => (
                    <li key={index} className="action-item">🎯 {insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
