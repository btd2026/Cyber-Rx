'use strict';

/**
 * Core module registry.
 *
 * CyberRX's analysis pipeline is built from five clearly-defined modules. This
 * registry names them, points to the service that implements each, exposes the
 * primary entry function, and reports health (does the service load, is the LLM
 * enabled). It is the single place that answers "what does the backend do".
 *
 *   M1  Business-Process Intake      read uploaded process file → extract hierarchy
 *   M2  Application-Inventory Intake  read uploaded app/CMDB file → normalize + persist
 *   M3  Process→Application Mapping   LLM-map each process/sub-process to its apps
 *   M4  Technical Control Validation  connect to the tech stack → validate controls
 *                                     for NIST CSF 2.0 / 800-53 / CIS / SOC, each
 *                                     framework assessed INDEPENDENTLY (no mapping)
 *   M5  Document Assurance Review     LLM review of uploaded docs for assurance,
 *                                     completeness, and compliance with manual /
 *                                     semi-manual control requirements
 */

const MODULES = [
  {
    id: 'M1', name: 'Business-Process Intake',
    purpose: 'Read the content of the uploaded key-business-process file and extract business functions → processes → sub-processes with RTO and criticality tier.',
    service: 'services/ProcessExtractionService', entry: 'extract(text)',
    route: 'POST /api/intake/extract-processes', llm: true,
  },
  {
    id: 'M2', name: 'Application-Inventory Intake',
    purpose: 'Read the content of the uploaded application / CMDB inventory file, propose a field mapping, normalize rows, and persist applications.',
    service: 'ingestion/IngestionService', entry: 'preview(sourceKind,input,meta) → ingest(orgId,sourceKind,parsed,mapping)',
    route: 'POST /api/ingestion/preview, POST /api/ingestion/commit', llm: false,
  },
  {
    id: 'M3', name: 'Process → Application Mapping',
    purpose: 'Use the LLM to map each process and sub-process to ALL applications that support it (many-to-many), with confidence scoring.',
    service: 'crosswalk/CrosswalkService', entry: 'autoMapAppsToProcesses(orgId)',
    route: 'POST /api/crosswalk/app-process/auto, GET /api/crosswalk/app-process/graph', llm: true,
  },
  {
    id: 'M4', name: 'Technical Control Validation',
    purpose: 'Obtain API keys / credentials, connect to the technology stack, and grab the data needed to validate controls for NIST CSF 2.0, NIST SP 800-53, CIS, and SOC — each framework assessed independently, with no attempt to cross-map frameworks.',
    service: 'cae/assessmentService', entry: 'runAssessment(orgId, frameworks)',
    route: 'POST /api/cae/assessment/run, GET /api/cae/assessment',
    frameworks: ['nist_csf_2_0', 'nist_800_53', 'cis_v8', 'soc_2'], independentFrameworks: true, llm: false,
  },
  {
    id: 'M5', name: 'Document Assurance Review',
    purpose: 'Run the LLM over uploaded documents to review them for assurance, completeness, and compliance with the non-technical / manual / semi-manual control requirements of the frameworks.',
    service: 'services/DocumentPipelineService (+ VendorDocAnalysisService)', entry: 'processUpload(...) / analyze(...)',
    route: 'POST /api/intake/documents, POST /api/intake/documents/:id/rereview', llm: true,
  },
];

// Best-effort health: can the implementing service be required, and is the LLM
// configured. Never throws — a missing service degrades to status 'unavailable'.
function health() {
  const llmEnabled = !!process.env.ANTHROPIC_API_KEY;
  const probe = {
    M1: 'services/ProcessExtractionService', M2: 'ingestion/IngestionService',
    M3: 'crosswalk/CrosswalkService', M4: 'cae/assessmentService',
    M5: 'services/DocumentPipelineService',
  };
  return MODULES.map((m) => {
    let loads = false;
    try { require('../' + probe[m.id]); loads = true; } catch (_) { loads = false; }
    return {
      id: m.id, name: m.name, purpose: m.purpose, service: m.service, entry: m.entry,
      route: m.route, usesLLM: !!m.llm, llmActive: m.llm ? llmEnabled : false,
      status: loads ? 'ready' : 'unavailable',
      ...(m.frameworks ? { frameworks: m.frameworks, independentFrameworks: m.independentFrameworks } : {}),
    };
  });
}

module.exports = { MODULES, health };
