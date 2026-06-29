import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, Tag, Button, Modal, Form, Input, Select, Typography, Row, Col, Spin, Alert, message, Divider, Tabs, Card 
} from 'antd';
import { REACT_BASE_URL } from '../config';
import Swal from 'sweetalert2';
import { 
  FileTextOutlined, 
  HourglassOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ContainerOutlined,
  DownloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TicketsManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeTabKey, setActiveTabKey] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [form] = Form.useForm();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/tickets/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    
    // 1. Search Filter
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.subject?.toLowerCase().includes(lowSearch) ||
        t.asset_code?.toLowerCase().includes(lowSearch) ||
        t.employee_name?.toLowerCase().includes(lowSearch) ||
        t.id?.toLowerCase().includes(lowSearch)
      );
    }

    // 2. Tab Filter
    if (activeTabKey === 'all') return result;
    if (activeTabKey === 'open') return result.filter(t => t.status === 'open' || t.status === 'in_progress');
    if (activeTabKey === 'resolved') return result.filter(t => t.status === 'resolved' || t.status === 'closed');
    return result;
  }, [tickets, activeTabKey, searchTerm]);

  const handleUpdate = async (values) => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to update ticket');
      }
      
      message.success('Ticket updated successfully');
      setIsModalVisible(false);
      fetchTickets();
    } catch (err) {
      if (err.message.includes('approval')) {
        Swal.fire('Request Sent', err.message, 'info');
      } else {
        message.error(err.message);
      }
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    try {
      const response = await fetch(`${REACT_BASE_URL}/reports/tickets/excel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tickets_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to generate report');
      }
    } catch (err) {
      if (err.message.includes('approval')) {
        Swal.fire('Request Sent', err.message, 'info');
      } else {
        message.error('Error exporting tickets');
      }
    }
  };

  // Memoized column filters generator
  const getColumnFilters = useCallback((dataIndex) => {
    const uniqueValues = [...new Set(tickets.map((item) => item[dataIndex]).filter(Boolean))];
    return uniqueValues.map((value) => ({ text: value, value }));
  }, [tickets]);

  const columns = [
    {
      title: (
        <span>
          Ticket ID
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id.localeCompare(b.id),
      render: (id) => <Text copyable>{id.slice(0, 8)}...</Text>
    },
    {
      title: (
        <span>
          Asset
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'asset_code',
      key: 'asset_code',
      filters: getColumnFilters('asset_code'),
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.asset_code === value,
      sorter: (a, b) => a.asset_code.localeCompare(b.asset_code),
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.asset_name}</Text>
        </div>
      )
    },
    {
      title: (
        <span>
          Raised By
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'employee_name',
      key: 'employee_name',
      filters: getColumnFilters('employee_name'),
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.employee_name === value,
      sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
    },
    {
      title: (
        <span>
          Subject
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'subject',
      key: 'subject',
      sorter: (a, b) => a.subject.localeCompare(b.subject),
    },
    {
      title: (
        <span>
          Status
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'OPEN', value: 'open' },
        { text: 'IN PROGRESS', value: 'in_progress' },
        { text: 'RESOLVED', value: 'resolved' },
        { text: 'CLOSED', value: 'closed' },
      ],
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        let color = 'default';
        if (status === 'open') color = 'red';
        if (status === 'in_progress') color = 'blue';
        if (status === 'resolved') color = 'green';
        if (status === 'closed') color = 'gray';
        return <Tag color={color}>{status?.toUpperCase()}</Tag>
      }
    },
    {
      title: (
        <span>
          Priority
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'priority',
      key: 'priority',
      filters: [
        { text: 'LOW', value: 'low' },
        { text: 'MEDIUM', value: 'medium' },
        { text: 'HIGH', value: 'high' },
        { text: 'CRITICAL', value: 'critical' },
      ],
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.priority === value,
      render: (priority) => {
        let color = 'default';
        if (priority === 'critical') color = 'volcano';
        if (priority === 'high') color = 'orange';
        if (priority === 'medium') color = 'blue';
        return <Tag color={color}>{priority?.toUpperCase()}</Tag>
      }
    },
    {
      title: (
        <span>
          Created At
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Button 
          type="primary" 
          ghost 
          onClick={() => {
            setSelectedTicket(record);
            form.setFieldsValue({
              status: record.status,
              priority: record.priority,
              resolution_notes: record.resolution_notes
            });
            setIsModalVisible(true);
          }}
        >
          Manage
        </Button>
      )
    }
  ];

  const renderTicketTable = () => (
    <div className="asset-table-container">
      <Table 
        columns={columns} 
        dataSource={filteredTickets} 
        rowKey="id" 
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{ 
          pageSize: 15,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tickets`
        }}
        style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
      />
    </div>
  );

  return (
    <div className="tickets-management-container" style={{ padding: '16px 24px' }}>
      <div className="top-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 className="header-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          Ticket Management
        </h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by ID, Asset, Employee..."
            size="large"
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={
              <img
                src="/icons/search.svg"
                alt="Search"
                style={{ width: 16, height: 16, marginRight: 4 }}
              />
            }
            className="custom-search-input"
            style={{ width: 280, maxWidth: '100%' }}
          />
          <Button
            icon={<DownloadOutlined />}
            className="btn-edit-columns"
            onClick={handleExport}
          >
            Export Excel
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderLeft: '4px solid #1890ff', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ContainerOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Total Tickets</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderLeft: '4px solid #ff4d4f', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileTextOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Open</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.open}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderLeft: '4px solid #faad14', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HourglassOutlined style={{ fontSize: 24, color: '#faad14' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>In Progress</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.inProgress}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Resolved</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.resolved}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderLeft: '4px solid #8c8c8c', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CloseCircleOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Closed</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.closed}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 20 }} />}
      
      <Tabs 
        activeKey={activeTabKey} 
        className="asset-tabs"
        onChange={setActiveTabKey}
      >
        <Tabs.TabPane 
          tab={
            <span>
              <img src="/icons/home.svg" alt="All" style={{ width: 16, marginRight: 8 }} />
              All Tickets
            </span>
          } 
          key="all"
        >
          {renderTicketTable()}
        </Tabs.TabPane>
        <Tabs.TabPane 
          tab={
            <span>
              <img src="/icons/assign.svg" alt="Open" style={{ width: 16, marginRight: 8 }} />
              Open / In Progress
            </span>
          } 
          key="open"
        >
          {renderTicketTable()}
        </Tabs.TabPane>
        <Tabs.TabPane 
          tab={
            <span>
              <img src="/icons/return.svg" alt="Resolved" style={{ width: 16, marginRight: 8 }} />
              Resolved / Closed
            </span>
          } 
          key="resolved"
        >
          {renderTicketTable()}
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title={`Manage Ticket: ${selectedTicket?.subject}`}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item label="Ticket Status" name="status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="open">Open</Select.Option>
              <Select.Option value="in_progress">In Progress</Select.Option>
              <Select.Option value="resolved">Resolved</Select.Option>
              <Select.Option value="closed">Closed</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Priority" name="priority" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Resolution Notes" name="resolution_notes">
            <TextArea rows={4} placeholder="Describe steps taken to resolve the issue..." />
          </Form.Item>
          
          <Form.Item>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Update Ticket</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TicketsManagement;
