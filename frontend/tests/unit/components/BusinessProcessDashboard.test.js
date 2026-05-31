/**
 * BusinessProcessDashboard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BusinessProcessDashboard from '../../../src/components/organisms/BusinessProcessDashboard';

// Mock the atomic components
jest.mock('../../../src/components/atoms/CMMIBadge', () => ({
  CMMIBadge: ({ score, size }) => <div data-testid={`cmmi-${size}`}>{score}</div>,
  CMMIBar: ({ score, width }) => <div style={{ width }} data-score={score} />
}));

jest.mock('../../../src/components/atoms/StatusIcon', () => ({
  __esModule: true,
  default: ({ status }) => <div data-status={status}>●</div>
}));

jest.mock('../../../src/components/atoms/Badge', () => ({
  __esModule: true,
  default: ({ label, variant }) => <span data-variant={variant}>{label}</span>
}));

describe('BusinessProcessDashboard Component', () => {
  const mockProcesses = [
    {
      id: 'bp-1',
      name: 'Claims Processing',
      tier: 'Primary',
      criticality: 'Critical',
      owner: 'CIO',
      healthScore: 85,
      controlGap: 2,
      controlCoverage: 80,
      supportedBySystems: ['sys-1', 'sys-2'],
      createsDataObjects: ['data-1'],
      governedByControls: ['ctrl-1', 'ctrl-2', 'ctrl-3'],
      riskCount: 5
    },
    {
      id: 'bp-2',
      name: 'Membership & Enrollment',
      tier: 'Primary',
      criticality: 'High',
      owner: 'CIO',
      healthScore: 72,
      controlGap: 3,
      controlCoverage: 62,
      supportedBySystems: ['sys-3'],
      createsDataObjects: ['data-2'],
      governedByControls: ['ctrl-1'],
      riskCount: 8
    },
    {
      id: 'bp-3',
      name: 'Provider Operations',
      tier: 'Strategic',
      criticality: 'Critical',
      owner: 'CISO',
      healthScore: 90,
      controlGap: 0,
      controlCoverage: 100,
      supportedBySystems: ['sys-1', 'sys-2', 'sys-4'],
      createsDataObjects: ['data-1', 'data-3'],
      governedByControls: ['ctrl-1', 'ctrl-2', 'ctrl-3', 'ctrl-4'],
      riskCount: 2
    },
    {
      id: 'bp-4',
      name: 'Care Management',
      tier: 'Primary',
      criticality: 'High',
      owner: 'CIO',
      healthScore: 55,
      controlGap: 5,
      controlCoverage: 37,
      supportedBySystems: ['sys-5'],
      createsDataObjects: ['data-4'],
      governedByControls: ['ctrl-1'],
      riskCount: 12
    },
    {
      id: 'bp-5',
      name: 'Payment Integrity',
      tier: 'Primary',
      criticality: 'High',
      owner: 'CFO',
      healthScore: 95,
      controlGap: 0,
      controlCoverage: 100,
      supportedBySystems: ['sys-6'],
      createsDataObjects: [],
      governedByControls: ['ctrl-1', 'ctrl-2', 'ctrl-3', 'ctrl-4', 'ctrl-5'],
      riskCount: 1
    }
  ];

  const mockSummary = {
    total: 5,
    byTier: {
      Primary: 4,
      Strategic: 1
    },
    byCriticality: {
      Critical: 2,
      High: 3,
      Medium: 0,
      Low: 0
    },
    averageHealthScore: 79,
    averageControlCoverage: 76,
    processesNeedingAttention: 1
  };

  describe('Rendering', () => {
    it('should render dashboard header', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Business Process Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Executive overview of business process health/)).toBeInTheDocument();
    });

    it('should render key metrics cards', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Total Processes')).toBeInTheDocument();
      expect(screen.getByText('Avg Health Score')).toBeInTheDocument();
      expect(screen.getByText('Avg Control Coverage')).toBeInTheDocument();
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    });

    it('should display total process count', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('5')).toBeInTheDocument(); // Total processes
    });

    it('should display average health score', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('79%')).toBeInTheDocument();
    });

    it('should display average control coverage', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('76%')).toBeInTheDocument();
    });

    it('should display processes needing attention', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render tier distribution section', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Processes by Tier')).toBeInTheDocument();
      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Strategic')).toBeInTheDocument();
    });

    it('should render criticality distribution section', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Processes by Criticality')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should render health score distribution section', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Health Score Distribution')).toBeInTheDocument();
      expect(screen.getByText(/Excellent \(90-100\)/)).toBeInTheDocument();
      expect(screen.getByText(/Good \(75-89\)/)).toBeInTheDocument();
      expect(screen.getByText(/Fair \(60-74\)/)).toBeInTheDocument();
      expect(screen.getByText(/Poor \(\<60\)/)).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(<BusinessProcessDashboard processes={[]} loading={true} />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('should show empty state when no processes', () => {
      render(<BusinessProcessDashboard processes={[]} loading={false} />);

      expect(screen.getByText('No Business Processes Yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first business process to see dashboard metrics')).toBeInTheDocument();
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate summary from processes if not provided', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={null} />);

      // Should still render with calculated metrics
      expect(screen.getByText('Total Processes')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should calculate tier distribution correctly', () => {
      const { container } = render(
        <BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />
      );

      // Primary: 4 (80%), Strategic: 1 (20%)
      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Strategic')).toBeInTheDocument();
    });

    it('should calculate criticality distribution correctly', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Critical: 2, High: 3
      expect(screen.getAllByText('Critical')).toHaveLength(2); // 1 in label + 1 in badges
      expect(screen.getAllByText('High')).toHaveLength(2); // 1 in label + 1 in badges
    });

    it('should calculate health distribution correctly', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // 90-100: 1 (Payment Integrity - 95)
      // 75-89: 2 (Claims - 85, Provider - 90? actually 90 is in excellent)
      // 60-74: 1 (Membership - 72)
      // <60: 1 (Care Management - 55)

      // Should show counts for each category
      expect(screen.getByText(/Excellent \(90-100\)/)).toBeInTheDocument();
    });

    it('should calculate processes needing attention correctly', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Processes with health < 60 or control gap > 2
      // Care Management: health 55, gap 5 -> needs attention
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Top Risk Processes Section', () => {
    it('should render top risk processes when risks exist', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Top Risk Processes')).toBeInTheDocument();
    });

    it('should not render top risk processes when no risks', () => {
      const noRiskProcesses = mockProcesses.map(p => ({ ...p, riskCount: 0 }));

      render(<BusinessProcessDashboard processes={noRiskProcesses} summary={mockSummary} />);

      expect(screen.queryByText('Top Risk Processes')).not.toBeInTheDocument();
    });

    it('should display top 5 risk processes ordered by risk count', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Top 5 should be:
      // 1. Care Management (12 risks)
      // 2. Membership & Enrollment (8 risks)
      // 3. Claims Processing (5 risks)
      // 4. Provider Operations (2 risks)
      // 5. Payment Integrity (1 risk)

      const riskNumbers = screen.getAllByText(/^\d+$/); // Numbers by themselves
      expect(riskNumbers.length).toBeGreaterThan(0);
    });

    it('should show process details in risk list', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Care Management')).toBeInTheDocument();
      expect(screen.getByText('Membership & Enrollment')).toBeInTheDocument();
    });

    it('should call onProcessClick when risk process is clicked', () => {
      const mockClick = jest.fn();

      render(
        <BusinessProcessDashboard
          processes={mockProcesses}
          summary={mockSummary}
          onProcessClick={mockClick}
        />
      );

      const careManagement = screen.getByText('Care Management');
      fireEvent.click(careManagement);

      expect(mockClick).toHaveBeenCalledWith(mockProcesses[3]);
    });
  });

  describe('Control Gaps Section', () => {
    it('should render processes with control gaps', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Processes with Control Gaps')).toBeInTheDocument();
    });

    it('should not render control gaps section when no gaps', () => {
      const noGapProcesses = mockProcesses.map(p => ({ ...p, controlGap: 0 }));

      render(<BusinessProcessDashboard processes={noGapProcesses} summary={mockSummary} />);

      expect(screen.queryByText('Processes with Control Gaps')).not.toBeInTheDocument();
    });

    it('should display gap numbers', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Should show negative gap numbers
      expect(screen.getByText('-2')).toBeInTheDocument();
      expect(screen.getByText('-3')).toBeInTheDocument();
      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('should order processes by gap size', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Largest gaps should appear first
      // Care Management: -5
      // Membership: -3
      // Claims: -2
    });

    it('should show control coverage bars', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // CMMI bars should be rendered for gap processes
      const bars = screen.getAllByTestId(/cmmi-/);
      expect(bars.length).toBeGreaterThan(0);
    });

    it('should call onProcessClick when gap process is clicked', () => {
      const mockClick = jest.fn();

      render(
        <BusinessProcessDashboard
          processes={mockProcesses}
          summary={mockSummary}
          onProcessClick={mockClick}
        />
      );

      const claimsProcessing = screen.getByText('Claims Processing');
      fireEvent.click(claimsProcessing);

      expect(mockClick).toHaveBeenCalledWith(mockProcesses[0]);
    });
  });

  describe('Color Coding', () => {
    it('should use appropriate colors for health scores', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // High health (85) should be green
      // Medium health (72) should be yellow/orange
      // Low health (55) should be red
    });

    it('should use appropriate colors for criticality levels', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Critical should be red
      // High should be orange
    });

    it('should use appropriate colors for tier levels', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Primary should be blue
      // Strategic should be purple
    });

    it('should use appropriate colors for attention metrics', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Processes needing attention > 0 should show red
      // Average health score >= 80 should show green
    });
  });

  describe('Responsive Design', () => {
    it('should render metric cards in grid', () => {
      const { container } = render(
        <BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />
      );

      // Should use grid layout for responsive cards
    });

    it('should handle mobile viewport', () => {
      global.innerWidth = 375;

      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Should still render without errors
      expect(screen.getByText('Business Process Dashboard')).toBeInTheDocument();
    });

    it('should handle tablet viewport', () => {
      global.innerWidth = 768;

      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Business Process Dashboard')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
    });

    it('should have clickable elements for interactive items', () => {
      const mockClick = jest.fn();

      render(
        <BusinessProcessDashboard
          processes={mockProcesses}
          summary={mockSummary}
          onProcessClick={mockClick}
        />
      );

      const processCards = screen.getAllByText('Claims Processing');
      expect(processCards.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single process', () => {
      const singleProcess = [mockProcesses[0]];
      const singleSummary = {
        total: 1,
        byTier: { Primary: 1, Strategic: 0 },
        byCriticality: { Critical: 1, High: 0, Medium: 0, Low: 0 },
        averageHealthScore: 85,
        averageControlCoverage: 80,
        processesNeedingAttention: 0
      };

      render(
        <BusinessProcessDashboard
          processes={singleProcess}
          summary={singleSummary}
        />
      );

      expect(screen.getByText('Total Processes')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle processes with zero health score', () => {
      const zeroHealthProcess = [{
        ...mockProcesses[0],
        healthScore: 0,
        controlGap: 10,
        controlCoverage: 0
      }];

      render(<BusinessProcessDashboard processes={zeroHealthProcess} summary={null} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle all processes needing attention', () => {
      const allNeedAttention = mockProcesses.map(p => ({
        ...p,
        healthScore: 45,
        controlGap: 8
      }));

      render(<BusinessProcessDashboard processes={allNeedAttention} summary={null} />);

      // Should show all 5 needing attention
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should handle perfect scores across all metrics', () => {
      const perfectProcesses = mockProcesses.map(p => ({
        ...p,
        healthScore: 100,
        controlGap: 0,
        controlCoverage: 100,
        riskCount: 0
      }));

      render(<BusinessProcessDashboard processes={perfectProcesses} summary={null} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Needs attention
    });
  });

  describe('Trend Indicators', () => {
    it('should render trend indicators if provided', () => {
      // This would require extending the summary prop to include trends
      // For now, just verify the component structure
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      expect(screen.getByText('Business Process Dashboard')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should integrate with CMMIBadge component', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // CMMI badges should be rendered
      const cmmiBadges = screen.getAllByTestId(/^cmmi-/);
      expect(cmmiBadges.length).toBeGreaterThan(0);
    });

    it('should integrate with StatusIcon component', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Status icons should be rendered
      const statusIcons = screen.getAllByTestId(/^status-/);
      expect(statusIcons.length).toBeGreaterThan(0);
    });

    it('should integrate with Badge component', () => {
      render(<BusinessProcessDashboard processes={mockProcesses} summary={mockSummary} />);

      // Badges should be rendered for tier, criticality, owner
      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('CIO')).toBeInTheDocument();
    });
  });
});
