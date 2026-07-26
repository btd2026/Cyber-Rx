# Third-party notices & attributions — Nerion

This product is "Nerion." It references widely used security and AI-governance
frameworks to help customers read their posture against them. To avoid
reproducing licensed standard text, the platform references framework controls
**by identifier only** and pairs each with a **Nerion-authored plain-English
label** and a **crosswalk** to the public NIST CSF 2.0 informative references.
No verbatim requirement/criterion text from a licensed standard is stored or
displayed. Framework and product names are the property of their respective
owners; Nerion is independent and not affiliated with, sponsored by, or endorsed
by any of them.

> This notice is an engineering record of third-party materials and how they are
> used. It is not legal advice; confirm framework-licensing specifics with counsel
> before distribution.

## Bundled software / assets

| Asset | Author / Owner | License |
|---|---|---|
| Inter (`public/fonts/inter-var.woff2`) | The Inter Project Authors | SIL Open Font License 1.1 — see `public/fonts/LICENSE-Inter.txt` |

Other font families named in CSS (`Public Sans`, `Space Grotesk`, `JetBrains
Mono`, `Iowan Old Style`, `SF Mono`, system fonts) are **referenced as
`font-family` fallbacks only** — none are bundled or redistributed; they render
only if already present on the viewer's device, otherwise a system fallback is
used. No third-party runtime JavaScript libraries are bundled in the shipped
`public/` assets.

## Frameworks referenced (by ID + Nerion-authored labels; text not reproduced)

| Framework | Owner | How referenced |
|---|---|---|
| NIST CSF 2.0, NIST AI RMF (AI 100-1), SP 800-53, SP 800-66 | NIST (U.S. Government) | **Public domain.** CSF subcategory outcome statements are used verbatim (public domain). |
| ISO/IEC 27001:2022, ISO/IEC 42001 | International Organization for Standardization (ISO) | Clause / Annex-A **identifiers only**, with Nerion-authored labels; licensed ISO text is not reproduced. "ISO" is a trademark of ISO. |
| CIS Controls v8 | Center for Internet Security (CIS) | Control / safeguard **identifiers only**, with Nerion-authored labels; licensed CIS text is not stored or shown. |
| SOC 2 (Trust Services Criteria) | AICPA | Criteria referenced by ID with Nerion-authored labels; AICPA TSC text is not reproduced. |
| PCI DSS | PCI Security Standards Council | Referenced by requirement number only. |
| HIPAA Security Rule (45 CFR §164) | U.S. Government | **Public domain.** |
| OWASP Top 10 for LLM & Agentic Applications | OWASP Foundation | Category names referenced for interoperability. © OWASP Foundation, licensed **CC BY-SA 4.0**. Attribution shown in-product. |
| MITRE ATLAS™ (and ATT&CK®) | The MITRE Corporation | Tactic/technique identifiers used **with attribution**. ATLAS and ATT&CK are trademarks of The MITRE Corporation. |
| EU AI Act (Regulation (EU) 2024/1689) | European Union | Article numbers cited for mapping (EU legislation is freely reproducible). Not legal advice. |

Vendor product names that may appear in demo/sample data (e.g., EDR, SIEM,
identity, and other security tools) are used **nominatively** to describe
interoperability and evidence sources; they are trademarks of their respective
owners and no logos are bundled or displayed.
