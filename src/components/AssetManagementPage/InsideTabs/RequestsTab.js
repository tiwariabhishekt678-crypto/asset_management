import React, { useMemo, useState } from 'react';
import {
  Table,
  Tag,
  Card,
  Row,
  Col,
  Empty,
  Input,
  Button,
  Badge,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

const RequestsTab = ({
  filteredData,
  handleTableChange,
  loading,
  openModal,
  getColumnFilters,
  visibleColumns,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Build requests from asset history
  const requests = useMemo(() => {
    const allRequests = [];

    filteredData.forEach((asset) => {
      if (asset.assetHistory && asset.assetHistory.length > 0) {
        asset.assetHistory.forEach((history, index) => {
          allRequests.push({
            key: `${asset.assetId}-${index}`,
            requestId: `REQ-${String(allRequests.length + 1).padStart(
              4,
              '0'
            )}`,
            assetId: asset.assetId,
            assetCode: asset.assetCode,
            assetName: asset.name,
            brand: asset.brand,
            action: history.action,
            requestedBy: history.by || 'System',
            assignedTo: history.to || 'N/A',
            date: history.date || 'N/A',
            location: history.location || 'N/A',
            status: getRequestStatus(history.action),
            currentAssetStatus: asset.assetStatus,
          });
        });
      }
    });

    return allRequests.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }, [filteredData]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let data = requests;

    if (activeFilter !== 'all') {
      data = data.filter((r) => r.status === activeFilter);
    }

    if (localSearch.trim()) {
      data = data.filter((record) =>
        Object.values(record).some((value) =>
          value
            ?.toString()
            .toLowerCase()
            .includes(localSearch.toLowerCase())
        )
      );
    }

    return data;
  }, [requests, activeFilter, localSearch]);

  // Stats
  const stats = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter(
      (r) => r.status === 'completed'
    ).length;
    const pending = requests.filter(
      (r) => r.status === 'pending'
    ).length;
    const rejected = requests.filter(
      (r) => r.status === 'rejected'
    ).length;

    return { total, completed, pending, rejected };
  }, [requests]);

  // Columns
  const requestColumns = useMemo(
    () => [
      {
        title: 'Request ID',
        dataIndex: 'requestId',
        key: 'requestId',
        sorter: (a, b) => a.requestId.localeCompare(b.requestId),
        width: 130,
      },
      {
        title: (
          <span>
            Asset ID
            <img
              src="/icons/sort.svg"
              alt="Sort"
              style={{
                width: 12,
                marginLeft: 6,
                position: 'absolute',
                right: '-20px',
                top: '2px',
              }}
            />
          </span>
        ),
        dataIndex: 'assetId',
        key: 'assetId',
        sorter: (a, b) =>
          String(a.assetId).localeCompare(String(b.assetId)),
        render: (text, record) => (
          <span>
            <span title={text}>
              {text && String(text).length > 8
                ? `${String(text).substring(0, 8)}...`
                : text}
            </span>
            <InfoCircleOutlined
              style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }}
              onClick={() => {
                const asset = filteredData.find(
                  (a) => a.assetId === record.assetId
                );
                if (asset) openModal('info', asset);
              }}
            />
          </span>
        ),
      },
      {
        title: 'Asset Code',
        dataIndex: 'assetCode',
        key: 'assetCode',
        sorter: (a, b) =>
          (a.assetCode || '').localeCompare(b.assetCode || ''),
      },
      {
        title: (
          <span>
            Asset Name
            <img
              src="/icons/sort.svg"
              alt="Sort"
              style={{
                width: 12,
                marginLeft: 6,
                position: 'absolute',
                right: '-20px',
                top: '2px',
              }}
            />
          </span>
        ),
        dataIndex: 'assetName',
        key: 'assetName',
        sorter: (a, b) =>
          (a.assetName || '').localeCompare(b.assetName || ''),
      },
      {
        title: 'Brand',
        dataIndex: 'brand',
        key: 'brand',
        sorter: (a, b) => (a.brand || '').localeCompare(b.brand || ''),
      },
      {
        title: (
          <span>
            Action
            <img
              src="/icons/sort.svg"
              alt="Sort"
              style={{
                width: 12,
                marginLeft: 6,
                position: 'absolute',
                right: '-20px',
                top: '2px',
              }}
            />
          </span>
        ),
        dataIndex: 'action',
        key: 'action',
        filters: [
          { text: 'Created', value: 'Created' },
          { text: 'Assigned', value: 'Assigned' },
          { text: 'Unassigned', value: 'Unassigned' },
          { text: 'Added', value: 'Added' },
        ],
        filterIcon: () => (
          <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />
        ),
        onFilter: (value, record) => record.action === value,
        render: (text) => {
          const colorMap = {
            Created: 'blue',
            Assigned: 'green',
            Unassigned: 'orange',
            Added: 'purple',
            'Applied for Fix': 'red',
          };
          return <Tag color={colorMap[text] || 'default'}>{text}</Tag>;
        },
      },
      {
        title: 'Requested By',
        dataIndex: 'requestedBy',
        key: 'requestedBy',
        sorter: (a, b) =>
          (a.requestedBy || '').localeCompare(b.requestedBy || ''),
      },
      {
        title: 'Assigned To',
        dataIndex: 'assignedTo',
        key: 'assignedTo',
        sorter: (a, b) =>
          (a.assignedTo || '').localeCompare(b.assignedTo || ''),
      },
      {
        title: (
          <span>
            Date
            <img
              src="/icons/sort.svg"
              alt="Sort"
              style={{
                width: 12,
                marginLeft: 6,
                position: 'absolute',
                right: '-20px',
                top: '2px',
              }}
            />
          </span>
        ),
        dataIndex: 'date',
        key: 'date',
        sorter: (a, b) => new Date(a.date) - new Date(b.date),
      },
      {
        title: 'Location',
        dataIndex: 'location',
        key: 'location',
        sorter: (a, b) =>
          (a.location || '').localeCompare(b.location || ''),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        filters: [
          { text: 'Completed', value: 'completed' },
          { text: 'Pending', value: 'pending' },
          { text: 'Rejected', value: 'rejected' },
        ],
        filterIcon: () => (
          <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />
        ),
        onFilter: (value, record) => record.status === value,
        render: (status) => {
          const config = {
            completed: {
              color: 'green',
              icon: <CheckCircleOutlined />,
              text: 'Completed',
            },
            pending: {
              color: 'orange',
              icon: <ClockCircleOutlined />,
              text: 'Pending',
            },
            rejected: {
              color: 'red',
              icon: <CloseCircleOutlined />,
              text: 'Rejected',
            },
          };
          const { color, icon, text } = config[status] || config.pending;
          return (
            <Tag color={color} icon={icon}>
              {text}
            </Tag>
          );
        },
      },
      {
        title: 'Current Asset Status',
        dataIndex: 'currentAssetStatus',
        key: 'currentAssetStatus',
        render: (status) => {
          const colorMap = {
            available: 'green',
            assigned: 'blue',
            maintenance: 'orange',
            retired: 'red',
          };
          return (
            <Tag color={colorMap[status] || 'default'}>
              {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
            </Tag>
          );
        },
      },
    ],
    [filteredData, openModal]
  );

  return (
    <div className="requests-tab">
      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6} md={6}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #1890ff',
              borderRadius: 8,
              cursor: 'pointer',
              background: activeFilter === 'all' ? '#e6f7ff' : '#fff',
            }}
            onClick={() => setActiveFilter('all')}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <FileTextOutlined
                style={{ fontSize: 24, color: '#1890ff' }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8c8c8c',
                    fontWeight: 500,
                  }}
                >
                  Total Requests
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.total}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #52c41a',
              borderRadius: 8,
              cursor: 'pointer',
              background:
                activeFilter === 'completed' ? '#f6ffed' : '#fff',
            }}
            onClick={() => setActiveFilter('completed')}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <CheckCircleOutlined
                style={{ fontSize: 24, color: '#52c41a' }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8c8c8c',
                    fontWeight: 500,
                  }}
                >
                  Completed
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.completed}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #faad14',
              borderRadius: 8,
              cursor: 'pointer',
              background:
                activeFilter === 'pending' ? '#fffbe6' : '#fff',
            }}
            onClick={() => setActiveFilter('pending')}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <ClockCircleOutlined
                style={{ fontSize: 24, color: '#faad14' }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8c8c8c',
                    fontWeight: 500,
                  }}
                >
                  Pending
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.pending}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #ff4d4f',
              borderRadius: 8,
              cursor: 'pointer',
              background:
                activeFilter === 'rejected' ? '#fff2f0' : '#fff',
            }}
            onClick={() => setActiveFilter('rejected')}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <CloseCircleOutlined
                style={{ fontSize: 24, color: '#ff4d4f' }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8c8c8c',
                    fontWeight: 500,
                  }}
                >
                  Rejected
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.rejected}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Search & Filter Bar */}
      <Row
        style={{ marginBottom: 16 }}
        gutter={[16, 16]}
        align="middle"
      >
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="Search requests..."
            allowClear
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ borderRadius: 8 }}
            size="large"
          />
        </Col>
        <Col xs={24} sm={12} md={16}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', 'completed', 'pending', 'rejected'].map(
              (filter) => (
                <Button
                  key={filter}
                  type={activeFilter === filter ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setActiveFilter(filter)}
                  style={{ borderRadius: 16 }}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  {filter !== 'all' && (
                    <Badge
                      count={stats[filter] || 0}
                      style={{
                        marginLeft: 6,
                        backgroundColor:
                          activeFilter === filter
                            ? '#fff'
                            : '#1890ff',
                        color:
                          activeFilter === filter
                            ? '#1890ff'
                            : '#fff',
                        fontSize: 10,
                      }}
                      size="small"
                    />
                  )}
                </Button>
              )
            )}
          </div>
        </Col>
      </Row>

      {/* Table */}
      <Table
        columns={requestColumns}
        dataSource={filteredRequests}
        onChange={handleTableChange}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} requests`,
        }}
        rowKey="key"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No requests found"
            />
          ),
        }}
      />
    </div>
  );
};

// Helper function
function getRequestStatus(action) {
  const completedActions = [
    'Created',
    'Assigned',
    'Unassigned',
    'Added',
  ];
  const pendingActions = ['Applied for Fix', 'Pending Review'];
  const rejectedActions = ['Rejected', 'Declined'];

  if (completedActions.includes(action)) return 'completed';
  if (pendingActions.includes(action)) return 'pending';
  if (rejectedActions.includes(action)) return 'rejected';
  return 'pending';
}

export default RequestsTab;