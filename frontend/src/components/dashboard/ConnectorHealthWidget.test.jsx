/**
 * ConnectorHealthWidget Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectorHealthWidget from './ConnectorHealthWidget';

describe('ConnectorHealthWidget', () => {
  const mockVendors = [
    { id: 'v1', name: 'Vendor 1', status: 'connected', riskScore: 70 },
    { id: 'v2', name: 'Vendor 2', status: 'connected', riskScore: 80 },
    { id: 'v3', name: 'Vendor 3', status: 'syncing', riskScore: 60 },
    { id: 'v4', name: 'Vendor 4', status: 'error', riskScore: 40 },
    { id: 'v5', name: 'Vendor 5', status: 'disconnected', riskScore: 50 }
  ];

  const mockStatistics = {
    totalVendors: 5,
    connected: 2,
    syncing: 1,
    error: 1,
    disconnected: 1
  };

  it('should render widget header', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    expect(screen.getByText(/Connector Health/i)).toBeInTheDocument();
  });

  it('should display health score badge', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    expect(screen.getByText(/% Healthy/i)).toBeInTheDocument();
  });

  it('should calculate correct health score', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    // 2 connected + 1 syncing = 3 healthy out of 5 = 60%
    expect(screen.getByText('60% Healthy')).toBeInTheDocument();
  });

  it('should display status cards for each status type', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Syncing/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });

  it('should display correct counts for each status', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    expect(screen.getByText('2')).toBeInTheDocument(); // Connected
    expect(screen.getByText('1')).toBeInTheDocument(); // Syncing
    expect(screen.getByText('1')).toBeInTheDocument(); // Error
  });

  it('should display percentages for each status', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    expect(screen.getByText(/40\.0%/)).toBeInTheDocument(); // 2 of 5 = 40%
  });

  it('should render progress bar', () => {
    const { container } = render(<ConnectorHealthWidget vendors={mockVendors} />);

    const progressBar = container.querySelector('[style*="display: flex"][style*="height: 8px"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('should display status summary', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    expect(screen.getByText(/2 connected/i)).toBeInTheDocument();
    expect(screen.getByText(/1 syncing/i)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 disconnected/i)).toBeInTheDocument();
  });

  it('should handle empty vendor list', () => {
    render(<ConnectorHealthWidget vendors={[]} />);

    expect(screen.getByText(/No vendors to display/i)).toBeInTheDocument();
    expect(screen.getByText('0% Healthy')).toBeInTheDocument();
  });

  it('should use correct colors for health score', () => {
    const { container } = render(<ConnectorHealthWidget vendors={mockVendors} />);

    // 60% should be orange/warning color
    const healthBadge = container.querySelector('[style*="color: #F59E0B"]');
    expect(healthBadge).toBeInTheDocument();
  });

  it('should use green for high health score', () => {
    const healthyVendors = [
      { id: 'v1', name: 'Vendor 1', status: 'connected', riskScore: 70 },
      { id: 'v2', name: 'Vendor 2', status: 'connected', riskScore: 80 },
      { id: 'v3', name: 'Vendor 3', status: 'connected', riskScore: 90 },
      { id: 'v4', name: 'Vendor 4', status: 'connected', riskScore: 75 }
    ];

    const { container } = render(<ConnectorHealthWidget vendors={healthyVendors} />);

    // 100% healthy should be green
    const healthBadge = container.querySelector('[style*="color: #10B981"]');
    expect(healthBadge).toBeInTheDocument();
  });

  it('should use red for low health score', () => {
    const unhealthyVendors = [
      { id: 'v1', name: 'Vendor 1', status: 'error', riskScore: 30 },
      { id: 'v2', name: 'Vendor 2', status: 'disconnected', riskScore: 40 },
      { id: 'v3', name: 'Vendor 3', status: 'error', riskScore: 35 }
    ];

    const { container } = render(<ConnectorHealthWidget vendors={unhealthyVendors} />);

    // 0% healthy should be dark red
    const healthBadge = container.querySelector('[style*="color: #DC2626"]');
    expect(healthBadge).toBeInTheDocument();
  });

  it('should handle vendors with null status', () => {
    const vendorsWithNull = [
      { id: 'v1', name: 'Vendor 1', status: null, riskScore: 70 },
      { id: 'v2', name: 'Vendor 2', status: 'connected', riskScore: 80 }
    ];

    render(<ConnectorHealthWidget vendors={vendorsWithNull} />);

    expect(screen.getByText(/Total: 2 vendors/i)).toBeInTheDocument();
  });

  it('should handle vendors with undefined status', () => {
    const vendorsWithUndefined = [
      { id: 'v1', name: 'Vendor 1', riskScore: 70 },
      { id: 'v2', name: 'Vendor 2', status: 'connected', riskScore: 80 }
    ];

    render(<ConnectorHealthWidget vendors={vendorsWithUndefined} />);

    expect(screen.getByText(/Total: 2 vendors/i)).toBeInTheDocument();
  });

  it('should handle case-insensitive status values', () => {
    const mixedCaseVendors = [
      { id: 'v1', name: 'Vendor 1', status: 'Connected', riskScore: 70 },
      { id: 'v2', name: 'Vendor 2', status: 'SYNCING', riskScore: 80 },
      { id: 'v3', name: 'Vendor 3', status: 'Error', riskScore: 60 }
    ];

    render(<ConnectorHealthWidget vendors={mixedCaseVendors} />);

    expect(screen.getByText(/Total: 3 vendors/i)).toBeInTheDocument();
  });

  it('should display StatusIcon components', () => {
    const { container } = render(<ConnectorHealthWidget vendors={mockVendors} />);

    const statusIcons = container.querySelectorAll('[class*="status"]');
    expect(statusIcons.length).toBeGreaterThan(0);
  });

  it('should have hover effects on status cards', () => {
    const { container } = render(<ConnectorHealthWidget vendors={mockVendors} />);

    const cards = container.querySelectorAll('[style*="cursor: default"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should handle all vendors in same status', () => {
    const allConnected = [
      { id: 'v1', name: 'Vendor 1', status: 'connected', riskScore: 70 },
      { id: 'v2', name: 'Vendor 2', status: 'connected', riskScore: 80 },
      { id: 'v3', name: 'Vendor 3', status: 'connected', riskScore: 90 }
    ];

    render(<ConnectorHealthWidget vendors={allConnected} />);

    expect(screen.getByText('100% Healthy')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render progress bar segments with correct colors', () => {
    const { container } = render(<ConnectorHealthWidget vendors={mockVendors} />);

    const segments = container.querySelectorAll('[style*="backgroundColor"]');
    expect(segments.length).toBeGreaterThan(0);
  });

  it('should handle statistics prop', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} statistics={mockStatistics} />);

    expect(screen.getByText(/Connector Health/i)).toBeInTheDocument();
  });

  it('should work without statistics prop', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    expect(screen.getByText(/Connector Health/i)).toBeInTheDocument();
  });

  it('should display percentage of total for each status', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    // Check that percentage labels exist
    const percentages = screen.getAllByText(/\d+\.\d+% of total/);
    expect(percentages.length).toBeGreaterThan(0);
  });

  it('should have accessible status labels', () => {
    render(<ConnectorHealthWidget vendors={mockVendors} />);

    expect(screen.getByText(/Actively syncing/i)).toBeInTheDocument();
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Connection error/i)).toBeInTheDocument();
    expect(screen.getByText(/Not connected/i)).toBeInTheDocument();
  });

  it('should handle zero vendors in a status category', () => {
    const singleStatus = [
      { id: 'v1', name: 'Vendor 1', status: 'connected', riskScore: 70 }
    ];

    render(<ConnectorHealthWidget vendors={singleStatus} />);

    expect(screen.getByText(/Total: 1 vendors/i)).toBeInTheDocument();
  });

  it('should calculate percentages with decimal precision', () => {
    const unevenVendors = [
      { id: 'v1', name: 'Vendor 1', status: 'connected', riskScore: 70 },
      { id: 'v2', name: 'Vendor 2', status: 'connected', riskScore: 80 },
      { id: 'v3', name: 'Vendor 3', status: 'syncing', riskScore: 60 }
    ];

    render(<ConnectorHealthWidget vendors={unevenVendors} />);

    // 66.7% connected (2 of 3)
    expect(screen.getByText(/66\.7%/)).toBeInTheDocument();
  });
});
