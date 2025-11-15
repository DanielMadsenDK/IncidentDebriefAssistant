var IncidentAnalysisUtils = Class.create();
IncidentAnalysisUtils.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
  
  searchIncidents: function() {
    var searchTerm = this.getParameter('sysparm_search_term');
    
    gs.info('IncidentAnalysisUtils.searchIncidents called with term: ' + searchTerm);
    
    if (!searchTerm) {
      return JSON.stringify({
        success: false,
        error: 'Search term is required'
      });
    }

    try {
      var results = this._performIncidentSearch(searchTerm);
      gs.info('IncidentAnalysisUtils.searchIncidents found ' + results.length + ' results');
      return JSON.stringify({
        success: true,
        results: results
      });
    } catch (ex) {
      gs.error('IncidentAnalysisUtils.searchIncidents error: ' + ex.getMessage());
      return JSON.stringify({
        success: false,
        error: 'Search failed: ' + ex.getMessage()
      });
    }
  },

  _performIncidentSearch: function(searchTerm) {
    var results = [];
    var gr = new GlideRecord('incident');
    
    // Build query based on search term
    if (searchTerm.toUpperCase().indexOf('INC') === 0) {
      // Search by incident number
      gr.addQuery('number', 'CONTAINS', searchTerm);
    } else {
      // Search in multiple fields
      var qc = gr.addQuery('number', 'CONTAINS', searchTerm);
      qc.addOrCondition('short_description', 'CONTAINS', searchTerm);
      qc.addOrCondition('description', 'CONTAINS', searchTerm);
    }
    
    gr.orderByDesc('sys_updated_on');
    gr.setLimit(20);
    gr.query();

    gs.info('IncidentAnalysisUtils._performIncidentSearch query: ' + gr.getEncodedQuery());

    while (gr.next()) {
      var incident = {
        sys_id: gr.getUniqueValue(),
        number: gr.getDisplayValue('number'),
        short_description: gr.getDisplayValue('short_description'),
        state: gr.getValue('state'),
        state_display: gr.getDisplayValue('state'),
        priority: gr.getValue('priority'),
        priority_display: gr.getDisplayValue('priority'),
        assignment_group: gr.getValue('assignment_group'),
        assignment_group_display: gr.getDisplayValue('assignment_group'),
        opened_at: gr.getDisplayValue('opened_at'),
        caller_id_display: gr.getDisplayValue('caller_id')
      };
      results.push(incident);
    }

    return results;
  },

  generateIncidentAnalysis: function() {
    var sys_id = this.getParameter('sysparm_sys_id');
    
    if (!sys_id) {
      return JSON.stringify({
        success: false,
        error: 'sys_id parameter is required'
      });
    }

    try {
      // Get the incident record
      var incident = this._getIncidentRecord(sys_id);
      if (!incident) {
        return JSON.stringify({
          success: false,
          error: 'Incident not found'
        });
      }

      // Build timeline from multiple sources
      var timeline = this._buildTimeline(sys_id);
      
      // Generate debrief metrics
      var debrief = this._generateDebrief(incident, timeline);

      return JSON.stringify({
        success: true,
        incident: incident,
        timeline: timeline,
        debrief: debrief
      });
    } catch (ex) {
      gs.error('IncidentAnalysisUtils.generateIncidentAnalysis error: ' + ex.getMessage());
      return JSON.stringify({
        success: false,
        error: 'Analysis failed: ' + ex.getMessage()
      });
    }
  },

  _getIncidentRecord: function(sys_id) {
    var gr = new GlideRecord('incident');
    if (!gr.get(sys_id)) {
      return null;
    }

    return {
      sys_id: gr.getUniqueValue(),
      number: gr.getDisplayValue('number'),
      short_description: gr.getDisplayValue('short_description'),
      description: gr.getDisplayValue('description'),
      state: gr.getDisplayValue('state'),
      priority: gr.getDisplayValue('priority'),
      category: gr.getDisplayValue('category'),
      subcategory: gr.getDisplayValue('subcategory'),
      assigned_to: gr.getDisplayValue('assigned_to'),
      assignment_group: gr.getDisplayValue('assignment_group'),
      opened_by: gr.getDisplayValue('opened_by'),
      opened_at: gr.getDisplayValue('opened_at'),
      resolved_at: gr.getDisplayValue('resolved_at'),
      closed_at: gr.getDisplayValue('closed_at'),
      caller_id: gr.getDisplayValue('caller_id'),
      business_service: gr.getDisplayValue('business_service'),
      cmdb_ci: gr.getDisplayValue('cmdb_ci'),
      cmdb_ci_sys_id: this._resolveCISysId(gr.getValue('cmdb_ci')),
      impact: gr.getDisplayValue('impact'),
      urgency: gr.getDisplayValue('urgency'),
      sys_created_on: gr.getDisplayValue('sys_created_on'),
      sys_updated_on: gr.getDisplayValue('sys_updated_on'),
      // New fields from High/Medium priority features
      close_code: gr.getDisplayValue('close_code'),
      reopen_count: gr.getValue('reopen_count') || 0,
      business_duration: gr.getValue('business_duration'),
      hierarchy: this.getIncidentHierarchy(sys_id),
      problem_link: this.getProblemLink(sys_id),
      sla_compliance: this.getSLACompliance(sys_id),
      // Temporarily disable advanced methods to debug
      // ci_impact_network: this.getCIImpactNetwork(sys_id, 2),
      // change_interventions: this.getChangeInterventions(sys_id),
      // assignee_workload: this.calculateAssigneeWorkload(sys_id),
      // categorization_quality: this.assessCategorizationQuality(sys_id),
      ci_impact_network: { primary_ci: {}, dependencies: [], impact_score: 5 },
      change_interventions: { related_changes: [], changes_implemented: 0, effectiveness_rating: 'unknown' },
      assignee_workload: this.calculateAssigneeWorkload(sys_id),
      categorization_quality: this.assessCategorizationQuality(sys_id),
      ci_details: this.getCIDetails(sys_id)
    };
  },

  _buildTimeline: function(sys_id) {
    var timeline = [];
    
    // Get journal entries (comments and work notes)
    timeline = timeline.concat(this._getJournalEntries(sys_id));
    
    // Get history entries (field changes)
    timeline = timeline.concat(this._getHistoryEntries(sys_id));
    
    // Sort all timeline events by timestamp
    timeline.sort(function(a, b) {
      var dateA = new GlideDateTime(a.timestamp);
      var dateB = new GlideDateTime(b.timestamp);
      return dateA.compareTo(dateB);
    });

    return timeline;
  },

  _getJournalEntries: function(sys_id) {
    var entries = [];
    var gr = new GlideRecord('sys_journal_field');
    gr.addQuery('element_id', sys_id);
    gr.addQuery('element', 'IN', 'comments,work_notes');
    gr.orderBy('sys_created_on');
    gr.query();

    while (gr.next()) {
      var entry = {
        type: gr.getValue('element') === 'comments' ? 'comment' : 'work_note',
        timestamp: gr.getDisplayValue('sys_created_on'),
        user: gr.getDisplayValue('sys_created_by'),
        content: gr.getDisplayValue('value'),
        element: gr.getValue('element')
      };
      entries.push(entry);
    }

    return entries;
  },

  _getHistoryEntries: function(sys_id) {
    var entries = [];
    var gr = new GlideRecord('sys_history_line');
    gr.addQuery('set.id', sys_id);
    gr.addQuery('field', 'IN', 'state,priority,assigned_to,assignment_group,category,subcategory');
    gr.orderBy('sys_created_on');
    gr.query();

    while (gr.next()) {
      var field = gr.getValue('field');
      var oldValue = gr.getDisplayValue('old_value');
      var newValue = gr.getDisplayValue('new_value');
      
      if (oldValue != newValue) { // Only include actual changes
        var entry = {
          type: 'field_change',
          timestamp: gr.getDisplayValue('sys_created_on'),
          user: gr.getDisplayValue('sys_created_by'),
          field: field,
          old_value: oldValue || '(empty)',
          new_value: newValue || '(empty)',
          change_description: this._formatFieldChange(field, oldValue, newValue)
        };
        entries.push(entry);
      }
    }

    return entries;
  },

  _formatFieldChange: function(field, oldValue, newValue) {
    var fieldNames = {
      'state': 'State',
      'priority': 'Priority', 
      'assigned_to': 'Assigned To',
      'assignment_group': 'Assignment Group',
      'category': 'Category',
      'subcategory': 'Subcategory'
    };
    
    var fieldName = fieldNames[field] || field;
    return fieldName + ' changed from "' + (oldValue || '(empty)') + '" to "' + (newValue || '(empty)') + '"';
  },

  getIncidentHierarchy: function(sys_id) {
    var incident = new GlideRecord('incident');
    if (!incident.get(sys_id)) return { has_parent: false, child_count: 0 };

    var hierarchy = {
      has_parent: !!incident.parent_incident,
      parent_incident: {},
      child_count: 0
    };

    // Get parent details if exists
    if (incident.parent_incident) {
      var parent = new GlideRecord('incident');
      if (parent.get(incident.parent_incident.sys_id)) {
        hierarchy.parent_incident = {
          sys_id: parent.sys_id,
          number: parent.getDisplayValue('number'),
          short_description: parent.getDisplayValue('short_description'),
          state: parent.getDisplayValue('state'),
          opened_at: parent.getDisplayValue('opened_at')
        };
      }
    }

    // Count children (avoid full load for performance)
    var childQuery = new GlideRecord('incident');
    childQuery.addQuery('parent_incident', sys_id);
    childQuery.query();
    hierarchy.child_count = childQuery.getRowCount();

    return hierarchy;
  },

  getProblemLink: function(sys_id) {
    var incident = new GlideRecord('incident');
    if (!incident.get(sys_id)) return null;

    if (!incident.problem_id) return null;

    var problem = new GlideRecord('problem');
    if (!problem.get(incident.problem_id)) return null;

    return {
      sys_id: problem.sys_id,
      number: problem.getDisplayValue('number'),
      short_description: problem.getDisplayValue('short_description'),
      state: problem.getDisplayValue('state'),
      priority: problem.getDisplayValue('priority'),
      opened_at: problem.getDisplayValue('opened_at'),
      resolved_at: problem.getDisplayValue('resolved_at')
    };
  },

  getSLACompliance: function(sys_id) {
    // In ServiceNow, SLAs are attached to tasks and have their own records
    // We need to query for SLAs where the task sys_id matches our incident
    try {
      var slaGR = new GlideRecord('task_sla');
      slaGR.addQuery('task', sys_id);
      slaGR.query();

      var slas = [];
      while (slaGR.next()) {
        slas.push({
          sys_id: slaGR.sys_id,
          sla_name: slaGR.sla ? slaGR.sla.getDisplayValue() : 'Unknown SLA',
          stage: slaGR.stage ? slaGR.stage.getDisplayValue() : 'Unknown',
          breach_time: slaGR.breach_time ? slaGR.breach_time.getDisplayValue() : null,
          planned_goal_time: slaGR.planned_goal_time ? slaGR.planned_goal_time.getDisplayValue() : null
        });
      }
      return slas;
    } catch (e) {
      gs.warn('SLA compliance query failed: ' + e.toString());
      return [];
    }
  },

  getCIImpactNetwork: function(sys_id, maxDepth) {
    try {
      var incident = new GlideRecord('incident');
      if (!incident.get(sys_id) || !incident.cmdb_ci) {
        return { primary_ci: {}, dependencies: [], impact_score: 0 };
      }

      var network = {
        primary_ci: {},
        dependencies: [],
        impacted_services: [],
        impact_score: 5, // Default medium impact
        depth_analyzed: 0,
        error: null
      };

      // Get primary CI details
      var ci = new GlideRecord('cmdb_ci');
      if (ci.get(incident.cmdb_ci.toString())) {
        network.primary_ci = {
          sys_id: ci.sys_id.toString(),
          name: ci.getDisplayValue('name') || 'Unknown CI',
          class: ci.getDisplayValue('sys_class_name') || 'cmdb_ci',
          install_status: ci.getDisplayValue('install_status') || 'Unknown',
          operational_status: ci.getDisplayValue('operational_status') || 'Unknown',
          impact: parseInt(ci.getValue('u_impact')) || 5
        };
        network.impact_score = network.primary_ci.impact;
      }

      // Analyze CI relationships - limit depth to prevent performance issues
      var maxDepth = maxDepth || 2;
      network = this._analyzeCIDependencies(ci.sys_id.toString(), maxDepth, network, 1);

      return network;
    } catch (e) {
      gs.warn('CI Impact Network analysis failed: ' + e.toString());
      return {
        primary_ci: {},
        dependencies: [],
        impacted_services: [],
        impact_score: 5,
        depth_analyzed: 0,
        error: e.toString()
      };
    }
  },

  _analyzeCIDependencies: function(ciSysId, maxDepth, network, currentDepth) {
    if (currentDepth > maxDepth) return;

    var cdta = new CIData();
    try {
      cdta.loadFromCI(ciSysId);
      network.depth_analyzed = Math.max(network.depth_analyzed, currentDepth);
    } catch (e) {
      gs.warn('CIData load failed for CI: ' + ciSysId);
      return;
    }

    // Analyze cmdb_rel_ci relationships
    var relationships = cdta.getRelatedListInstance('cmdb_rel_ci', 'parent');
    if (relationships) {
      var relatedCIs = cdta.getM2MTable('cmdb_ci', null);
      for (var i = 0; i < relatedCIs.length && i < 10; i++) { // Limit to prevent performance issues
        var relatedCI = relatedCIs[i];

        // Only add if not already in dependencies
        var exists = false;
        for (var j = 0; j < network.dependencies.length; j++) {
          if (network.dependencies[j].sys_id === relatedCI.sys_id) {
            exists = true;
            break;
          }
        }

        if (!exists) {
          network.dependencies.push({
            sys_id: relatedCI.sys_id,
            name: relatedCI.name || 'Unknown CI',
            class: relatedCI.sys_class_name || 'Unknown',
            relationship: 'Depends on',
            depth: currentDepth
          });

          // Adjust impact score based on relationship criticality
          if (relatedCI.sys_class_name == 'cmdb_ci_service') {
            network.impacted_services.push(relatedCI.name);
            network.impact_score = Math.max(network.impact_score, 8); // High impact for service dependency
          } else if (currentDepth === 1) {
            network.impact_score = Math.max(network.impact_score, 6); // Medium-high impact for direct dependencies
          }
        }
      }
    }
  },

  getChangeInterventions: function(sys_id) {
    var interventions = {
      related_changes: [],
      changes_implemented: 0,
      post_implementation_incidents: 0,
      effectiveness_rating: 'unknown'
    };

    // Find changes related to this incident via task_rel_task
    var taskRelations = new GlideRecord('task_rel_task');
    taskRelations.addQuery('child', sys_id);
    taskRelations.addQuery('type', 'Fixes::Fixed by'); // Confirmed relationship type
    taskRelations.query();

    while (taskRelations.next()) {
      var changeGR = new GlideRecord('change_request');
      if (changeGR.get(taskRelations.parent.toString())) {
        var changeInfo = {
          sys_id: changeGR.sys_id,
          number: changeGR.getDisplayValue('number'),
          short_description: changeGR.getDisplayValue('short_description'),
          state: changeGR.getDisplayValue('state'),
          type: changeGR.getDisplayValue('type'),
          planned_start_date: changeGR.getDisplayValue('start_date'),
          planned_end_date: changeGR.getDisplayValue('end_date'),
          actual_end_date: changeGR.getDisplayValue('work_end'),
          risk: changeGR.getDisplayValue('risk')
        };

        interventions.related_changes.push(changeInfo);

        // Track implementation completion
        if (changeInfo.state === 'Closed' || changeInfo.state === 'Implemented') {
          interventions.changes_implemented++;
        }
      }
    }

    // Assess change effectiveness
    if (interventions.changes_implemented > 0) {
      interventions.effectiveness_rating = 'implemented_changes';
    } else if (interventions.related_changes.length > 0) {
      interventions.effectiveness_rating = 'pending_changes';
    }

    return interventions;
  },

  calculateAssigneeWorkload: function(sys_id) {
    var incident = new GlideRecord('incident');
    if (!incident.get(sys_id)) return { assignee_stats: {}, group_workload: {}, performance_score: 0 };

    var workload = {
      assignee_history: [],
      group_comparison: {},
      performance_indicators: {},
      overall_score: 50
    };

    // Get incident assignee history from timeline data
    // This would analyze the current incident's assignment patterns
    var timeline = this._buildTimeline(sys_id);

    var currentAssignee = incident.assigned_to;
    var currentGroup = incident.assignment_group;

    if (currentAssignee) {
      workload.assignee_history.push({
        sys_id: currentAssignee.toString(),
        name: incident.assigned_to.getDisplayValue(),
        assignment_date: incident.sys_updated_on.getDisplayValue(),
        role: 'Current Owner'
      });
    }

    // Look for assignment changes in timeline
    for (var i = 0; i < timeline.length; i++) {
      var event = timeline[i];
      if (event.type === 'field_change' &&
          (event.field === 'assigned_to' || event.field === 'assignment_group')) {
        workload.assignee_history.push({
          field: event.field,
          old_value: event.old_value,
          new_value: event.new_value,
          timestamp: event.timestamp,
          type: 'Assignment Change'
        });
      }
    }

    // Basic workload assessment based on available data
    workload.performance_indicators = {
      reassignment_count: workload.assignee_history.filter(function(item) {
        return item.type === 'Assignment Change';
      }).length,
      stability: workload.assignee_history.length <= 2 ? 'high' : 'low',
      resolution: incident.state === 'Resolved' || incident.state === 'Closed'
    };

    workload.overall_score = workload.performance_indicators.reassignment_count > 2 ? 30 :
                           workload.performance_indicators.reassignment_count > 0 ? 60 : 85;

    return workload;
  },

  getCIHealthHistoryDuringIncident: function() {
    try {
      // Extract parameters from the GlideAjax call
      var sys_id = this.getParameter('sysparm_sys_id');
      var preIncidentWindowHours = this.getParameter('sysparm_pre_incident_window_hours') || 48;

      gs.info('CI Health History: Received sys_id: ' + sys_id + ', window hours: ' + preIncidentWindowHours);

      if (!sys_id) {
        return JSON.stringify({
          success: false,
          error: 'Incident sys_id parameter is required'
        });
      }

      // Get incident and validate CI association
      var incident = new GlideRecord('incident');
      if (!incident.get(sys_id)) {
      gs.info('CI Health History: Failed to load incident with sys_id: ' + sys_id);
      return JSON.stringify({
        success: false,
        error: 'Unable to load incident analysis',
        data: { ci_present: false, summary: { insights: 'This incident could not be found or loaded' }}
      });
      }
      gs.info('CI Health History: Successfully loaded incident: ' + incident.getDisplayValue('number'));

      if (!incident.cmdb_ci || incident.cmdb_ci === '' || incident.cmdb_ci === null) {
      return JSON.stringify({
        success: false,
        error: 'Configuration Item not connected',
        data: {
          ci_present: false,
          summary: {
            insights: 'No Configuration Item is currently assigned to this incident. CI health analysis is not available without a connected configuration item.',
            friendly_message: '🔗 Add a Configuration Item to this incident to view its health history and correlation analysis.'
          }
        }
      });
      }

      var healthHistory = {
        ci_info: {},
        health_analysis: {},
        related_activity: {},
        stress_indicators: {},
        recommendations: [],
        correlation_score: 0,
        analysis_timestamp: new GlideDateTime().getValue()
      };

      // Resolve CI sys_id within the method for reliability
      var ciSysId = this._resolveCISysId(incident.getValue('cmdb_ci'));
      healthHistory.ci_info = this._getCIHealthData(ciSysId);

      // Analyze health history during relevant timeframes
      healthHistory.health_analysis = this._analyzeCIHealthHistory(
        incident,
        preIncidentWindowHours
      );

      // Get related activity (incidents, changes, SLA events)
      healthHistory.related_activity = this._getCIActivityDuringPeriod(
        ciSysId,
        healthHistory.health_analysis.time_window.start_time,
        healthHistory.health_analysis.time_window.incident_opened_at
      );

      // Calculate stress indicators and correlation
      healthHistory = this._calculateCIStressIndicators(healthHistory, incident);

      return JSON.stringify({
        success: true,
        data: healthHistory,
        message: 'CI health history analysis completed'
      });

    } catch (e) {
      gs.error('CI Health History analysis failed: ' + e.toString());
      return JSON.stringify({
        success: false,
        error: 'CI health analysis failed: ' + e.toString(),
        data: null
      });
    }
  },

  _getCIHealthData: function(ciSysId) {
    if (!ciSysId) {
      return { error: 'No CI sys_id provided' };
    }

    var ciGR = new GlideRecord('cmdb_ci');
    if (!ciGR.get(ciSysId)) {
      return { error: 'CI record not accessible or does not exist - sys_id: ' + ciSysId };
    }

    return {
      sys_id: ciGR.sys_id.toString(),
      name: ciGR.getDisplayValue('name') || 'Unnamed CI',
      class: ciGR.getDisplayValue('sys_class_name') || 'Unknown',
      operational_status: ciGR.getDisplayValue('operational_status') || 'Unknown',
      install_status: ciGR.getDisplayValue('install_status') || 'Unknown',
      category: ciGR.getDisplayValue('category') || 'Unclassified',
      last_discovered: ciGR.getDisplayValue('last_discovered') || 'Unknown'
    };
  },

  _analyzeCIHealthHistory: function(incident, windowHours) {
    var incidentOpenedAt = new GlideDateTime(incident.getValue('opened_at'));
    var analysisWindowStart = new GlideDateTime(incidentOpenedAt);
    analysisWindowStart.subtract(windowHours * 60 * 60 * 1000); // Convert hours to milliseconds

    return {
      time_window: {
        pre_incident_hours: windowHours,
        start_time: analysisWindowStart.getValue(),
        incident_opened_at: incidentOpenedAt.getValue(),
        incident_sys_id: incident.sys_id.toString()
      },
      health_metrics: {
        stability_score: 100, // Base score, will be adjusted
        activity_level: 'normal', // normal, high, critical
        recommendation: []
      }
    };
  },

  _getCIActivityDuringPeriod: function(ciSysId, startTime, endTime) {
    var activity = {
      pre_incident_incidents: [],
      concurrent_incidents: [],
      related_change_requests: [],
      sla_events: []
    };

    // Get other incidents affecting this CI during the analysis window
    // Excludes the current incident
    activity.pre_incident_incidents = this._getRelatedCIIncidents(ciSysId, startTime, endTime);

    // Get change requests affecting this CI during timeframe
    activity.related_change_requests = this._getCIDuringPeriodChanges(ciSysId, startTime, endTime);

    // Get SLA breach events during timeframe (if any linked to this CI)
    activity.sla_events = this._getCIDuringPeriodSLA(ciSysId, startTime, endTime);

    return activity;
  },

  _getRelatedCIIncidents: function(ciSysId, startTime, endTime) {
    var incidents = new GlideRecord('incident');
    incidents.addQuery('cmdb_ci', ciSysId);
    incidents.addQuery('opened_at', '>=', startTime);
    incidents.addQuery('opened_at', '<=', endTime);
    incidents.addQuery('state', '!=', 'Closed'); // Focus on active/previously active incidents
    incidents.orderByDesc('opened_at');
    incidents.setLimit(20); // Prevent excessive data return
    incidents.query();

    var incidentList = [];
    while (incidents.next()) {
      incidentList.push({
        sys_id: incidents.sys_id.toString(),
        number: incidents.getDisplayValue('number'),
        priority: incidents.getDisplayValue('priority'),
        state: incidents.getDisplayValue('state'),
        opened_at: incidents.getValue('opened_at'),
        caller: incidents.getDisplayValue('caller_id'),
        short_description: incidents.getDisplayValue('short_description') || ''
      });
    }

    return incidentList;
  },

  _getCIDuringPeriodChanges: function(ciSysId, startTime, endTime) {
    // Find changes that involve this CI through task relationships
    var changeList = [];

    var changes = new GlideRecord('change_request');
    changes.addQuery('sys_created_on', '>=', startTime);
    changes.addQuery('sys_created_on', '<=', endTime);
    changes.addQuery('state', 'IN', 'New,Assess,Authorize,Scheduled,Implement,Review,Closed');
    changes.setLimit(15);
    changes.query();

    while (changes.next()) {
      // Check if this change is related to the CI through task_rel_task or direct CI field
      if (changes.cmdb_ci == ciSysId) {
        changeList.push({
          sys_id: changes.sys_id.toString(),
          number: changes.getDisplayValue('number'),
          type: changes.getDisplayValue('type') || 'Standard',
          priority: changes.getDisplayValue('priority') || '3',
          state: changes.getDisplayValue('state'),
          impact: changes.getDisplayValue('impact') || 'Unknown',
          risk: changes.getDisplayValue('risk') || 'Unknown',
          opened_at: changes.getValue('sys_created_on'),
          planned_start_date: changes.getDisplayValue('start_date') || 'Not set',
          phase: 'implementation' // Since this is an existing change during the incident
        });
      }
    }

    return changeList;
  },

  _getCIDuringPeriodSLA: function(ciSysId, startTime, endTime) {
    // Look for SLA records that were breached or at risk during the analysis timeframe
    var slaList = [];

    var slas = new GlideRecord('task_sla');
    slas.addQuery('sys_created_on', '>=', startTime);
    slas.addQuery('sys_created_on', '<=', endTime);
    slas.setLimit(10);
    slas.query();

    while (slas.next()) {
      // Check if this SLA is related to the CI through incident association
      var relatedTask = new GlideRecord('incident');
      if (relatedTask.get(slas.task.toString()) && relatedTask.cmdb_ci == ciSysId) {
        slaList.push({
          sla_name: slas.sla.getDisplayValue() || 'Unknown SLA',
          stage: slas.stage.getDisplayValue(),
          breach_time: slas.breach_time ? slas.breach_time.getDisplayValue() : null,
          planned_time: slas.planned_goal_time ? slas.planned_goal_time.getDisplayValue() : null,
          breached: slas.stage.toString().indexOf('breach') !== -1
        });
      }
    }

    return slaList;
  },

  _calculateCIStressIndicators: function(healthHistory, originalIncident) {
    var stressScore = {
      overload_indicator: 'low',
      stability_risk: 'low',
      correlation_insights: [],
      health_score: 100
    };

    var activity = healthHistory.related_activity;

    // Count concurrent incidents
    var concurrentCount = activity.pre_incident_incidents.length;

    // Count active changes
    var activeChanges = activity.related_change_requests.filter(function(ch) {
      return ch.state !== 'Closed' && ch.state !== 'Cancelled';
    }).length;

    // Count SLA breaches
    var slaBreaches = activity.sla_events.filter(function(sla) {
      return sla.breached;
    }).length;

    // Calculate overall stress indicators
    if (concurrentCount >= 3) {
      stressScore.overload_indicator = 'high';
      stressScore.correlation_insights.push('High incident concurrency - CI may be experiencing related issues');
      stressScore.health_score -= 25;
    } else if (concurrentCount >= 1) {
      stressScore.overload_indicator = 'medium';
      stressScore.correlation_insights.push('Multiple incidents affecting same CI');
      stressScore.health_score -= 10;
    }

    if (activeChanges >= 2) {
      stressScore.stability_risk = 'medium';
      stressScore.correlation_insights.push('Multiple concurrent changes involving CI');
      stressScore.health_score -= 15;
    } else if (activeChanges >= 1) {
      stressScore.stability_risk = 'low';
      stressScore.correlation_insights.push('Change activity around incident time');
    }

    if (slaBreaches >= 1) {
      stressScore.stability_risk = 'high';
      stressScore.correlation_insights.push('SLA breaches indicate service level pressure');
      stressScore.health_score -= 20;
    }

    // Generate recommendations
    if (stressScore.health_score < 75) {
      stressScore.correlation_insights.push('RECOMMENDATION: Consider CI maintenance or monitoring enhancement');
    }

    if (concurrentCount > 0 && activeChanges > 0) {
      stressScore.correlation_insights.push('RECOMMENDATION: Evaluate change readiness - incident occurred during change window');
    }

    healthHistory.stress_indicators = stressScore;
    healthHistory.correlation_score = concurrentCount + (activeChanges * 2) + (slaBreaches * 3); // Weighted score

    return healthHistory;
  },

  assessCategorizationQuality: function(sys_id) {
    var incident = new GlideRecord('incident');
    if (!incident.get(sys_id)) return { confidence_score: 0, categories: {}, suggestions: [] };

    var assessment = {
      confidence_score: 75, // Start with high confidence
      categories: {
        category: incident.getDisplayValue('category') || 'Not categorized',
        subcategory: incident.getDisplayValue('subcategory') || 'Not categorized',
        ci_attached: !!incident.cmdb_ci
      },
      risk_factors: [],
      suggestions: []
    };

    // Assess categorization quality based on resolution details
    var closeNotes = this._getCloseNotesDetails(sys_id);
    var resolutionApproach = closeNotes.notes.toLowerCase();

    // Check if resolution matches category expectations
    if (incident.category) {
      var category = incident.category.toLowerCase();
      var resolutionMismatch = false;

      if (category.indexOf('hardware') !== -1 && resolutionApproach.indexOf('software') > resolutionApproach.indexOf('hardware')) {
        resolutionMismatch = true;
        assessment.suggestions.push('Category suggests hardware issue but resolution appears software-related');
      } else if (category.indexOf('software') !== -1 && resolutionApproach.indexOf('hardware') > resolutionApproach.indexOf('software')) {
        resolutionMismatch = true;
        assessment.suggestions.push('Category suggests software issue but resolution appears hardware-related');
      }

      if (resolutionMismatch) {
        assessment.confidence_score -= 25;
        assessment.risk_factors.push('Category-resolution mismatch');
      }
    }

    // Check CI attachment for technical categories
    if (!assessment.categories.ci_attached &&
        (resolutionApproach.indexOf('server') !== -1 ||
         resolutionApproach.indexOf('database') !== -1 ||
         resolutionApproach.indexOf('network') !== -1)) {
      assessment.confidence_score -= 15;
      assessment.suggestions.push('Technical resolution documented but no CI attached');
      assessment.risk_factors.push('Missing CI for technical issue');
    }

    // Assess completeness
    if (!assessment.categories.category || assessment.categories.category === 'Not categorized') {
      assessment.confidence_score -= 20;
      assessment.suggestions.push('Incident not properly categorized - missing category');
      assessment.risk_factors.push('Uncategorized incident');
    }

    if (!assessment.categories.subcategory || assessment.categories.subcategory === 'Not categorized') {
      assessment.confidence_score -= 10;
      assessment.suggestions.push('Missing subcategory for better classification');
    }

    return assessment;
  },

  _getCloseNotesDetails: function(sys_id) {
    var details = { notes: '', attachments: 0 };

    // Get close notes
    var incident = new GlideRecord('incident');
    if (incident.get(sys_id)) {
      details.notes = incident.getDisplayValue('close_notes') || '';

      // Could count attachments if needed
      // details.attachments = countAttachments(sys_id);
    }

    return details;
  },

  _resolveCISysId: function(cmdbCIValue) {
    if (!cmdbCIValue || cmdbCIValue === '' || cmdbCIValue === null) {
      return null;
    }

    // First, try to interpret as a sys_id (standard ServiceNow format)
    if (cmdbCIValue.toString().length === 32 && /^[a-f0-9]{32}$/.test(cmdbCIValue.toString())) {
      // Looks like a valid sys_id format - verify it exists
      var testCI = new GlideRecord('cmdb_ci');
      if (testCI.get(cmdbCIValue.toString())) {
        return cmdbCIValue.toString();
      }
    }

    // If it's not a sys_id, try to look it up by name (handles demo data and display names)
    var lookupCI = new GlideRecord('cmdb_ci');
    lookupCI.addQuery('name', cmdbCIValue);
    lookupCI.query();
    if (lookupCI.next()) {
      return lookupCI.sys_id.toString();
    }

    // Last resort - nothing found
    gs.warn('CI resolution failed: no CI found for value: ' + cmdbCIValue);
    return null;
  },

  getCIDetails: function(sys_id) {
    var incident = new GlideRecord('incident');
    if (!incident.get(sys_id) || !incident.cmdb_ci) return null;

    var ci = new GlideRecord('cmdb_ci');
    if (!ci.get(incident.cmdb_ci.sys_id)) return null;

    return {
      sys_id: ci.sys_id,
      name: ci.getDisplayValue('name'),
      class: ci.getDisplayValue('sys_class_name'),
      impact: ci.getValue('u_impact') || 5, // Custom field, default to medium (5)
      install_status: ci.getDisplayValue('install_status'),
      operational_status: ci.getDisplayValue('operational_status')
    };
  },

  _generateDebrief: function(incident, timeline) {
    var debrief = {
      resolution_time: this._calculateResolutionTime(incident),
      handoff_count: this._countHandoffs(timeline),
      groups_involved: this._getGroupsInvolved(timeline),
      note_count: this._countNotes(timeline),
      state_changes: this._countStateChanges(timeline),
      priority_changes: this._countPriorityChanges(timeline),
      reopen_count: incident.reopen_count || 0,
      cause_summary: this._generateCauseSummary(timeline),
      first_response_time: this._calculateFirstResponseTime(incident, timeline),
      key_events: this._identifyKeyEvents(timeline),
      // Enhanced metrics
      resolution_quality: this._calculateResolutionQuality(incident),
      hierarchy_complexity: this._calculateHierarchyComplexity(incident),
      sla_compliance_score: this._calculateSLAComplianceScore(incident, timeline)
    };

    return debrief;
  },

  _calculateResolutionTime: function(incident) {
    if (!incident.opened_at) {
      return {
        value: 0,
        display: 'Unknown - no opening time'
      };
    }

    var openTime = new GlideDateTime(incident.opened_at);
    var resolveTime;
    
    if (incident.resolved_at) {
      resolveTime = new GlideDateTime(incident.resolved_at);
    } else if (incident.closed_at) {
      resolveTime = new GlideDateTime(incident.closed_at);
    } else {
      resolveTime = new GlideDateTime(); // Current time
    }

    var duration = GlideDateTime.subtract(openTime, resolveTime);
    var durationMS = duration.getNumericValue();
    
    return {
      value: Math.floor(durationMS / 1000), // seconds
      display: this._formatDuration(durationMS),
      is_resolved: !!incident.resolved_at
    };
  },

  _formatDuration: function(milliseconds) {
    var seconds = Math.floor(milliseconds / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    if (days > 0) {
      return days + ' days, ' + (hours % 24) + ' hours';
    } else if (hours > 0) {
      return hours + ' hours, ' + (minutes % 60) + ' minutes';
    } else if (minutes > 0) {
      return minutes + ' minutes';
    } else {
      return seconds + ' seconds';
    }
  },

  _countHandoffs: function(timeline) {
    var handoffs = 0;
    var assignmentChanges = timeline.filter(function(event) {
      return event.type === 'field_change' && 
             (event.field === 'assigned_to' || event.field === 'assignment_group');
    });
    
    return assignmentChanges.length;
  },

  _getGroupsInvolved: function(timeline) {
    var groups = [];
    
    timeline.forEach(function(event) {
      if (event.type === 'field_change' && event.field === 'assignment_group') {
        if (event.old_value && event.old_value !== '(empty)' && groups.indexOf(event.old_value) === -1) {
          groups.push(event.old_value);
        }
        if (event.new_value && event.new_value !== '(empty)' && groups.indexOf(event.new_value) === -1) {
          groups.push(event.new_value);
        }
      }
    });

    return groups;
  },

  _countNotes: function(timeline) {
    var counts = {
      comments: 0,
      work_notes: 0,
      total: 0
    };

    timeline.forEach(function(event) {
      if (event.type === 'comment') {
        counts.comments++;
        counts.total++;
      } else if (event.type === 'work_note') {
        counts.work_notes++;
        counts.total++;
      }
    });

    return counts;
  },

  _countStateChanges: function(timeline) {
    return timeline.filter(function(event) {
      return event.type === 'field_change' && event.field === 'state';
    }).length;
  },

  _countPriorityChanges: function(timeline) {
    return timeline.filter(function(event) {
      return event.type === 'field_change' && event.field === 'priority';
    }).length;
  },

  _generateCauseSummary: function(timeline) {
    // Find earliest journal entry that might contain cause information
    var journalEntries = timeline.filter(function(event) {
      return (event.type === 'comment' || event.type === 'work_note') && 
             event.content && event.content.length > 10;
    });

    if (journalEntries.length === 0) {
      return 'No detailed information available in journal entries';
    }

    var firstEntry = journalEntries[0];
    var content = firstEntry.content.toLowerCase();
    
    // Simple keyword-based cause detection
    if (content.indexOf('network') !== -1 || content.indexOf('connectivity') !== -1) {
      return 'Network or connectivity related issue';
    } else if (content.indexOf('server') !== -1 || content.indexOf('system') !== -1 || content.indexOf('down') !== -1) {
      return 'Server or system related issue';
    } else if (content.indexOf('application') !== -1 || content.indexOf('software') !== -1) {
      return 'Application or software related issue';
    } else if (content.indexOf('user') !== -1 || content.indexOf('access') !== -1 || content.indexOf('login') !== -1) {
      return 'User access or authentication issue';
    } else if (content.indexOf('performance') !== -1 || content.indexOf('slow') !== -1) {
      return 'Performance related issue';
    } else if (content.indexOf('hardware') !== -1 || content.indexOf('disk') !== -1 || content.indexOf('memory') !== -1) {
      return 'Hardware related issue';
    } else {
      // Return first 100 characters of the earliest entry as a fallback
      var summary = firstEntry.content.substring(0, 100);
      if (firstEntry.content.length > 100) {
        summary += '...';
      }
      return 'Issue described as: ' + summary;
    }
  },

  _calculateFirstResponseTime: function(incident, timeline) {
    if (!incident.opened_at) {
      return {
        value: 0,
        display: 'Unknown - no opening time'
      };
    }

    var openTime = new GlideDateTime(incident.opened_at);
    var firstResponseTime = null;

    // Find first comment or work note after incident creation
    var responses = timeline.filter(function(event) {
      return (event.type === 'comment' || event.type === 'work_note') && 
             event.user !== incident.opened_by;
    });

    if (responses.length > 0) {
      firstResponseTime = new GlideDateTime(responses[0].timestamp);
      var duration = GlideDateTime.subtract(openTime, firstResponseTime);
      var durationMS = duration.getNumericValue();
      
      return {
        value: Math.floor(durationMS / 1000),
        display: this._formatDuration(durationMS),
        response_by: responses[0].user
      };
    } else {
      return {
        value: 0,
        display: 'No response recorded',
        response_by: null
      };
    }
  },

  _identifyKeyEvents: function(timeline) {
    var keyEvents = [];
    
    timeline.forEach(function(event) {
      if (event.type === 'field_change') {
        if (event.field === 'state' || 
            event.field === 'priority' || 
            event.field === 'assigned_to' || 
            event.field === 'assignment_group') {
          keyEvents.push({
            timestamp: event.timestamp,
            description: event.change_description,
            user: event.user,
            significance: 'high'
          });
        }
      } else if (event.type === 'comment' || event.type === 'work_note') {
        // Mark as key event if it's a substantial note (>50 chars)
        if (event.content && event.content.length > 50) {
          keyEvents.push({
            timestamp: event.timestamp,
            description: event.type === 'comment' ? 'Comment added' : 'Work note added',
            user: event.user,
            significance: 'medium',
            content_preview: event.content.substring(0, 80) + (event.content.length > 80 ? '...' : '')
          });
        }
      }
    });

    return keyEvents;
  },

  _calculateResolutionQuality: function(incident) {
    var quality = {
      score: 50, // Base score out of 100
      factors: []
    };

    // Close code analysis - positive if properly documented, negative if not
    if (incident.close_code && incident.close_code !== '') {
      quality.score += 20;
      quality.factors.push('Resolution code documented');
      var closeCode = incident.close_code.toUpperCase();
      if (closeCode.indexOf('WON\'T FIX') === -1 && closeCode.indexOf('DUPLICATE') === -1) {
        quality.factors.push('Provides actionable resolution type');
      } else {
        quality.score -= 10;
      }
    } else {
      quality.factors.push('Missing close code');
      quality.score -= 20;
    }

    // Reopen factor
    var reopenCount = incident.reopen_count || 0;
    if (reopenCount === 0) {
      quality.score += 20;
      quality.factors.push('No reopens - permanent solution');
    } else if (reopenCount <= 2) {
      quality.factors.push('Minimal reopens - acceptable');
    } else {
      quality.score -= 15;
      quality.factors.push('Multiple reopens - solution quality concern');
    }

    return quality;
  },

  _calculateHierarchyComplexity: function(incident) {
    var complexity = {
      score: 0, // Out of 10
      factors: []
    };

    // Parent existence
    if (incident.hierarchy && incident.hierarchy.has_parent) {
      complexity.score += 3;
      complexity.factors.push('Part of parent incident chain');
    }

    // Child incidents
    if (incident.hierarchy && incident.hierarchy.child_count > 0) {
      complexity.score += incident.hierarchy.child_count;
      complexity.factors.push(incident.hierarchy.child_count + ' child incidents spawned');
    }

    // Related problem
    if (incident.problem_link) {
      complexity.score += 2;
      if (incident.problem_link.state === 'Resolved' || incident.problem_link.state === 'Closed') {
        complexity.factors.push('Linked to resolved problem');
      } else {
        complexity.score += 1;
        complexity.factors.push('Linked to active problem');
      }
    }

    return complexity;
  },

  _calculateSLAComplianceScore: function(incident, timeline) {
    var compliance = {
      score: 0, // Out of 100
      breeches: 0,
      total_slas: 0,
      factors: []
    };

    if (!incident.sla_compliance || incident.sla_compliance.length === 0) {
      compliance.factors.push('No SLAs attached');
      return compliance;
    }

    compliance.total_slas = incident.sla_compliance.length;

    incident.sla_compliance.forEach(function(sla) {
      if (sla.stage && sla.stage.toLowerCase().indexOf('breach') !== -1) {
        compliance.breeches += 1;
      }
    });

    if (compliance.total_slas > 0) {
      var complianceRate = ((compliance.total_slas - compliance.breeches) / compliance.total_slas) * 100;
      compliance.score = Math.round(complianceRate);
    }

    if (compliance.breeches === 0) {
      compliance.factors.push('All SLAs met');
    } else {
      compliance.factors.push(compliance.breeches + ' SLA breaches');
    }

    return compliance;
  },

  // Background Script Test Utility for CI Health History
  // Copy below code and paste into Background Scripts in ServiceNow to test
  testCIHealthHistoryBackgroundScript: function() {
    /*
     * USAGE INSTRUCTIONS:
     *
     * 1. Open ServiceNow Studio or Background Scripts
     * 2. Copy and paste this script
     * 3. Set the variables below and execute
     */
  },

  type: 'IncidentAnalysisUtils'
});

