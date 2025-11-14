export default class IncidentSearchService {
  constructor() {
    this.scriptInclude = 'x_1118332_incident.IncidentAnalysisUtils';
  }

  async searchIncidents(searchTerm) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Creating GlideAjax with script include:', this.scriptInclude);
        console.log('Search term:', searchTerm);
        
        const ga = new GlideAjax(this.scriptInclude);
        ga.addParam('sysparm_name', 'searchIncidents');
        ga.addParam('sysparm_search_term', searchTerm);
        
        ga.getXMLAnswer((response) => {
          try {
            console.log('Raw GlideAjax response:', response);
            
            if (!response) {
              reject(new Error('Empty response from server'));
              return;
            }

            const result = JSON.parse(response);
            console.log('Parsed result:', result);
            
            if (result.success) {
              resolve(result.results || []);
            } else {
              reject(new Error(result.error || 'Search failed'));
            }
          } catch (parseError) {
            console.error('Parse error:', parseError, 'Response:', response);
            reject(new Error('Failed to parse search response'));
          }
        });
      } catch (error) {
        console.error('GlideAjax error:', error);
        reject(new Error('Search request failed: ' + error.message));
      }
    });
  }

  async getHighPriorityIncidents() {
    // For high priority incidents, we can search for a blank term 
    // and let the server handle the filtering
    return new Promise((resolve, reject) => {
      try {
        const ga = new GlideAjax(this.scriptInclude);
        ga.addParam('sysparm_name', 'searchIncidents');
        ga.addParam('sysparm_search_term', ''); // Empty search for recent
        
        ga.getXMLAnswer((response) => {
          try {
            const result = JSON.parse(response);
            if (result.success) {
              // Filter for high priority on client side
              const highPriority = (result.results || []).filter(incident => 
                incident.priority && parseInt(incident.priority) <= 2
              );
              resolve(highPriority);
            } else {
              reject(new Error(result.error || 'Failed to get high priority incidents'));
            }
          } catch (parseError) {
            console.error('Parse error:', parseError, 'Response:', response);
            reject(new Error('Failed to parse high priority incidents response'));
          }
        });
      } catch (error) {
        console.error('GlideAjax error:', error);
        reject(new Error('High priority incidents request failed: ' + error.message));
      }
    });
  }
}