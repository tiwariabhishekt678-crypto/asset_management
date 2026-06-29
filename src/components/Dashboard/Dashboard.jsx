import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import { REACT_BASE_URL } from "../config";
import { Spin, Card, Row, Col, Statistic, Progress, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
            try {
                const response = await fetch(`${REACT_BASE_URL}/dashboard/stats`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!stats) return <div className="dashboard-container">Failed to load statistics.</div>;

    const { assets, tickets, employees, stock } = stats;

    const getPercentage = (value, total) => {
        if (!total) return 0;
        return Math.round((value / total) * 100);
    };

    const handleExportSummary = async () => {
        const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
        try {
            const response = await fetch(`${REACT_BASE_URL}/reports/dashboard/pdf`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dashboard_summary.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (err) {
            console.error('Export error:', err);
        }
    };

    return (
        <div className="dashboard-management-container">
            <div className="top-header-row">
                <h2 className="header-title">Dashboard Overview</h2>
                <Button 
                    icon={<DownloadOutlined />} 
                    type="primary" 
                    onClick={handleExportSummary}
                >
                    Export Summary
                </Button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Total Assets</span>
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                            <img src="/Asset_Management_icon.svg" alt="Assets" style={{ width: 24, padding: 4 }} />
                        </div>
                    </div>
                    <div className="stat-value">{assets.total}</div>
                    <div className="stat-footer">Across all categories</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Total Employees</span>
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <img src="/Employees_icon.svg" alt="Employees" style={{ width: 24, padding: 4 }} />
                        </div>
                    </div>
                    <div className="stat-value">{employees.total}</div>
                    <div className="stat-footer">Active employees registered</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Total Tickets</span>
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                            <img src="/icons/ticket.svg" alt="Tickets" style={{ width: 24, padding: 4 }} />
                        </div>
                    </div>
                    <div className="stat-value">{tickets.total}</div>
                    <div className="stat-footer">System wide support requests</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Stock Items</span>
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                            <img src="/icons/stock.svg" alt="Stock" style={{ width: 24, padding: 4 }} />
                        </div>
                    </div>
                    <div className="stat-value">{stock?.total_items || 0}</div>
                    <div className="stat-footer">Items in inventory</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Stock Value</span>
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
                            <img src="/icons/stock.svg" alt="Value" style={{ width: 24, padding: 4 }} />
                        </div>
                    </div>
                    <div className="stat-value">₹{parseFloat(stock?.total_value || 0).toLocaleString()}</div>
                    <div className="stat-footer">Total inventory valuation</div>
                </div>
            </div>

            <div className="dashboard-sections">
                <div className="dashboard-section">
                    <h3 className="section-title">Asset Status Breakdown</h3>
                    <div className="status-breakdown">
                        <StatusItem 
                            label="Assigned" 
                            count={assets.assigned} 
                            total={assets.total} 
                            color="#2563eb"
                        />
                        <StatusItem 
                            label="Available" 
                            count={assets.available} 
                            total={assets.total} 
                            color="#10b981"
                        />
                        <StatusItem 
                            label="Maintenance" 
                            count={assets.maintenance} 
                            total={assets.total} 
                            color="#f59e0b"
                        />
                         <StatusItem 
                            label="Decommissioned" 
                            count={assets.decommissioned} 
                            total={assets.total} 
                            color="#ef4444"
                        />
                    </div>
                </div>

                <div className="dashboard-section">
                    <h3 className="section-title">Ticket Status</h3>
                    <div className="status-breakdown">
                        <StatusItem 
                            label="Open" 
                            count={tickets.open} 
                            total={tickets.total} 
                            color="#ef4444"
                        />
                        <StatusItem 
                            label="In Progress" 
                            count={tickets.in_progress} 
                            total={tickets.total} 
                            color="#3b82f6"
                        />
                        <StatusItem 
                            label="Resolved" 
                            count={tickets.resolved} 
                            total={tickets.total} 
                            color="#10b981"
                        />
                         <StatusItem 
                            label="Closed" 
                            count={tickets.closed} 
                            total={tickets.total} 
                            color="#6b7280"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatusItem = ({ label, count, total, color }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="status-item-container">
            <div className="status-item">
                <div className="status-info">
                   <div className="status-dot" style={{ backgroundColor: color }}></div>
                   <span className="status-label">{label}</span>
                </div>
                <span className="status-count">{count}</span>
            </div>
            <div className="progress-bar-bg">
                <div 
                    className="progress-bar-fill" 
                    style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: color 
                    }}
                ></div>
            </div>
        </div>
    );
};

export default Dashboard;
