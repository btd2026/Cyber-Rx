"""
Prompt Template System

Manages prompt templates for AI agents using Jinja2 templating.
Provides template loading, rendering, validation, and versioning.
"""
import os
import json
from typing import Dict, Any
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, TemplateSyntaxError
import logging


logger = logging.getLogger(__name__)


class PromptManager:
    """
    Manages prompt templates for AI agents.

    Features:
    - Template loading from filesystem
    - Jinja2 rendering with context injection
    - Template syntax validation
    - Template versioning for reproducibility
    - Support for template variables
    """

    def __init__(self, template_dir: str = None):
        """
        Initialize prompt manager with template directory.

        Args:
            template_dir: Root directory for templates
        """
        if template_dir is None:
            # Default to prompts/ directory
            current_dir = Path(__file__).parent
            template_dir = current_dir.parent / "prompts"

        self.template_dir = Path(template_dir)

        # Initialize Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=False  # Don't escape HTML (we're doing text, not HTML)
        )

        logger.info(f"Prompt manager initialized with template directory: {self.template_dir}")

    def load_template(self, agent_id: str, template_name: str) -> str:
        """
        Load prompt template from filesystem.

        Args:
            agent_id: Agent identifier (e.g., "cfo", "ciso", "board")
            template_name: Template name (e.g., "briefing", "trend_analysis")

        Returns:
            str: Raw template content

        Raises:
            FileNotFoundError: If template file not found
            TemplateError: If template has syntax errors
        """
        # Build template path
        template_path = f"{agent_id}/{template_name}.txt"

        try:
            # Load template
            template = self.env.get_template(template_path)
            template_content = template.source

            logger.info(f"Loaded template: {template_path}")

            return template_content

        except TemplateSyntaxError as e:
            logger.error(f"Template syntax error in {template_path}: {e}")
            raise Exception(f"Template syntax error: {e}")

        except Exception as e:
            logger.error(f"Failed to load template {template_path}: {e}")
            raise FileNotFoundError(f"Template not found: {template_path}")

    def render_template(
        self,
        template: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Render template with context injection.

        Uses Jinja2 to inject variables into template.

        Args:
            template: Raw template string
            context: Variables for injection

        Returns:
            str: Rendered prompt ready for LLM
        """
        try:
            # Create Jinja2 template from string
            from jinja2 import Template
            jinja_template = Template(template)

            # Render with context
            rendered = jinja_template.render(**context)

            logger.debug(f"Template rendered successfully (length: {len(rendered)})")

            return rendered

        except Exception as e:
            logger.error(f"Failed to render template: {e}")
            raise Exception(f"Template rendering failed: {e}")

    def render_template_from_file(
        self,
        agent_id: str,
        template_name: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Load and render template in one operation.

        Args:
            agent_id: Agent identifier
            template_name: Template name
            context: Variables for injection

        Returns:
            str: Rendered prompt ready for LLM
        """
        # Load template
        template_content = self.load_template(agent_id, template_name)

        # Render template
        rendered = self.render_template(template_content, context)

        return rendered

    def validate_template(self, template: str) -> Dict[str, Any]:
        """
        Validate template syntax.

        Args:
            template: Template string to validate

        Returns:
            dict: Validation result with valid flag and errors if any
        """
        try:
            # Try to parse the template
            from jinja2 import Template, TemplateSyntaxError
            Template(template)

            return {
                "valid": True,
                "errors": []
            }

        except TemplateSyntaxError as e:
            return {
                "valid": False,
                "errors": [str(e)]
            }

    def validate_template_file(self, agent_id: str, template_name: str) -> Dict[str, Any]:
        """
        Validate template file.

        Args:
            agent_id: Agent identifier
            template_name: Template name

        Returns:
            dict: Validation result
        """
        try:
            template_content = self.load_template(agent_id, template_name)
            return self.validate_template(template_content)
        except Exception as e:
            return {
                "valid": False,
                "errors": [str(e)]
            }

    def list_templates(self, agent_id: str = None) -> Dict[str, list]:
        """
        List available templates.

        Args:
            agent_id: Optional agent filter

        Returns:
            dict: Templates organized by agent
        """
        templates = {}

        # Iterate over agent directories
        for agent_dir in self.template_dir.iterdir():
            if not agent_dir.is_dir():
                continue

            agent_name = agent_dir.name

            # Skip if agent filter specified and doesn't match
            if agent_id and agent_name != agent_id:
                continue

            # List template files
            template_files = []
            for template_file in agent_dir.glob("*.txt"):
                template_files.append(template_file.stem)

            templates[agent_name] = template_files

        return templates

    def get_template_version(self, agent_id: str, template_name: str) -> Dict[str, Any]:
        """
        Get template version information.

        Args:
            agent_id: Agent identifier
            template_name: Template name

        Returns:
            dict: Version information
        """
        template_path = self.template_dir / agent_id / f"{template_name}.txt"

        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")

        # Get file modification time as version
        mtime = template_path.stat().st_mtime
        modified_time = datetime.fromtimestamp(mtime)

        # Calculate hash for integrity check
        import hashlib
        with open(template_path, 'r') as f:
            content = f.read()
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]

        return {
            "agent_id": agent_id,
            "template_name": template_name,
            "version": f"v1-{modified_time.strftime('%Y%m%d-%H%M%S')}",
            "modified_time": modified_time.isoformat(),
            "hash": content_hash
        }


# Singleton instance for use across the application
_prompt_manager_instance = None


def get_prompt_manager(template_dir: str = None) -> PromptManager:
    """Get singleton prompt manager instance."""
    global _prompt_manager_instance
    if _prompt_manager_instance is None:
        _prompt_manager_instance = PromptManager(template_dir=template_dir)
    return _prompt_manager_instance
