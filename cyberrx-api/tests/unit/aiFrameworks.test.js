'use strict';

/**
 * The AI-framework continuous assessment reuses the SAME honest three-axis structure (Summary /
 * Controls / Drift + region-entity scope) as NIST CSF, but assesses NIST AI RMF + ISO/IEC 42001
 * controls. It's wired as its own Program Health tab; the CSF path is unchanged (default 'csf').
 * Source-scan guard.
 */
const fs = require('fs');
const path = require('path');
const ciso = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/ciso5.js'), 'utf8');

describe('AI frameworks — continuous assessment (NIST AI RMF + ISO 42001)', () => {
  it('ships an AI control catalog keyed by the AI RMF function.subcat-n shape', () => {
    expect(ciso).toContain('var AI_CONTROLS=[');
    expect(ciso).toContain("['GOVERN.1-1','doc',");
    expect(ciso).toContain("['MEASURE.2-3','live',");
    expect(ciso).toContain('var AI_BASE_METHOD=(function(){');
    expect(ciso).toContain('var AI_DESC=(function(){');
  });

  it('carries a framework config + getters so the assessment is framework-aware', () => {
    expect(ciso).toContain("var C5_ASSESS_FW='csf';");
    expect(ciso).toContain("ai:{label:'NIST AI RMF + ISO 42001',fns:[{k:'GOVERN',l:'Govern'},{k:'MAP',l:'Map'},{k:'MEASURE',l:'Measure'},{k:'MANAGE',l:'Manage'}]");
    expect(ciso).toContain('function c5AssessMethods(){return C5_ASSESS_FW===\'ai\'?AI_BASE_METHOD:CSF_BASE_METHOD;}');
    expect(ciso).toContain('function c5AssessFwCfg(){');
    // the control catalog + function list are driven by the active framework
    expect(ciso).toContain('var base=c5AssessMethods()[id]||\'doc\';');
    expect(ciso).toContain('var FN=c5AssessFwCfg().fns;');
  });

  it('is honest about AI method: doc→attestation, hybrid→human-confirmed, live→awaiting a connector', () => {
    expect(ciso).toContain("if(C5_ASSESS_FW==='ai'){");
    expect(ciso).toContain("method=base==='doc'?'attestation':base==='hybrid'?'hybrid':'awaiting';");
  });

  it('is wired as its own Program Health tab; CSF remains the default', () => {
    expect(ciso).toContain('data-phtab="ai">AI frameworks');
    expect(ciso).toContain("else if(tab==='ai'){C5_ASSESS_FW='ai';c5ContinuousAssessment(body);}");
    expect(ciso).toContain("else{C5_ASSESS_FW='csf';c5ContinuousAssessment(body);}");
    // switching between CSF and AI resets the drill so a control id never leaks across frameworks
    expect(ciso).toContain("if((nt==='assess'||nt==='ai')&&nt!==C5_PH_TAB){C5_ASSESS_CTRL=null;C5_ASSESS_EXP=null;C5_ASSESS_SUBTAB='summary';}");
  });

  it('the confirm queue stays CSF-only (never reflects AI controls)', () => {
    expect(ciso).toContain('var ids=Object.keys(CSF_BASE_METHOD);var conf=c5Confirmations();');
    expect(ciso).toContain("var queuePanel=(C5_ASSESS_FW==='csf'&&pendingN)?(");
  });
});
