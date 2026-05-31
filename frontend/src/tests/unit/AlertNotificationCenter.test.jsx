/**
 * AlertNotificationCenter Tests
 *
 * Comprehensive test suite for Alert Notification Center component.
 * Covers rendering, filtering, interactions, and edge cases.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertNotificationCenter from '../../components/AlertNotificationCenter';

// Mock fetch API
global.fetch = jest.fn();

describe('AlertNotificationCenter', () => {
  const mockApiUrl = 'https://api.test.com';
  const mockAuthToken = 'test-token';
  const mockOrgId = 'test-org-id';

  const mockAlerts = {
    items: [
      {
        id: 'alert-1',
        severity: 'Critical',
        alert_type: 'critical_signal',
        message: 'Critical security signal detected',
        created_at: '2024-01-15T10:30:00Z',
        acknowledged_at: null,
        acknowledged_by: null,
        vendor_id: 'vendor-1',
        vendor_name: 'Test Vendor',
        metadata: { source: 'security_scan' }
      },
      {
        id: 'alert-2',
        severity: 'High',
        alert_type: 'score_increase',
        message: 'Risk score increased significantly',
        created_at: '2024-01-15T09:15:00Z',
        acknowledged_at: '2024-01-15T11:00:00Z',
        acknowledged_by: 'admin@example.com',
        vendor_id: 'vendor-2',
        vendor_name: 'Another Vendor',
        metadata: { previous_score: 45, new_score: 72 }
      },
      {
        id: 'alert-3',
        severity: 'Medium',
        alert_type: 'grade_degradation',
        message: 'Compliance grade degraded',
        created_at: '2024-01-14T16:20:00Z',
        acknowledged_at: null,
        acknowledged_by: null,
        vendor_id: 'vendor-1',
        vendor_name: 'Test Vendor',
        metadata: { previous_grade: 'A', new_grade: 'C' }
      }
    ],
    pagination: {
      totalCount: 3,
      totalPages: 1,
      currentPage: 1,
      limit: 50
    }
  };

  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    test('should render loading state initially', () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      expect(screen.getByText(/loading alerts/i)).toBeInTheDocument();
    });

    test('should render error state on fetch failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading alerts/i)).toBeInTheDocument();
      });
    });

    test('should render alert list successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
        expect(screen.getByText(/risk score increased significantly/i)).toBeInTheDocument();
        expect(screen.getByText(/compliance grade degraded/i)).toBeInTheDocument();
      });
    });

    test('should render header with alert counts', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/3 total alerts/i)).toBeInTheDocument();
        expect(screen.getByText(/2 unacknowledged/i)).toBeInTheDocument();
      });
    });

    test('should render analytics widgets', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/alert summary/i)).toBeInTheDocument();
        expect(screen.getByText(/alert trend/i)).toBeInTheDocument();
        expect(screen.getByText(/top alert types/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    test('should render all filter dropdowns', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/severity/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/acknowledged/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
      });
    });

    test('should filter by severity', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const severityFilter = screen.getByLabelText(/severity/i);
      fireEvent.change(severityFilter, { target: { value: 'Critical' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('severity=Critical'),
          expect.any(Object)
        );
      });
    });

    test('should filter by alert type', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const typeFilter = screen.getByLabelText(/type/i);
      fireEvent.change(typeFilter, { target: { value: 'critical_signal' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=critical_signal'),
          expect.any(Object)
        );
      });
    });

    test('should filter by acknowledgment status', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const acknowledgedFilter = screen.getByLabelText(/acknowledged/i);
      fireEvent.change(acknowledgedFilter, { target: { value: 'unacknowledged' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('acknowledged=unacknowledged'),
          expect.any(Object)
        );
      });
    });

    test('should filter by search text', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search alerts/i);
      fireEvent.change(searchInput, { target: { value: 'security' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=security'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Alert Selection', () => {
    test('should select single alert', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // First alert checkbox

      await waitFor(() => {
        expect(screen.getByText(/acknowledge 1 alert/i)).toBeInTheDocument();
      });
    });

    test('should select multiple alerts', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // First alert
      fireEvent.click(checkboxes[2]); // Second alert

      await waitFor(() => {
        expect(screen.getByText(/acknowledge 2 alerts/i)).toBeInTheDocument();
      });
    });

    test('should select all alerts', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/acknowledge 3 alerts/i)).toBeInTheDocument();
      });
    });
  });

  describe('Acknowledgment', () => {
    test('should acknowledge single alert', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText(/acknowledge/i);
      fireEvent.click(acknowledgeButtons[0]);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/alerts/acknowledge'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('alert-1')
          })
        );
      });
    });

    test('should acknowledge multiple alerts in batch', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      const batchAckButton = screen.getByText(/acknowledge 2 alerts/i);
      fireEvent.click(batchAckButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/alerts/acknowledge'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('alert-1')
          })
        );
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/alerts/acknowledge'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('alert-2')
          })
        );
      });
    });

    test('should disable acknowledge button for already acknowledged alerts', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/acknowledged/i)).toBeInTheDocument();
      });

      const acknowledgedButton = screen.getAllByText(/acknowledged/i)[0];
      expect(acknowledgedButton).toBeDisabled();
    });
  });

  describe('Alert Details Modal', () => {
    test('should open alert details modal on click', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const alertContent = screen.getByText(/critical security signal detected/i).closest('.alert-content');
      fireEvent.click(alertContent);

      await waitFor(() => {
        expect(screen.getByText(/alert details/i)).toBeInTheDocument();
        expect(screen.getByText(/message/i)).toBeInTheDocument();
      });
    });

    test('should close modal on close button click', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const alertContent = screen.getByText(/critical security signal detected/i).closest('.alert-content');
      fireEvent.click(alertContent);

      await waitFor(() => {
        expect(screen.getByText(/alert details/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/alert details/i)).not.toBeInTheDocument();
      });
    });

    test('should close modal on escape key press', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const alertContent = screen.getByText(/critical security signal detected/i).closest('.alert-content');
      fireEvent.click(alertContent);

      await waitFor(() => {
        expect(screen.getByText(/alert details/i)).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText(/alert details/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const mockPaginatedAlerts = {
      items: mockAlerts.items,
      pagination: {
        totalCount: 150,
        totalPages: 3,
        currentPage: 1,
        limit: 50
      }
    };

    test('should render pagination controls for multiple pages', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPaginatedAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
        expect(screen.getByText(/first/i)).toBeInTheDocument();
        expect(screen.getByText(/next/i)).toBeInTheDocument();
        expect(screen.getByText(/last/i)).toBeInTheDocument();
      });
    });

    test('should navigate to next page', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPaginatedAlerts })
      });
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPaginatedAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByText(/next/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    test('should disable navigation buttons on first/last page', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPaginatedAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        const firstButton = screen.getByText(/first/i);
        const prevButton = screen.getByText(/previous/i);
        expect(firstButton).toBeDisabled();
        expect(prevButton).toBeDisabled();
      });
    });
  });

  describe('Empty State', () => {
    test('should render empty state when no alerts found', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { items: [], pagination: { totalCount: 0 } } })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no alerts found/i)).toBeInTheDocument();
      });
    });

    test('should show helpful message when filtering returns no results', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { items: [], pagination: { totalCount: 0 } } })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      // Set a search filter
      const searchInput = screen.getByPlaceholderText(/search alerts/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/try adjusting your search or filters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels on filters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /severity/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument();
      });
    });

    test('should be keyboard navigable', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search alerts/i);
        searchInput.focus();
        expect(document.activeElement).toBe(searchInput);
      });
    });
  });

  describe('Real-time Updates', () => {
    test('should poll for updates every 30 seconds', async () => {
      jest.useFakeTimers();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      // Initial fetch
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    test('should cleanup polling on unmount', async () => {
      jest.useFakeTimers();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      const { unmount } = render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      unmount();

      // Fast-forward past poll interval
      jest.advanceTimersByTime(30000);

      // Should not have called fetch again after unmount
      expect(fetch).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    test('should handle acknowledge errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });
      fetch.mockRejectedValueOnce(new Error('Network error'));

      // Mock alert to suppress the actual alert dialog
      global.alert = jest.fn();

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical security signal detected/i)).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText(/acknowledge/i);
      fireEvent.click(acknowledgeButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Error acknowledging alerts')
        );
      });
    });
  });

  describe('Severity Badge Colors', () => {
    test('should render correct colors for each severity', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/critical/i)).toBeInTheDocument();
        expect(screen.getByText(/high/i)).toBeInTheDocument();
        expect(screen.getByText(/medium/i)).toBeInTheDocument();
      });
    });
  });

  describe('Vendor Links', () => {
    test('should render vendor link in alert', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        const vendorLink = screen.getByText(/test vendor/i);
        expect(vendorLink).toBeInTheDocument();
        expect(vendorLink.closest('a')).toHaveAttribute('href', '/vendors/vendor-1');
      });
    });

    test('should stop propagation when clicking vendor link', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(
        <AlertNotificationCenter
          api_url={mockApiUrl}
          authToken={mockAuthToken}
          orgId={mockOrgId}
        />
      );

      await waitFor(() => {
        const vendorLink = screen.getByText(/test vendor/i).closest('a');
        const clickEvent = new MouseEvent('click', { bubbles: true });
        const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');

        vendorLink.dispatchEvent(clickEvent);

        expect(stopPropagationSpy).toHaveBeenCalled();
      });
    });
  });
});
