"""
Regulatory Trigger Mapper - Maps risk events to regulatory obligations.

Identifies HIPAA requirements, CMS regulations, and state breach laws
triggered by security events.
"""

import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import structlog

from ..config import TimescaleDBConfig, RegulatoryMappingConfig


logger = structlog.get_logger(__name__)


@dataclass
class Regulation:
    """
    Regulatory trigger associated with a risk.
    """
    regulation_id: str
    name: str
    obligation: str
    deadline: str  # ISO 8601
    status: str  # "compliant", "at_risk", "non_compliant"
    notification_required: bool
    notification_timeline: str
    cms_form_required: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "regulation_id": self.regulation_id,
            "name": self.name,
            "obligation": self.obligation,
            "deadline": self.deadline,
            "status": self.status,
            "notification_required": self.notification_required,
            "notification_timeline": self.notification_timeline,
            "cms_form_required": self.cms_form_required
        }


# Regulatory Mapping Rules
REGULATORY_MAPPINGS = {
    "hipaa_phi_disclosure": {
        "triggers": [
            "business_process_map CONTAINS 'claims_adjudication'",
            "business_process_map CONTAINS 'enrollment'",
            "business_process_map CONTAINS 'care_management'",
            "affected_assets MATCHES 'member.*'",
            "source IN ('nasco', 'azure_ad')"
        ],
        "regulation_id": "HIPAA-45CFR164.312",
        "name": "HIPAA Security Rule - Safeguard Electronic PHI",
        "obligation": "Implement technical safeguards to protect electronic PHI",
        "notification_required": True,
        "notification_timeline": "60 days",
        "deadline_calc": "breach_date + 60 days"
    },
    "hipaa_breach_notification": {
        "triggers": [
            "category = 'threat'",
            "severity >= 'HIGH'",
            "business_process_map CONTAINS 'claims_adjudication'"
        ],
        "regulation_id": "HIPAA-45CFR164.404",
        "name": "HIPAA Breach Notification Rule",
        "obligation": "Notify individuals, HHS, and media of PHI breach",
        "notification_required": True,
        "notification_timeline": "60 days",
        "deadline_calc": "discovery_date + 60 days"
    },
    "cms_mlr_breach": {
        "triggers": [
            "financial_exposure.mlr_impact > 1.0",
            "financial_exposure.line_of_business IN ('Medicare', 'Medicaid')"
        ],
        "regulation_id": "CMS-4202-B",
        "name": "CMS MLR Reporting Requirements",
        "obligation": "Report Medical Loss Ratio shortfall to CMS",
        "notification_required": True,
        "notification_timeline": "90 days",
        "deadline_calc": "year_end + 90 days"
    },
    "cms_part_d_breach": {
        "triggers": [
            "business_process_map CONTAINS 'pbm_interface'",
            "severity >= 'HIGH'",
            "category = 'threat'"
        ],
        "regulation_id": "CMS-10743",
        "name": "CMS Part D Breach Reporting",
        "obligation": "Report Part D breach affecting enrollees to CMS",
        "notification_required": True,
        "notification_timeline": "60 days",
        "cms_form_required": "CMS-10743",
        "deadline_calc": "discovery_date + 60 days"
    },
    "cms_part_c_breach": {
        "triggers": [
            "business_process_map CONTAINS 'provider_payment'",
            "severity >= 'HIGH'",
            "category = 'threat'"
        ],
        "regulation_id": "CMS-10613",
        "name": "CMS Part C Breach Reporting",
        "obligation": "Report Part C breach to CMS",
        "notification_required": True,
        "notification_timeline": "60 days",
        "cms_form_required": "CMS-10613",
        "deadline_calc": "discovery_date + 60 days"
    }
}


