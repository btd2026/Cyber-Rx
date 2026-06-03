/**
 * DTNKShield Healthcare-Payer Demo Landing Page
 *
 * Route: /demo
 *
 * Shows demo options and quick start guide for Acme Health Plan demo.
 */

import React, { useState } from 'react';
import './DemoLanding.css';

const DemoLanding = () => {
  const [loading, setLoading] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);

  const startDemo = async () => {
    setLoading(true);

    try {
      // In production, this would call the seeding API
      // For now, simulate loading
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the demo match ID (would come from seeding response)
      // For demo purposes, we'll fetch the latest demo match
      const response = await fetch('/api/demo/latest');
      const data = await response.json();

      if (data.matchId) {
        // Redirect to demo review page
        window.location.href = `/demo/${data.matchId}`;
      } else {
        // Fallback: show seeding instructions
        alert('Demo not seeded. Please run: node scripts/seed-demo-data.js');
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to start demo:', error);
      alert('Failed to start demo. Please check API connection.');
      setLoading(false);
    }
  };

  return (
    <div className="demo-landing">
      <div className="demo-container">
        {/* Header */}
        <div className="demo-header">
          <h1 className="demo-title">DTNKShield Healthcare-Payer Vertical</h1>
          <p className="demo-subtitle">Complete risk visibility in 15 minutes</p>
        </div>

        {/* Demo Overview */}
        <div className="demo-overview">
          <div className="overview-text">
            <h2>See DTNKShield in Action</h2>
            <p>
              Watch how Acme Health Plan transformed 8 rows in a spreadsheet into
              complete risk visibility with crown jewel classification, gap analysis,
              and industry benchmarking.
            </p>
          </div>

          <div className="demo-stats">
            <div className="stat">
              <div className="stat-value">8</div>
              <div className="stat-label">Processes</div>
            </div>
            <div className="stat">
              <div className="stat-value">2</div>
              <div className="stat-label">Crown Jewels</div>
            </div>
            <div className="stat">
              <div className="stat-value">3</div>
              <div className="stat-label">Gaps Found</div>
            </div>
            <div className="stat">
              <div className="stat-value">$10M</div>
              <div className="stat-label">Daily Downtime Risk</div>
            </div>
          </div>
        </div>

        {/* Start Demo Button */}
        <div className="demo-actions">
          <button
            className="start-demo-button"
            onClick={startDemo}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Preparing Demo...
              </>
            ) : (
              <>
                <span className="play-icon">▶</span>
                Start Acme Health Plan Demo
              </>
            )}
          </button>

          <p className="demo-note">
            Interactive demo with pre-seeded Acme Health Plan data
          </p>
        </div>

        {/* Feature Steps */}
        <div className="demo-features">
          <div className="feature">
            <div className="feature-icon">📤</div>
            <h3 className="feature-title">Upload</h3>
            <p className="feature-description">
              Drag & drop your Excel file with processes and applications
            </p>
          </div>

          <div className="feature">
            <div className="feature-icon">🤖</div>
            <h3 className="feature-title">Match</h3>
            <p className="feature-description">
              AI maps your processes to healthcare payer reference model
            </p>
          </div>

          <div className="feature">
            <div className="feature-icon">✅</div>
            <h3 className="feature-title">Confirm</h3>
            <p className="feature-description">
              Review AI proposals and accept, reject, or override
            </p>
          </div>

          <div className="feature">
            <div className="feature-icon">🕸️</div>
            <h3 className="feature-title">Visualize</h3>
            <p className="feature-description">
              See your process hierarchy in interactive graph
            </p>
          </div>

          <div className="feature">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Gaps</h3>
            <p className="feature-description">
              Find missing systems with regulatory and business impact
            </p>
          </div>

          <div className="feature">
            <div className="feature-icon">💎</div>
            <h3 className="feature-title">Crown Jewels</h3>
            <p className="feature-description">
              Know your downtime costs with transparent methodology
            </p>
          </div>
        </div>

        {/* Demo Script Link */}
        <div className="demo-resources">
          <h3>Demo Resources</h3>
          <div className="resource-links">
            <a href="/fixtures/acme-health-plan/processes.csv" download>
              📄 Download Demo Data (CSV)
            </a>
            <a href="/demo-script" target="_blank" rel="noopener noreferrer">
              📖 View Demo Script (Sales)
            </a>
            <a href="/api-docs" target="_blank" rel="noopener noreferrer">
              🔧 API Documentation
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="demo-footer">
          <p className="demo-metadata">
            Demo Organization: Acme Health Plan ($2.5B revenue, 2.5M members)
          </p>
          <p className="demo-version">
            DTNKShield v1.0.0 | Healthcare-Payer Vertical
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoLanding;
