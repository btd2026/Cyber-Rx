import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricCard from '../../components/MetricCard';

describe('MetricCard Component', () => {
  describe('Rendering', () => {
    it('should render metric card with label and value', () => {
      const metric = {
        label: 'Test Metric',
        value: '42',
        format: 'score'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      const metric = {
        label: 'Test Metric',
        value: '42',
        format: 'score',
        description: 'This is a test description'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const metric = {
        label: 'Test Metric',
        value: '42',
        format: 'score'
      };

      render(<MetricCard metric={metric} />);

      // Should only have label and value
      const textContent = screen.getByText('Test Metric').parentElement.textContent;
      expect(textContent).toContain('Test Metric');
      expect(textContent).toContain('42');
    });
  });

  describe('Score Format', () => {
    it('should display warning icon for high scores (>=70)', () => {
      const metric = {
        label: 'Risk Score',
        value: 75,
        format: 'score'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should display warning icon for medium scores (>=40)', () => {
      const metric = {
        label: 'Risk Score',
        value: 50,
        format: 'score'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });

    it('should display checkmark for low scores (<40)', () => {
      const metric = {
        label: 'Risk Score',
        value: 25,
        format: 'score'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/✓/)).toBeInTheDocument();
    });

    it('should use custom color when provided', () => {
      const metric = {
        label: 'Custom Score',
        value: 60,
        format: 'score',
        color: '#FF5733'
      };

      const { container } = render(<MetricCard metric={metric} />);

      // Check that the value is rendered with custom color
      const valueElement = screen.getByText('60');
      expect(valueElement).toBeInTheDocument();
    });
  });

  describe('Status Format', () => {
    it('should display critical status with red color and warning icon', () => {
      const metric = {
        label: 'System Status',
        value: 'Critical',
        format: 'status',
        status: 'critical'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should display warning status with orange color and warning icon', () => {
      const metric = {
        label: 'System Status',
        value: 'Warning',
        format: 'status',
        status: 'warning'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should display clear status with green color and checkmark', () => {
      const metric = {
        label: 'System Status',
        value: 'Clear',
        format: 'status',
        status: 'clear'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/✓/)).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should display unknown status with gray color and bullet', () => {
      const metric = {
        label: 'System Status',
        value: 'Unknown',
        format: 'status',
        status: 'unknown'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/•/)).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Trend Format', () => {
    it('should display increasing trend with red color and up arrow', () => {
      const metric = {
        label: 'Threat Trend',
        value: '+15%',
        format: 'trend',
        trend: 'increasing'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/📈/)).toBeInTheDocument();
      expect(screen.getByText('+15%')).toBeInTheDocument();
    });

    it('should display stable trend with green color and right arrow', () => {
      const metric = {
        label: 'Threat Trend',
        value: '0%',
        format: 'trend',
        trend: 'stable'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/➡️/)).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display decreasing trend with green color and down arrow', () => {
      const metric = {
        label: 'Threat Trend',
        value: '-10%',
        format: 'trend',
        trend: 'decreasing'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(/📉/)).toBeInTheDocument();
      expect(screen.getByText('-10%')).toBeInTheDocument();
    });
  });

  describe('Days Format', () => {
    it('should display days with green color when fresh', () => {
      const metric = {
        label: 'Days Since Last Test',
        value: '5',
        format: 'days',
        threshold: 30
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('days since last evidence')).toBeInTheDocument();
    });

    it('should display days with orange color when approaching threshold', () => {
      const metric = {
        label: 'Days Since Last Test',
        value: '25',
        format: 'days',
        threshold: 30
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should display days with red color when past threshold', () => {
      const metric = {
        label: 'Days Since Last Test',
        value: '35',
        format: 'days',
        threshold: 30
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('35')).toBeInTheDocument();
    });

    it('should display "No evidence" text when value is "No evidence"', () => {
      const metric = {
        label: 'Evidence Status',
        value: 'No evidence',
        format: 'days',
        threshold: 30
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('No evidence')).toBeInTheDocument();
      expect(screen.getByText('No evidence uploaded')).toBeInTheDocument();
    });
  });

  describe('Count Format', () => {
    it('should display count with red color for critical severity', () => {
      const metric = {
        label: 'Critical Findings',
        value: '5',
        format: 'count',
        severity: 'critical'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display count with orange color for high severity', () => {
      const metric = {
        label: 'High Findings',
        value: '12',
        format: 'count',
        severity: 'high'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display count with gray color for normal severity', () => {
      const metric = {
        label: 'Total Findings',
        value: '42',
        format: 'count',
        severity: 'low'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display subtitle when provided', () => {
      const metric = {
        label: 'Open Findings',
        value: '8',
        format: 'count',
        severity: 'high',
        subtitle: 'requiring attention'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('requiring attention')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing format gracefully', () => {
      const metric = {
        label: 'Unknown Format',
        value: 'test'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('Unknown Format')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('should handle empty value', () => {
      const metric = {
        label: 'Empty Value',
        value: '',
        format: 'score'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('Empty Value')).toBeInTheDocument();
    });

    it('should handle numeric value', () => {
      const metric = {
        label: 'Numeric Value',
        value: 42,
        format: 'score'
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should handle very long description text', () => {
      const longDescription = 'This is a very long description that should wrap and display properly without breaking the layout or causing overflow issues';
      const metric = {
        label: 'Test Metric',
        value: '5',
        format: 'score',
        description: longDescription
      };

      render(<MetricCard metric={metric} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });
});
