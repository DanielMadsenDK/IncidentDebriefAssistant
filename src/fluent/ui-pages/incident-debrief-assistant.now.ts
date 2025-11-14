import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';
import incidentDebriefPage from '../../client/index.html';

export const incident_debrief_assistant = UiPage({
  $id: Now.ID['incident-debrief-assistant'],
  endpoint: 'x_1118332_incident_debrief_assistant.do',
  name: 'Incident Debrief Assistant',
  description: 'React-based UI for incident analysis and debrief with server-side processing',
  category: 'general',
  html: incidentDebriefPage,
  direct: true
});