class RegulatoryMapper:
    """
    Regulatory Trigger Mapper.

    Maps risk events to regulatory obligations including HIPAA,
    CMS regulations, and state breach laws.
    """

    def __init__(
        self,
        config: TimescaleDBConfig,
        regulatory_config: RegulatoryMappingConfig
    ):
        """
        Initialize Regulatory Mapper.

        Args:
            config: TimescaleDB configuration
            regulatory_config: Regulatory mapping configuration
        """
        self.config = config
        self.regulatory_config = regulatory_config

        # Statistics
        self._hipaa_triggers = 0
        self._cms_triggers = 0
        self._state_triggers = 0

        logger.info("regulatory_mapper_initialized")

    async def map_regulatory_triggers(
        self,
        risk_object: Dict[str, Any],
        customer_id: str
    ) -> List[Regulation]:
        """
        Map risk event to regulatory obligations.

        Maps based on:
        - Business processes affected (claims adjudication → HIPAA)
        - PHI exposure (member_id in affected_assets → HIPAA 45 CFR §164.312)
        - System type (claims_system → CMS regulations)
        - Severity (critical → breach notification required)

        Args:
            risk_object: RiskObject with business_process_map
            customer_id: Customer for tenant isolation

        Returns:
            List of regulatory obligations triggered
        """
        logger.debug(
            "mapping_regulatory_triggers",
            risk_object_id=risk_object.get('id'),
            customer_id=customer_id
        )

        regulations = []

        # Check HIPAA triggers
        if self.regulatory_config.hipaa_enabled:
            hipaa_regs = await self.check_hipaa_triggers(risk_object)
            regulations.extend(hipaa_regs)

        # Check CMS triggers
        if self.regulatory_config.cms_enabled:
            cms_regs = await self.check_cms_triggers(risk_object)
            regulations.extend(cms_regs)

        logger.debug(
            "regulatory_triggers_mapped",
            regulation_count=len(regulations)
        )

        return regulations

    async def check_hipaa_triggers(self, risk_object: Dict[str, Any]) -> List[Regulation]:
        """
        Check if HIPAA obligations are triggered.

        HIPAA triggered if:
        - Business process involves PHI (claims, enrollment, care management)
        - PHI present in affected_assets
        - System type is claims_system, member_portal, provider_portal

        Args:
            risk_object: RiskObject to check

        Returns:
            List of HIPAA regulations triggered
        """
        hipaa_regs = []

        business_process_map = risk_object.get('business_process_map', [])
        affected_assets = risk_object.get('affected_assets', [])
        source = risk_object.get('source', '')
        category = risk_object.get('category', '')
        severity = risk_object.get('severity', '').lower()

        # Check for PHI-related business processes
        phi_processes = ['claims_adjudication', 'enrollment', 'care_management',
                        'provider_payment', 'edi_837', 'edi_835']
        has_phi_process = any(process in business_process_map for process in phi_processes)

        # Check for PHI in affected assets
        has_phi_assets = any(
            re.search(r'\b(member|patient|mrn)\b', asset, re.IGNORECASE)
            for asset in affected_assets
        )

        # Check source
        phi_sources = ['nasco', 'azure_ad', 'splunk', 'crowdstrike']
        has_phi_source = source in phi_sources

        # Determine if HIPAA is triggered
        if has_phi_process or has_phi_assets or has_phi_source:
            # HIPAA Security Rule
            phi_disclosure = Regulation(
                regulation_id="HIPAA-45CFR164.312",
                name="HIPAA Security Rule - Safeguard Electronic PHI",
                obligation="Implement technical safeguards to protect electronic PHI",
                deadline=self._calculate_deadline("hipaa_breach", risk_object),
                status="at_risk",
                notification_required=True,
                notification_timeline="60 days"
            )
            hipaa_regs.append(phi_disclosure)
            self._hipaa_triggers += 1

            # HIPAA Breach Notification (if high severity)
            if severity in ['high', 'critical']:
                breach_notification = Regulation(
                    regulation_id="HIPAA-45CFR164.404",
                    name="HIPAA Breach Notification Rule",
                    obligation="Notify individuals, HHS, and media of PHI breach",
                    deadline=self._calculate_deadline("hipaa_breach", risk_object),
                    status="at_risk",
                    notification_required=True,
                    notification_timeline="60 days"
                )
                hipaa_regs.append(breach_notification)
                self._hipaa_triggers += 1

        if hipaa_regs:
            logger.debug("hipaa_triggers_detected", trigger_count=len(hipaa_regs))

        return hipaa_regs

    async def check_cms_triggers(self, risk_object: Dict[str, Any]) -> List[Regulation]:
        """
        Check if CMS regulations are triggered.

        CMS triggered if:
        - Medicare/Medicaid business process affected
        - MLR impact > threshold (e.g., 1 percentage point)
        - Premium revenue at risk for Medicare line of business

        Args:
            risk_object: RiskObject to check

        Returns:
            True if CMS obligations triggered
        """
        cms_regs = []

        business_process_map = risk_object.get('business_process_map', [])
        financial_exposure = risk_object.get('financial_exposure', {})
        severity = risk_object.get('severity', '').lower()

        # Check for Part D (PBM interface)
        if 'pbm_interface' in business_process_map and severity in ['high', 'critical']:
            part_d_breach = Regulation(
                regulation_id="CMS-10743",
                name="CMS Part D Breach Reporting",
                obligation="Report Part D breach affecting enrollees to CMS",
                deadline=self._calculate_deadline("cms_10743", risk_object),
                status="at_risk",
                notification_required=True,
                notification_timeline="60 days",
                cms_form_required="CMS-10743"
            )
            cms_regs.append(part_d_breach)
            self._cms_triggers += 1

        # Check for Part C (Provider payment)
        if 'provider_payment' in business_process_map and severity in ['high', 'critical']:
            part_c_breach = Regulation(
                regulation_id="CMS-10613",
                name="CMS Part C Breach Reporting",
                obligation="Report Part C breach to CMS",
                deadline=self._calculate_deadline("cms_part_c", risk_object),
                status="at_risk",
                notification_required=True,
                notification_timeline="60 days",
                cms_form_required="CMS-10613"
            )
            cms_regs.append(part_c_breach)
            self._cms_triggers += 1

        # Check for MLR breach
        mlr_impact = financial_exposure.get('mlr_impact', 0)
        line_of_business = financial_exposure.get('line_of_business', '')

        if mlr_impact > 1.0 and line_of_business in ['Medicare', 'Medicaid']:
            mlr_breach = Regulation(
                regulation_id="CMS-4202-B",
                name="CMS MLR Reporting Requirements",
                obligation="Report Medical Loss Ratio shortfall to CMS",
                deadline=self._calculate_deadline("cms_mlr", risk_object),
                status="at_risk",
                notification_required=True,
                notification_timeline="90 days"
            )
            cms_regs.append(mlr_breach)
            self._cms_triggers += 1

        if cms_regs:
            logger.debug("cms_triggers_detected", trigger_count=len(cms_regs))

        return cms_regs

    def _calculate_deadline(
        self,
        regulation_type: str,
        risk_object: Dict[str, Any]
    ) -> str:
        """
        Calculate notification deadline based on regulation.

        Examples:
        - HIPAA breach notification: 60 days from discovery
        - CMS-10743 (Part D): 60 days from discovery
        - State breach laws: Varies by state (CA: 30 days, TX: 60 days)

        Args:
            regulation_type: Regulation identifier
            risk_object: RiskObject with timestamps

        Returns:
            ISO 8601 deadline for notification
        """
        # Get discovery date from risk object
        discovery_date_str = risk_object.get('first_detected_at') or risk_object.get('created_at')

        try:
            discovery_date = datetime.fromisoformat(discovery_date_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            # Default to current time if parsing fails
            discovery_date = datetime.utcnow()

        # Get notification timeline from config
        timeline_days = self.regulatory_config.notification_timeline_days.get(
            regulation_type,
            60  # Default to 60 days
        )

        # Calculate deadline
        deadline = discovery_date + timedelta(days=timeline_days)

        return deadline.isoformat()

    def get_statistics(self) -> Dict[str, int]:
        """
        Get regulatory mapping statistics.

        Returns:
            Statistics dictionary
        """
        return {
            "hipaa_triggers": self._hipaa_triggers,
            "cms_triggers": self._cms_triggers,
            "state_triggers": self._state_triggers
        }
