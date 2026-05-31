/**
 * DataDashboard Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DataDashboard from '../../../src/components/organisms/DataDashboard';

// Mock AuthContext
const mockApi = {
  get: jest.fn()
};

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    api: mockApi
  })
}));

describe('DataDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockApi.get = jest.fn(() => new Promise(() => {}));

    render(<DataDashboard organizationId="org-123" />);

    expect(screen.getByText(/loading data dashboard/i)).toBeInTheDocument();
  });

  it('renders data dashboard with summary data', async () => {
    const mockSummary = {
      total: 150,
      highValueCount: 25,
      totalRecords: 5000000,
      controlCoverage: 75,
      byType: {
        'PHI': 50,
        'PII': 40,
        'PCI': 30,
        'Financial': 20,
        'Legal': 10
      },
      bySensitivity: {
        'Critical': 20,
        'High': 30,
        'Medium': 50,
        'Low': 50
      }
    };

    const mockHighValueData = [
      {
        id: 'do-1',
        name: 'Member PHI',
        type: 'PHI',
        sensitivity: 'Critical',
        recordCount: 3000000,
        description: 'Member protected health information'
      },
      {
        id: 'do-2',
        name: 'Claims Data',
        type: 'PII',
        sensitivity: 'High',
        recordCount: 1500000,
        description: 'Claims processing data'
      }
    ];

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: mockSummary } })
      .mockResolvedValueOnce({ data: { data: mockHighValueData } });

    render(<DataDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('5,000,000')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Member PHI')).toBeInTheDocument();
    expect(screen.getByText('Claims Data')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    mockApi.get = jest.fn().mockRejectedValue(new Error('API Error'));

    render(<DataDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load data dashboard/i)).toBeInTheDocument();
    });
  });

  it('displays data type distribution correctly', async () => {
    const mockSummary = {
      total: 150,
      highValueCount: 25,
      totalRecords: 5000000,
      controlCoverage: 75,
      byType: {
        'PHI': 50,
        'PII': 40,
        'PCI': 30
      },
      bySensitivity: {}
    };

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: mockSummary } })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<DataDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText('PHI')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('PII')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
    });
  });

  it('displays sensitivity distribution correctly', async () => {
    const mockSummary = {
      total: 150,
      highValueCount: 25,
      totalRecords: 5000000,
      controlCoverage: 75,
      byType: {},
      bySensitivity: {
        'Critical': 20,
        'High': 30,
        'Medium': 50,
        'Low': 50
      }
    };

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: mockSummary } })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<DataDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  it('displays empty state for high-value data', async () => {
    const mockSummary = {
      total: 0,
      highValueCount: 0,
      totalRecords: 0,
      controlCoverage: 0,
      byType: {},
      bySensitivity: {}
    };

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: mockSummary } })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<DataDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no high-value data objects found/i)).toBeInTheDocument();
    });
  });

  it('calls API endpoints correctly', async () => {
    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: { total: 0, highValueCount: 0, totalRecords: 0, controlCoverage: 0, byType: {}, bySensitivity: {} } } })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<DataDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/api/data-objects/summary/classification');
      expect(mockApi.get).toHaveBeenCalledWith('/api/data-objects/high-value');
    });
  });
});
