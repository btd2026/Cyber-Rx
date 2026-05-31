/**
 * AlertNotificationCenter Demo Component
 *
 * Demonstrates how to integrate and use the Alert Notification Center.
 * This is a reference implementation showing proper usage patterns.
 */

import React, { useState, useEffect } from 'react';
import AlertNotificationCenter from './AlertNotificationCenter';

const AlertNotificationCenterDemo = () => {
  // Simulate authentication state
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    token: null,
    orgId: null,
    user: null
  });

  // Mock login function
  const login = () => {
    const mockToken = 'mock-jwt-token-' + Date.now();
    const mockOrgId = 'demo-org-123';

    setAuthState({
      isAuthenticated: true,
      token: mockToken,
      orgId: mockOrgId,
      user: {
        email: 'admin@example.com',
        name: 'Demo Admin',
        role: 'admin'
      }
    });

    // Store in localStorage for persistence
    localStorage.setItem('authToken', mockToken);
    localStorage.setItem('orgId', mockOrgId);
  };

  // Mock logout function
  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      token: null,
      orgId: null,
      user: null
    });

    localStorage.removeItem('authToken');
    localStorage.removeItem('orgId');
  };

  // Check for existing auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedOrgId = localStorage.getItem('orgId');

    if (savedToken && savedOrgId) {
      setAuthState({
        isAuthenticated: true,
        token: savedToken,
        orgId: savedOrgId,
        user: {
          email: 'admin@example.com',
          name: 'Demo Admin',
          role: 'admin'
        }
      });
    }
  }, []);

  // API configuration
  const api_url = import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

  // Show login screen if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#F3F4F6',
        padding: 20
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 40,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: 400,
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 8
          }}>
            CyberRx Alert Center
          </div>
          <div style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 24
          }}>
            Sign in to view and manage your alerts
          </div>

          <button
            onClick={login}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#1D4ED8';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#2563EB';
            }}
          >
            Sign In with Demo Account
          </button>

          <div style={{
            marginTop: 16,
            fontSize: 11,
            color: '#9CA3AF'
          }}>
            Demo mode - No authentication required
          </div>
        </div>
      </div>
    );
  }

  // Show alert center when authenticated
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#111827',
            margin: 0
          }}>
            CyberRx Platform
          </h1>
          <p style={{
            fontSize: 12,
            color: '#6B7280',
            margin: '4px 0 0 0'
          }}>
            Alert Notification Center Demo
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#374151'
            }}>
              {authState.user?.name}
            </div>
            <div style={{
              fontSize: 10,
              color: '#6B7280'
            }}>
              {authState.user?.email}
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #D1D5DB',
              color: '#6B7280',
              borderRadius: 6,
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '24px' }}>
        <AlertNotificationCenter
          api_url={api_url}
          authToken={authState.token}
          orgId={authState.orgId}
        />
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        padding: '16px 24px',
        marginTop: 40,
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: 11,
          color: '#6B7280'
        }}>
          CyberRx Alert Notification Center Demo • Built with React + Tailwind CSS
        </div>
      </footer>
    </div>
  );
};

export default AlertNotificationCenterDemo;

/**
 * USAGE INSTRUCTIONS:
 *
 * 1. In your App.jsx or routing configuration:
 *
 *    import AlertNotificationCenterDemo from './components/AlertNotificationCenter.demo';
 *
 *    <Route path="/alerts/demo" element={<AlertNotificationCenterDemo />} />
 *
 * 2. For production use, integrate the AlertNotificationCenter component directly:
 *
 *    import { AlertNotificationCenter } from './components/alerts';
 *
 *    function AlertsPage() {
 *      const { token, orgId } = useAuth();
 *      const api_url = import.meta.env.VITE_API_URL;
 *
 *      return (
 *        <AlertNotificationCenter
 *          api_url={api_url}
 *          authToken={token}
 *          orgId={orgId}
 *        />
 *      );
 *    }
 *
 * 3. Ensure backend API endpoints are implemented:
 *    - GET /api/alerts
 *    - POST /api/alerts/acknowledge
 *    - GET /api/alerts/:id
 *    - GET /api/alerts/statistics
 *    - GET /api/alerts/trend
 *    - GET /api/alerts/types
 *
 * 4. Configure CORS to allow requests from your frontend domain
 *
 * 5. Set up proper JWT authentication and organization-based access control
 */
