'use strict';

const EmailDraft = require('../../src/services/EmailDraftService');
const Notify = require('../../src/services/NotificationService');

describe('EmailDraftService', () => {
  const payload = {
    fromName: 'Bobby Ford', fromRole: 'CISO', toName: 'Marie Myers', toRole: 'CFO', org: 'HPE',
    items: [
      { title: 'Fund the identity fix', ask: 'Approve the funding.', why: 'Highest return per dollar', status: 'pending' },
      { title: 'Risk acceptance — Billing system', ask: 'Approve or decline.', status: 'pending' },
    ],
  };

  test('template draft is well-formed and mentions the items', async () => {
    process.env.NOTIFY_DRAFT_ENGINE = 'template';
    const d = await EmailDraft.draft(payload);
    expect(d.engine).toBe('template');
    expect(d.subject).toMatch(/sign-off|Fund/i);
    expect(d.body).toContain('Fund the identity fix');
    expect(d.body).toContain('Risk acceptance — Billing system');
    expect(d.body).toContain('Bobby Ford');
    expect(d.body.length).toBeGreaterThan(60);
    delete process.env.NOTIFY_DRAFT_ENGINE;
  });

  test('draft always resolves even with no items', async () => {
    process.env.NOTIFY_DRAFT_ENGINE = 'template';
    const d = await EmailDraft.draft({ toName: 'Jon', items: [] });
    expect(d.subject).toBeTruthy();
    expect(d.body).toBeTruthy();
    delete process.env.NOTIFY_DRAFT_ENGINE;
  });

  test('normalize clamps and defaults', () => {
    const n = EmailDraft.normalize({ items: [{ title: 'x'.repeat(500) }], tone: 'nonsense' });
    expect(n.items[0].title.length).toBeLessThanOrEqual(160);
    expect(n.tone).toBe('professional');
    expect(n.fromRole).toBe('CISO');
  });
});

describe('NotificationService', () => {
  const OLD = { ...process.env };
  afterEach(() => { process.env = { ...OLD }; });

  test('status reports not-configured without SMTP env', () => {
    delete process.env.SMTP_HOST;
    const s = Notify.status();
    expect(s.smtp).toBe(false);
    expect(s.configured).toBe(false);
  });

  test('send rejects an invalid recipient', async () => {
    const r = await Notify.send({ to: 'not-an-email', subject: 'Hi', body: 'Body' });
    expect(r.sent).toBe(false);
    expect(r.method).toBe('error');
  });

  test('send falls back to mailto when SMTP is not configured', async () => {
    delete process.env.SMTP_HOST;
    const r = await Notify.send({ to: 'marie@hpe.com', subject: 'Reminder', body: 'Body' });
    expect(r.sent).toBe(false);
    expect(r.method).toBe('mailto');
  });

  test('send uses the injected transport when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    const sent = [];
    const fakeTransport = { sendMail: async (o) => { sent.push(o); return { messageId: 'abc123' }; } };
    const r = await Notify.send({ to: 'marie@hpe.com', subject: 'Reminder', body: 'Body', cc: 'ciso@hpe.com' }, { transport: fakeTransport });
    expect(r.sent).toBe(true);
    expect(r.method).toBe('smtp');
    expect(r.messageId).toBe('abc123');
    expect(sent[0].to).toBe('marie@hpe.com');
    expect(sent[0].cc).toBe('ciso@hpe.com');
    expect(sent[0].subject).toBe('Reminder');
  });
});
