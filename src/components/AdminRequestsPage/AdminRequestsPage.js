import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Button,
  Tag,
  Card,
  Row,
  Col,
  Input,
  Space,
  Alert,
  Tabs,
  Modal,
  Spin,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import Swal from "sweetalert2";
import { REACT_BASE_URL } from "../config";
import "./AdminRequestsPage.css";

const { TabPane } = Tabs;

const renderPayloadDetails = (request) => {
  if (!request || !request.payload) return null;
  const { action_type, payload } = request;

  // 1. Comparison for Edit/Update actions
  if (action_type?.endsWith(".edit") || action_type?.includes('update')) {
    const oldData = payload.old_data || {};
    const newData = payload.new_data || payload.data || payload;
    
    const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
    const displayKeys = allKeys.filter(k => !["id", "company_id", "asset_type_id", "project_ids", "created_at", "updated_at"].includes(k));

    return (
      <div style={{ marginTop: 16 }}>
        <h4 style={{ marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>Field Comparison</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa' }}>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #f0f0f0' }}>Field</th>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #f0f0f0' }}>Old Value</th>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #f0f0f0' }}>Proposed Value</th>
              </tr>
            </thead>
            <tbody>
              {displayKeys.map(key => {
                const oldVal = oldData[key];
                const newVal = newData[key];
                const isExplicitlyModified = newVal !== undefined && String(oldVal) !== String(newVal);
                
                return (
                  <tr key={key} style={isExplicitlyModified ? { backgroundColor: '#fffbe6' } : {}}>
                    <td style={{ padding: '8px', border: '1px solid #f0f0f0', fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word' }}>{key.replace(/_/g, ' ').toUpperCase()}</td>
                    <td style={{ padding: '8px', border: '1px solid #f0f0f0', color: '#8c8c8c', whiteSpace: 'normal', wordBreak: 'break-word' }}>{typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? 'N/A')}</td>
                    <td style={{ padding: '8px', border: '1px solid #f0f0f0', color: isExplicitlyModified ? '#cf1322' : 'inherit', fontWeight: isExplicitlyModified ? 600 : 'normal', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? (newVal === undefined ? oldVal : 'N/A'))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. Specialized view for Bulk/Multi Assignments
  if (action_type?.includes('bulk_assign') || payload.assets_detail || payload.asset_ids) {
    const assets = payload.assets_detail || payload.asset_ids || [];
    return (
      <div style={{ marginTop: 16 }}>
        <Card size="small" title="Assignment Target" style={{ marginBottom: 16, borderLeft: '4px solid #1890ff' }}>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>EMPLOYEE</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{payload.employee_name || payload.employee_id || 'N/A'}</div>
            </Col>
            <Col span={12}>
              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>LOCATION</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{payload.location || 'N/A'}</div>
            </Col>
          </Row>
        </Card>
        
        <h4 style={{ marginBottom: 12, paddingBottom: 4, borderBottom: '1px solid #f0f0f0' }}>Assets to Assign</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#fafafa' }}>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #f0f0f0' }}>Asset Code</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #f0f0f0' }}>Asset Name</th>
            </tr>
          </thead>
          <tbody>
            {(payload.assets_detail || []).map((asset, idx) => (
              <tr key={idx}>
                <td style={{ padding: '8px', border: '1px solid #f0f0f0', fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word' }}>{asset.code}</td>
                <td style={{ padding: '8px', border: '1px solid #f0f0f0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{asset.name}</td>
              </tr>
            )) || (payload.asset_ids || []).map((id, idx) => (
              <tr key={idx}>
                <td colSpan={2} style={{ padding: '8px', border: '1px solid #f0f0f0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payload.remarks && (
          <div style={{ marginTop: 12, padding: '8px', backgroundColor: '#f9f9f9', borderRadius: 4, whiteSpace: 'normal', wordBreak: 'break-word' }}>
            <strong>Remarks:</strong> {payload.remarks}
          </div>
        )}
      </div>
    );
  }

  // 3. General list-style for Creations, Deletions, and SINGLE Assignments
  const data = payload.data || payload;
  const displayFields = Object.entries(data).filter(([key]) => 
    !["id", "company_id", "project_ids", "asset_type_id", "other_asset_type_id", "invoice_id", "user_id", "reporting_manager_id", "created_by_id", "hashed_password", "permissions", "file_indices", "invoices"].includes(key)
  );

  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>Request Details</h4>
      <Row gutter={[16, 16]}>
        {displayFields.map(([key, value]) => {
          let displayVal = value;
          let label = key.replace(/_/g, ' ').toUpperCase();
          
          // Better labels for specific fields
          if (key === 'employee_id' && payload.employee_name) { label = 'ASSIGNED TO'; displayVal = payload.employee_name; }
          if (key === 'asset_id' && payload.asset_name) { label = 'ASSET'; displayVal = `${payload.asset_name} (${payload.asset_code || ''})`; }

          return (
            <Col span={12} key={key}>
              <div style={{ fontSize: '10px', color: '#8c8c8c', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word' }}>{typeof displayVal === 'object' ? JSON.stringify(displayVal) : String(displayVal ?? 'N/A')}</div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

const AdminRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTabKey, setActiveTabKey] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${REACT_BASE_URL}/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch requests");
      const data = await response.json();
      setRequests(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // auto-refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const reviewRequest = async (requestId, status, rejectionReason = null) => {
    try {
      const response = await fetch(`${REACT_BASE_URL}/admin/requests/${requestId}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, rejection_reason: rejectionReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || `Failed to ${status} request`);
      }

      Swal.fire({
        icon: "success",
        title: `Request ${status}`,
        text: `Request has been ${status === 'approved' ? 'approved' : 'rejected'} successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });

      fetchRequests();
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  const handleReject = (requestId, reason) => {
    reviewRequest(requestId, "rejected", reason);
  };

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  const filteredData = useMemo(() => {
    let result = [...requests];

    if (activeTabKey !== "all") {
      result = result.filter((req) => req.status === activeTabKey);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((req) =>
        req.action_type.toLowerCase().includes(lowerSearch) ||
        req.description?.toLowerCase().includes(lowerSearch) ||
        req.requested_by_name?.toLowerCase().includes(lowerSearch)
      );
    }

    return result;
  }, [requests, activeTabKey, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination]);

  const getColumnFilters = useCallback((dataIndex) => {
    const uniqueValues = [...new Set(requests.map((item) => item[dataIndex]).filter(Boolean))];
    return uniqueValues.map((value) => ({ text: value, value }));
  }, [requests]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Error Loading Requests"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  const columns = [
    {
      title: (
        <span>
          Request Details
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      key: "details",
      width: 450,
      render: (_, record) => (
        <div style={{ 
          whiteSpace: 'normal', 
          wordBreak: 'break-word', 
          lineHeight: '1.5',
          maxWidth: '450px' 
        }}>
          <strong style={{ color: '#1890ff' }}>{record.requested_by_name}</strong>
          {" requested to "}
          <span style={{ fontWeight: 500, color: '#434343' }}>{record.description || record.action_type}</span>
        </div>
      ),
      sorter: (a, b) => (a.requested_by_name || '').localeCompare(b.requested_by_name || ''),
    },
    {
      title: (
        <span>
          Status
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: "status",
      key: "status",
      width: 130,
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Rejected', value: 'rejected' },
      ],
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag
          color={
            status === "approved"
              ? "green"
              : status === "rejected"
              ? "red"
              : "orange"
          }
          style={{ borderRadius: 4, textTransform: 'uppercase', fontWeight: 600, padding: '0 8px' }}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: "Reviewer/Reason",
      key: "review",
      width: 220,
      render: (_, record) => {
        if (record.status === "rejected" && record.rejection_reason) {
          return <span style={{ color: '#ff4d4f', fontSize: '12px' }}>Reason: {record.rejection_reason}</span>;
        }
        if (record.reviewed_by_name) {
          return <span style={{ color: '#8c8c8c', fontSize: '12px' }}>By: {record.reviewed_by_name}</span>;
        }
        return <span style={{ color: '#bfbfbf' }}>-</span>;
      }
    },
    {
      title: (
        <span>
          Requested At
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      render: (date) => (
        <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
          {new Date(date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedRequest(record);
              setIsDetailModalVisible(true);
            }}
            icon={<EyeOutlined />}
            className="action-btn-blue"
          >
            View
          </Button>
          {record.status === "pending" && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => reviewRequest(record.id, "approved")}
                className="action-btn-green"
              >
                Approve
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderRequestTable = () => (
    <div className="asset-table-container">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={paginatedData}
        loading={loading}
        onChange={(pag) => setPagination({ current: pag.current, pageSize: pag.pageSize })}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredData.length,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requests`,
        }}
        scroll={{ x: "max-content" }}
      />
    </div>
  );

  return (
    <div className="admin-requests-container" style={{ padding: '16px 24px' }}>
      <div className="top-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 className="header-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          Admin Requests
        </h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by action, description, or requester..."
            size="large"
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<img src="/icons/search.svg" alt="Search" style={{ width: 16, height: 16, marginRight: 4 }} />}
            className="custom-search-input"
            style={{ width: 350, maxWidth: '100%' }}
          />

          <Button
            type="default"
            icon={<img src="/icons/home.svg" alt="Refresh" style={{ width: 14, marginRight: 8 }} />}
            onClick={() => fetchRequests()}
            className="btn-edit-columns"
          >
            Refresh
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ borderLeft: "4px solid #1890ff", borderRadius: 8, cursor: 'pointer' }}
            onClick={() => setActiveTabKey('all')}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FileTextOutlined style={{ fontSize: 24, color: "#1890ff" }} />
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>Total Requests</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ borderLeft: "4px solid #faad14", borderRadius: 8, cursor: 'pointer' }}
            onClick={() => setActiveTabKey('pending')}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ClockCircleOutlined style={{ fontSize: 24, color: "#faad14" }} />
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>Pending</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.pending}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ borderLeft: "4px solid #52c41a", borderRadius: 8, cursor: 'pointer' }}
            onClick={() => setActiveTabKey('approved')}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a" }} />
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>Approved</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.approved}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ borderLeft: "4px solid #ff4d4f", borderRadius: 8, cursor: 'pointer' }}
            onClick={() => setActiveTabKey('rejected')}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CloseCircleOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>Rejected</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.rejected}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTabKey}
        className="asset-tabs"
        onChange={(key) => {
          setActiveTabKey(key);
          setPagination({ ...pagination, current: 1 });
        }}
      >
        <TabPane
          tab={<span><img src="/icons/home.svg" alt="All" style={{ width: 16, marginRight: 8 }} />Total</span>}
          key="all"
        >
          {renderRequestTable()}
        </TabPane>
        <TabPane
          tab={<span><img src="/icons/ticket.svg" alt="Pending" style={{ width: 16, marginRight: 8 }} />Pending</span>}
          key="pending"
        >
          {renderRequestTable()}
        </TabPane>
        <TabPane
          tab={<span><img src="/icons/submittick.svg" alt="Approved" style={{ width: 16, marginRight: 8 }} />Approved</span>}
          key="approved"
        >
          {renderRequestTable()}
        </TabPane>
        <TabPane
          tab={<span><img src="/icons/decommission.svg" alt="Rejected" style={{ width: 16, marginRight: 8 }} />Rejected</span>}
          key="rejected"
        >
          {renderRequestTable()}
        </TabPane>
      </Tabs>

      {/* Request Details Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>Request Details: {selectedRequest?.action_type?.toUpperCase()}</span>
          </div>
        }
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedRequest(null);
        }}
        width={700}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            Close
          </Button>,
          selectedRequest?.status === "pending" && (
            <Button 
              key="reject" 
              danger 
              icon={<CloseCircleOutlined />}
              onClick={() => {
                Swal.fire({
                  title: 'Reject Request',
                  input: 'text',
                  inputLabel: 'Reason for rejection',
                  inputPlaceholder: 'Enter reason...',
                  showCancelButton: true,
                }).then((result) => {
                  if (result.isConfirmed) {
                    handleReject(selectedRequest.id, result.value);
                    setIsDetailModalVisible(false);
                  }
                });
              }}
            >
              Reject
            </Button>
          ),
          selectedRequest?.status === "pending" && (
            <Button 
              key="approve" 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={() => {
                reviewRequest(selectedRequest.id, "approved");
                setIsDetailModalVisible(false);
              }}
            >
              Approve
            </Button>
          ),
        ]}
      >
        {selectedRequest && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>REQUESTED BY</div>
                <div style={{ fontWeight: 600 }}>{selectedRequest.requested_by_name}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>REQUESTED AT</div>
                <div style={{ fontWeight: 500 }}>{new Date(selectedRequest.created_at).toLocaleString()}</div>
              </Col>
              <Col span={24}>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>DESCRIPTION</div>
                <div style={{ fontStyle: 'italic' }}>{selectedRequest.description || "No description provided"}</div>
              </Col>
            </Row>

            {selectedRequest.rejection_reason && (
              <Row style={{ marginBottom: 16 }}>
                <Col span={24}>
                  <Alert 
                    message="Rejection Reason" 
                    description={selectedRequest.rejection_reason} 
                    type="error" 
                    showIcon 
                  />
                </Col>
              </Row>
            )}

            {renderPayloadDetails(selectedRequest)}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminRequestsPage;
