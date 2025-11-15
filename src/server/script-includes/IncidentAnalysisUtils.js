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
      ci_impact_network: this.getCIImpactNetwork(sys_id, 2),
      change_interventions: this.getChangeInterventions(sys_id),
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
    var slaGR = new GlideRecord('task_sla');
    slaGR.addQuery('task', sys_id);
    slaGR.addQuery('record', 'incident');
    slaGR.query();

    var slas = [];
    while (slaGR.next()) {
      slas.push({
        sys_id: slaGR.sys_id,
        sla_name: slaGR.sla.getDisplayValue(),
        stage: slaGR.stage.getDisplayValue(),
        breach_time: slaGR.breach_time ? slaGR.breach_time.getDisplayValue() : null,
        planned_goal_time: slaGR.planned_goal_time ? slaGR.planned_goal_time.getDisplayValue() : null
      });
    }
    return slas;
  },

  getCIImpactNetwork: function(sys_id, maxDepth) {
    var incident = new GlideRecord('incident');
    if (!incident.get(sys_id) || !incident.cmdb_ci) return { primary_ci: {}, dependencies: [], impact_score: 0 };

    var network = {
      primary_ci: {},
      dependencies: [],
      impacted_services: [],
      impact_score: 5, // Default medium impact
      depth_analyzed: 0
    };

    // Get primary CI details
    var ci = new GlideRecord('cmdb_ci');
    if (ci.get(incident.cmdb_ci.sys_id)) {
      network.primary_ci = {
        sys_id: ci.sys_id,
        name: ci.getDisplayValue('name'),
        class: ci.getDisplayValue('sys_class_name'),
        install_status: ci.getDisplayValue('install_status'),
        operational_status: ci.getDisplayValue('operational_status'),
        impact: ci.getValue('u_impact') || 5
      };
      network.impact_score = network.primary_ci.impact;
    }

    // Analyze CI relationships - limit depth to prevent performance issues
    var maxDepth = maxDepth || 2;
    this._analyzeCIDependencies(ci.sys_id, maxDepth, network, 1);

    return network;
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

  type: 'IncidentAnalysisUtils'
});
