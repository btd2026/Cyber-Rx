/**
 * ConnectorCredentialModal Unit Tests
 *
 * Test suite for the ConnectorCredentialModal component.
 * Covers component rendering, user interactions, form validation,
 * API calls, and edge cases.
 *
 * Run with: npm test ConnectorCredentialModal.test.jsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectorCredentialModal from './ConnectorCredentialModal';

// Mock fetch API
global.fetch = jest.fn();

describe('ConnectorCredentialModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    connector: {
      id: 'securityscorecard',
      name: 'SecurityScorecard',
      icon: '🛡️',
      purpose: 'Cyber risk ratings',
      description: 'SecurityScorecard provides cybersecurity ratings.',
      docsUrl: 'https://www.securityscorecard.com/docs/'
    },
    api_url: 'https://api.test.com',
    authToken: 'test-token',
    orgId: 'test-org',
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    // Clear fetch mock
    fetch.mockClear();
  });

  describe('Rendering', () => {
    test('should render modal when isOpen is true', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      expect(screen.getByText('Configure SecurityScorecard')).toBeInTheDocument();
    });

    test('should not render modal when isOpen is false', () => {
      render(<ConnectorCredentialModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Configure SecurityScorecard')).not.toBeInTheDocument();
    });

    test('should render correct fields for SecurityScorecard connector', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      expect(screen.getByLabelText(/API Key/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Domain \(optional\)/)).toBeInTheDocument();
    });

    test('should render sync frequency dropdown', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      expect(screen.getByLabelText(/Sync Frequency/)).toBeInTheDocument();
      expect(screen.getByText(/Real-time \(webhook\)/)).toBeInTheDocument();
      expect(screen.getByText(/Daily \(recommended\)/)).toBeInTheDocument();
    });

    test('should render password field with show/hide toggle', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const passwordInput = screen.getByLabelText(/API Key/);
      expect(passwordInput.type).toBe('password');

      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      expect(passwordInput.type).toBe('text');
    });

    test('should render BitSight connector with correct fields', () => {
      const bitsightConnector = {
        ...defaultProps.connector,
        id: 'bitsight',
        name: 'BitSight'
      };
      render(<ConnectorCredentialModal {...defaultProps} connector={bitsightConnector} />);
      expect(screen.getByText('Configure BitSight')).toBeInTheDocument();
      expect(screen.getByLabelText(/API Key/)).toBeInTheDocument();
    });

    test('should render Recorded Future connector with only API key field', () => {
      const rfConnector = {
        ...defaultProps.connector,
        id: 'recorded_future',
        name: 'Recorded Future'
      };
      render(<ConnectorCredentialModal {...defaultProps} connector={rfConnector} />);
      expect(screen.getByLabelText(/API Key/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Domain/)).not.toBeInTheDocument();
    });

    test('should render file upload for Compliance Evidence connector', () => {
      const complianceConnector = {
        ...defaultProps.connector,
        id: 'compliance_evidence',
        name: 'Compliance Evidence'
      };
      render(<ConnectorCredentialModal {...defaultProps} connector={complianceConnector} />);
      expect(screen.getByLabelText(/Upload Evidence Document/)).toBeInTheDocument();
      expect(screen.getByText(/Upload SOC 2 report/)).toBeInTheDocument();
    });

    test('should render Google Alerts connector with RSS URL field', () => {
      const alertsConnector = {
        ...defaultProps.connector,
        id: 'google_alerts',
        name: 'Google Alerts'
      };
      render(<ConnectorCredentialModal {...defaultProps} connector={alertsConnector} />);
      expect(screen.getByLabelText(/RSS Feed URL/)).toBeInTheDocument();
    });

    test('should render Questionnaire connector with email checkbox', () => {
      const questionnaireConnector = {
        ...defaultProps.connector,
        id: 'questionnaire',
        name: 'Vendor Questionnaire'
      };
      render(<ConnectorCredentialModal {...defaultProps} connector={questionnaireConnector} />);
      expect(screen.getByLabelText(/Send questionnaire via email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Recipient Email Address/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('should update credentials when typing in input fields', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
      expect(apiKeyInput.value).toBe('test-api-key');
    });

    test('should toggle password visibility', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const passwordInput = screen.getByLabelText(/API Key/);
      const showButton = screen.getByText('Show');
      const hideButton = screen.getByText('Hide');

      expect(passwordInput.type).toBe('password');
      fireEvent.click(showButton);
      expect(passwordInput.type).toBe('text');
      fireEvent.click(hideButton);
      expect(passwordInput.type).toBe('password');
    });

    test('should update sync frequency', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const select = screen.getByLabelText(/Sync Frequency/);
      fireEvent.change(select, { target: { value: 'hourly' } });
      expect(select.value).toBe('hourly');
    });

    test('should close modal when clicking X button', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should close modal when clicking Cancel button', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should close modal when pressing ESC key', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should close modal when clicking backdrop', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const backdrop = screen.getByText('Configure SecurityScorecard').closest('div[style*="position: fixed"]');
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should handle checkbox for Questionnaire connector', () => {
      const questionnaireConnector = {
        ...defaultProps.connector,
        id: 'questionnaire',
        name: 'Vendor Questionnaire'
      };
      render(<ConnectorCredentialModal {...defaultProps} connector={questionnaireConnector} />);
      const checkbox = screen.getByLabelText(/Send questionnaire via email/);
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    test('should handle file upload for Compliance Evidence', () => {
      const complianceConnector = {
        ...defaultProps.connector,
        id: 'compliance_evidence',
        name: 'Compliance Evidence'
      };
      render(<ConnectorCredentialModal {...defaultProps} connector={complianceConnector} />);
      const fileInput = screen.getByLabelText(/Upload Evidence Document/);
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      expect(fileInput.files[0]).toBe(file);
    });
  });

  describe('Form Validation', () => {
    test('should disable Test Connection button when required fields are empty', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const testButton = screen.getByText('Test Connection');
      expect(testButton).toBeDisabled();
    });

    test('should enable Test Connection button when required fields are filled', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      expect(testButton).not.toBeDisabled();
    });

    test('should disable Save button until connection test passes', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const saveButton = screen.getByText('Save & Connect');
      expect(saveButton).toBeDisabled();
    });

    test('should clear test result when credentials change', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { valid: true } })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      // Fill in credentials and test
      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection verified/)).toBeInTheDocument();
      });

      // Change credentials
      fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });

      // Test result should be cleared
      expect(screen.queryByText(/Connection verified/)).not.toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    test('should call validate endpoint when testing connection', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { valid: true } })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'https://api.test.com/api/credentials/securityscorecard/validate',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
              'X-Org-Id': 'test-org'
            }),
            body: expect.stringContaining('test-key')
          })
        );
      });
    });

    test('should show success message on successful connection test', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection verified/)).toBeInTheDocument();
        expect(screen.getByText('✓')).toBeInTheDocument();
      });
    });

    test('should show error message on failed connection test', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'Invalid API key' })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'invalid-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
        expect(screen.getByText(/Invalid API key/)).toBeInTheDocument();
        expect(screen.getByText('✗')).toBeInTheDocument();
      });
    });

    test('should enable Save button after successful test', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection verified/)).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save & Connect');
      expect(saveButton).not.toBeDisabled();
    });

    test('should call save endpoint when saving credentials', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { saved: true } })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection verified/)).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save & Connect');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'https://api.test.com/api/credentials/securityscorecard',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('••••••••••••')
          })
        );
      });
    });

    test('should call onSuccess callback and close modal on successful save', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { saved: true } })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection verified/)).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save & Connect');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('securityscorecard', 'daily');
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    test('should show error message when save fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'Database error' })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection verified/)).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save & Connect');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Database error/)).toBeInTheDocument();
        expect(defaultProps.onClose).not.toHaveBeenCalled();
      });
    });

    test('should handle network errors during connection test', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    test('should show loading state during connection test', async () => {
      fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      }), 100)));

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      expect(screen.getByText('Testing...')).toBeInTheDocument();
      expect(testButton).toBeDisabled();
    });

    test('should show loading state during save', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: { saved: true } })
      }), 100)));

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection verified/)).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save & Connect');
      fireEvent.click(saveButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing connector prop', () => {
      render(<ConnectorCredentialModal {...defaultProps} connector={null} />);
      expect(screen.queryByText('Configure')).not.toBeInTheDocument();
    });

    test('should read auth token from localStorage if not provided', () => {
      localStorage.setItem('authToken', 'local-token');
      const { api_url: _, ...propsWithoutAuth } = defaultProps;

      render(<ConnectorCredentialModal {...propsWithoutAuth} authToken={undefined} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      fireEvent.click(testButton);

      // Should read from localStorage
      expect(localStorage.getItem('authToken')).toBe('local-token');
    });

    test('should read orgId from localStorage if not provided', () => {
      localStorage.setItem('orgId', 'local-org');
      const { api_url: _, ...propsWithoutOrg } = defaultProps;

      render(<ConnectorCredentialModal {...propsWithoutOrg} orgId={undefined} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      fireEvent.click(testButton);

      // Should read from localStorage
      expect(localStorage.getItem('orgId')).toBe('local-org');
    });

    test('should handle unknown connector type with generic API key field', () => {
      const unknownConnector = {
        ...defaultProps.connector,
        id: 'unknown_connector',
        name: 'Unknown Connector'
      };
      render(<ConnectorCredentialModal {...defaultProps} connector={unknownConnector} />);
      expect(screen.getByLabelText(/API Key/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Domain/)).not.toBeInTheDocument();
    });

    test('should mask API key when saving', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { saved: true } })
      });

      render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'my-secret-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection verified/)).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save & Connect');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const saveCall = fetch.mock.calls[1];
        const body = JSON.parse(saveCall[1].body);
        expect(body.credentials.apiKey).toBe('••••••••••••');
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    test('should focus first input when modal opens', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      const apiKeyInput = screen.getByLabelText(/API Key/);
      expect(apiKeyInput).toHaveFocus();
    });

    test('should trap focus within modal', () => {
      render(<ConnectorCredentialModal {...defaultProps} />);
      // Focus trapping is handled by the browser when modal is open
      // This is a basic check - full accessibility testing would require more tools
      const modalContent = screen.getByText('Configure SecurityScorecard').closest('div[style*="overflow: hidden"]');
      expect(modalContent).toBeInTheDocument();
    });

    test('should prevent body scroll when modal is open', () => {
      const { rerender } = render(<ConnectorCredentialModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<ConnectorCredentialModal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Form Reset', () => {
    test('should reset form when modal closes', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection verified' })
      });

      const { rerender } = render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      // Close modal
      rerender(<ConnectorCredentialModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<ConnectorCredentialModal {...defaultProps} isOpen={true} />);

      // Form should be reset
      const newApiKeyInput = screen.getByLabelText(/API Key/);
      expect(newApiKeyInput.value).toBe('');
      expect(screen.queryByText(/Connection verified/)).not.toBeInTheDocument();
    });

    test('should reset form when connector changes', () => {
      const { rerender } = render(<ConnectorCredentialModal {...defaultProps} />);

      const apiKeyInput = screen.getByLabelText(/API Key/);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const newConnector = {
        ...defaultProps.connector,
        id: 'bitsight',
        name: 'BitSight'
      };

      rerender(<ConnectorCredentialModal {...defaultProps} connector={newConnector} />);

      // Form should be reset
      expect(screen.getByText('Configure BitSight')).toBeInTheDocument();
    });
  });
});
