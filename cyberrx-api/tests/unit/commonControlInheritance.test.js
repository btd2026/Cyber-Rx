'use strict';

/**
 * Common-control inheritance — the NIST General Support System / Major Application model.
 * Some controls are COMMON (provided once by corporate, inherited by every region); the
 * rest are SYSTEM-SPECIFIC (federated, each region runs its own). Onboarding captures the
 * operating model + which capabilities are common; the cockpit inherits accordingly, so a
 * region can't score below the corporate baseline on an inherited control.
 */
const fs = require('fs');
const path = require('path');

const cockpit = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/cockpit.html'), 'utf8');
const onboarding = fs.readFileSync(path.resolve(__dirname, '../../../CyberRXNew/public/onboarding.html'), 'utf8');

describe('Cockpit — common-control inheritance in the CSF assessment', () => {
  it('reads the operating model (common vs system-specific) with a hybrid default', () => {
    expect(cockpit).toContain('function securityModel()');
    expect(cockpit).toContain("localStorage.getItem('cyberrx_security_model')");
    expect(cockpit).toContain("return {model:'hybrid',common:['mfa','pam','aware','siem','cspm','backup']};");
  });

  it('layers the corporate common controls (CORPORATE_SIG) over the region\'s own signals', () => {
    expect(cockpit).toContain('var CORPORATE_SIG={');
    expect(cockpit).toContain('function scopeOwnSignals(id)');
    expect(cockpit).toContain('commonSigKeys().forEach(function(sk){if(CORPORATE_SIG[sk]!=null)own[sk]=CORPORATE_SIG[sk];});');
  });

  it('exposes each capability\'s provider (common inherited vs region-specific)', () => {
    expect(cockpit).toContain("function capProvider(capKey){return (securityModel().common.indexOf(capKey)>=0)?'common':'specific';}");
  });
});

describe('Onboarding — security operating model capture', () => {
  it('asks centralized / hybrid / federated and which controls are corporate-common', () => {
    expect(onboarding).toContain('Security operating model');
    expect(onboarding).toContain('data-m="centralized"');
    expect(onboarding).toContain('data-m="federated"');
    expect(onboarding).toContain('id="secCommon"');
  });

  it('persists the model to cyberrx_security_model with sensible per-model defaults', () => {
    expect(onboarding).toContain("localStorage.setItem('cyberrx_security_model',JSON.stringify(o));");
    expect(onboarding).toContain("federated:['aware']");
    expect(onboarding).toContain('security_model:currentSecModel()'); // in the finish payload
  });
});
