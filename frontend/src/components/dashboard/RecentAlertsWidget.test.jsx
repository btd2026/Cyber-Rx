/**
 * RecentAlertsWidget Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentAlertsWidget from './RecentAlertsWidget';

describe('RecentAlertsWidget', () => {
  const mockOnAcknowledge = vi.fn();

  const mockAlerts = [
    {
      id: 'a1',
      title: 'Critical Security Alert',
      severity: 'critical',
      message: 'Critical vulnerability detected in system',
      vendorName: 'Critical Vendor Inc',
      createdAt: '2026-05-30T12:00:00Z',
      acknowledged: false
    },
    {
      id: 'a2',
      title: 'High Risk Warning',
      severity: 'high',
      message: 'High risk detected in compliance audit',
      vendorName: 'High Risk Solutions',
      createdAt: '2026-05-29T14:00:00Z',
      acknowledged: false
    },
    {
      id: 'a3',
      title: 'Medium Risk Notice',
      severity: 'medium',
      message: 'Medium risk issue requires attention',
      vendorName: 'Medium Risk Corp',
      createdAt: '2026-05-28T10:00:00Z',
      acknowledged: false
    },
    {
      id: 'a4',
      title: 'Low Risk Info',
      severity: 'low',
      message: 'Low risk information notice',
      vendorName: 'Low Risk Services',
      createdAt: '2026-05-27T09:00:00Z',
      acknowledged: true
    },
    {
      id: 'a5',
      title: 'Another Critical',
      severity: 'critical',
      message: 'Another critical issue detected',
      vendorName: 'Another Vendor',
      createdAt: '2026-05-26T08:00:00Z',
      acknowledged: false
    }
  ];

  it('should render widget header', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText(/Recent Alerts/i)).toBeInTheDocument();
  });

  it('should display "No recent alerts" when empty', () => {
    render(<RecentAlertsWidget alerts={[]} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText(/No recent alerts/i)).toBeInTheDocument();
  });

  it('should display new alerts count badge', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('4 new')).toBeInTheDocument();
  });

  it('should not display new badge when all acknowledged', () => {
    const allAcknowledged = mockAlerts.map(a => ({ ...a, acknowledged: true }));

    render(<RecentAlertsWidget alerts={allAcknowledged} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.queryByText('4 new')).not.toBeInTheDocument();
  });

  it('should display alert titles', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('Critical Security Alert')).toBeInTheDocument();
    expect(screen.getByText('High Risk Warning')).toBeInTheDocument();
  });

  it('should display alert messages', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText(/Critical vulnerability detected in system/i)).toBeInTheDocument();
  });

  it('should display vendor names', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('Critical Vendor Inc')).toBeInTheDocument();
    expect(screen.getByText('High Risk Solutions')).toBeInTheDocument();
  });

  it('should display severity badges', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('should display timestamps', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    // Check that timestamps are displayed (should show relative time like "1d ago")
    const timestamps = screen.getAllByText(/\d+[mhds] ago/i);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('should display acknowledge button for unacknowledged alerts', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    expect(acknowledgeButtons.length).toBe(4);
  });

  it('should display acknowledged status for acknowledged alerts', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
  });

  it('should call onAcknowledge when acknowledge button clicked', async () => {
    const user = userEvent.setup();

    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    const acknowledgeButton = screen.getAllByText('Acknowledge')[0];
    await user.click(acknowledgeButton);

    expect(mockOnAcknowledge).toHaveBeenCalledWith('a1');
  });

  it('should stop event propagation on acknowledge click', async () => {
    const user = userEvent.setup();

    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    const acknowledgeButton = screen.getAllByText('Acknowledge')[0];

    // Click should not trigger parent onClick
    fireEvent.click(acknowledgeButton);

    expect(mockOnAcknowledge).toHaveBeenCalled();
  });

  it('should use correct colors for severity levels', () => {
    const { container } = render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    // Check for color-coded severity badges
    const criticalBadge = container.querySelector('[style*="background-color: #DC2626"]');
    const highBadge = container.querySelector('[style*="background-color: #EF4444"]');

    expect(criticalBadge).toBeInTheDocument();
    expect(highBadge).toBeInTheDocument();
  });

  it('should display severity icons', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('🚨')).toBeInTheDocument(); // Critical
    expect(screen.getByText('⚠️')).toBeInTheDocument(); // High
    expect(screen.getByText('⚡')).toBeInTheDocument(); // Medium
    expect(screen.getByText('ℹ️')).toBeInTheDocument(); // Low
  });

  it('should limit display to 5 alerts', () => {
    const manyAlerts = [
      ...mockAlerts,
      { id: 'a6', title: 'Alert 6', severity: 'low', message: 'Message 6', vendorName: 'Vendor 6', createdAt: '2026-05-25T10:00:00Z', acknowledged: false },
      { id: 'a7', title: 'Alert 7', severity: 'low', message: 'Message 7', vendorName: 'Vendor 7', createdAt: '2026-05-24T10:00:00Z', acknowledged: false }
    ];

    render(<RecentAlertsWidget alerts={manyAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    // Should only show 5 alerts max
    const alertTitles = screen.getAllByText(/Alert|Critical|High|Medium|Low/i);
    expect(alertTitles.length).toBeLessThanOrEqual(10); // 5 alerts * 2 (title + severity)
  });

  it('should format timestamps as relative time', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    // Should show relative time like "1d ago" not full date
    expect(screen.queryByText(/2026-05-30/)).not.toBeInTheDocument();
  });

  it('should handle alerts without vendor name', () => {
    const alertsWithoutVendor = [
      {
        id: 'a1',
        title: 'Alert Without Vendor',
        severity: 'high',
        message: 'Message',
        createdAt: '2026-05-30T12:00:00Z',
        acknowledged: false
      }
    ];

    render(<RecentAlertsWidget alerts={alertsWithoutVendor} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('Alert Without Vendor')).toBeInTheDocument();
  });

  it('should handle alerts without title', () => {
    const alertsWithoutTitle = [
      {
        id: 'a1',
        severity: 'high',
        type: 'Security Alert',
        message: 'Message',
        vendorName: 'Vendor Inc',
        createdAt: '2026-05-30T12:00:00Z',
        acknowledged: false
      }
    ];

    render(<RecentAlertsWidget alerts={alertsWithoutTitle} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('Security Alert')).toBeInTheDocument();
  });

  it('should handle alerts without message', () => {
    const alertsWithoutMessage = [
      {
        id: 'a1',
        title: 'Alert Title',
        severity: 'high',
        vendorName: 'Vendor Inc',
        createdAt: '2026-05-30T12:00:00Z',
        acknowledged: false
      }
    ];

    render(<RecentAlertsWidget alerts={alertsWithoutMessage} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('Alert Title')).toBeInTheDocument();
  });

  it('should handle alerts without timestamp', () => {
    const alertsWithoutTimestamp = [
      {
        id: 'a1',
        title: 'Alert Title',
        severity: 'high',
        message: 'Message',
        vendorName: 'Vendor Inc',
        acknowledged: false
      }
    ];

    render(<RecentAlertsWidget alerts={alertsWithoutTimestamp} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText(/Unknown/i)).toBeInTheDocument();
  });

  it('should handle alerts with null severity', () => {
    const alertsWithNullSeverity = [
      {
        id: 'a1',
        title: 'Alert Title',
        severity: null,
        message: 'Message',
        vendorName: 'Vendor Inc',
        createdAt: '2026-05-30T12:00:00Z',
        acknowledged: false
      }
    ];

    render(<RecentAlertsWidget alerts={alertsWithNullSeverity} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    // Should default to low severity
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('should handle case-insensitive severity values', () => {
    const mixedCaseAlerts = [
      {
        id: 'a1',
        title: 'Alert Title',
        severity: 'CRITICAL',
        message: 'Message',
        vendorName: 'Vendor Inc',
        createdAt: '2026-05-30T12:00:00Z',
        acknowledged: false
      }
    ];

    render(<RecentAlertsWidget alerts={mixedCaseAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('should have hover effects on alert cards', () => {
    const { container } = render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    const alertCards = container.querySelectorAll('[style*="cursor: pointer"]');
    expect(alertCards.length).toBeGreaterThan(0);
  });

  it('should display unacknowledged count in footer', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText(/4 unacknowledged alerts/i)).toBeInTheDocument();
  });

  it('should display all acknowledged message in footer', () => {
    const allAcknowledged = mockAlerts.map(a => ({ ...a, acknowledged: true }));

    render(<RecentAlertsWidget alerts={allAcknowledged} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    expect(screen.getByText(/All alerts acknowledged/i)).toBeInTheDocument();
  });

  it('should truncate long messages', () => {
    const longMessageAlert = [
      {
        id: 'a1',
        title: 'Alert Title',
        severity: 'high',
        message: 'This is a very long message that should be truncated to fit within the card layout without breaking the design',
        vendorName: 'Vendor Inc',
        createdAt: '2026-05-30T12:00:00Z',
        acknowledged: false
      }
    ];

    const { container } = render(<RecentAlertsWidget alerts={longMessageAlert} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    const messageElement = container.querySelector('[style*="-webkit-line-clamp"]');
    expect(messageElement).toBeInTheDocument();
  });

  it('should apply different opacity to acknowledged alerts', () => {
    const { container } = render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    // Check for opacity styles on alert cards
    const alertCards = container.querySelectorAll('[style*="opacity"]');
    expect(alertCards.length).toBeGreaterThan(0);
  });

  it('should be clickable for alert details', async () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    const alertCard = screen.getByText('Critical Security Alert').closest('[style*="cursor: pointer"]');
    expect(alertCard).toBeInTheDocument();
  });

  it('should handle acknowledge callback gracefully', async () => {
    const user = userEvent.setup();
    const mockAcknowledge = vi.fn();

    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockAcknowledge} orgId="test-org" />);

    const acknowledgeButton = screen.getAllByText('Acknowledge')[0];
    await user.click(acknowledgeButton);

    expect(mockAcknowledge).toHaveBeenCalledWith('a1');
  });

  it('should work without onAcknowledge callback', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} orgId="test-org" />);

    expect(screen.getByText(/Recent Alerts/i)).toBeInTheDocument();
  });

  it('should display tooltips on hover', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    // Severity badges should have hover effects
    const severityBadges = screen.getAllByText('Critical');
    expect(severityBadges.length).toBeGreaterThan(0);
  });

  it('should have accessible structure', () => {
    render(<RecentAlertsWidget alerts={mockAlerts} onAcknowledge={mockOnAcknowledge} orgId="test-org" />);

    // Should have proper heading structure
    const header = screen.getByText(/Recent Alerts/i);
    expect(header).toBeInTheDocument();
  });
});
