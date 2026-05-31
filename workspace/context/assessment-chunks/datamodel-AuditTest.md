## AuditTest entity
```
// AuditTest (NEW - Audit model)
AuditTest { id, controlId, name, testPlan, testProcedure, frequency (quarterly/annual); lastTestDate, lastTester, result (pass/fail/n/a), findings[]; evidenceIds[], managementAssertion }
```
