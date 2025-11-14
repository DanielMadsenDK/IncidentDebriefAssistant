import '@servicenow/sdk/global'
import { ApplicationMenu, Record } from '@servicenow/sdk/core'

// Create the main application menu
export const incidentDebriefMenu = ApplicationMenu({
    $id: Now.ID['incident_debrief_menu'],
    title: 'Incident Debrief Assistant',
    hint: 'Tools for incident analysis and debrief',
    description: 'Comprehensive incident analysis, timeline review, and debrief metrics',
    active: true,
    order: 100,
})

// Create the main module that goes to the landing page
export const newAnalysisModule = Record({
    $id: Now.ID['new_analysis_module'],
    table: 'sys_app_module',
    data: {
        title: 'New Analysis',
        application: incidentDebriefMenu.$id,
        link_type: 'DIRECT',
        query: 'x_1118332_incident_debrief_assistant.do',
        hint: 'Start a new incident analysis',
        active: true,
        order: 100,
    },
})

// Create a separator for organization
export const toolsSeparator = Record({
    $id: Now.ID['tools_separator'],
    table: 'sys_app_module',
    data: {
        title: 'Analysis Tools',
        application: incidentDebriefMenu.$id,
        link_type: 'SEPARATOR',
        active: true,
        order: 200,
    },
})

// Create a direct link to analysis with URL parameter input
export const directAnalysisModule = Record({
    $id: Now.ID['direct_analysis_module'],
    table: 'sys_app_module',
    data: {
        title: 'Direct Analysis',
        application: incidentDebriefMenu.$id,
        link_type: 'DIRECT',
        query: 'x_1118332_incident_debrief_assistant.do?sys_id=',
        hint: 'Direct link to analysis page (add incident sys_id to URL)',
        active: true,
        order: 210,
    },
})