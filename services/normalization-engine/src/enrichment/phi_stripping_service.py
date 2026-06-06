"""
PHI Stripping Service - Detects and strips Protected Health Information.

Uses regex patterns and NLP (spaCy) to detect and redact PHI/PII from
RiskObjects before LLM processing. Critical for HIPAA compliance.
"""

import re
from typing import List, Dict, Tuple, Any, Optional
import spacy

import structlog


logger = structlog.get_logger(__name__)


# PHI Patterns (Regex)
PHI_PATTERNS = {
    "member_id": r"\b(MEMBER|MEMB|ID)[-_]?\d{6,}\b",
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    "claim_id": r"\b(CLAIM|CLM)[-_]?\d{8,}\b",
    "mrn": r"\b(MRN|MR)[-_]?\d{6,}\b",
    "patient_name": r"(Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+",
    "phone": r"\b\d{3}-\d{3}-\d{4}\b",
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    "medical_record": r"\b(MEDICAL|RECORD|MR)[-_]?\d{6,}\b",
    "patient_id": r"\b(PATIENT|PT)[-_]?\d{6,}\b",
    "health_plan_id": r"\b(HP|HEALTH|PLAN)[-_]?\d{6,}\b"
}

# Compile regex patterns
COMPILED_PATTERNS = {
    phi_type: re.compile(pattern, re.IGNORECASE)
    for phi_type, pattern in PHI_PATTERNS.items()
}


