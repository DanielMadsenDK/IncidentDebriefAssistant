export default function IncidentAnalysisService() {
  this.scriptInclude = 'x_1118332_incident.IncidentAnalysisUtils';
}

IncidentAnalysisService.prototype.getIncident = async function(sysId) {
  // This method is not needed since we get incident data from the server-side analysis
  // But keeping it for compatibility
  try {
    const analysis = await this.callScriptInclude('generateIncidentAnalysis', { sys_id: sysId });
    if (analysis.success) {
      return analysis.incident;
    } else {
      throw new Error(analysis.error || 'Failed to get incident');
    }
  } catch (error) {
    console.error('Get incident error:', error);
    throw new Error('Failed to get incident: ' + error.message);
  }
};

IncidentAnalysisService.prototype.analyzeIncident = async function(sysId) {
  try {
    console.log('Analyzing incident with sys_id:', sysId);
    console.log('Using script include:', this.scriptInclude);

    // Use the server-side Script Include for analysis
    const analysis = await this.callScriptInclude('generateIncidentAnalysis', { sys_id: sysId });

    console.log('Analysis result:', analysis);

    if (!analysis.success) {
      throw new Error(analysis.error || 'Analysis failed');
    }

    return {
      incident: analysis.incident,
      timeline: analysis.timeline,
      debrief: analysis.debrief,
      // Transform debrief data into the expected format for the UI
      rootCause: analysis.debrief.cause_summary,
      impact: this.formatImpactAssessment(analysis.incident, analysis.debrief),
      recommendations: this.generateRecommendations(analysis.debrief),
      preventionMeasures: this.generatePreventionMeasures(analysis.debrief)
    };
  } catch (error) {
    console.error('Analyze incident error:', error);
    throw new Error('Failed to analyze incident: ' + error.message);
  }
};

IncidentAnalysisService.prototype.callScriptInclude = function(methodName, parameters) {
  if (!parameters) {
    parameters = {};
  }
  return new Promise(function(resolve, reject) {
    try {
      console.log('Creating GlideAjax for method:', methodName);
      console.log('Parameters:', parameters);

      const ga = new GlideAjax(this.scriptInclude);
      ga.addParam('sysparm_name', methodName);

      // Add all parameters
      Object.keys(parameters).forEach(function(key) {
        ga.addParam('sysparm_' + key, parameters[key]);
      });

      ga.getXMLAnswer(function(response) {
        try {
          console.log('Raw server response:', response);

          if (!response) {
            reject(new Error('Empty response from server'));
            return;
          }

          const result = JSON.parse(response);
          console.log('Parsed analysis result:', result);
          resolve(result);
        } catch (parseError) {
          console.error('Parse error:', parseError, 'Response:', response);
          reject(new Error('Failed to parse server response: ' + parseError.message));
        }
      });
    } catch (error) {
      console.error('GlideAjax setup error:', error);
      reject(new Error('Failed to setup server request: ' + error.message));
    }
  }.bind(this));
};

IncidentAnalysisService.prototype.formatImpactAssessment = function(incident, debrief) {
    const priority = incident.priority || 'Unknown';
    const state = incident.state || 'Unknown';
    const resolutionTime = debrief.resolution_time;
    const handoffs = debrief.handoff_count;

    let assessment = `Priority ${priority} incident affecting business operations. `;

    if (resolutionTime.is_resolved) {
      assessment += `Resolved in ${resolutionTime.display}. `;
    } else {
      assessment += `Currently active for ${resolutionTime.display}. `;
    }

    if (handoffs > 0) {
      assessment += `Involved ${handoffs} assignment changes across ${debrief.groups_involved.length} groups. `;
    }

    assessment += `Generated ${debrief.note_count.total} notes (${debrief.note_count.comments} comments, ${debrief.note_count.work_notes} work notes). `;

    // Add Phase 1 & 2 advanced metrics to impact assessment
    if (incident.ci_impact_network && incident.ci_impact_network.impact_score) {
      assessment += `Configuration Item impact score: ${incident.ci_impact_network.impact_score}/10`;
      if (incident.ci_impact_network.impacted_services && incident.ci_impact_network.impacted_services.length > 0) {
        assessment += ` - affecting ${incident.ci_impact_network.impacted_services.length} business services. `;
      } else {
        assessment += '. ';
      }
    }

    if (incident.change_interventions && incident.change_interventions.changes_implemented > 0) {
      assessment += `Involves ${incident.change_interventions.changes_implemented} implemented changes. `;
    }

    if (incident.assignee_workload && incident.assignee_workload.overall_score) {
      assessment += `Assignment workload score: ${incident.assignee_workload.overall_score}/100. `;
    }

    if (incident.categorization_quality && incident.categorization_quality.confidence_score) {
      assessment += `Category confidence: ${incident.categorization_quality.confidence_score}%. `;
    }

    // Add existing metrics
    if (incident.hierarchy && incident.hierarchy.complexity) {
      assessment += `Hierarchy complexity: ${incident.hierarchy.complexity.score}/10. `;
    }

    if (incident.sla_compliance && incident.sla_compliance.score !== undefined) {
      assessment += `SLA compliance: ${incident.sla_compliance.score}%. `;
    }

    if (incident.resolution_quality) {
      assessment += `Resolution quality: ${incident.resolution_quality.score}/100. `;
    }

    if (incident.problem_link) {
      assessment += `Linked to problem record. `;
    }

    if (incident.close_code) {
      assessment += `Closed with code: ${incident.close_code}. `;
    }

    if (incident.reopen_count > 0) {
      assessment += `Reopened ${incident.reopen_count} time(s). `;
    }

    return assessment;
  }

