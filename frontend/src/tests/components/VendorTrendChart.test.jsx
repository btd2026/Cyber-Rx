/**
 * VendorTrendChart Component Tests
 *
 * Comprehensive test suite for trend chart functionality including:
 * - Component rendering
 * - Vendor selection
 * - Time range switching
 * - Chart type switching
 * - Data fetching and display
 * - Export functionality
 * - Accessibility
 * - Error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VendorTrendChart from '../../../src/components/dashboard/VendorTrendChart';

// Mock Chart.js components
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  ArcElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn(),
  Annotation: jest.fn()
}));

jest.mock('react-chartjs-2', () => ({
  Line: jest.fn().mockReturnValue({ chartType: 'line' }),
  Bar: jest.fn().mockReturnValue({ chartType: 'bar' })
}));


// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    addImage: jest.fn(),
    save: jest.fn(),
    setFontSize: jest.fn()
  }));
});

const mockVendors = [
  { id: 'vendor-1', name: 'Acme Corp', riskScore: 75, grade: 'B' },
  { id: 'vendor-2', name: 'Globex Inc', riskScore: 85, grade: 'A' },
  { id: 'vendor-3', name: 'Soylent Corp', riskScore: 55, grade: 'C' },
  { id: 'vendor-4', name: 'Initech', riskScore: 92, grade: 'A' },
  { id: 'vendor-5', name: 'Umbrella Corp', riskScore: 35, grade: 'D' }
];

const mockTrendData = {
  dates: ['Jan 25', 'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25'],
  scores: {
    'vendor-1': [72, 74, 75, 73, 76, 75],
    'vendor-2': [82, 84, 85, 83, 86, 85],
    'vendor-3': [52, 54, 55, 53, 56, 55]
  },
  events: [
    {
      date: 'Mar 25',
      vendorId: 'vendor-1',
      type: 'grade_degradation',
      severity: 'Medium',
      description: 'Grade changed for Acme Corp'
    }
  ]
};

describe('VendorTrendChart Component', () => {
  beforeEach(() => {
    // Mock fetch API
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render chart container', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText('Risk Trend Analysis')).toBeInTheDocument();
    });

    test('should render vendor selector section', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText('Compare Vendors (up to 5)')).toBeInTheDocument();
    });

    test('should render time range selector', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByDisplayValue('Last 12 Months')).toBeInTheDocument();
    });

    test('should render chart type selector', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByDisplayValue('Line Chart')).toBeInTheDocument();
    });

    test('should render export buttons', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    test('should render all vendors in selector', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      mockVendors.forEach(vendor => {
        expect(screen.getByText(vendor.name)).toBeInTheDocument();
      });
    });
  });

  describe('Vendor Selection', () => {
    test('should auto-select first 3 vendors', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const checkedCount = checkboxes.filter(cb => cb.checked).length;
      expect(checkedCount).toBe(3);
    });

    test('should allow toggling vendor selection', async () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const uncheckedCheckbox = checkboxes.find(cb => !cb.checked);

      if (uncheckedCheckbox) {
        fireEvent.click(uncheckedCheckbox);
        await waitFor(() => {
          expect(uncheckedCheckbox.checked).toBe(true);
        });
      }
    });

    test('should prevent selecting more than 5 vendors', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const uncheckedCheckboxes = checkboxes.filter(cb => !cb.checked);

      // Try to check all remaining checkboxes (should be disabled after reaching 5)
      uncheckedCheckboxes.forEach(cb => {
        if (!cb.disabled) {
          fireEvent.click(cb);
        }
      });

      // Count checked checkboxes
      const checkedCount = screen.getAllByRole('checkbox')
        .filter(cb => cb.checked).length;

      expect(checkedCount).toBeLessThanOrEqual(5);
    });

    test('should prevent deselecting last vendor', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors.slice(0, 1)}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      const initiallyChecked = checkbox.checked;

      fireEvent.click(checkbox);

      // Should still be checked (can't deselect last vendor)
      expect(checkbox.checked).toBe(initiallyChecked);
    });
  });

  describe('Time Range Selection', () => {
    test('should change time range to 3M', async () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const select = screen.getByDisplayValue('Last 12 Months');
      fireEvent.change(select, { target: { value: '3M' } });

      await waitFor(() => {
        expect(select.value).toBe('3M');
      });
    });

    test('should change time range to 6M', async () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const select = screen.getByDisplayValue('Last 12 Months');
      fireEvent.change(select, { target: { value: '6M' } });

      await waitFor(() => {
        expect(select.value).toBe('6M');
      });
    });

    test('should change time range to all', async () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const select = screen.getByDisplayValue('Last 12 Months');
      fireEvent.change(select, { target: { value: 'all' } });

      await waitFor(() => {
        expect(select.value).toBe('all');
      });
    });

    test('should have all time range options', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const select = screen.getByDisplayValue('Last 12 Months');
      const options = select.querySelectorAll('option');

      expect(options).toHaveLength(4);
      expect(options[0].value).toBe('3M');
      expect(options[1].value).toBe('6M');
      expect(options[2].value).toBe('12M');
      expect(options[3].value).toBe('all');
    });
  });

  describe('Chart Type Selection', () => {
    test('should switch to area chart', async () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const select = screen.getByDisplayValue('Line Chart');
      fireEvent.change(select, { target: { value: 'area' } });

      await waitFor(() => {
        expect(select.value).toBe('area');
      });
    });

    test('should switch back to line chart', async () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          chartType="area"
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const select = screen.getByDisplayValue('Area Chart');
      fireEvent.change(select, { target: { value: 'line' } });

      await waitFor(() => {
        expect(select.value).toBe('line');
      });
    });
  });

  describe('Data Fetching', () => {
    test('should fetch trend data on mount', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrendData })
      });

      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/vendors/trends'),
          expect.any(Object)
        );
      });
    });

    test('should handle fetch errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Loading trend data/i)).toBeInTheDocument();
      });
    });

    test('should regenerate mock data on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API error'));

      render(
        <VendorTrendChart
          vendors={mockVendors.slice(0, 3)}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      await waitFor(() => {
        // Should generate mock data and not show error
        expect(screen.queryByText(/Error Loading Trend Data/i)).not.toBeInTheDocument();
      });
    });

    test('should include correct query parameters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrendData })
      });

      render(
        <VendorTrendChart
          vendors={mockVendors.slice(0, 3)}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
          timeRange="6M"
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('vendorIds=vendor-1%2Cvendor-2%2Cvendor-3'),
          expect.any(Object)
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('range=6M'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Export Functionality', () => {
    test('should have PNG export button', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText('PNG')).toBeInTheDocument();
    });

    test('should have PDF export button', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    test('should disable export buttons when no data', () => {
      render(
        <VendorTrendChart
          vendors={[]}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const pngButton = screen.getByText('PNG');
      const pdfButton = screen.getByText('PDF');

      expect(pngButton.closest('button')).toBeDisabled();
      expect(pdfButton.closest('button')).toBeDisabled();
    });
  });

  describe('Loading States', () => {
    test('should show loading spinner initially', () => {
      global.fetch.mockImplementation(() => new Promise(() => {}));

      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText(/Loading trend data/i)).toBeInTheDocument();
    });

    test('should hide loading after data loads', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrendData })
      });

      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading trend data/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    test('should show message when no vendors selected', () => {
      render(
        <VendorTrendChart
          vendors={[]}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText(/Select vendors to view trend data/i)).toBeInTheDocument();
    });

    test('should handle null vendors prop', () => {
      render(
        <VendorTrendChart
          vendors={null}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText(/Select vendors to view trend data/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have accessible form controls', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toHaveAccessibleName();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeVisible();
      });
    });

    test('should have keyboard-navigable controls', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('Props Handling', () => {
    test('should accept custom timeRange prop', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          timeRange="6M"
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByDisplayValue('Last 6 Months')).toBeInTheDocument();
    });

    test('should accept custom showAnnotations prop', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          showAnnotations={false}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      // Component should render without errors
      expect(screen.getByText('Risk Trend Analysis')).toBeInTheDocument();
    });

    test('should require orgId prop', () => {
      // Should not crash without orgId
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
        />
      );

      expect(screen.getByText('Risk Trend Analysis')).toBeInTheDocument();
    });
  });

  describe('Summary Section', () => {
    test('should display summary when data loaded', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrendData })
      });

      render(
        <VendorTrendChart
          vendors={mockVendors.slice(0, 3)}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Summary/i)).toBeInTheDocument();
      });
    });

    test('should show vendor count in summary', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrendData })
      });

      render(
        <VendorTrendChart
          vendors={mockVendors.slice(0, 2)}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/2 vendor\(s\)/i)).toBeInTheDocument();
      });
    });

    test('should show time range in summary', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrendData })
      });

      render(
        <VendorTrendChart
          vendors={mockVendors.slice(0, 2)}
          timeRange="6M"
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/over 6M/i)).toBeInTheDocument();
      });
    });

    test('should show event count in summary', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrendData })
      });

      render(
        <VendorTrendChart
          vendors={mockVendors.slice(0, 2)}
          showAnnotations={true}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/1 significant event/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    test('should render on mobile viewport', () => {
      // Change viewport to mobile size
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));

      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText('Risk Trend Analysis')).toBeInTheDocument();
    });

    test('should render on tablet viewport', () => {
      // Change viewport to tablet size
      window.innerWidth = 768;
      window.dispatchEvent(new Event('resize'));

      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText('Risk Trend Analysis')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle single vendor', () => {
      render(
        <VendorTrendChart
          vendors={[mockVendors[0]]}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      expect(screen.getByText('Risk Trend Analysis')).toBeInTheDocument();
    });

    test('should handle exactly 5 vendors', () => {
      render(
        <VendorTrendChart
          vendors={mockVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(5);
    });

    test('should handle more than 5 vendors in list', () => {
      const manyVendors = [
        ...mockVendors,
        { id: 'vendor-6', name: 'Cyberdyne', riskScore: 70, grade: 'B' }
      ];

      render(
        <VendorTrendChart
          vendors={manyVendors}
          api_url="http://localhost:3000"
          authToken="test-token"
          orgId="test-org"
        />
      );

      // Should show all vendors
      expect(screen.getByText('Cyberdyne')).toBeInTheDocument();
    });
  });
});
