/**
 * ConnectorCredentialModal Component
 *
 * Modal for configuring credentials for vendor monitoring services.
 * Supports multiple connector types with dynamic form fields.
 * Features credential validation, secure password handling, and connection testing.
 *
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Close callback
 * @param {object} props.connector - Connector configuration object
 * @param {string} props.api_url - API base URL
 * @param {string} props.authToken - Authentication token
 * @param {string} props.orgId - Organization ID
 * @param {function} props.onSuccess - Success callback after credential save
 */

import React, { useState, useCallback, useEffect } from 'react';
import Modal from './molecules/Modal';
import Input from './molecules/Input';
import Select from './molecules/Select';
import Button from './atoms/Button';

const ConnectorCredentialModal = ({
  isOpen,
  onClose,
  connector,
  api_url,
  authToken,
  orgId,
  onSuccess
}) => {
  // Form state
  const [credentials, setCredentials] = useState({});
  const [syncFrequency, setSyncFrequency] = useState('daily');
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Reset form when modal opens/closes or connector changes
  useEffect(() => {
    if (isOpen) {
      setCredentials({});
      setSyncFrequency('daily');
      setShowPassword(false);
      setTestResult(null);
      setSaveError(null);
    }
  }, [isOpen, connector]);

  // Sync frequency options
  const syncOptions = [
    { value: 'realtime', label: 'Real-time (webhook)', helper: 'Instant updates when vendor data changes' },
    { value: 'hourly', label: 'Hourly', helper: 'Check for updates every hour' },
    { value: 'daily', label: 'Daily (recommended)', helper: 'Check for updates once per day' },
    { value: 'weekly', label: 'Weekly', helper: 'Check for updates once per week' }
  ];

  // Get connector-specific field configuration
  const getConnectorFields = useCallback(() => {
    if (!connector) return [];

    const fields = [];

    switch (connector.id) {
      case 'securityscorecard':
      case 'bitsight':
      case 'riskrecon':
        fields.push({
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your API key',
          helperText: 'Find your API key in your provider dashboard under Settings > API Keys'
        });
        fields.push({
          name: 'domain',
          label: 'Domain (optional)',
          type: 'text',
          required: false,
          placeholder: 'example.com',
          helperText: 'Leave blank to monitor all domains in your account'
        });
        break;

      case 'recorded_future':
        fields.push({
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your Recorded Future API key',
          helperText: 'Create an API key in your Recorded Future account settings'
        });
        break;

      case 'compliance_evidence':
        fields.push({
          name: 'evidenceFile',
          label: 'Upload Evidence Document',
          type: 'file',
          required: true,
          accept: '.pdf,.doc,.docx',
          helperText: 'Upload SOC 2 report, ISO 27001 certificate, or other compliance evidence (PDF, DOC, DOCX)'
        });
        break;

      case 'google_alerts':
        fields.push({
          name: 'rssUrl',
          label: 'RSS Feed URL',
          type: 'url',
          required: true,
          placeholder: 'https://www.google.com/alerts/feeds/...',
          helperText: 'Copy the RSS URL from your Google Alert settings'
        });
        break;

      case 'questionnaire':
        fields.push({
          name: 'sendViaEmail',
          label: 'Send questionnaire via email',
          type: 'checkbox',
          required: false,
          helperText: 'Vendor will receive the questionnaire by email'
        });
        fields.push({
          name: 'recipientEmail',
          label: 'Recipient Email Address',
          type: 'email',
          required: false,
          placeholder: 'vendor@example.com',
          helperText: 'Optional: Specify recipient email address'
        });
        break;

      default:
        // Generic API key field for unknown connectors
        fields.push({
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your API key',
          helperText: 'Enter the API key from your provider dashboard'
        });
    }

    return fields;
  }, [connector]);

  // Handle credential field change
  const handleCredentialChange = useCallback((fieldName, value) => {
    setCredentials(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Clear test result when credentials change
    setTestResult(null);
    setSaveError(null);
  }, []);

  // Test connection
  const handleTestConnection = useCallback(async () => {
    if (!connector) return;

    setTesting(true);
    setTestResult(null);
    setSaveError(null);

    try {
      const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
      const token = authToken || localStorage.getItem('authToken');
      const organizationId = orgId || localStorage.getItem('orgId');

      const response = await fetch(
        `${apiUrl}/api/credentials/${connector.id}/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          },
          body: JSON.stringify({ credentials, syncFrequency })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: 'Connection verified successfully'
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || data.error || 'Invalid credentials. Please check your API key and try again.'
        });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult({
        success: false,
        message: `Connection failed: ${error.message}`
      });
    } finally {
      setTesting(false);
    }
  }, [connector, credentials, syncFrequency, api_url, authToken, orgId]);

  // Save credentials
  const handleSave = useCallback(async () => {
    if (!connector || !testResult?.success) return;

    setSaving(true);
    setSaveError(null);

    try {
      const apiUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
      const token = authToken || localStorage.getItem('authToken');
      const organizationId = orgId || localStorage.getItem('orgId');

      const response = await fetch(
        `${apiUrl}/api/credentials/${connector.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': organizationId
          },
          body: JSON.stringify({
            credentials: {
              ...credentials,
              // Mask API key in storage (never store actual key)
              apiKey: credentials.apiKey ? '••••••••••••' : undefined
            },
            syncFrequency,
            connectorId: connector.id
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Close modal and notify parent
        if (onSuccess) {
          onSuccess(connector.id, syncFrequency);
        }
        onClose();
      } else {
        setSaveError(data.message || data.error || 'Failed to save credentials. Please try again.');
      }
    } catch (error) {
      console.error('Save credentials failed:', error);
      setSaveError(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [connector, credentials, syncFrequency, testResult, api_url, authToken, orgId, onSuccess, onClose]);

  // Check if form is valid for testing
  const canTest = useCallback(() => {
    const fields = getConnectorFields();
    const requiredFields = fields.filter(f => f.required);

    for (const field of requiredFields) {
      if (!credentials[field.name]) {
        return false;
      }
    }

    return true;
  }, [credentials, getConnectorFields]);

  // Check if can save (must pass test first)
  const canSave = testResult?.success && !saving;

  if (!connector) return null;

  const fields = getConnectorFields();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure ${connector.name}`}
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!canTest() || testing || saving}
            loading={testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!canSave}
            loading={saving}
          >
            {saving ? 'Saving...' : 'Save & Connect'}
          </Button>
        </>
      }
    >
      {/* Connector description */}
      <div style={{
        padding: '12px',
        backgroundColor: '#F9FAFB',
        borderRadius: 6,
        marginBottom: 20,
        fontSize: 11,
        color: '#6B7280',
        lineHeight: 1.5
      }}>
        {connector.description || `Configure your ${connector.name} credentials to enable automated monitoring.`}
      </div>

      {/* Dynamic form fields */}
      {fields.map((field) => (
        <div key={field.name} style={{ marginBottom: 16 }}>
          {/* Checkbox field */}
          {field.type === 'checkbox' ? (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 11,
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={credentials[field.name] || false}
                onChange={(e) => handleCredentialChange(field.name, e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontWeight: 600 }}>
                {field.label}
              </span>
              {field.required && <span style={{ color: '#EF4545' }}>*</span>}
            </label>
          ) : field.type === 'file' ? (
            /* File upload field */
            <>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 6
              }}>
                {field.label}
                {field.required && <span style={{ color: '#EF4545', marginLeft: 2 }}>*</span>}
              </label>
              <input
                type="file"
                accept={field.accept}
                onChange={(e) => handleCredentialChange(field.name, e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 12,
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer'
                }}
              />
            </>
          ) : (
            /* Password field with show/hide toggle */
            <>
              <Input
                label={field.label}
                type={field.type === 'password' && !showPassword ? 'password' : 'text'}
                value={credentials[field.name] || ''}
                onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                helperText={
                  field.type === 'password' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{field.helperText}</span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          cursor: 'pointer',
                          fontSize: 10,
                          fontWeight: 600,
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  ) : field.helperText
                }
              />
            </>
          )}

          {/* Helper text for non-Input fields */}
          {field.type === 'checkbox' && field.helperText && (
            <div style={{
              marginTop: 4,
              fontSize: 10,
              color: '#6B7280'
            }}>
              {field.helperText}
            </div>
          )}
        </div>
      ))}

      {/* Sync frequency dropdown */}
      <Select
        label="Sync Frequency"
        options={syncOptions.map(opt => ({ value: opt.value, label: opt.label }))}
        value={syncFrequency}
        onChange={setSyncFrequency}
        required
        helperText={syncOptions.find(opt => opt.value === syncFrequency)?.helper}
      />

      {/* Test result message */}
      {testResult && (
        <div style={{
          marginTop: 20,
          padding: '12px',
          borderRadius: 6,
          backgroundColor: testResult.success ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${testResult.success ? '#10B981' : '#EF4545'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: testResult.success ? '#065F46' : '#991B1B'
        }}>
          <span style={{ fontSize: 14 }}>
            {testResult.success ? '✓' : '✗'}
          </span>
          <span style={{ fontWeight: 600 }}>
            {testResult.success ? 'Connection verified' : 'Connection failed'}
          </span>
          <span style={{ color: testResult.success ? '#065F46' : '#991B1B' }}>
            {testResult.message}
          </span>
        </div>
      )}

      {/* Save error message */}
      {saveError && (
        <div style={{
          marginTop: 16,
          padding: '12px',
          borderRadius: 6,
          backgroundColor: '#FEF2F2',
          border: '1px solid #EF4545',
          fontSize: 11,
          color: '#991B1B'
        }}>
          <strong>Error:</strong> {saveError}
        </div>
      )}

      {/* Help link */}
      {connector.docsUrl && (
        <div style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 10
        }}>
          <a
            href={connector.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#2563EB',
              textDecoration: 'underline'
            }}
          >
            Where do I find my API key?
          </a>
        </div>
      )}
    </Modal>
  );
};

export default ConnectorCredentialModal;
