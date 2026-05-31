#!/usr/bin/env python3
"""
Mock Evidence PDF Generator for BCBS State Demos
Generates professional-looking PDFs with DEMO watermarks
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas
from reportlab.platypus import Flowable
import datetime

# Watermark class
class Watermark(Flowable):
    def __init__(self, text):
        Flowable.__init__(self)
        self.text = text

    def draw(self):
        self.canv.saveState()
        self.canv.setFont("Helvetica-Bold", 60)
        self.canv.setFillColor(colors.red, alpha=0.15)
        self.canv.rotate(45)
        # Draw watermark centered on page
        text_width = self.canv.stringWidth(self.text, "Helvetica-Bold", 60)
        x = (self.canv._pagesize[0] - text_width) / 2
        y = (self.canv._pagesize[1] - 60) / 2
        self.canv.drawString(x, y, self.text)
        self.canv.restoreState()

# PDF metadata for each evidence file
EVIDENCE_FILES = {
    'mass': [
        {
            'filename': 'SOC2_TypeII_Cotiviti_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Cotiviti Analytics Platform',
            'content': [
                ['Service Organization:', 'Cotiviti'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'Deloitte & Touche LLP'],
                ['Report Date:', 'March 15, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Processing Integrity'],
                ['Description of Services:', 'Payment integrity analytics and fraud detection platform'],
                ['User Entities:', 'Health Plans and Payers'],
                ['Complementary User Entity Controls:', 'Defined in Appendix C'],
                ['', ''],
                ['Opinion:', 'In our opinion, in all material respects, the description of Cotiviti'],
                ['', 'system is fairly presented and the controls were effectively operating.'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_HealthEdge_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - HealthEdge',
            'content': [
                ['Service Organization:', 'HealthEdge'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'Ernst & Young LLP'],
                ['Report Date:', 'February 20, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Confidentiality'],
                ['Description of Services:', 'Enrollment and eligibility platform for Medicare Advantage'],
                ['User Entities:', 'Health Plans'],
                ['Complementary User Entity Controls:', 'Defined in Appendix B'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_Salesforce_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Salesforce Health Cloud',
            'content': [
                ['Service Organization:', 'Salesforce Health Cloud'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'KPMG LLP'],
                ['Report Date:', 'April 10, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Confidentiality'],
                ['Description of Services:', 'Member services CRM and care coordination'],
                ['User Entities:', 'Health Plans'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_Kyruus_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Kyruus',
            'content': [
                ['Service Organization:', 'Kyruus'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'RSM US LLP'],
                ['Report Date:', 'March 5, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability'],
                ['Description of Services:', 'Provider directory and patient scheduling platform'],
                ['User Entities:', 'Health Plans'],
            ]
        },
        {
            'filename': 'HITRUST_cs2_HealthEdge_2025.pdf',
            'title': 'HITRUST CS2 Certification',
            'subtitle': 'HealthEdge - Common Security Framework 2.0',
            'content': [
                ['Certification Type:', 'HITRUST CS2 Certified'],
                ['Organization:', 'HealthEdge'],
                ['Certification Period:', 'June 1, 2024 - May 31, 2025'],
                ['Assessment Firm:', 'A-LIGN CPAs, LLC'],
                ['Certification Date:', 'January 15, 2025'],
                ['CSF Version:', 'HITRUST CSF v11.2'],
                ['Control Requirements:', 'HIPAA, HITECH, Omnibus, NIST CSF'],
                ['Implementation Status:', 'Certified'],
                ['Risk Management:', 'Mature'],
            ]
        },
        {
            'filename': 'HITRUST_cs2_Zelis_2025.pdf',
            'title': 'HITRUST CS2 Certification',
            'subtitle': 'Zelis - Common Security Framework 2.0',
            'content': [
                ['Certification Type:', 'HITRUST CS2 Certified'],
                ['Organization:', 'Zelis'],
                ['Certification Period:', 'June 1, 2024 - May 31, 2025'],
                ['Assessment Firm:', 'Coalfire'],
                ['Certification Date:', 'February 28, 2025'],
                ['CSF Version:', 'HITRUST CSF v11.2'],
                ['Control Requirements:', 'HIPAA, PCI DSS, NIST CSF'],
                ['Implementation Status:', 'Certified'],
                ['Risk Management:', 'Mature'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_TriZetto_Mass_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Massachusetts and TriZetto Facets',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Massachusetts'],
                ['Business Associate:', 'TriZetto Facets (Cognizant)'],
                ['Agreement Date:', 'January 10, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Claims processing and payment integrity services'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
                ['Safeguards:', 'Administrative, Physical, Technical'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_ChangeHealthcare_Mass_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Massachusetts and Change Healthcare',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Massachusetts'],
                ['Business Associate:', 'Change Healthcare (UnitedHealth Group)'],
                ['Agreement Date:', 'January 12, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Clearinghouse and EDI services'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_Cotiviti_Mass_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Massachusetts and Cotiviti',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Massachusetts'],
                ['Business Associate:', 'Cotiviti'],
                ['Agreement Date:', 'January 8, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Payment integrity analytics and fraud detection'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_CAQH_Mass_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Massachusetts and CAQH',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Massachusetts'],
                ['Business Associate:', 'CAQH (Council for Affordable Quality Healthcare)'],
                ['Agreement Date:', 'January 14, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Provider credentialing and privileging'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'NIST_CSF_SelfAssessment_Mass_2025.pdf',
            'title': 'NIST Cybersecurity Framework Self-Assessment',
            'subtitle': 'Salesforce Health Cloud - BCBS Massachusetts',
            'content': [
                ['Assessment Framework:', 'NIST CSF v1.1'],
                ['Assessed System:', 'Salesforce Health Cloud'],
                ['Assessment Date:', 'April 1, 2025'],
                ['Assessment Period:', 'January 1, 2025 - March 31, 2025'],
                ['Assessor:', 'BCBS Massachusetts - CISO Office'],
                ['Overall Maturity Level:', 'Level 3 (Repeatable)'],
                ['Identify Function:', 'Level 3'],
                ['Protect Function:', 'Level 3'],
                ['Detect Function:', 'Level 3'],
                ['Respond Function:', 'Level 3'],
                ['Recover Function:', 'Level 2'],
            ]
        },
        {
            'filename': 'MA_DPH_Assessment_2025.pdf',
            'title': 'Massachusetts DPH Privacy & Security Assessment',
            'subtitle': '201 CMR 17.00 Compliance',
            'content': [
                ['Regulation:', 'MA 201 CMR 17.00'],
                ['Organization:', 'Blue Cross Blue Shield of Massachusetts'],
                ['Assessment Date:', 'March 30, 2025'],
                ['Assessment Period:', 'FY 2024'],
                ['Assessor:', 'MA DPH Compliance Office'],
                ['Written Information Security Program (WISP):', 'Implemented'],
                ['Encryption Requirements:', 'Compliant'],
                ['Breach Notification:', 'Compliant'],
                ['Third-Party Oversight:', 'Compliant'],
                ['Training Program:', 'Annual'],
                ['Overall Status:', 'Compliant'],
            ]
        },
    ],
    'texas': [
        {
            'filename': 'SOC2_TypeII_Inovalon_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Inovalon',
            'content': [
                ['Service Organization:', 'Inovalon'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'Deloitte & Touche LLP'],
                ['Report Date:', 'March 20, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Processing Integrity'],
                ['Description of Services:', 'Population health analytics and quality measures'],
                ['User Entities:', 'Health Plans'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_Salesforce_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Salesforce Health Cloud',
            'content': [
                ['Service Organization:', 'Salesforce Health Cloud'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'KPMG LLP'],
                ['Report Date:', 'April 5, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Confidentiality'],
                ['Description of Services:', 'Member services CRM and care coordination'],
                ['User Entities:', 'Health Plans'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_Benefitfocus_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Benefitfocus',
            'content': [
                ['Service Organization:', 'Benefitfocus ( Voya)'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'Grant Thornton LLP'],
                ['Report Date:', 'March 10, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability'],
                ['Description of Services:', 'Benefits administration and ACA reporting'],
                ['User Entities:', 'Health Plans and Employers'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_Availity_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report -Availity',
            'content': [
                ['Service Organization:', 'Availity'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'RSM US LLP'],
                ['Report Date:', 'March 25, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Confidentiality'],
                ['Description of Services:', 'Provider portal and clearinghouse'],
                ['User Entities:', 'Health Plans and Providers'],
            ]
        },
        {
            'filename': 'HITRUST_cs2_HealthEdge_Texas_2025.pdf',
            'title': 'HITRUST CS2 Certification',
            'subtitle': 'HealthEdge - Common Security Framework 2.0 (Texas Medicaid)',
            'content': [
                ['Certification Type:', 'HITRUST CS2 Certified'],
                ['Organization:', 'HealthEdge'],
                ['Certification Period:', 'June 1, 2024 - May 31, 2025'],
                ['Assessment Firm:', 'A-LIGN CPAs, LLC'],
                ['Certification Date:', 'February 15, 2025'],
                ['CSF Version:', 'HITRUST CSF v11.2'],
                ['Control Requirements:', 'HIPAA, HITECH, Texas Medicaid'],
                ['Implementation Status:', 'Certified'],
            ]
        },
        {
            'filename': 'HITRUST_cs2_Zelis_Texas_2025.pdf',
            'title': 'HITRUST CS2 Certification',
            'subtitle': 'Zelis - Common Security Framework 2.0 (Texas Medicaid)',
            'content': [
                ['Certification Type:', 'HITRUST CS2 Certified'],
                ['Organization:', 'Zelis'],
                ['Certification Period:', 'June 1, 2024 - May 31, 2025'],
                ['Assessment Firm:', 'Coalfire'],
                ['Certification Date:', 'February 28, 2025'],
                ['CSF Version:', 'HITRUST CSF v11.2'],
                ['Control Requirements:', 'HIPAA, PCI DSS, Texas Medicaid'],
                ['Implementation Status:', 'Certified'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_QNXT_Texas_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Texas and QNXT',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Texas'],
                ['Business Associate:', 'QNXT (Oracle Health)'],
                ['Agreement Date:', 'January 15, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Medicaid claims processing'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA & Texas Medicaid compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_FACETS_Texas_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Texas and FACETS',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Texas'],
                ['Business Associate:', 'FACETS (Cognizant)'],
                ['Agreement Date:', 'January 16, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Commercial claims processing'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_Inovalon_Texas_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Texas and Inovalon',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Texas'],
                ['Business Associate:', 'Inovalon'],
                ['Agreement Date:', 'January 18, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Population health analytics'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA & Texas Medicaid compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_Availity_Texas_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Texas and Availity',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Texas'],
                ['Business Associate:', 'Availity'],
                ['Agreement Date:', 'January 20, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Provider portal and clearinghouse'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA & Texas Medicaid compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'ISO_27001_Benefitfocus_2025.pdf',
            'title': 'ISO 27001:2013 Certification',
            'subtitle': 'Benefitfocus Information Security Management System',
            'content': [
                ['Standard:', 'ISO/IEC 27001:2013'],
                ['Organization:', 'Benefitfocus (Voya)'],
                ['Certification Date:', 'April 15, 2025'],
                ['Certification Period:', 'May 1, 2024 - May 1, 2027'],
                ['Certification Body:', 'BSI Group America'],
                ['ISMS Scope:', 'Benefits administration and ACA reporting'],
                ['Statement of Applicability:', 'SoA v3.2'],
                ['Risk Assessment:', 'Annual'],
                ['Management Review:', 'Quarterly'],
                ['Surveillance Audits:', 'Annual'],
            ]
        },
        {
            'filename': 'TX_HB300_GapAssessment_2025.pdf',
            'title': 'Texas HB 300 Privacy Law Gap Assessment',
            'subtitle': 'BCBS Texas - 2025 Assessment',
            'content': [
                ['Texas Law:', 'HB 300 (Tex. Bus. & Com. Code § 521)'],
                ['Organization:', 'Blue Cross Blue Shield of Texas'],
                ['Assessment Date:', 'May 1, 2025'],
                ['Assessment Period:', 'FY 2024'],
                ['Assessor:', 'BCBS Texas - Compliance Office'],
                ['Breach Notification Timeline:', 'Compliant (30 days)'],
                ['Training Requirements:', 'Compliant'],
                ['Privacy Policy:', 'Compliant'],
                ['Third-Party Contracts:', 'Compliant'],
                ['Encryption Standards:', 'Compliant'],
                ['Overall Status:', 'Compliant'],
            ]
        },
    ],
    'virginia': [
        {
            'filename': 'SOC2_TypeII_ChangeHealthcare_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Change Healthcare',
            'content': [
                ['Service Organization:', 'Change Healthcare (UnitedHealth Group)'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'Deloitte & Touche LLP'],
                ['Report Date:', 'March 18, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Processing Integrity'],
                ['Description of Services:', 'Claims gateway and clearinghouse'],
                ['User Entities:', 'Health Plans and Providers'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_Availity_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Availity',
            'content': [
                ['Service Organization:', 'Availity'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'RSM US LLP'],
                ['Report Date:', 'March 22, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Confidentiality'],
                ['Description of Services:', 'Provider portal and clearinghouse'],
                ['User Entities:', 'Health Plans and Providers'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_Cotiviti_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - Cotiviti',
            'content': [
                ['Service Organization:', 'Cotiviti'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'Deloitte & Touche LLP'],
                ['Report Date:', 'March 15, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability, Processing Integrity'],
                ['Description of Services:', 'Payment integrity analytics'],
                ['User Entities:', 'Health Plans'],
            ]
        },
        {
            'filename': 'SOC2_TypeII_HealthSherpa_2025.pdf',
            'title': 'System and Organization Controls (SOC) 2',
            'subtitle': 'Type II Report - HealthSherpa',
            'content': [
                ['Service Organization:', 'HealthSherpa'],
                ['Audit Period:', 'January 1, 2024 - December 31, 2024'],
                ['Service Auditor:', 'Moss Adams LLP'],
                ['Report Date:', 'March 8, 2025'],
                ['Criteria:', 'SOC 2 Trust Services Criteria'],
                ['Trust Services Covered:', 'Security, Availability'],
                ['Description of Services:', 'Marketplace enrollment platform'],
                ['User Entities:', 'Health Plans and Exchanges'],
            ]
        },
        {
            'filename': 'HITRUST_cs2_Zelis_Virginia_2025.pdf',
            'title': 'HITRUST CS2 Certification',
            'subtitle': 'Zelis - Common Security Framework 2.0 (Multi-State)',
            'content': [
                ['Certification Type:', 'HITRUST CS2 Certified'],
                ['Organization:', 'Zelis'],
                ['Certification Period:', 'June 1, 2024 - May 31, 2025'],
                ['Assessment Firm:', 'Coalfire'],
                ['Certification Date:', 'February 20, 2025'],
                ['CSF Version:', 'HITRUST CSF v11.2'],
                ['Control Requirements:', 'HIPAA, PCI DSS, Multi-State Privacy'],
                ['Implementation Status:', 'Certified'],
            ]
        },
        {
            'filename': 'HITRUST_cs2_ModioHealth_2025.pdf',
            'title': 'HITRUST CS2 Certification',
            'subtitle': 'Modio Health - Common Security Framework 2.0',
            'content': [
                ['Certification Type:', 'HITRUST CS2 Certified'],
                ['Organization:', 'Modio Health'],
                ['Certification Period:', 'June 1, 2024 - May 31, 2025'],
                ['Assessment Firm:', 'A-LIGN CPAs, LLC'],
                ['Certification Date:', 'February 25, 2025'],
                ['CSF Version:', 'HITRUST CSF v11.2'],
                ['Control Requirements:', 'HIPAA, HITECH, NIST CSF'],
                ['Implementation Status:', 'Certified'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_ChangeHealthcare_Virginia_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Virginia and Change Healthcare',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Virginia (CareFirst)'],
                ['Business Associate:', 'Change Healthcare (UnitedHealth Group)'],
                ['Agreement Date:', 'January 11, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Claims gateway and clearinghouse (DC/VA/MD)'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_Availity_Virginia_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Virginia and Availity',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Virginia (CareFirst)'],
                ['Business Associate:', 'Availity'],
                ['Agreement Date:', 'January 13, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Provider portal and clearinghouse'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_Cotiviti_Virginia_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Virginia and Cotiviti',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Virginia (CareFirst)'],
                ['Business Associate:', 'Cotiviti'],
                ['Agreement Date:', 'January 9, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Payment integrity analytics'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'HIPAA_BAA_Zelis_Virginia_2025.pdf',
            'title': 'HIPAA Business Associate Agreement',
            'subtitle': 'BCBS Virginia and Zelis',
            'content': [
                ['Agreement Type:', 'Business Associate Agreement (BAA)'],
                ['Covered Entity:', 'Blue Cross Blue Shield of Virginia (CareFirst)'],
                ['Business Associate:', 'Zelis'],
                ['Agreement Date:', 'January 7, 2025'],
                ['Effective Period:', 'January 1, 2025 - December 31, 2027'],
                ['Purpose:', 'Payment processing (DC/VA/MD)'],
                ['Permitted Uses:', 'Treatment, Payment, Health Care Operations'],
                ['Obligations:', 'HIPAA Privacy & Security Rule compliance'],
                ['Breach Notification:', 'Within 60 days of discovery'],
            ]
        },
        {
            'filename': 'CIS_v8_Assessment_Salesforce_2025.pdf',
            'title': 'CIS Critical Security Controls Assessment',
            'subtitle': 'Salesforce Service Cloud - CIS v8.1.2',
            'content': [
                ['Assessment Framework:', 'CIS Controls v8.1.2'],
                ['Assessed System:', 'Salesforce Service Cloud'],
                ['Assessment Date:', 'April 20, 2025'],
                ['Assessment Period:', 'January 1, 2025 - March 31, 2025'],
                ['Assessor:', 'BCBS Virginia - CISO Office'],
                ['Implementation Level:', 'IG1 (Intermediate)'],
                ['Overall Score:', '82% (Implementation)'],
                ['Safeguard 1-6 (IG1):', '85% implemented'],
                ['Safeguard 7-16 (IG2):', '78% implemented'],
                ['Safeguard 17-18 (IG3):', '65% implemented'],
            ]
        },
        {
            'filename': 'FEP_OPM_Assessment_2025.pdf',
            'title': 'Federal Employee Program OPM Compliance Assessment',
            'subtitle': 'BCBS Virginia (CareFirst) - Multi-State FEP Operations',
            'content': [
                ['Program:', 'Federal Employee Program (FEP)'],
                ['Regulatory Body:', 'Office of Personnel Management (OPM)'],
                ['Organization:', 'Blue Cross Blue Shield of Virginia (CareFirst)'],
                ['Assessment Date:', 'May 10, 2025'],
                ['Assessment Period:', 'FY 2024'],
                ['Coverage Area:', 'DC/VA/MD (Multi-State)'],
                ['FEP Contract Requirements:', 'Compliant'],
                ['OPM Security Requirements:', 'Compliant'],
                ['Multi-State Coordination:', 'Compliant'],
                ['Breach Notification:', 'Compliant'],
                ['Overall Status:', 'Compliant'],
            ]
        },
    ]
}

def create_pdf(evidence_data, filepath):
    """Create a professional-looking PDF with demo watermark"""
    doc = SimpleDocTemplate(filepath, pagesize=A4,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)

    styles = getSampleStyleSheet()
    story = []

    # Add watermark
    story.append(Watermark("DEMO - NOT FOR ACTUAL COMPLIANCE"))

    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.darkblue,
        alignment=TA_CENTER,
        spaceAfter=12
    )

    # Subtitle style
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.darkblue,
        alignment=TA_CENTER,
        spaceAfter=24
    )

    # Add title
    story.append(Paragraph(evidence_data['title'], title_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph(evidence_data['subtitle'], subtitle_style))
    story.append(Spacer(1, 24))

    # Create table
    table_data = []
    for row in evidence_data['content']:
        table_data.append(row)

    # Create table style
    table = Table(table_data, colWidths=[2.5*inch, 3.5*inch])
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.lightgrey]),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))

    story.append(table)
    story.append(Spacer(1, 24))

    # Add disclaimer
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.red,
        alignment=TA_CENTER,
        leading=10
    )
    story.append(Paragraph(
        'DEMO DOCUMENT - NOT FOR ACTUAL COMPLIANCE USE - FOR DEMONSTRATION PURPOSES ONLY',
        disclaimer_style
    ))

    # Build PDF
    doc.build(story)

def main():
    """Generate all mock evidence PDFs"""
    import os

    base_dir = '/Users/briandibassinga/Github/Cyber-Rx/cyberrx-api/mock-evidence'

    for state, files in EVIDENCE_FILES.items():
        state_dir = os.path.join(base_dir, state)
        os.makedirs(state_dir, exist_ok=True)

        print(f"Generating {len(files)} PDFs for {state.upper()}...")

        for evidence_data in files:
            filepath = os.path.join(state_dir, evidence_data['filename'])
            create_pdf(evidence_data, filepath)
            print(f"  Created: {evidence_data['filename']}")

    print("\nAll mock evidence PDFs generated successfully!")

if __name__ == '__main__':
    main()
