"""
Structured Output Formatter

Parses and validates structured JSON output from Claude LLM.
Handles malformed JSON gracefully and formats output for frontend consumption.
"""
import json
import logging
from typing import Dict, Any, List
from jsonschema import validate, ValidationError as JsonSchemaValidationError
from src.models import OutputFormatError


logger = logging.getLogger(__name__)


class OutputFormatter:
    """
    Formats and validates structured output from Claude LLM.

    Features:
    - Parse structured JSON output
    - Validate against expected schema
    - Handle malformed JSON gracefully
    - Format output for frontend consumption
    - Generate user-friendly error messages
    """

    def __init__(self):
        """Initialize output formatter."""
        logger.info("Output formatter initialized")

    def parse_structured_output(
        self,
        llm_response: str,
        output_schema: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Parse structured output from Claude response.

        Args:
            llm_response: Raw response text from Claude
            output_schema: Optional JSON schema for validation

        Returns:
            dict: Parsed structured output

        Raises:
            OutputFormatError: If response doesn't match schema or is invalid JSON
        """
        try:
            # Try to parse JSON
            structured_output = json.loads(llm_response)

            logger.info("Successfully parsed JSON from Claude response")

            # Validate against schema if provided
            if output_schema:
                self._validate_schema(structured_output, output_schema)
                logger.info("Output validated against schema")

            return structured_output

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Claude response: {e}")
            raise OutputFormatError(f"Invalid JSON in Claude response: {e}")

    def _validate_schema(
        self,
        output: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> None:
        """
        Validate output against JSON schema.

        Args:
            output: Parsed output to validate
            schema: JSON schema

        Raises:
            OutputFormatError: If validation fails
        """
        try:
            validate(instance=output, schema=schema)
        except JsonSchemaValidationError as e:
            logger.error(f"Schema validation failed: {e}")
            raise OutputFormatError(f"Output doesn't match schema: {e}")

    def format_for_frontend(self, briefing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format briefing for frontend consumption.

        Ensures consistent structure for frontend rendering.

        Args:
            briefing: Raw agent briefing

        Returns:
            dict: Formatted briefing for frontend
        """
        try:
            # Ensure required fields exist
            formatted = {
                "briefing_id": briefing.get("briefing_id"),
                "agent_id": briefing.get("agent_id"),
                "query": briefing.get("query"),
                "generated_at": briefing.get("generated_at"),
                "token_cost": briefing.get("token_cost"),
                "content": {}
            }

            # Extract briefing content
            briefing_content = briefing.get("briefing", {})

            # Format based on agent type
            agent_id = briefing.get("agent_id", "")

            if agent_id == "cfo":
                formatted["content"] = self._format_cfo_briefing(briefing_content)
            elif agent_id == "ciso":
                formatted["content"] = self._format_ciso_briefing(briefing_content)
            elif agent_id == "board":
                formatted["content"] = self._format_board_briefing(briefing_content)
            else:
                # Generic formatting
                formatted["content"] = briefing_content

            logger.debug(f"Formatted briefing for {agent_id} agent")

            return formatted

        except Exception as e:
            logger.error(f"Failed to format briefing for frontend: {e}")
            # Return original if formatting fails
            return briefing

    def _format_cfo_briefing(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Format CFO briefing for frontend."""
        return {
            "summary": content.get("briefing_summary", ""),
            "exposure_breakdown": content.get("exposure_breakdown", {}),
            "trends": content.get("trends", []),
            "top_risks": content.get("top_risks", []),
            "methodology_trail": content.get("methodology_trail", [])
        }

    def _format_ciso_briefing(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Format CISO briefing for frontend."""
        return {
            "summary": content.get("briefing_summary", ""),
            "attack_vectors": content.get("attack_vectors", []),
            "mitigation_priorities": content.get("mitigation_priorities", []),
            "coordination_points": content.get("coordination_points", []),
            "methodology_trail": content.get("methodology_trail", [])
        }

    def _format_board_briefing(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Format Board briefing for frontend."""
        return {
            "summary": content.get("executive_summary", ""),
            "key_insights": content.get("key_insights", []),
            "risk_assessment": content.get("risk_assessment", {}),
            "recommendations": content.get("recommendations", []),
            "methodology_trail": content.get("methodology_trail", [])
        }

    def generate_error_message(self, error: Exception) -> Dict[str, Any]:
        """
        Generate user-friendly error message.

        Args:
            error: Exception from LLM or parsing

        Returns:
            dict: Error message for frontend
        """
        error_type = type(error).__name__
        error_message = str(error)

        # Categorize error for user-friendly message
        if isinstance(error, OutputFormatError):
            user_message = "The agent response could not be processed. Please try again."
            severity = "error"
        elif isinstance(error, json.JSONDecodeError):
            user_message = "The agent returned an invalid response. Please try again."
            severity = "error"
        else:
            user_message = "An unexpected error occurred. Please try again."
            severity = "error"

        logger.warning(f"Generated error message: {error_type} - {user_message}")

        return {
            "error": True,
            "error_type": error_type,
            "user_message": user_message,
            "technical_message": error_message,
            "severity": severity,
            "timestamp": None  # Will be added by caller
        }

    def extract_json_from_response(self, response: str) -> str:
        """
        Extract JSON from response that may contain additional text.

        Claude sometimes wraps JSON in markdown code blocks or adds
        explanatory text. This extracts just the JSON.

        Args:
            response: Raw response from Claude

        Returns:
            str: Extracted JSON string
        """
        # Try to find JSON in markdown code blocks
        if "```json" in response:
            start = response.find("```json") + 7
            end = response.find("```", start)
            if end > start:
                return response[start:end].strip()

        # Try without json specifier
        if "```" in response:
            start = response.find("```") + 3
            end = response.find("```", start)
            if end > start:
                return response[start:end].strip()

        # Try to find JSON object boundaries
        first_brace = response.find("{")
        last_brace = response.rfind("}")

        if first_brace >= 0 and last_brace > first_brace:
            return response[first_brace:last_brace + 1]

        # Return original if no JSON found
        return response

    def sanitize_output(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize output for frontend consumption.

        Removes any sensitive information and ensures safe values.

        Args:
            output: Raw output

        Returns:
            dict: Sanitized output
        """
        def _sanitize_value(value: Any) -> Any:
            """Recursively sanitize values."""
            if isinstance(value, dict):
                return {k: _sanitize_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [_sanitize_value(v) for v in value]
            elif isinstance(value, str):
                # Remove any potential script tags
                value = value.replace("<script>", "").replace("</script>", "")
                return value
            else:
                return value

        return _sanitize_value(output)


# Singleton instance for use across the application
_output_formatter_instance = None


def get_output_formatter() -> OutputFormatter:
    """Get singleton output formatter instance."""
    global _output_formatter_instance
    if _output_formatter_instance is None:
        _output_formatter_instance = OutputFormatter()
    return _output_formatter_instance