IncidentAnalysisService.prototype.generateRecommendations = function(debrief) {
    const recommendations = [];
    
    // Based on resolution time
    if (debrief.resolution_time.value > 86400) { // > 1 day
      recommendations.push("Consider escalation procedures for incidents taking longer than 24 hours");
    }

    // Based on handoffs
    if (debrief.handoff_count > 3) {
      recommendations.push("Review assignment process - multiple handoffs may indicate unclear responsibility");
    }

    // Based on groups involved
    if (debrief.groups_involved.length > 2) {
      recommendations.push("Implement better cross-team communication for multi-group incidents");
    }

    // Based on state changes
    if (debrief.state_changes > 5) {
      recommendations.push("Reduce unnecessary state changes to improve incident tracking");
    }

    // Based on priority changes
    if (debrief.priority_changes > 1) {
      recommendations.push("Review initial priority assessment process to avoid multiple changes");
    }

    // Based on response time
    if (debrief.first_response_time.value > 3600) { // > 1 hour
      recommendations.push("Improve first response time - currently exceeding 1 hour");
    }

    // New recommendations based on enhanced metrics
    if (debrief.resolution_quality && debrief.resolution_quality.score < 60) {
      recommendations.push("Review resolution documentation and close code practices");
      recommendations.push("Provide training on proper incident closure procedures");
    }

    if (debrief.hierarchy_complexity && debrief.hierarchy_complexity.score > 3) {
      recommendations.push("Complex incident hierarchies may indicate systemic issues - consider problem management escalation");
    }

    if (debrief.sla_compliance_score && debrief.sla_compliance_score.score < 80) { // SLA below 80%
      recommendations.push("Review SLA performance and response time goals");
      recommendations.push("Consider process improvements for better SLA compliance");
    }

    if (debrief.reopen_count > 1) {
      recommendations.push("Multiple reopens indicate solution verification issues - review post-resolution monitoring");
    }

    // General recommendations
    recommendations.push("Document lessons learned for future reference");
    recommendations.push("Review incident handling procedures based on timeline analysis");

    return recommendations;
  }

IncidentAnalysisService.prototype.generatePreventionMeasures = function(debrief) {
    const measures = [];
    const causeSummary = debrief.cause_summary.toLowerCase();

    // Based on identified cause patterns
    if (causeSummary.includes('network') || causeSummary.includes('connectivity')) {
      measures.push("Implement network monitoring and alerting");
      measures.push("Review network redundancy and failover procedures");
    } else if (causeSummary.includes('server') || causeSummary.includes('system')) {
      measures.push("Enhance system monitoring and health checks");
      measures.push("Implement proactive system maintenance schedules");
    } else if (causeSummary.includes('application') || causeSummary.includes('software')) {
      measures.push("Improve application testing and deployment procedures");
      measures.push("Implement application performance monitoring");
    } else if (causeSummary.includes('user') || causeSummary.includes('access')) {
      measures.push("Review user access management procedures");
      measures.push("Enhance user training and documentation");
    } else if (causeSummary.includes('performance')) {
      measures.push("Implement performance baselines and monitoring");
      measures.push("Review capacity planning procedures");
    } else if (causeSummary.includes('hardware')) {
      measures.push("Implement predictive hardware maintenance");
      measures.push("Review hardware monitoring and replacement schedules");
    }

    // General prevention measures based on metrics
    if (debrief.handoff_count > 2) {
      measures.push("Improve initial triage and assignment accuracy");
    }

    if (debrief.resolution_time.value > 172800) { // > 2 days
      measures.push("Implement escalation thresholds for long-running incidents");
    }

    // Always include these general measures
    measures.push("Regular review of incident patterns and trends");
    measures.push("Update knowledge base with resolution information");
    measures.push("Cross-training team members on critical systems");

    return measures;
  },

IncidentAnalysisService.prototype.getCIHealthHistory = function(incidentSysId, preIncidentHours) {
  if (typeof preIncidentHours === 'undefined') {
    preIncidentHours = 48;
  }
  const self = this;
  return new Promise(function(resolve, reject) {
    try {
      const response = self.callScriptInclude('getCIHealthHistoryDuringIncident', {
        sys_id: incidentSysId,
        pre_incident_window_hours: preIncidentHours
      });
      response.then(resolve).catch(function(error) {
        console.error('CI health history error:', error);
        reject(new Error('Failed to get CI health history: ' + error.message));
      });
    } catch (error) {
      console.error('CI health history setup error:', error);
      reject(new Error('Failed to setup CI health history request: ' + error.message));
    }
  });
};
