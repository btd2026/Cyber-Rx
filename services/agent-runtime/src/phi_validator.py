"""
PHI Boundary Validator

CRITICAL SECURITY COMPONENT: Validates that NO Protected Health Information (PHI)
reaches the Claude LLM. This is a HIPAA security boundary.

This is the second line of defense (after upstream PHI stripping in T-MVP-005).
If PHI is detected, the LLM call is aborted and security is alerted.
"""
import re
import json
from typing import List, Dict, Any
from src.models import ValidationResult, PHIValidationError


class PHIValidator:
    """
    Validates that context contains NO PHI before LLM calls.

    This is a CRITICAL HIPAA security boundary. NO PHI should reach Claude.
    """

    # PHI Patterns to detect
    PHI_PATTERNS = {
        # Member IDs (alphanumeric, 8-20 chars, common patterns)
        'member_id': [
            r'\b[A-Z0-9]{8,20}\b',  # Generic alphanumeric
            r'\bMEM[0-9]{6,15}\b',  # MEM + digits
            r'\bMBR[0-9]{6,15}\b',  # MBR + digits
        ],

        # Patient names (title case + last name patterns)
        'patient_name': [
            r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b',  # First Last
            r'\b[A-Z]\.\s*[A-Z][a-z]+\b',  # F. Last
            r'\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b',  # Last, First
        ],

        # MRNs (Medical Record Numbers)
        'mrn': [
            r'\bMRN[0-9]{6,10}\b',  # MRN prefix
            r'\bMR[0-9]{6,10}\b',  # MR prefix
            r'\bMedical Record:\s*[0-9]{6,10}\b',  # Medical Record: number
        ],

        # DOBs (Dates of Birth)
        'dob': [
            r'\bDOB:\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # DOB: MM/DD/YYYY
            r'\bDate of Birth:\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # Date of Birth: ...
            r'\bborn\s+(on|:)\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # born on ...
        ],

        # SSNs (Social Security Numbers)
        'ssn': [
            r'\b\d{3}-\d{2}-\d{4}\b',  # XXX-XX-XXXX
            r'\b\d{3}\s*\d{2}\s*\d{4}\b',  # XXX XX XXXX
            r'\bSSN:\s*\d{3}-\d{2}-\d{4}\b',  # SSN: XXX-XX-XXXX
        ],

        # Claims IDs
        'claims_id': [
            r'\bCLAIM[0-9]{8,15}\b',  # CLAIM + digits
            r'\bCLM[0-9]{8,15}\b',  # CLM + digits
            r'\bClaim[#:\s]*[0-9]{8,15}\b',  # Claim # XXXXX
        ],

        # ICD-10 Codes (Diagnosis Codes)
        'icd10': [
            r'\b[A-Z][0-9][A-Z0-9](?:\.[A-Z0-9]{0,4})?\b',  # ICD-10 format
        ],

        # CPT Codes (Procedure Codes)
        'cpt': [
            r'\bCPT:\s*\d{5}\b',  # CPT: XXXXX
            r'\b\d{5}-?\d{2}\b',  # XXXX-XX (CPT with modifiers)
        ],

        # Provider names (medical entities)
        'provider_name': [
            r'\bHospital\b',
            r'\bMedical Center\b',
            r'\bClinic\b',
            r'\bHealth System\b',
            r'\bPhysicians?\b',
            r'\bDrs\.?\s+[A-Z][a-z]+\b',  # Dr. Last
            r'\bDr\.?\s+[A-Z]\.?\s*[A-Z][a-z]+\b',  # Dr. F. Last
        ],
    }

    # Patterns that are allowed (false positives to ignore)
    ALLOWED_PATTERNS = [
        r'\bserver-\d+\b',  # server-1, server-2
        r'\bdb-\d+\b',  # db-1, db-2
        r'\bapi-\d+\b',  # api-1, api-2
        r'\bprocess-\d+\b',  # process-1, process-2
        r'\binstance-\d+\b',  # instance-1, instance-2
        r'\bclaims-adjudication\b',  # Business process name
        r'\bclaims-processing\b',  # Business process name
        r'\bclaims-db\b',  # System name
        r'\bclaims-api\b',  # System name
        r'\bprovider-portal\b',  # System name
        r'\bmember-portal\b',  # System name
    ]

    def __init__(self):
        """Initialize PHI validator with compiled patterns."""
        self._compile_patterns()
        self._compile_allowed_patterns()

    def _compile_patterns(self):
        """Pre-compile PHI patterns for performance."""
        self.compiled_patterns = {}
        for phi_type, patterns in self.PHI_PATTERNS.items():
            self.compiled_patterns[phi_type] = [
                re.compile(pattern, re.IGNORECASE)
                for pattern in patterns
            ]

    def _compile_allowed_patterns(self):
        """Pre-compile allowed patterns (false positives)."""
        self.compiled_allowed = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.ALLOWED_PATTERNS
        ]

    def validate_no_phi(self, context: Dict[str, Any]) -> ValidationResult:
        """
        Validate that context contains NO PHI.

        This is a CRITICAL security boundary. NO PHI should reach Claude.

        Args:
            context: Context dictionary for LLM

        Returns:
            ValidationResult: Validation result with PHI matches if any
        """
        # Convert context to JSON string for scanning
        context_str = json.dumps(context, indent=2, default=str)

        # Scan for PHI
        phi_matches = self.scan_for_phi(context_str)

        if phi_matches:
            return ValidationResult(
                valid=False,
                phi_detected=True,
                phi_matches=phi_matches,
                error_message=f"PHI detected in context: {len(phi_matches)} matches found"
            )

        return ValidationResult(
            valid=True,
            phi_detected=False,
            phi_matches=[],
            error_message=None
        )

    def scan_for_phi(self, text: str) -> List[str]:
        """
        Scan text for PHI patterns.

        Args:
            text: Text to scan for PHI

        Returns:
            List[str]: List of PHI matches found
        """
        phi_matches = []

        # First, filter out allowed patterns
        allowed_positions = set()
        for pattern in self.compiled_allowed:
            for match in pattern.finditer(text):
                allowed_positions.add(match.start())

        # Scan for PHI patterns
        for phi_type, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                for match in pattern.finditer(text):
                    # Skip if this matches an allowed pattern
                    if match.start() in allowed_positions:
                        continue

                    # Extract the matched text with context
                    start = max(0, match.start() - 20)
                    end = min(len(text), match.end() + 20)
                    context_snippet = text[start:end]

                    phi_matches.append(
                        f"{phi_type}: '{match.group()}' in context: \"...{context_snippet}...\""
                    )

        return phi_matches

    def validate_context_dict(self, context: Dict[str, Any]) -> ValidationResult:
        """
        Validate context dictionary recursively.

        This is more thorough than JSON string scanning as it validates
        each value individually.

        Args:
            context: Context dictionary

        Returns:
            ValidationResult: Validation result
        """
        def _scan_dict(data: Any, path: str = "root") -> List[str]:
            """Recursively scan dictionary for PHI."""
            matches = []

            if isinstance(data, dict):
                for key, value in data.items():
                    new_path = f"{path}.{key}"
                    matches.extend(_scan_dict(value, new_path))

            elif isinstance(data, list):
                for i, item in enumerate(data):
                    new_path = f"{path}[{i}]"
                    matches.extend(_scan_dict(item, new_path))

            elif isinstance(data, str):
                phi_found = self.scan_for_phi(data)
                for phi in phi_found:
                    matches.append(f"{path}: {phi}")

            elif isinstance(data, (int, float, bool)) or data is None:
                # These types don't contain PHI
                pass

            else:
                # Unknown type, convert to string and scan
                str_data = str(data)
                phi_found = self.scan_for_phi(str_data)
                for phi in phi_found:
                    matches.append(f"{path}: {phi}")

            return matches

        phi_matches = _scan_dict(context)

        if phi_matches:
            return ValidationResult(
                valid=False,
                phi_detected=True,
                phi_matches=phi_matches,
                error_message=f"PHI detected in context: {len(phi_matches)} matches"
            )

        return ValidationResult(
            valid=True,
            phi_detected=False,
            phi_matches=[],
            error_message=None
        )

    def raise_if_phi_detected(self, context: Dict[str, Any]) -> None:
        """
        Raise exception if PHI detected in context.

        Use this method before LLM calls to abort if PHI is present.

        Args:
            context: Context dictionary

        Raises:
            PHIValidationError: If PHI detected
        """
        result = self.validate_context_dict(context)

        if result.phi_detected:
            # Log security alert (in production, send to security team)
            error_msg = (
                f"SECURITY ALERT: PHI detected in LLM context. "
                f"LLM call aborted. PHI matches: {result.phi_matches}"
            )
            raise PHIValidationError(error_msg)


# Singleton instance for use across the application
_phi_validator_instance = None


def get_phi_validator() -> PHIValidator:
    """Get singleton PHI validator instance."""
    global _phi_validator_instance
    if _phi_validator_instance is None:
        _phi_validator_instance = PHIValidator()
    return _phi_validator_instance