/*
BACKGROUND SCRIPT FOR TESTING CI HEALTH HISTORY METHOD

Copy everything between the MARKERS below and paste into ServiceNow Background Scripts:

// MARKER - COPY FROM HERE
(function() {
    // TEST PARAMETERS - Configure these
    var incidentSysId = 'YOUR_INCIDENT_SYS_ID_HERE'; // Get from incident form URL
    var hours = 48; // Analysis window in hours (default: 48)

    // Initialize the script include
    var utils = new IncidentAnalysisUtils();

    try {
        gs.info('=== CI HEALTH HISTORY TEST STARTED ===');
        gs.info('Testing incident: ' + incidentSysId);

        // Get incident details first for validation
        var incident = utils._getIncidentRecord(incidentSysId);
        if (!incident) {
            gs.error('❌ INCIDENT NOT FOUND: ' + incidentSysId);
            return;
        }

        gs.info('✅ Incident found: ' + incident.number + ' - ' + incident.short_description);
        gs.info('✅ CI attached: ' + incident.cmdb_ci + ' (resolved sys_id: ' + incident.cmdb_ci_sys_id + ')');

        // Call the CI Health History method
        gs.info('📊 Calling getCIHealthHistoryDuringIncident with ' + hours + ' hour window...');

        var startTime = new GlideDateTime().getNumericValue();
        var result = utils.getCIHealthHistoryDuringIncident(incidentSysId, hours);
        var endTime = new GlideDateTime().getNumericValue();

        gs.info('⚡ Method execution time: ' + (endTime - startTime) + 'ms');

        // Parse and display results
        try {
            var parsedResult = JSON.parse(result);
            gs.info('📋 RESPONSE STATUS: ' + (parsedResult.success ? 'SUCCESS ✅' : 'FAILED ❌'));

            if (parsedResult.success && parsedResult.data) {
                var data = parsedResult.data;

                // CI Info Summary
                gs.info('🏷️  CI INFORMATION:');
                if (data.ci_info && !data.ci_info.error) {
                    gs.info('   - Name: ' + data.ci_info.name);
                    gs.info('   - Class: ' + data.ci_info.class);
                    gs.info('   - Operational Status: ' + data.ci_info.operational_status);
                    gs.info('   - Install Status: ' + data.ci_info.install_status);
                } else {
                    gs.error('   ❌ CI could not be loaded: ' + JSON.stringify(data.ci_info));
                }

                // Time Window Info
                gs.info('⏰ TIME ANALYSIS WINDOW:');
                if (data.health_analysis && data.health_analysis.time_window) {
                    var tw = data.health_analysis.time_window;
                    gs.info('   - Analysis window: ' + tw.pre_incident_hours + ' hours');
                    gs.info('   - Start time: ' + tw.start_time);
                    gs.info('   - Incident time: ' + tw.incident_opened_at);
                }

                // Related Activity Summary
                gs.info('📊 RELATED ACTIVITY SUMMARY:');
                if (data.related_activity) {
                    var ra = data.related_activity;
                    gs.info('   - Pre-incident incidents: ' + ra.pre_incident_incidents.length);
                    gs.info('   - Related changes: ' + ra.related_change_requests.length);
                    gs.info('   - SLA events: ' + ra.sla_events.length);

                    // Detailed incident listing
                    if (ra.pre_incident_incidents.length > 0) {
                        gs.info('📋 RELATED INCIDENTS DETAILS:');
                        ra.pre_incident_incidents.forEach(function(inc, idx) {
                            gs.info('   ' + (idx+1) + '. ' + inc.number + ' - ' + inc.short_description +
                                   ' (Priority: ' + inc.priority + ', State: ' + inc.state + ', Opened: ' + inc.opened_at + ')');
                        });
                    }

                    // Detailed change listing
                    if (ra.related_change_requests.length > 0) {
                        gs.info('🔧 RELATED CHANGES DETAILS:');
                        ra.related_change_requests.forEach(function(ch, idx) {
                            gs.info('   ' + (idx+1) + '. ' + ch.number + ' - ' + ch.short_description +
                                   ' (Type: ' + ch.type + ', State: ' + ch.state + ')');
                        });
                    }

                    // SLA events
                    if (ra.sla_events.length > 0) {
                        gs.info('⚠️  SLA EVENTS:');
                        ra.sla_events.forEach(function(sla, idx) {
                            gs.info('   ' + (idx+1) + '. ' + sla.sla_name + ' - ' + sla.stage +
                                   ' (Breach: ' + (sla.breached ? 'YES' : 'NO') + ')');
                        });
                    }
                }

                // Stress Indicators
                gs.info('🚦 STRESS INDICATORS:');
                if (data.stress_indicators) {
                    var si = data.stress_indicators;
                    gs.info('   - Overload: ' + si.overload_indicator);
                    gs.info('   - Stability risk: ' + si.stability_risk);
                    gs.info('   - Health score: ' + si.health_score + '/100');
                    gs.info('   - Correlation score: ' + data.correlation_score);

                    if (si.correlation_insights && si.correlation_insights.length > 0) {
                        gs.info('   🔍 INSIGHTS:');
                        si.correlation_insights.forEach(function(insight, idx) {
                            gs.info('      ' + (idx+1) + '. ' + insight);
                        });
                    }
                }

            } else {
                gs.error('❌ METHOD FAILED');
                gs.error('Error details: ' + parsedResult.error || 'Unknown error');
            }

        } catch (parseError) {
            gs.error('❌ RESULT PARSING FAILED');
            gs.error('Raw result: ' + result);
            gs.error('Parse error: ' + parseError);
        }

        gs.info('=== CI HEALTH HISTORY TEST COMPLETED ===');

    } catch (globalError) {
        gs.error('💥 CRITICAL TEST FAILURE');
        gs.error('Error: ' + globalError.toString());
    }

})();

// MARKER - COPY UNTIL HERE
*/
