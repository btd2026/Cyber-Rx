/**
 * RiskDistributionWidget Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskDistributionWidget from './RiskDistributionWidget';

describe('RiskDistributionWidget', () => {
  const mockVendors = [
    { id: 'v1', name: 'Vendor 1', riskScore: 25 },
    { id: 'v2', name: 'Vendor 2', riskScore: 35 },
    { id: 'v3', name: 'Vendor 3', riskScore: 45 },
    { id: 'v4', name: 'Vendor 4', riskScore: 65 },
    { id: 'v5', name: 'Vendor 5', riskScore: 75 },
    { id: 'v6', name: 'Vendor 6', riskScore: 85 }
  ];

  it('should render widget header', () => {
    render(<RiskDistributionWidget vendors={mockVendors} />);

    expect(screen.getByText(/Risk Score Distribution/i)).toBeInTheDocument();
  });

  it('should display no vendors message when empty', () => {
    render(<RiskDistributionWidget vendors={[]} />);

    expect(screen.getByText(/No vendors to display/i)).toBeInTheDocument();
  });

  it('should calculate risk distribution correctly', () => {
    render(<RiskDistributionWidget vendors={mockVendors} />);

    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
    expect(screen.getByText(/High/i)).toBeInTheDocument();
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
    expect(screen.getByText(/Low/i)).toBeInTheDocument();
  });

  it('should display vendor counts per risk level', () => {
    render(<RiskDistributionWidget vendors={mockVendors} />);

    expect(screen.getByText(/2/)).toBeInTheDocument(); // 2 critical
  });

  it('should display percentages for each risk level', () => {
    render(<RiskDistributionWidget vendors={mockVendors} />);

    // Check that percentage values are displayed
    const percentages = screen.getAllByText(/\d+\.\d%/);
    expect(percentages.length).toBeGreaterThan(0);
  });

  it('should render SVG pie chart', () => {
    const { container } = render(<RiskDistributionWidget vendors={mockVendors} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should display total vendor count', () => {
    render(<RiskDistributionWidget vendors={mockVendors} />);

    expect(screen.getByText(/Total: 6 vendors/i)).toBeInTheDocument();
  });

  it('should use correct colors for risk levels', () => {
    const { container } = render(<RiskDistributionWidget vendors={mockVendors} />);

    // Check for color indicators (legend)
    const colorIndicators = container.querySelectorAll('[style*="background-color"]');
    expect(colorIndicators.length).toBeGreaterThan(0);
  });

  it('should handle vendors with null risk scores', () => {
    const vendorsWithNull = [
      { id: 'v1', name: 'Vendor 1', riskScore: null },
      { id: 'v2', name: 'Vendor 2', riskScore: 50 }
    ];

    render(<RiskDistributionWidget vendors={vendorsWithNull} />);

    expect(screen.getByText(/Total: 2 vendors/i)).toBeInTheDocument();
  });

  it('should handle vendors with undefined risk scores', () => {
    const vendorsWithUndefined = [
      { id: 'v1', name: 'Vendor 1' },
      { id: 'v2', name: 'Vendor 2', riskScore: 50 }
    ];

    render(<RiskDistributionWidget vendors={vendorsWithUndefined} />);

    expect(screen.getByText(/Total: 2 vendors/i)).toBeInTheDocument();
  });

  it('should categorize vendors into correct risk buckets', () => {
    const testVendors = [
      { id: 'v1', name: 'Vendor 1', riskScore: 20 }, // Critical
      { id: 'v2', name: 'Vendor 2', riskScore: 50 }, // High
      { id: 'v3', name: 'Vendor 3', riskScore: 70 }, // Medium
      { id: 'v4', name: 'Vendor 4', riskScore: 90 }  // Low
    ];

    render(<RiskDistributionWidget vendors={testVendors} />);

    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
    expect(screen.getByText(/High/i)).toBeInTheDocument();
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
    expect(screen.getByText(/Low/i)).toBeInTheDocument();
  });

  it('should display tooltip on chart segment hover', () => {
    const { container } = render(<RiskDistributionWidget vendors={mockVendors} />);

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);

    // Check that paths have title elements for tooltips
    paths.forEach(path => {
      const title = path.querySelector('title');
      expect(title).toBeInTheDocument();
    });
  });

  it('should handle single vendor', () => {
    const singleVendor = [{ id: 'v1', name: 'Vendor 1', riskScore: 50 }];

    render(<RiskDistributionWidget vendors={singleVendor} />);

    expect(screen.getByText(/Total: 1 vendors/i)).toBeInTheDocument();
    expect(screen.getByText(/High/i)).toBeInTheDocument();
  });

  it('should handle all vendors in same risk category', () => {
    const allHighRisk = [
      { id: 'v1', name: 'Vendor 1', riskScore: 45 },
      { id: 'v2', name: 'Vendor 2', riskScore: 55 }
    ];

    render(<RiskDistributionWidget vendors={allHighRisk} />);

    expect(screen.getByText(/Total: 2 vendors/i)).toBeInTheDocument();
  });

  it('should calculate percentages correctly', () => {
    const testVendors = [
      { id: 'v1', name: 'Vendor 1', riskScore: 25 },
      { id: 'v2', name: 'Vendor 2', riskScore: 45 },
      { id: 'v3', name: 'Vendor 3', riskScore: 65 },
      { id: 'v4', name: 'Vendor 4', riskScore: 85 }
    ];

    render(<RiskDistributionWidget vendors={testVendors} />);

    expect(screen.getByText(/25\.0%/)).toBeInTheDocument(); // 1 of 4 = 25%
  });

  it('should have accessible legend', () => {
    render(<RiskDistributionWidget vendors={mockVendors} />);

    const legendItems = screen.getAllByText(/Critical|High|Medium|Low/);
    expect(legendItems.length).toBeGreaterThanOrEqual(4);
  });

  it('should render chart with proper dimensions', () => {
    const { container } = render(<RiskDistributionWidget vendors={mockVendors} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '200');
    expect(svg).toHaveAttribute('height', '200');
  });

  it('should handle boundary risk scores (40, 60, 80)', () => {
    const boundaryVendors = [
      { id: 'v1', name: 'Vendor 1', riskScore: 40 },
      { id: 'v2', name: 'Vendor 2', riskScore: 60 },
      { id: 'v3', name: 'Vendor 3', riskScore: 80 }
    ];

    render(<RiskDistributionWidget vendors={boundaryVendors} />);

    // All should be categorized correctly
    expect(screen.getByText(/Total: 3 vendors/i)).toBeInTheDocument();
  });

  it('should have hover effects on chart segments', () => {
    const { container } = render(<RiskDistributionWidget vendors={mockVendors} />);

    const paths = container.querySelectorAll('path');
    paths.forEach(path => {
      expect(path).toHaveStyle({ transition: 'opacity 0.15s ease' });
    });
  });
});
