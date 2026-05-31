/**
 * BusinessProcessForm Component
 *
 * Form for creating and editing business processes.
 * Validates required fields and integrates with API endpoints.
 *
 * @param {Object} props
 * @param {Object} props.initialValues - Initial form values (for edit mode)
 * @param {Function} props.onSubmit - Submit handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 */

import React, { useState, useEffect } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';

const BusinessProcessForm = ({
  initialValues = null,
  onSubmit,
  onCancel,
  loading = false,
  error = null
}) => {
  const [formData, setFormData] = useState({
    name: '',
    tier: 'Primary',
    criticality: 'High',
    owner: 'CIO',
    description: '',
    supportedBySystems: [],
    createsDataObjects: [],
    governedByControls: []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        tier: initialValues.tier || 'Primary',
        criticality: initialValues.criticality || 'High',
        owner: initialValues.owner || 'CIO',
        description: initialValues.description || '',
        supportedBySystems: initialValues.supportedBySystems || [],
        createsDataObjects: initialValues.createsDataObjects || [],
        governedByControls: initialValues.governedByControls || []
      });
    }
  }, [initialValues]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Business process name is required';
    }

    if (!formData.tier || !['Primary', 'Strategic'].includes(formData.tier)) {
      newErrors.tier = 'Tier must be Primary or Strategic';
    }

    if (!formData.criticality || !['Critical', 'High', 'Medium', 'Low'].includes(formData.criticality)) {
      newErrors.criticality = 'Criticality must be Critical, High, Medium, or Low';
    }

    if (!formData.owner || !formData.owner.trim()) {
      newErrors.owner = 'Owner is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      tier: formData.tier,
      criticality: formData.criticality,
      owner: formData.owner.trim(),
      description: formData.description.trim() || null,
      supportedBySystems: formData.supportedBySystems,
      createsDataObjects: formData.createsDataObjects,
      governedByControls: formData.governedByControls
    });
  };

  const tiers = ['Primary', 'Strategic'];
  const criticalities = ['Critical', 'High', 'Medium', 'Low'];
  const owners = ['CIO', 'CISO', 'CFO', 'CRO', 'CTO', 'CSO', 'COO', 'CEO', 'CLO', 'CMO'];

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
            color: '#991B1B'
          }}
        >
          {error}
        </div>
      )}

      {/* Name Field */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="name"
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6
          }}
        >
          Business Process Name <span style={{ color: '#EF4545' }}>*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Claims Adjudication"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${errors.name ? '#EF4545' : '#D1D5DB'}`,
            borderRadius: 6,
            fontSize: 14,
            color: '#111827',
            backgroundColor: loading ? '#F3F4F6' : '#FFFFFF',
            transition: 'border-color 0.15s ease'
          }}
          onFocus={(e) => {
            if (!errors.name) {
              e.currentTarget.style.borderColor = '#3B82F6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }
          }}
          onBlur={(e) => {
            if (!errors.name) {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        />
        {errors.name && (
          <div style={{ fontSize: 12, color: '#EF4545', marginTop: 4 }}>
            {errors.name}
          </div>
        )}
      </div>

      {/* Tier Field */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="tier"
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6
          }}
        >
          Tier <span style={{ color: '#EF4545' }}>*</span>
        </label>
        <select
          id="tier"
          value={formData.tier}
          onChange={(e) => handleChange('tier', e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${errors.tier ? '#EF4545' : '#D1D5DB'}`,
            borderRadius: 6,
            fontSize: 14,
            color: '#111827',
            backgroundColor: loading ? '#F3F4F6' : '#FFFFFF',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {tiers.map(tier => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
        {errors.tier && (
          <div style={{ fontSize: 12, color: '#EF4545', marginTop: 4 }}>
            {errors.tier}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          Primary: Core operations | Strategic: Long-term capabilities
        </div>
      </div>

      {/* Criticality Field */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="criticality"
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6
          }}
        >
          Criticality <span style={{ color: '#EF4545' }}>*</span>
        </label>
        <select
          id="criticality"
          value={formData.criticality}
          onChange={(e) => handleChange('criticality', e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${errors.criticality ? '#EF4545' : '#D1D5DB'}`,
            borderRadius: 6,
            fontSize: 14,
            color: '#111827',
            backgroundColor: loading ? '#F3F4F6' : '#FFFFFF',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {criticalities.map(crit => (
            <option key={crit} value={crit}>
              {crit}
            </option>
          ))}
        </select>
        {errors.criticality && (
          <div style={{ fontSize: 12, color: '#EF4545', marginTop: 4 }}>
            {errors.criticality}
          </div>
        )}
      </div>

      {/* Owner Field */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="owner"
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6
          }}
        >
          Executive Owner <span style={{ color: '#EF4545' }}>*</span>
        </label>
        <select
          id="owner"
          value={formData.owner}
          onChange={(e) => handleChange('owner', e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${errors.owner ? '#EF4545' : '#D1D5DB'}`,
            borderRadius: 6,
            fontSize: 14,
            color: '#111827',
            backgroundColor: loading ? '#F3F4F6' : '#FFFFFF',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {owners.map(owner => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
        {errors.owner && (
          <div style={{ fontSize: 12, color: '#EF4545', marginTop: 4 }}>
            {errors.owner}
          </div>
        )}
      </div>

      {/* Description Field */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="description"
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6
          }}
        >
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe the business process and its purpose..."
          rows={4}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            fontSize: 14,
            color: '#111827',
            backgroundColor: loading ? '#F3F4F6' : '#FFFFFF',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          Optional: Provide additional context about this process
        </div>
      </div>

      {/* Control Coverage Preview */}
      {formData.criticality && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 6,
            marginBottom: 16
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0369A1', marginBottom: 4 }}>
            Required Controls for {formData.criticality} Criticality:
          </div>
          <div style={{ fontSize: 14, color: '#0C4A6E' }}>
            {
              formData.criticality === 'Critical' ? '10 controls' :
              formData.criticality === 'High' ? '8 controls' :
              formData.criticality === 'Medium' ? '5 controls' :
              '3 controls'
            }
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          paddingTop: 16,
          borderTop: '1px solid #E5E7EB'
        }}
      >
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          type="button"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={loading}
          loading={loading}
        >
          {initialValues ? 'Update Process' : 'Create Process'}
        </Button>
      </div>
    </form>
  );
};

export default BusinessProcessForm;
