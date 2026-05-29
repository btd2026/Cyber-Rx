'use strict';
const express = require('express');
const router = express.Router();
const vault = require('../utils/vault');

const DEMO_TICKET = () => ({
  ticket_id: 'DEMO-' + Date.now(),
  demo: true,
  url: null,
  ts: new Date().toISOString(),
});

router.post('/:system/ticket', async (req, res) => {
  try {
    const { system } = req.params;
    const orgId = req.headers['x-org-id'] || 'demo';
    const { title = 'CyberRx Security Finding', desc = '', actId = '', finding = null } = req.body;
    const creds = await vault.get(orgId, system);

    // No credentials → return demo ticket
    if (!creds) return res.json(DEMO_TICKET());

    let result;

    if (system === 'snow') {
      // ServiceNow Change Request
      const priority = finding && finding.sev === 'Critical' ? '1-Critical' : '2-High';
      const r = await fetch(
        `https://${creds.instance}.service-now.com/api/now/table/change_request`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${creds.user}:${creds.password}`).toString('base64'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            short_description: title,
            description: desc,
            category: 'Cybersecurity',
            priority,
            assignment_group: creds.assignGroup || 'IT Security',
            u_cyberrx_finding: finding ? finding.id : '',
            u_cyberrx_action: actId,
          }),
        }
      );
      const data = await r.json();
      const num = data.result?.number;
      result = {
        ticket_id: num,
        url: num ? `https://${creds.instance}.service-now.com/nav_to.do?uri=change_request.do?number=${num}` : null,
      };

    } else if (system === 'jira') {
      // Jira Issue
      const r = await fetch(
        `https://${creds.instance}.atlassian.net/rest/api/3/issue`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${creds.email}:${creds.token}`).toString('base64'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              project: { key: creds.project || 'SEC' },
              summary: title,
              description: {
                type: 'doc', version: 1,
                content: [{ type: 'paragraph', content: [{ type: 'text', text: desc }] }],
              },
              issuetype: { name: 'Task' },
              priority: { name: finding && finding.sev === 'Critical' ? 'Highest' : 'High' },
              labels: ['cyberrx', 'security'],
            },
          }),
        }
      );
      const data = await r.json();
      result = {
        ticket_id: data.key,
        url: data.key ? `https://${creds.instance}.atlassian.net/browse/${data.key}` : null,
      };

    } else if (system === 'freshservice') {
      // Freshservice Ticket
      const r = await fetch(
        `https://${creds.domain}.freshservice.com/api/v2/tickets`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${creds.apiKey}:X`).toString('base64'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: title,
            description: desc,
            email: creds.email || 'cyberrx@demo.com',
            priority: finding && finding.sev === 'Critical' ? 1 : 2,
            status: 2,
            type: 'Incident',
            tags: ['cyberrx', 'security'],
          }),
        }
      );
      const data = await r.json();
      const tid = data.ticket?.id;
      result = {
        ticket_id: tid ? 'SR-' + tid : null,
        url: tid ? `https://${creds.domain}.freshservice.com/support/tickets/${tid}` : null,
      };

    } else if (system === 'remedy') {
      // BMC Remedy — get JWT then create incident
      const tokenRes = await fetch(`https://${creds.server}/api/jwt/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(creds.user)}&password=${encodeURIComponent(creds.password)}`,
      });
      const token = await tokenRes.text();
      const r = await fetch(`https://${creds.server}/api/arsys/v1/entry/HPD:HelpDesk`, {
        method: 'POST',
        headers: { 'Authorization': 'AR-JWT ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: {
            'Summary': title,
            'Notes': desc,
            'Urgency': '1-Critical',
            'Impact': '2-Significant/Large',
            'Reported Source': 'CyberRx',
            'Service Type': 'Security',
          },
        }),
      });
      const data = await r.json();
      result = { ticket_id: data.values?.['Incident Number'] || null, url: null };

    } else if (system === 'cherwell') {
      // Cherwell — OAuth token then create business object
      const tokenRes = await fetch(`https://${creds.server}/CherwellAPI/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: `grant_type=password&client_id=${creds.clientId}&username=${creds.user}&password=${creds.password}`,
      });
      const { access_token } = await tokenRes.json();
      const r = await fetch(`https://${creds.server}/CherwellAPI/api/V1/SaveBusinessObject`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busObId: creds.busObId,
          fields: [
            { name: 'IncidentType', value: 'Incident' },
            { name: 'Description',  value: title },
            { name: 'Details',      value: desc },
            { name: 'Priority',     value: finding && finding.sev === 'Critical' ? '1' : '2' },
          ],
        }),
      });
      const data = await r.json();
      result = { ticket_id: data.busObPublicId || null, url: null };

    } else {
      return res.json(DEMO_TICKET());
    }

    res.json({ ...result, system, ts: new Date().toISOString(), demo: false });
  } catch (err) {
    console.error('ITSM error:', err.message);
    // Graceful fallback to demo ticket on any error
    res.json({ ...DEMO_TICKET(), error: err.message });
  }
});

module.exports = router;
