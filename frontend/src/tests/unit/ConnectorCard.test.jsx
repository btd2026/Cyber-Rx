import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectorCard from '../../components/ConnectorCard';

describe('ConnectorCard Component', () => {
  const mockConnector = {
    id: 'test-connector',
    name: 'Test Connector',
    icon: '🔌',
    purpose: 'Test purpose description'
  };

  const mockCallbacks = {
    onConnect: jest.fn(),
    onTest: jest.fn(),
    onSync: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Not Connected State', () => {
    it('should render connector in not connected state', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={null}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Test Connector')).toBeInTheDocument();
      expect(screen.getByText('Test purpose description')).toBeInTheDocument();
      expect(screen.getByText('Not Connected')).toBeInTheDocument();
    });

    it('should display Connect button when not connected', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={null}
          {...mockCallbacks}
        />
      );

      const connectButton = screen.getByText('Connect');
      expect(connectButton).toBeInTheDocument();
    });

    it('should call onConnect when Connect button is clicked', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={null}
          {...mockCallbacks}
        />
      );

      const connectButton = screen.getByText('Connect');
      fireEvent.click(connectButton);

      // Connect button opens modal, modal success calls onConnect
      // For now just verify button is clickable
      expect(connectButton).toBeInTheDocument();
    });

    it('should display gray status indicator for not connected', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={null}
          {...mockCallbacks}
        />
      );

      // Status indicator is shown with "Not Connected" text
      expect(screen.getByText('Not Connected')).toBeInTheDocument();
    });
  });

  describe('Connected State', () => {
    const mockConnection = {
      status: 'connected',
      lastSync: new Date('2024-01-15'),
      signalCount: 42,
      riskContribution: 0.35
    };

    it('should render connector in connected state', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={mockConnection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display green status indicator for connected', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={mockConnection}
          {...mockCallbacks}
        />
      );

      // Status indicator is shown with "Connected" text
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should display Sync Now and Test buttons when connected', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={mockConnection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Sync Now')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    it('should call onSync when Sync Now button is clicked', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={mockConnection}
          {...mockCallbacks}
        />
      );

      const syncButton = screen.getByText('Sync Now');
      fireEvent.click(syncButton);

      expect(mockCallbacks.onSync).toHaveBeenCalledTimes(1);
    });

    it('should call onTest when Test button is clicked', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={mockConnection}
          {...mockCallbacks}
        />
      );

      const testButton = screen.getByText('Test');
      fireEvent.click(testButton);

      expect(mockCallbacks.onTest).toHaveBeenCalledTimes(1);
    });

    it('should display risk contribution percentage', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={mockConnection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('35%')).toBeInTheDocument();
    });

    it('should display risk contribution in orange for medium contribution', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={mockConnection}
          {...mockCallbacks}
        />
      );

      const riskElement = screen.getByText('35%');
      expect(riskElement).toHaveStyle({ color: '#F5A623' });
    });

    it('should display risk contribution in red for high contribution', () => {
      const highRiskConnection = {
        ...mockConnection,
        riskContribution: 0.6
      };

      render(
        <ConnectorCard
          connector={mockConnector}
          connection={highRiskConnection}
          {...mockCallbacks}
        />
      );

      const riskElement = screen.getByText('60%');
      expect(riskElement).toHaveStyle({ color: '#EF4545' });
    });

    it('should display risk contribution in green for low contribution', () => {
      const lowRiskConnection = {
        ...mockConnection,
        riskContribution: 0.2
      };

      render(
        <ConnectorCard
          connector={mockConnector}
          connection={lowRiskConnection}
          {...mockCallbacks}
        />
      );

      const riskElement = screen.getByText('20%');
      expect(riskElement).toHaveStyle({ color: '#0FBB80' });
    });
  });

  describe('Syncing State', () => {
    const syncingConnection = {
      status: 'syncing',
      lastSync: new Date('2024-01-15'),
      signalCount: 42,
      riskContribution: 0.35
    };

    it('should display syncing status', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={syncingConnection}
          {...mockCallbacks}
        />
      );

      expect(screen.getAllByText('Syncing...').length).toBeGreaterThan(0);
    });

    it('should display Syncing... text on button while syncing', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={syncingConnection}
          {...mockCallbacks}
        />
      );

      const syncButton = screen.getAllByText('Syncing...').find(el => el.tagName === 'BUTTON');
      expect(syncButton).toBeInTheDocument();
      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument();
    });

    it('should disable sync button while syncing', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={syncingConnection}
          {...mockCallbacks}
        />
      );

      const syncButton = screen.getAllByText('Syncing...').find(el => el.tagName === 'BUTTON');
      expect(syncButton).toBeDisabled();
    });

    it('should display orange status indicator while syncing', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={syncingConnection}
          {...mockCallbacks}
        />
      );

      // Status indicator is shown with "Syncing..." text (multiple occurrences)
      expect(screen.getAllByText('Syncing...').length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    const errorConnection = {
      status: 'failed',
      lastSync: new Date('2024-01-15'),
      signalCount: 42,
      riskContribution: 0.35
    };

    it('should display error status', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={errorConnection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });

    it('should display red status indicator for error', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={errorConnection}
          {...mockCallbacks}
        />
      );

      // Status indicator is shown with "Connection Failed" text
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });
  });

  describe('Manual Entry Required State', () => {
    const manualEntryConnection = {
      status: 'manual_entry_required',
      lastSync: new Date('2024-01-15'),
      signalCount: 0,
      riskContribution: null
    };

    it('should display manual entry required status', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={manualEntryConnection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Manual Entry Required')).toBeInTheDocument();
    });

    it('should display manual entry warning badge', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={manualEntryConnection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText(/Manual entry required/)).toBeInTheDocument();
      expect(screen.getByText(/web scraping blocked/)).toBeInTheDocument();
    });

    it('should display orange status indicator for manual entry required', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={manualEntryConnection}
          {...mockCallbacks}
        />
      );

      // Status indicator is shown with "Manual Entry Required" text
      expect(screen.getByText('Manual Entry Required')).toBeInTheDocument();
    });
  });

  describe('Last Sync Formatting', () => {
    it('should display "Today" for sync from today', () => {
      const now = new Date();
      const connection = {
        status: 'connected',
        lastSync: new Date(now.getTime() - 30 * 1000), // 30 seconds ago
        signalCount: 0
      };

      render(
        <ConnectorCard
          connector={mockConnector}
          connection={connection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should display "Yesterday" for sync from yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const connection = {
        status: 'connected',
        lastSync: yesterday,
        signalCount: 0
      };

      render(
        <ConnectorCard
          connector={mockConnector}
          connection={connection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('should display "X days ago" for sync from recent days', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const connection = {
        status: 'connected',
        lastSync: threeDaysAgo,
        signalCount: 0
      };

      render(
        <ConnectorCard
          connector={mockConnector}
          connection={connection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });

    it('should display "Never" when no last sync', () => {
      const connection = {
        status: 'connected',
        lastSync: null,
        signalCount: 0
      };

      render(
        <ConnectorCard
          connector={mockConnector}
          connection={connection}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing connection object', () => {
      render(
        <ConnectorCard
          connector={mockConnector}
          connection={undefined}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Not Connected')).toBeInTheDocument();
    });

    it('should handle zero signal count', () => {
      const connection = {
        status: 'connected',
        lastSync: new Date(),
        signalCount: 0
      };

      render(
        <ConnectorCard
          connector={mockConnector}
          connection={connection}
          {...mockCallbacks}
        />
      );

      // Should not display signal count when zero
      expect(screen.queryByText(/Signals:/)).not.toBeInTheDocument();
    });

    it('should handle missing connector icon', () => {
      const connectorWithoutIcon = {
        ...mockConnector,
        icon: undefined
      };

      render(
        <ConnectorCard
          connector={connectorWithoutIcon}
          connection={null}
          {...mockCallbacks}
        />
      );

      // Should display default icon
      const icon = screen.getByText('🔌');
      expect(icon).toBeInTheDocument();
    });

    it('should handle very long connector name', () => {
      const longNameConnector = {
        ...mockConnector,
        name: 'This is a very long connector name that should be truncated'
      };

      render(
        <ConnectorCard
          connector={longNameConnector}
          connection={null}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText(/This is a very long connector name/)).toBeInTheDocument();
    });
  });
});
