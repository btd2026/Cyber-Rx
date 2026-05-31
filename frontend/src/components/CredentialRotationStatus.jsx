/**
 * CredentialRotationStatus Component
 *
 * Displays credential rotation status including:
 * - Current credential age
 * - Days until rotation required
 * - Rotation status indicator (ok, due_soon, overdue, critical_overdue)
 * - Rotate Now button for credentials needing rotation
 * - Rotation history timeline
 *
 * Security Features:
 * - No sensitive credential data displayed
 * - Shows only metadata (age, version, timestamps)
 * - Audit trail for compliance
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, History, RotateCw } from 'lucide-react';

const CredentialRotationStatus = ({ connection, onRotate, className = '' }) => {
  const [rotationStatus, setRotationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchRotationStatus();
  }, [connection?.id]);

  const fetchRotationStatus = async () => {
    if (!connection?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/credentials/rotation-status?orgId=${connection.orgId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rotation status');
      }

      const data = await response.json();
      const credential = data.credentials.find(c => c.id === connection.id);
      setRotationStatus(credential || null);
    } catch (error) {
      console.error('Failed to fetch rotation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRotate = async () => {
    if (onRotate) {
      onRotate(connection);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical_overdue':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'overdue':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'due_soon':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ok':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical_overdue':
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'due_soon':
        return <Clock className="w-4 h-4" />;
      case 'ok':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'critical_overdue':
        return 'Critically Overdue';
      case 'overdue':
        return 'Overdue';
      case 'due_soon':
        return 'Rotation Due Soon';
      case 'ok':
        return 'OK';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className={`credential-rotation-status p-4 border rounded-lg ${className}`}>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!rotationStatus) {
    return null;
  }

  const { credentialAge, daysUntilRotation, status } = rotationStatus;

  return (
    <div className={`credential-rotation-status p-4 border rounded-lg ${getStatusColor(status)} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon(status)}
          <span className="font-medium">{getStatusLabel(status)}</span>
        </div>
        {rotationStatus.rotationHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm flex items-center space-x-1 hover:underline"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-sm opacity-75">Credential Age</div>
          <div className="text-lg font-semibold">{credentialAge} days</div>
        </div>

        <div>
          <div className="text-sm opacity-75">Rotation Period</div>
          <div className="text-lg font-semibold">{rotationStatus.rotationPeriod} days</div>
        </div>

        <div className={daysUntilRotation < 0 ? 'text-red-700' : ''}>
          <div className="text-sm opacity-75">
            {daysUntilRotation > 0 ? 'Rotation Due In' : 'Overdue By'}
          </div>
          <div className="text-lg font-semibold">
            {Math.abs(daysUntilRotation)} days
          </div>
        </div>

        <div>
          <div className="text-sm opacity-75">Current Version</div>
          <div className="text-lg font-semibold">{rotationStatus.currentVersion}</div>
        </div>
      </div>

      {status !== 'ok' && (
        <div className="flex space-x-2">
          <button
            onClick={handleRotate}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-white bg-opacity-50 border border-current rounded-md hover:bg-opacity-75 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            <span>Rotate Now</span>
          </button>
        </div>
      )}

      {showHistory && rotationStatus.rotationHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-25">
          <h4 className="font-medium mb-2">Rotation History</h4>
          <div className="space-y-2 text-sm">
            {rotationStatus.rotationHistory.map((entry, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="font-medium">{entry.version}</div>
                <div className="flex-1">
                  <div>Rotated {new Date(entry.rotatedAt).toLocaleDateString()}</div>
                  <div className="text-xs opacity-75">by {entry.rotatedBy}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialRotationStatus;
