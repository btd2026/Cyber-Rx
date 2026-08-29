export const INSTR: string[] = ["ID.AM-01","PR.AA-03","PR.DS-01","ID.RA-01",            /* by 2023 Q4 */
  "PR.AA-01","PR.PS-05",                                             /* by 2024 Q4 */
  "ID.AM-02",                                                        /* by 2025 Q4 */
  "PR.DS-02","PR.DS-11","PR.PS-02","DE.CM-01",                       /* by 2026 Q1 */
  "PR.PS-04","PR.AT-01","PR.PS-01","PR.PS-03","PR.IR-01","PR.AA-04","DE.CM-09","DE.AE-02",
  "ID.AM-03","ID.RA-06","ID.RA-07","ID.RA-09","ID.IM-02","ID.IM-03","PR.AA-05",
  "DE.CM-03","DE.AE-03","RS.MA-02","RS.MA-03"];                      /* by 2026 Q3 */

export const ASOF: [string, string, number][] = [["2023-12-31","2023 Q4",4],["2024-12-31","2024 Q4",6],["2025-12-31","2025 Q4",7],
            ["2026-03-31","2026 Q1",11],["2026-06-30","2026 Q2",19],["2026-08-24","2026 Q3 · today",30]];

export const SIGNERS: [string, number][] = [["Chief Information Security Officer",11],["Chief Information Officer",6],
  ["Head of Supply Chain Risk",7],["Group Head of HR",3],["Head of Physical Security",3]];

export const CONTRADICTED: string[] = ["GV.SC-06","PR.AA-02","PR.DS-10","RS.MI-01"];   /* signed, but telemetry disagrees */
