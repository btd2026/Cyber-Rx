'use strict';

// Mock the DB so the projection logic can be exercised without a database.
jest.mock('../../../src/utils/db', () => ({ query: jest.fn() }));

const db = require('../../../src/utils/db');
const Library = require('../../../src/services/ControlLibraryService');

describe('ControlLibraryService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists the five compliance frameworks (no ATT&CK; ISO/CIS removed)', () => {
    const ids = Library.FRAMEWORK_IDS;
    expect(ids).toHaveLength(5);
    expect(ids).toEqual(expect.arrayContaining([
      'nist_csf_2', 'nist_800_53_r5', 'soc_2', 'hipaa_security', 'hitrust_csf',
    ]));
    expect(ids).not.toContain('attack_enterprise');
    expect(ids).not.toContain('iso_27001');
    expect(ids).not.toContain('cis_v8_1');
  });

  it('rejects an unknown framework in coverageByFramework', async () => {
    await expect(Library.coverageByFramework('bogus')).rejects.toMatchObject({ status: 400 });
  });

  describe('projectFromSatisfied', () => {
    // Three requirements: REQ-A (one mapped control), REQ-B (two mapped controls),
    // REQ-C (unmapped).
    function wire() {
      db.query.mockImplementation((sql) => {
        if (sql.includes('FROM framework_requirements')) {
          return Promise.resolve([
            { requirement_id: 'REQ-A', family: 'F', title: 'A' },
            { requirement_id: 'REQ-B', family: 'F', title: 'B' },
            { requirement_id: 'REQ-C', family: 'F', title: 'C' },
          ]);
        }
        if (sql.includes('FROM control_library_crosswalk')) {
          return Promise.resolve([
            { requirement_id: 'REQ-A', library_control_id: 'CL-1' },
            { requirement_id: 'REQ-B', library_control_id: 'CL-2' },
            { requirement_id: 'REQ-B', library_control_id: 'CL-3' },
          ]);
        }
        return Promise.resolve([]);
      });
    }

    it('marks met / partial / not_met / unmapped correctly', async () => {
      wire();
      // CL-1 satisfied (REQ-A fully met); CL-2 satisfied but not CL-3 (REQ-B partial).
      const out = await Library.projectFromSatisfied('nist_csf_2', ['CL-1', 'CL-2']);
      const byId = Object.fromEntries(out.requirements.map((r) => [r.requirement_id, r.status]));
      expect(byId['REQ-A']).toBe('met');
      expect(byId['REQ-B']).toBe('partial');
      expect(byId['REQ-C']).toBe('unmapped');
      expect(out.summary).toMatchObject({ total: 3, met: 1, partial: 1, not_met: 0, unmapped: 1 });
    });

    it('marks a fully-mapped-but-unsatisfied requirement as not_met', async () => {
      wire();
      const out = await Library.projectFromSatisfied('nist_csf_2', []);
      const byId = Object.fromEntries(out.requirements.map((r) => [r.requirement_id, r.status]));
      expect(byId['REQ-A']).toBe('not_met');
      expect(byId['REQ-B']).toBe('not_met');
      expect(out.summary.score).toBe(0);
    });

    it('scores partial credit at 50% in the rollup', async () => {
      wire();
      // REQ-A met (1.0) + REQ-B partial (0.5) over 3 reqs -> round(1.5/3*100)=50
      const out = await Library.projectFromSatisfied('nist_csf_2', ['CL-1', 'CL-2']);
      expect(out.summary.score).toBe(50);
    });

    it('rejects an unknown framework', async () => {
      await expect(Library.projectFromSatisfied('bogus', [])).rejects.toMatchObject({ status: 400 });
    });
  });
});
