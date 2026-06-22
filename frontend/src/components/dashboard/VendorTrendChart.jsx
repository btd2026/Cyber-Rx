/**
 * VendorTrendChart Component
 *
 * Displays interactive trend charts showing vendor risk score changes over time.
 * Supports multiple vendors for comparison, event annotations, and export functionality.
 *
 * @param {Array} props.vendors - Array of vendor objects
 * @param {string} props.timeRange - Time range filter ('3M', '6M', '12M', 'all')
 * @param {boolean} props.showAnnotations - Show event annotations on chart
 * @param {function} props.onExport - Callback for chart export
 * @param {string} props.api_url - API base URL
 * @param {string} props.authToken - Authentication token
 * @param {string} props.orgId - Organization ID
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  Annotation
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import jsPDF from 'jspdf';
import 'chartjs-plugin-annotation';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels,
  Annotation
);

// BCBS healthcare color palette
const CHART_COLORS = {
  primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#14B8A6'],
  critical: '#DC2626',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
  grid: '#E5E7EB',
  text: '#6B7280'
};

const VendorTrendChart = ({
  vendors = [],
  timeRange = '12M',
  showAnnotations = true,
  onExport,
  api_url,
  authToken,
  orgId
}) => {
  // Chart state
  const [chartType, setChartType] = useState('line');
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [currentTimeRange, setCurrentTimeRange] = useState(timeRange);
  const [zoomLevel, setZoomLevel] = useState('all');

  // Data state
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Chart ref for export
  const chartRef = useRef(null);

  // Initialize selected vendors
  useEffect(() => {
    if (vendors.length > 0 && selectedVendors.length === 0) {
      setSelectedVendors(vendors.slice(0, 3));
    }
  }, [vendors]);

  // Fetch trend data
  useEffect(() => {
    if (!orgId || selectedVendors.length === 0) return;

    const fetchTrendData = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = api_url || import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';

        const queryParams = new URLSearchParams({
          orgId,
          vendorIds: selectedVendors.map(v => v.id).join(','),
          range: currentTimeRange
        });

        const response = await fetch(
          `${baseUrl}/api/vendors/trends?${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch trend data: ${response.statusText}`);
        }

        const data = await response.json();
        setTrendData(data.success ? data.data : data);

      } catch (err) {
        console.error('Failed to load trend data:', err);
        setError(err.message);

        // Generate mock data for development
        generateMockTrendData();
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [selectedVendors, currentTimeRange, orgId, api_url, authToken]);

  // Generate mock trend data for development
  const generateMockTrendData = () => {
    const months = [];
    const now = new Date();
    const monthCount = currentTimeRange === '3M' ? 3 : currentTimeRange === '6M' ? 6 : 12;

    for (let i = monthCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }));
    }

    const scores = {};
    const events = [];

    selectedVendors.forEach((vendor, vendorIndex) => {
      const baseScore = 50 + (vendorIndex * 10);
      scores[vendor.id] = months.map((_, i) => {
        const variation = Math.sin(i * 0.5) * 10 + Math.random() * 10;
        return Math.round(Math.max(0, Math.min(100, baseScore + variation)));
      });

      // Add mock events
      if (Math.random() > 0.5) {
        const eventMonth = Math.floor(Math.random() * months.length);
        events.push({
          date: months[eventMonth],
          vendorId: vendor.id,
          type: 'grade_degradation',
          severity: Math.random() > 0.5 ? 'Critical' : 'Medium',
          description: `Grade changed for ${vendor.name}`
        });
      }
    });

    setTrendData({
      dates: months,
      scores,
      events
    });
  };

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (!trendData || !trendData.dates) {
      return { labels: [], datasets: [] };
    }

    const labels = trendData.dates;
    const datasets = selectedVendors.map((vendor, index) => {
      const vendorData = trendData.scores?.[vendor.id] || [];
      const color = CHART_COLORS.primary[index % CHART_COLORS.primary.length];

      return {
        label: vendor.name,
        data: vendorData,
        borderColor: color,
        backgroundColor: chartType === 'area' ? `${color}20` : 'transparent',
        borderWidth: 2,
        tension: 0.4,
        fill: chartType === 'area',
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        yAxisID: 'y'
      };
    });

    return { labels, datasets };
  }, [trendData, selectedVendors, chartType]);

  // Prepare annotation data
  const annotations = React.useMemo(() => {
    if (!showAnnotations || !trendData?.events) {
      return {};
    }

    const annotationMap = {};
    trendData.events.forEach((event, index) => {
      const dateKey = event.date;
      const color = event.severity === 'Critical' ? CHART_COLORS.critical : CHART_COLORS.medium;

      annotationMap[`event-${index}`] = {
        type: 'line',
        xMin: dateKey,
        xMax: dateKey,
        borderColor: color,
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: event.description,
          position: 'start',
          backgroundColor: color,
          color: '#FFFFFF',
          font: {
            size: 11,
            weight: 'bold'
          },
          padding: 6,
          borderRadius: 4
        }
      };
    });

    return annotationMap;
  }, [showAnnotations, trendData]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500'
          },
          color: CHART_COLORS.text
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            return `Date: ${context[0].label}`;
          },
          label: (context) => {
            const vendor = selectedVendors[context.datasetIndex];
            const score = context.parsed.y;
            const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
            return [
              `${vendor.name}`,
              `Risk Score: ${score}/100`,
              `Grade: ${grade}`
            ];
          }
        }
      },
      annotation: {
        annotations
      },
      datalabels: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: CHART_COLORS.text,
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: CHART_COLORS.grid,
          drawBorder: false
        },
        ticks: {
          color: CHART_COLORS.text,
          font: {
            size: 11
          },
          stepSize: 20,
          callback: (value) => `${value}/100`
        },
        title: {
          display: true,
          text: 'Risk Score',
          color: CHART_COLORS.text,
          font: {
            size: 12,
            weight: '600'
          }
        }
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    }
  };

  // Export to PNG
  const exportToPNG = () => {
    if (!chartRef.current) return;

    const canvas = chartRef.current.canvas;
    const image = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `vendor-trends-${new Date().toISOString().split('T')[0]}.png`;
    link.href = image;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onExport?.('png');
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!chartRef.current) return;

    const canvas = chartRef.current.canvas;
    const image = canvas.toDataURL('image/png');

    const pdf = new jsPDF();
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.setFontSize(16);
    pdf.text('Vendor Risk Trend Analysis', 10, 20);

    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 28);
    pdf.text(`Time Range: ${currentTimeRange}`, 10, 33);
    pdf.text(`Vendors: ${selectedVendors.map(v => v.name).join(', ')}`, 10, 38);

    pdf.addImage(image, 'PNG', 10, 45, imgWidth, imgHeight);
    pdf.save(`vendor-trends-${new Date().toISOString().split('T')[0]}.pdf`);

    onExport?.('pdf');
  };

  // Handle vendor selection
  const toggleVendor = (vendor) => {
    if (selectedVendors.some(v => v.id === vendor.id)) {
      if (selectedVendors.length > 1) {
        setSelectedVendors(selectedVendors.filter(v => v.id !== vendor.id));
      }
    } else {
      if (selectedVendors.length < 5) {
        setSelectedVendors([...selectedVendors, vendor]);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #E5E7EB',
        padding: 24,
        minHeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid #E5E7EB',
          borderTopColor: '#3B82F6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Loading trend data...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        border: '1px solid #FECACA',
        padding: 24,
        minHeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#DC2626',
            marginBottom: 8
          }}>
            Error Loading Trend Data
          </div>
          <div style={{ fontSize: 13, color: '#991B1B', marginBottom: 16 }}>
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      border: '1px solid #E5E7EB',
      padding: 16,
      gridColumn: '1 / -1'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
          Risk Trend Analysis
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Time Range Selector */}
          <select
            value={currentTimeRange}
            onChange={(e) => setCurrentTimeRange(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              fontSize: 12,
              backgroundColor: '#FFFFFF',
              color: '#374151'
            }}
          >
            <option value="3M">Last 3 Months</option>
            <option value="6M">Last 6 Months</option>
            <option value="12M">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>

          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              fontSize: 12,
              backgroundColor: '#FFFFFF',
              color: '#374151'
            }}
          >
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
          </select>

          {/* Export Buttons */}
          <button
            onClick={exportToPNG}
            disabled={!trendData}
            style={{
              padding: '6px 12px',
              backgroundColor: !trendData ? '#F3F4F6' : '#FFFFFF',
              color: !trendData ? '#9CA3AF' : '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              cursor: !trendData ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 500
            }}
          >
            PNG
          </button>
          <button
            onClick={exportToPDF}
            disabled={!trendData}
            style={{
              padding: '6px 12px',
              backgroundColor: !trendData ? '#F3F4F6' : '#FFFFFF',
              color: !trendData ? '#9CA3AF' : '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              cursor: !trendData ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 500
            }}
          >
            PDF
          </button>
        </div>
      </div>

      {/* Vendor Selector */}
      {vendors.length > 0 && (
        <div style={{
          padding: '12px',
          backgroundColor: '#F9FAFB',
          borderRadius: 6,
          marginBottom: 16,
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Compare Vendors (up to 5)
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {vendors.map(vendor => {
              const isSelected = selectedVendors.some(v => v.id === vendor.id);
              const isDisabled = !isSelected && selectedVendors.length >= 5;

              return (
                <label
                  key={vendor.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: isDisabled ? '#9CA3AF' : '#374151',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.6 : 1
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleVendor(vendor)}
                    disabled={isDisabled}
                    style={{
                      cursor: isDisabled ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <span>{vendor.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ height: 400, position: 'relative' }}>
        {!trendData || selectedVendors.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6B7280',
            fontSize: 13
          }}>
            Select vendors to view trend data
          </div>
        ) : (
          <>
            {chartType === 'line' || chartType === 'area' ? (
              <Line
                ref={chartRef}
                data={chartData}
                options={chartOptions}
              />
            ) : (
              <Bar
                ref={chartRef}
                data={chartData}
                options={chartOptions}
              />
            )}
          </>
        )}
      </div>

      {/* Legend Summary */}
      {trendData && selectedVendors.length > 0 && (
        <div style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#F9FAFB',
          borderRadius: 6,
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Summary
          </div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            Displaying risk trends for {selectedVendors.length} vendor(s) over {currentTimeRange}.
            {showAnnotations && trendData.events?.length > 0 && (
              <> {trendData.events.length} significant event(s) marked on chart.</>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorTrendChart;