class PHIStrippingService:
    """
    PHI Stripping Service.

    Detects and strips PHI/PII from RiskObjects using regex patterns
    and NLP-based entity detection.
    """

    def __init__(self, spacy_model: str = "en_core_web_sm"):
        """
        Initialize PHI Stripping Service.

        Args:
            spacy_model: spaCy model for NLP-based detection
        """
        self.spacy_model = spacy_model

        # Load spaCy model
        try:
            self.nlp = spacy.load(spacy_model)
            logger.info("spacy_model_loaded", model=spacy_model)
        except OSError:
            logger.warning(
                "spacy_model_not_found",
                model=spacy_model,
                message="Downloading spaCy model..."
            )
            # Download model if not found
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", spacy_model], check=True)
            self.nlp = spacy.load(spacy_model)
            logger.info("spacy_model_downloaded", model=spacy_model)

        # Statistics
        self._patterns_detected = 0
        self._entities_detected = 0
        self._redaction_count = 0

        logger.info("phi_stripping_service_initialized")

    def strip_phi_from_risk_object(
        self,
        risk_object: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], List[str]]:
        """
        Strip PHI/PII from RiskObject.

        Strips from:
        - affected_assets (if contains member IDs)
        - normalization_notes (if contains member names)
        - methodology_trail.assumptions (if contains PHI)
        - raw event data (if attached)

        Args:
            risk_object: RiskObject potentially containing PHI

        Returns:
            Tuple of (stripped_risk_object, stripped_fields_list)

        Example:
            Input: affected_assets=["member-12345-pc", "server-1"]
            Output: affected_assets=["member-XXXXX-pc", "server-1"]
                    stripped_fields=["affected_assets[0]"]
        """
        logger.debug("stripping_phi_from_risk_object", risk_object_id=risk_object.get('id'))

        stripped_fields = []
        stripped_risk_object = risk_object.copy()

        # Strip from affected_assets
        if 'affected_assets' in stripped_risk_object:
            assets, asset_stripped = self._strip_phi_from_list(
                stripped_risk_object['affected_assets'],
                field_prefix='affected_assets'
            )
            stripped_risk_object['affected_assets'] = assets
            stripped_fields.extend(asset_stripped)

        # Strip from normalization_notes
        if 'normalization_notes' in stripped_risk_object:
            notes, note_stripped = self._strip_phi_from_text(
                stripped_risk_object['normalization_notes'],
                field='normalization_notes'
            )
            stripped_risk_object['normalization_notes'] = notes
            if note_stripped:
                stripped_fields.append('normalization_notes')

        # Strip from methodology_trail.assumptions
        if 'methodology_trail' in stripped_risk_object:
            methodology_trail = stripped_risk_object['methodology_trail'].copy()

            if 'assumptions' in methodology_trail:
                assumptions, assumption_stripped = self._strip_phi_from_list(
                    methodology_trail['assumptions'],
                    field_prefix='methodology_trail.assumptions'
                )
                methodology_trail['assumptions'] = assumptions
                stripped_fields.extend(assumption_stripped)

            stripped_risk_object['methodology_trail'] = methodology_trail

        # Log stripping operation
        if stripped_fields:
            self._redaction_count += len(stripped_fields)
            logger.info(
                "phi_stripped",
                stripped_fields=stripped_fields,
                stripped_count=len(stripped_fields)
            )

        return stripped_risk_object, stripped_fields

    def _strip_phi_from_list(
        self,
        items: List[str],
        field_prefix: str
    ) -> Tuple[List[str], List[str]]:
        """
        Strip PHI from list of strings.

        Args:
            items: List of strings potentially containing PHI
            field_prefix: Field prefix for logging

        Returns:
            Tuple of (stripped_list, stripped_fields)
        """
        stripped_list = []
        stripped_fields = []

        for i, item in enumerate(items):
            stripped_item, has_phi = self._strip_phi_from_text(
                item,
                field=f"{field_prefix}[{i}]"
            )
            stripped_list.append(stripped_item)

            if has_phi:
                stripped_fields.append(f"{field_prefix}[{i}]")

        return stripped_list, stripped_fields

    def _strip_phi_from_text(self, text: str, field: str) -> Tuple[str, bool]:
        """
        Strip PHI from text string.

        Uses regex patterns and NLP to detect and redact PHI.

        Args:
            text: Text potentially containing PHI
            field: Field name for logging

        Returns:
            Tuple of (stripped_text, has_phi)
        """
        if not text:
            return text, False

        # Detect PHI using regex patterns
        phi_detections = self.detect_phi_patterns(text)

        # Detect PHI using NLP
        if self.nlp:
            nlp_detections = self.detect_phi_entities(text)
            phi_detections.extend(nlp_detections)

        # Redact PHI
        if phi_detections:
            stripped_text = self.redact_phi(text, phi_detections)
            self._patterns_detected += len(phi_detections)
            return stripped_text, True
        else:
            return text, False

    def detect_phi_patterns(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect PHI patterns in text using regex.

        Patterns:
        - Member ID: \b(MEMBER|MEMB|ID)[-_]?\d{6,}\b
        - SSN: \b\d{3}-\d{2}-\d{4}\b
        - Claim ID: \b(CLAIM|CLM)[-_]?\d{8,}\b
        - Medical Record Number: \b(MRN|MR)[-_]?\d{6,}\b
        - Patient Name: (Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+

        Args:
            text: Text to search

        Returns:
            List of detected PHI with positions
        """
        detections = []

        for phi_type, pattern in COMPILED_PATTERNS.items():
            matches = pattern.finditer(text)

            for match in matches:
                detection = {
                    "type": phi_type,
                    "text": match.group(),
                    "start": match.start(),
                    "end": match.end(),
                    "method": "regex"
                }
                detections.append(detection)

        if detections:
            logger.debug("phi_patterns_detected", detection_count=len(detections))

        return detections

    def detect_phi_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect PHI entities using spaCy NLP.

        Detects:
        - PERSON names
        - ORGANizations (healthcare providers)
        - Dates (birth dates, admission dates)
        - Locations (addresses)

        Args:
            text: Text to search

        Returns:
            List of detected PHI entities with positions
        """
        if not self.nlp:
            return []

        detections = []
        doc = self.nlp(text)

        # PHI-relevant entity types
        phi_entity_types = {"PERSON", "ORG", "DATE", "GPE", "LOC"}

        for ent in doc.ents:
            if ent.label_ in phi_entity_types:
                detection = {
                    "type": ent.label_.lower(),
                    "text": ent.text,
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "method": "nlp"
                }
                detections.append(detection)

        if detections:
            self._entities_detected += len(detections)
            logger.debug("phi_entities_detected", detection_count=len(detections))

        return detections

    def redact_phi(self, text: str, phi_detections: List[Dict[str, Any]]) -> str:
        """
        Redact detected PHI from text.

        Args:
            text: Original text
            phi_detections: List of PHI detections from detect_phi_*()

        Returns:
            Redacted text with PHI replaced by XXXX
        """
        # Sort detections by position (reverse order to avoid index shifting)
        sorted_detections = sorted(
            phi_detections,
            key=lambda d: d['start'],
            reverse=True
        )

        # Redact each detection
        redacted_text = text
        for detection in sorted_detections:
            start = detection['start']
            end = detection['end']

            # Replace with XXXX (same length as original)
            redaction = 'X' * (end - start)
            redacted_text = redacted_text[:start] + redaction + redacted_text[end:]

        return redacted_text

    def validate_stripping(self, original: str, stripped: str) -> bool:
        """
        Validate that PHI has been effectively stripped.

        Args:
            original: Original text
            stripped: Stripped text

        Returns:
            True if no PHI detected in stripped text
        """
        # Check for PHI patterns in stripped text
        phi_in_stripped = self.detect_phi_patterns(stripped)

        # Check for PHI entities in stripped text
        if self.nlp:
            nlp_in_stripped = self.detect_phi_entities(stripped)
        else:
            nlp_in_stripped = []

        # If no PHI detected, validation passes
        is_valid = len(phi_in_stripped) == 0 and len(nlp_in_stripped) == 0

        if not is_valid:
            logger.warning(
                "phi_stripping_validation_failed",
                phi_patterns_found=len(phi_in_stripped),
                nlp_entities_found=len(nlp_in_stripped)
            )

        return is_valid

    def get_statistics(self) -> Dict[str, int]:
        """
        Get PHI stripping statistics.

        Returns:
            Statistics dictionary
        """
        return {
            "patterns_detected": self._patterns_detected,
            "entities_detected": self._entities_detected,
            "redaction_count": self._redaction_count
        }
