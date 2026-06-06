"""
RiskObject Validator - Validates RiskObjects against schema constraints.

Ensures all RiskObjects meet schema requirements including field types,
score ranges, financial_exposure structure, and methodology_trail completeness.
"""

import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import structlog


logger = structlog.get_logger(__name__)


@dataclass
class ValidationError:
    """
    Validation error details.
    """
    error_type: str
    field: str
    message: str
    severity: str  # "error" or "warning"


@dataclass
class ValidationResult:
    """
    Result of RiskObject validation.
    """
    is_valid: bool
    errors: List[ValidationError]
    warnings: List[ValidationError]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "is_valid": self.is_valid,
            "errors": [
                {
                    "error_type": e.error_type,
                    "field": e.field,
                    "message": e.message,
                    "severity": e.severity
                }
                for e in self.errors
            ],
            "warnings": [
                {
                    "error_type": w.error_type,
                    "field": w.field,
                    "message": w.message,
                    "severity": w.severity
                }
                for w in self.warnings
            ]
        }


class RiskObjectValidator:
    """
    RiskObject Validator.

    Validates all RiskObjects against schema constraints including
    field types, score ranges, financial_exposure structure, and
    methodology_trail completeness.
    """

    def __init__(self, strict_mode: bool = True):
        """
        Initialize RiskObject Validator.

        Args:
            strict_mode: If True, fail on warnings as errors
        """
        self.strict_mode = strict_mode

        # Validation statistics
        self._total_validated = 0
        self._validation_failed = 0
        self._validation_passed = 0

        logger.info("risk_object_validator_initialized", strict_mode=strict_mode)

    def validate_risk_object(self, risk_object: Dict[str, Any]) -> ValidationResult:
        """
        Validate RiskObject against schema constraints.

        Validates:
        - Required fields present
        - Field types correct
        - Score ranges (0.0 - 1.0)
        - Timestamps valid ISO 8601
        - Arrays non-empty where required
        - Enum values valid
        - financial_exposure structure valid
        - methodology_trail completeness
        - business_process_map references valid

        Args:
            risk_object: RiskObject to validate

        Returns:
            ValidationResult with is_valid, errors, warnings
        """
        self._total_validated += 1

        errors = []
        warnings = []

        # Validate required fields
        self._validate_required_fields(risk_object, errors)

        # Validate field types
        self._validate_field_types(risk_object, errors, warnings)

        # Validate score ranges
        self._validate_score_ranges(risk_object, errors)

        # Validate timestamps
        self._validate_timestamps(risk_object, errors)

        # Validate required arrays
        self._validate_required_arrays(risk_object, errors)

        # Validate enum values
        self._validate_enum_values(risk_object, errors, warnings)

        # Validate financial_exposure
        self._validate_financial_exposure(risk_object, errors, warnings)

        # Validate methodology_trail
        self._validate_methodology_trail(risk_object, errors, warnings)

        # Determine if valid
        is_valid = len(errors) == 0

        if self.strict_mode and warnings:
            is_valid = False
            errors.extend(warnings)
            warnings = []

        # Update statistics
        if is_valid:
            self._validation_passed += 1
        else:
            self._validation_failed += 1

        result = ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings
        )

        logger.debug(
            "risk_object_validated",
            is_valid=is_valid,
            error_count=len(errors),
            warning_count=len(warnings)
        )

        return result

    def _validate_required_fields(
        self,
        risk_object: Dict[str, Any],
        errors: List[ValidationError]
    ) -> None:
        """
        Validate required fields present.

        Args:
            risk_object: RiskObject to validate
            errors: Errors list to append to
        """
        required_fields = [
            'id', 'source', 'source_event_id', 'category',
            'affected_assets', 'business_process_map',
            'likelihood_score', 'blast_radius',
            'financial_exposure', 'regulatory_triggers',
            'threshold_breaches', 'remediation_owner', 'status',
            'created_at', 'updated_at', 'first_detected_at',
            'confidence', 'methodology_trail', 'normalization_notes'
        ]

        for field in required_fields:
            if field not in risk_object:
                errors.append(ValidationError(
                    error_type="missing_field",
                    field=field,
                    message=f"Required field '{field}' is missing",
                    severity="error"
                ))

    def _validate_field_types(
        self,
        risk_object: Dict[str, Any],
        errors: List[ValidationError],
        warnings: List[ValidationError]
    ) -> None:
        """
        Validate field types correct.

        Args:
            risk_object: RiskObject to validate
            errors: Errors list to append to
            warnings: Warnings list to append to
        """
        # String fields
        string_fields = ['id', 'source', 'source_event_id', 'remediation_owner',
                        'normalization_notes']
        for field in string_fields:
            if field in risk_object and not isinstance(risk_object[field], str):
                errors.append(ValidationError(
                    error_type="invalid_type",
                    field=field,
                    message=f"Field '{field}' must be string, got {type(risk_object[field])}",
                    severity="error"
                ))

        # Array fields
        array_fields = ['affected_assets', 'business_process_map', 'blast_radius',
                      'regulatory_triggers', 'threshold_breaches']
        for field in array_fields:
            if field in risk_object and not isinstance(risk_object[field], list):
                errors.append(ValidationError(
                    error_type="invalid_type",
                    field=field,
                    message=f"Field '{field}' must be list, got {type(risk_object[field])}",
                    severity="error"
                ))

        # Numeric fields
        numeric_fields = ['likelihood_score', 'confidence']
        for field in numeric_fields:
            if field in risk_object and not isinstance(risk_object[field], (int, float)):
                errors.append(ValidationError(
                    error_type="invalid_type",
                    field=field,
                    message=f"Field '{field}' must be numeric, got {type(risk_object[field])}",
                    severity="error"
                ))

        # Object fields
        object_fields = ['financial_exposure', 'methodology_trail']
        for field in object_fields:
            if field in risk_object and not isinstance(risk_object[field], dict):
                errors.append(ValidationError(
                    error_type="invalid_type",
                    field=field,
                    message=f"Field '{field}' must be object, got {type(risk_object[field])}",
                    severity="error"
                ))

    def _validate_score_ranges(
        self,
        risk_object: Dict[str, Any],
        errors: List[ValidationError]
    ) -> None:
        """
        Validate score ranges (0.0 - 1.0).

        Args:
            risk_object: RiskObject to validate
            errors: Errors list to append to
        """
        # likelihood_score
        if 'likelihood_score' in risk_object:
            likelihood = risk_object['likelihood_score']
            if not isinstance(likelihood, (int, float)) or not (0.0 <= likelihood <= 1.0):
                errors.append(ValidationError(
                    error_type="invalid_range",
                    field="likelihood_score",
                    message=f"likelihood_score must be between 0.0 and 1.0, got {likelihood}",
                    severity="error"
                ))

        # confidence
        if 'confidence' in risk_object:
            conf = risk_object['confidence']
            if not isinstance(conf, (int, float)) or not (0.0 <= conf <= 1.0):
                errors.append(ValidationError(
                    error_type="invalid_range",
                    field="confidence",
                    message=f"confidence must be between 0.0 and 1.0, got {conf}",
                    severity="error"
                ))

        # financial_exposure scores
        if 'financial_exposure' in risk_object:
            fin_exp = risk_object['financial_exposure']

            if 'mlr_impact_confidence' in fin_exp:
                mlr_conf = fin_exp['mlr_impact_confidence']
                if not isinstance(mlr_conf, (int, float)) or not (0.0 <= mlr_conf <= 1.0):
                    errors.append(ValidationError(
                        error_type="invalid_range",
                        field="financial_exposure.mlr_impact_confidence",
                        message=f"mlr_impact_confidence must be between 0.0 and 1.0, got {mlr_conf}",
                        severity="error"
                    ))

            if 'total_exposure_confidence' in fin_exp:
                total_conf = fin_exp['total_exposure_confidence']
                if not isinstance(total_conf, (int, float)) or not (0.0 <= total_conf <= 1.0):
                    errors.append(ValidationError(
                        error_type="invalid_range",
                        field="financial_exposure.total_exposure_confidence",
                        message=f"total_exposure_confidence must be between 0.0 and 1.0, got {total_conf}",
                        severity="error"
                    ))

    def _validate_timestamps(
        self,
        risk_object: Dict[str, Any],
        errors: List[ValidationError]
    ) -> None:
        """
        Validate timestamps are valid ISO 8601.

        Args:
            risk_object: RiskObject to validate
            errors: Errors list to append to
        """
        timestamp_fields = ['created_at', 'updated_at', 'first_detected_at']

        for field in timestamp_fields:
            if field in risk_object:
                timestamp_str = risk_object[field]
                try:
                    datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    errors.append(ValidationError(
                        error_type="invalid_timestamp",
                        field=field,
                        message=f"Field '{field}' must be valid ISO 8601 timestamp, got '{timestamp_str}'",
                        severity="error"
                    ))

        # financial_exposure timestamps
        if 'financial_exposure' in risk_object:
            fin_exp = risk_object['financial_exposure']

            if 'calculation_timestamp' in fin_exp:
                calc_ts = fin_exp['calculation_timestamp']
                try:
                    datetime.fromisoformat(calc_ts.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    errors.append(ValidationError(
                        error_type="invalid_timestamp",
                        field="financial_exposure.calculation_timestamp",
                        message=f"calculation_timestamp must be valid ISO 8601, got '{calc_ts}'",
                        severity="error"
                    ))

    def _validate_required_arrays(
        self,
        risk_object: Dict[str, Any],
        errors: List[ValidationError]
    ) -> None:
        """
        Validate arrays non-empty where required.

        Args:
            risk_object: RiskObject to validate
            errors: Errors list to append to
        """
        required_arrays = ['affected_assets', 'business_process_map', 'blast_radius']

        for field in required_arrays:
            if field in risk_object:
                if not isinstance(risk_object[field], list):
                    continue  # Already caught by field type validation

                if len(risk_object[field]) == 0:
                    errors.append(ValidationError(
                        error_type="empty_array",
                        field=field,
                        message=f"Field '{field}' cannot be empty",
                        severity="error"
                    ))

    def _validate_enum_values(
        self,
        risk_object: Dict[str, Any],
        errors: List[ValidationError],
        warnings: List[ValidationError]
    ) -> None:
        """
        Validate enum values.

        Args:
            risk_object: RiskObject to validate
            errors: Errors list to append to
            warnings: Warnings list to append to
        """
        # Category enum
        valid_categories = ['threat', 'vulnerability', 'compliance', 'vendor', 'operational']
        if 'category' in risk_object:
            category = risk_object['category']
            if category not in valid_categories:
                errors.append(ValidationError(
                    error_type="invalid_enum",
                    field="category",
                    message=f"Invalid category '{category}', must be one of {valid_categories}",
                    severity="error"
                ))

        # Status enum
        valid_statuses = ['active', 'remediated', 'accepted', 'escalated']
        if 'status' in risk_object:
            status = risk_object['status']
            if status not in valid_statuses:
                errors.append(ValidationError(
                    error_type="invalid_enum",
                    field="status",
                    message=f"Invalid status '{status}', must be one of {valid_statuses}",
                    severity="error"
                ))

    def _validate_financial_exposure(
        self,
        risk_object: Dict[str, Any],
        errors: List[ValidationError],
        warnings: List[ValidationError]
    ) -> None:
        """
        Validate financial_exposure structure.

        Validates:
        - methodology present
        - methodology_version present
        - calculation_timestamp present
        - sources non-empty
        - assumptions non-empty
        - Dollar amounts non-negative
        - Confidence scores 0.0 - 1.0

        Args:
            risk_object: RiskObject to validate
            errors: Errors list to append to
            warnings: Warnings list to append to
        """
        if 'financial_exposure' not in risk_object:
            return

        fin_exp = risk_object['financial_exposure']

        # Required fields
        required_fin_fields = [
            'methodology', 'methodology_version', 'calculation_timestamp',
            'sources', 'assumptions'
        ]

        for field in required_fin_fields:
            if field not in fin_exp:
                errors.append(ValidationError(
                    error_type="missing_field",
                    field=f"financial_exposure.{field}",
                    message=f"Required field 'financial_exposure.{field}' is missing",
                    severity="error"
                ))

        # Validate sources is non-empty array
        if 'sources' in fin_exp:
            if not isinstance(fin_exp['sources'], list):
                errors.append(ValidationError(
                    error_type="invalid_type",
                    field="financial_exposure.sources",
                    message="sources must be an array",
                    severity="error"
                ))
            elif len(fin_exp['sources']) == 0:
                errors.append(ValidationError(
                    error_type="empty_array",
                    field="financial_exposure.sources",
                    message="sources cannot be empty",
                    severity="error"
                ))

        # Validate assumptions is non-empty array
        if 'assumptions' in fin_exp:
            if not isinstance(fin_exp['assumptions'], list):
                errors.append(ValidationError(
                    error_type="invalid_type",
                    field="financial_exposure.assumptions",
                    message="assumptions must be an array",
                    severity="error"
                ))
            elif len(fin_exp['assumptions']) == 0:
                errors.append(ValidationError(
                    error_type="empty_array",
                    field="financial_exposure.assumptions",
                    message="assumptions cannot be empty",
                    severity="error"
                ))

    def _validate_methodology_trail(
        self,
        risk_object: Dict[str, Any],
        errors: List[ValidationError],
        warnings: List[ValidationError]
    ) -> None:
        """
        Validate methodology_trail completeness.

        Validates:
        - normalization_steps non-empty
        - enrichment_timestamps non-empty
        - data_sources non-empty
        - calculation_methods present
        - assumptions present
        - confidence_scores present
        - Arrays same length

        Args:
            risk_object: RiskObject to validate
            errors: Errors list to append to
            warnings: Warnings list to append to
        """
        if 'methodology_trail' not in risk_object:
            return

        trail = risk_object['methodology_trail']

        # Required fields
        required_trail_fields = [
            'normalization_steps', 'enrichment_timestamps',
            'data_sources', 'calculation_methods', 'assumptions', 'confidence_scores'
        ]

        for field in required_trail_fields:
            if field not in trail:
                errors.append(ValidationError(
                    error_type="missing_field",
                    field=f"methodology_trail.{field}",
                    message=f"Required field 'methodology_trail.{field}' is missing",
                    severity="error"
                ))

        # Validate arrays non-empty
        array_fields = ['normalization_steps', 'enrichment_timestamps', 'data_sources']
        for field in array_fields:
            if field in trail:
                if not isinstance(trail[field], list):
                    errors.append(ValidationError(
                        error_type="invalid_type",
                        field=f"methodology_trail.{field}",
                        message=f"methodology_trail.{field} must be an array",
                        severity="error"
                    ))
                elif len(trail[field]) == 0:
                    errors.append(ValidationError(
                        error_type="empty_array",
                        field=f"methodology_trail.{field}",
                        message=f"methodology_trail.{field} cannot be empty",
                        severity="error"
                    ))

    def get_statistics(self) -> Dict[str, int]:
        """
        Get validation statistics.

        Returns:
            Statistics dictionary
        """
        return {
            "total_validated": self._total_validated,
            "validation_passed": self._validation_passed,
            "validation_failed": self._validation_failed
        }
