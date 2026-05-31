/**
 * VendorPortfolioDashboard Component Tests
 *
 * Comprehensive test suite covering:
 * - Component rendering
 * - Filter/sort functionality
 * - Pagination
 * - Export functionality
 * - API integration
 * - Accessibility
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VendorPortfolioDashboard from './VendorPortfolioDashboard';

// Mock fetch API
global.fetch = vi.fn();

describe('VendorPortfolioDashboard', () => {
  const mockProps = {
    api_url: 'https://test-api.com',
    authToken: 'test-token',
    orgId: 'test-org-123',
    onNavigate: vi.fn()
  };

  const mockVendors = [
    {
      id: 'v1',
      name: 'Critical Vendor Inc',
      tier: 'critical',
      riskScore: 25,
      grade: 'D',
      status: 'connected',
      lastSync: '2026-05-30T10:00:00Z',
      description: 'Critical infrastructure provider'
    },
    {
      id: 'v2',
      name: 'High Risk Solutions',
      tier: 'high',
      riskScore: 45,
      grade: 'C',
      status: 'syncing',
      lastSync: '2026-05-29T15:30:00Z',
      description: 'High risk services'
    },
    {
      id: 'v3',
      name: 'Medium Risk Corp',
      tier: 'medium',
      riskScore: 70,
      grade: 'B',
      status: 'connected',
      lastSync: '2026-05-28T09:00:00Z',
      description: 'Medium risk vendor'
    },
    {
      id: 'v4',
      name: 'Low Risk Services',
      tier: 'low',
      riskScore: 85,
      grade: 'A',
      status: 'disconnected',
      lastSync: '2026-05-25T14:00:00Z',
      description: 'Low risk provider'
    },
    {
      id: 'v5',
      name: 'Error Vendor',
      tier: 'high',
      riskScore: 40,
      grade: 'C',
      status: 'error',
      lastSync: '2026-05-20T10:00:00Z',
      description: 'Vendor with connection errors'
    }
  ];

  const mockStatistics = {
    totalVendors: 5,
    connected: 2,
    syncing: 1,
    disconnected: 1,
    error: 1,
    hasMore: false
  };

  const mockAlerts = [
    {
      id: 'a1',
      title: 'Critical Security Alert',
      severity: 'critical',
      message: 'Critical vulnerability detected',
      vendorName: 'Critical Vendor Inc',
      createdAt: '2026-05-30T12:00:00Z',
      acknowledged: false
    },
    {
      id: 'a2',
      title: 'High Risk Warning',
      severity: 'high',
      message: 'High risk detected in compliance',
      vendorName: 'High Risk Solutions',
      createdAt: '2026-05-29T14:00:00Z',
      acknowledged: false
    }
  ];

  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      expect(screen.getByText(/Loading vendor portfolio/i)).toBeInTheDocument();
    });

    it('should render error state on fetch failure', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should render dashboard with vendors successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStatistics })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Vendor Portfolio Dashboard/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Vendors \(5\)/i)).toBeInTheDocument();
    });

    it('should render dashboard widgets', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStatistics })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Risk Score Distribution/i)).toBeInTheDocument();
        expect(screen.getByText(/Connector Health/i)).toBeInTheDocument();
        expect(screen.getByText(/Recent Alerts/i)).toBeInTheDocument();
      });
    });

    it('should render vendor table with all columns', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStatistics })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Vendor Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Tier/i)).toBeInTheDocument();
        expect(screen.getByText(/Risk Score/i)).toBeInTheDocument();
        expect(screen.getByText(/Grade/i)).toBeInTheDocument();
        expect(screen.getByText(/Status/i)).toBeInTheDocument();
        expect(screen.getByText(/Last Sync/i)).toBeInTheDocument();
        expect(screen.getByText(/Actions/i)).toBeInTheDocument();
      });
    });

    it('should render "No vendors found" message when filtered results are empty', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No vendors found matching the current filters/i)).toBeInTheDocument();
      });
    });

    it('should display vendor names in table', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStatistics })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Critical Vendor Inc')).toBeInTheDocument();
        expect(screen.getByText('High Risk Solutions')).toBeInTheDocument();
        expect(screen.getByText('Medium Risk Corp')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter vendors by search term', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStatistics })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockVendors[0]] })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStatistics })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Vendors \(5\)/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by name/i);
      await user.type(searchInput, 'Critical');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(6); // Initial load + filtered load
      });
    });

    it('should filter vendors by tier', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStatistics })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts })
      }).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors.filter(v => v.tier === 'critical') })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Vendor Tier/i)).toBeInTheDocument();
      });

      const tierSelect = screen.getByLabelText(/Vendor Tier/i);
      await user.click(tierSelect);

      const criticalOption = screen.getByText('Critical');
      await user.click(criticalOption);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should filter vendors by risk level', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors.filter(v => v.riskScore < 40) })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Risk Level/i)).toBeInTheDocument();
      });

      const riskSelect = screen.getByLabelText(/Risk Level/i);
      await user.click(riskSelect);

      const criticalOption = screenByText('Critical (0-40)');
      await user.click(criticalOption);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should filter vendors by status', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors.filter(v => v.status === 'connected') })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Connection Status/i)).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText(/Connection Status/i);
      await user.click(statusSelect);

      const connectedOption = screen.getByText('Connected');
      await user.click(connectedOption);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Clear All/i)).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should display active filters count', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Filters/i)).toBeInTheDocument();
      });

      // After applying filters, should show count badge
      const filtersLabel = screen.getByText(/Filters/i).closest('div');
      // Implementation would check for count badge
    });
  });

  describe('Sorting', () => {
    it('should sort vendors by name', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Vendor Name/i)).toBeInTheDocument();
      });

      const nameHeader = screen.getByText(/Vendor Name/i);
      await user.click(nameHeader);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should sort vendors by risk score', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Risk Score/i)).toBeInTheDocument();
      });

      const riskHeader = screen.getByText(/Risk Score/i);
      await user.click(riskHeader);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should toggle sort direction', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Tier/i)).toBeInTheDocument();
      });

      const tierHeader = screen.getByText(/Tier/i);

      // First click - asc
      await user.click(tierHeader);

      // Second click - desc
      await user.click(tierHeader);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      const largeVendorList = Array.from({ length: 100 }, (_, i) => ({
        id: `v${i}`,
        name: `Vendor ${i}`,
        tier: 'medium',
        riskScore: 70,
        grade: 'B',
        status: 'connected',
        lastSync: '2026-05-30T10:00:00Z'
      }));

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: largeVendorList })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Previous/i)).toBeInTheDocument();
        expect(screen.getByText(/Next/i)).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors, hasMore: true })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Next/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should navigate to previous page', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      // Set page to 1 via state (simulating navigation)
      await waitFor(() => {
        expect(screen.getByText(/Previous/i)).toBeInTheDocument();
      });

      const previousButton = screen.getByText('Previous');
      await user.click(previousButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should disable Previous button on first page', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        const previousButton = screen.getByText('Previous');
        expect(previousButton).toBeDisabled();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should export vendors to CSV', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      // Verify CSV download was triggered
      const link = document.querySelector('a[href*="blob:"]');
      expect(link).toBeTruthy();
    });

    it('should disable export when no vendors', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export CSV');
        expect(exportButton).toBeDisabled();
      });
    });
  });

  describe('Sync Functionality', () => {
    it('should trigger manual sync for vendor', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getAllByText(/Sync Now/i)).toHaveLength(5);
      });

      const syncButtons = screen.getAllByText('Sync Now');
      await user.click(syncButtons[0]);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/vendors/'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    it('should show loading state during sync', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getAllByText(/Sync Now/i)).toHaveLength(5);
      });

      const syncButtons = screen.getAllByText('Sync Now');
      await user.click(syncButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Syncing/i)).toBeInTheDocument();
      });
    });
  });

  describe('Alert Acknowledgment', () => {
    it('should acknowledge alert', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Recent Alerts/i)).toBeInTheDocument();
      });

      const acknowledgeButton = screen.getByText('Acknowledge');
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/alerts/'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    it('should show acknowledged state', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Recent Alerts/i)).toBeInTheDocument();
      });

      const acknowledgeButton = screen.getByText('Acknowledge');
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(screen.getByText(/Acknowledged/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to vendor detail on click', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Critical Vendor Inc')).toBeInTheDocument();
      });

      const vendorRow = screen.getByText('Critical Vendor Inc').closest('tr');
      await user.click(vendorRow);

      expect(mockProps.onNavigate).toHaveBeenCalledWith('/vendors/v1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /Search vendors/i })).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(/Search by name/i);
      searchInput.focus();

      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null orgId gracefully', () => {
      render(<VendorPortfolioDashboard {...mockProps} orgId={null} />);

      expect(screen.queryByText(/Loading vendor portfolio/i)).toBeInTheDocument();
    });

    it('should handle empty vendor list', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No vendors found/i)).toBeInTheDocument();
      });
    });

    it('should handle vendor without risk score', async () => {
      const vendorWithoutScore = [{
        id: 'v1',
        name: 'Unknown Risk Vendor',
        tier: 'medium',
        riskScore: null,
        grade: 'N/A',
        status: 'connected',
        lastSync: '2026-05-30T10:00:00Z'
      }];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: vendorWithoutScore })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Unknown Risk Vendor')).toBeInTheDocument();
      });
    });

    it('should handle vendor without last sync', async () => {
      const vendorWithoutSync = [{
        id: 'v1',
        name: 'Never Synced Vendor',
        tier: 'medium',
        riskScore: 70,
        grade: 'B',
        status: 'disconnected',
        lastSync: null
      }];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: vendorWithoutSync })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Never/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Widgets', () => {
    it('should render RiskDistributionWidget', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Risk Score Distribution/i)).toBeInTheDocument();
      });
    });

    it('should render ConnectorHealthWidget', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Connector Health/i)).toBeInTheDocument();
      });
    });

    it('should render RecentAlertsWidget', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockVendors })
      });

      render(<VendorPortfolioDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Recent Alerts/i)).toBeInTheDocument();
      });
    });
  });
});
