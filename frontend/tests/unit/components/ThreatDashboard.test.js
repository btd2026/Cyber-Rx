/**
 * ThreatDashboard Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ThreatDashboard from '../../../src/components/organisms/ThreatDashboard';

// Mock AuthContext
const mockApi = {
  get: jest.fn()
};

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    api: mockApi
  })
}));

describe('ThreatDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockApi.get = jest.fn(() => new Promise(() => {}));

    render(<ThreatDashboard organizationId="org-123" />);

    expect(screen.getByText(/loading threat dashboard/i)).toBeInTheDocument();
  });

  it('renders threat dashboard with summary data', async () => {
    const mockDashboard = {
      total: 25,
      highProbabilityCount: 8,
      criticalImpactCount: 5,
      controlEffectiveness: 65,
      byType: {
        'ransomware': 5,
        'phishing': 8,
        'insider': 3,
        'supply_chain': 2,
        'misconfig': 4,
        'ddos': 2,
        'api_abuse': 1
      },
      riskDistribution: {
        critical: 3,
        high: 6,
        medium: 10,
        low: 6
      }
    };

    const mockTopThreats = [
      {
        id: 'ts-1',
        name: 'Ransomware on Claims System',
        type: 'ransomware',
        probability: 70,
        impactLevel: 'Critical',
        calculatedRiskScore: 105,
        residualRisk: 37,
        description: 'Ransomware attack encrypting claims processing system'
      },
      {
        id: 'ts-2',
        name: 'Phishing Campaign targeting C-Suite',
        type: 'phishing',
        probability: 80,
        impactLevel: 'High',
        calculatedRiskScore: 96,
        residualRisk: 29,
        description: 'Sophisticated phishing campaign targeting executives'
      }
    ];

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: mockDashboard } })
      .mockResolvedValueOnce({ data: { data: mockTopThreats } });

    render(<ThreatDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('Ransomware on Claims System')).toBeInTheDocument();
    expect(screen.getByText('Phishing Campaign targeting C-Suite')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    mockApi.get = jest.fn().mockRejectedValue(new Error('API Error'));

    render(<ThreatDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load threat dashboard/i)).toBeInTheDocument();
    });
  });

  it('displays threat type distribution correctly', async () => {
    const mockDashboard = {
      total: 25,
      highProbabilityCount: 8,
      criticalImpactCount: 5,
      controlEffectiveness: 65,
      byType: {
        'ransomware': 5,
        'phishing': 8,
        'insider': 3
      },
      riskDistribution: {
        critical: 3,
        high: 6,
        medium: 10,
        low: 6
      }
    };

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: mockDashboard } })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<ThreatDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/ransomware/i)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(/phishing/i)).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('displays risk distribution correctly', async () => {
    const mockDashboard = {
      total: 25,
      highProbabilityCount: 8,
      criticalImpactCount: 5,
      controlEffectiveness: 65,
      byType: {},
      riskDistribution: {
        critical: 3,
        high: 6,
        medium: 10,
        low: 6
      }
    };

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: mockDashboard } })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<ThreatDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Critical Risk/i)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/High Risk/i)).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText(/Medium Risk/i)).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText(/Low Risk/i)).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('displays top threats with risk scores', async () => {
    const mockTopThreats = [
      {
        id: 'ts-1',
        name: 'Ransomware on Claims System',
        type: 'ransomware',
        probability: 70,
        impactLevel: 'Critical',
        calculatedRiskScore: 105,
        residualRisk: 37,
        description: 'Ransomware attack encrypting claims processing system'
      }
    ];

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: { total: 0, highProbabilityCount: 0, criticalImpactCount: 0, controlEffectiveness: 0, byType: {}, riskDistribution: {} } } })
      .mockResolvedValueOnce({ data: { data: mockTopThreats } });

    render(<ThreatDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText('Ransomware on Claims System')).toBeInTheDocument();
      expect(screen.getByText(/70%/)).toBeInTheDocument();
      expect(screen.getByText(/105/)).toBeInTheDocument();
      expect(screen.getByText(/37%/)).toBeInTheDocument();
    });
  });

  it('displays empty state for no threats', async () => {
    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: { total: 0, highProbabilityCount: 0, criticalImpactCount: 0, controlEffectiveness: 0, byType: {}, riskDistribution: {} } } })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<ThreatDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no threat scenarios found/i)).toBeInTheDocument();
    });
  });

  it('calls API endpoints correctly', async () => {
    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: { total: 0, highProbabilityCount: 0, criticalImpactCount: 0, controlEffectiveness: 0, byType: {}, riskDistribution: {} } } })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<ThreatDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/api/threat-scenarios/dashboard');
      expect(mockApi.get).toHaveBeenCalledWith('/api/threat-scenarios/top?limit=5');
    });
  });

  it('displays threat ranking correctly', async () => {
    const mockTopThreats = [
      { id: 'ts-1', name: 'Threat 1', type: 'ransomware', probability: 70, impactLevel: 'Critical', calculatedRiskScore: 105, description: 'First threat' },
      { id: 'ts-2', name: 'Threat 2', type: 'phishing', probability: 80, impactLevel: 'High', calculatedRiskScore: 96, description: 'Second threat' },
      { id: 'ts-3', name: 'Threat 3', type: 'insider', probability: 60, impactLevel: 'Medium', calculatedRiskScore: 60, description: 'Third threat' }
    ];

    mockApi.get = jest.fn()
      .mockResolvedValueOnce({ data: { data: { total: 3, highProbabilityCount: 2, criticalImpactCount: 1, controlEffectiveness: 70, byType: {}, riskDistribution: {} } } })
      .mockResolvedValueOnce({ data: { data: mockTopThreats } });

    render(<ThreatDashboard organizationId="org-123" />);

    await waitFor(() => {
      const threatElements = screen.getAllByText(/Threat/);
      expect(threatElements).toHaveLength(3);
    });
  });
});
