import '@servicenow/sdk/global';
import { ScriptInclude } from '@servicenow/sdk/core';

export const IncidentAnalysisUtils = ScriptInclude({
  $id: Now.ID['IncidentAnalysisUtils'],
  name: 'IncidentAnalysisUtils',
  script: Now.include('../../server/script-includes/IncidentAnalysisUtils.js'),
  description: 'Utility class for generating deterministic incident analysis including timeline and debrief metrics',
  apiName: 'x_1118332_incident.IncidentAnalysisUtilsInclude',
  callerAccess: 'tracking',
  clientCallable: true,
  mobileCallable: true,
  sandboxCallable: true,
  accessibleFrom: 'public',
  active: true
});