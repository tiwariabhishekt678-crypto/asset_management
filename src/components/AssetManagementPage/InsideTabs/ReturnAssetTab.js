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
  Avatar,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  EditOutlined,
  ClockCircleOutlined,
  FilePdfOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';

const ReturnAssetTab = ({
  filteredData,
  columns,
  handleTableChange,
  loading,
  handleUnassign,
  openModal,
  handleUserInfo,
  handleAssignerInfo,
  handleDeleteAsset,
  setSelectedRecord,
  setActiveView,
  getColumnFilters,
  visibleColumns,
  // ── New props for dynamic tech_spec columns ──
  dynamicColumns = {},
  techSpecKeys = [],
  getTechSpecFilters,
}) => {
  const [localSearch, setLocalSearch] = useState('');

  const handleDownloadHandover = async (record, format) => {
    try {
      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');
      const employeeId = record.assignedToId;

      if (!employeeId) {
        throw new Error('Cannot generate handover because the assigned employee ID is missing.');
      }

      const payload = {
        employee_id: employeeId,
        asset_ids: record.isOtherAsset ? [] : [record.assetId],
        other_asset_ids: record.isOtherAsset ? [record.assetId] : [],
        project_name: record.projectName || 'N/A',
        format,
      };

      const response = await fetch(`${REACT_BASE_URL}/handover/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to generate handover document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Handover_${record.assignTo || 'Employee'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating handover:', error);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('Error', error.message || 'Could not download handover', 'error');
    }
  };

  // Filter only assigned assets + local search (including tech_specs)
  const assignedAssets = useMemo(() => {
    let data = filteredData.filter(
      (item) => item.assetStatus === 'assigned'
    );

    if (localSearch.trim()) {
      const searchLower = localSearch.toLowerCase();
      data = data.filter((record) => {
        // Search static fields
        const matchesStatic = Object.entries(record).some(
          ([key, value]) => {
            if (key === 'tech_specs') return false;
            return value
              ?.toString()
              .toLowerCase()
              .includes(searchLower);
          }
        );

        // Search tech_specs values
        const matchesTechSpecs =
          record.tech_specs &&
          typeof record.tech_specs === 'object' &&
          Object.values(record.tech_specs).some((value) =>
            value
              ?.toString()
              .toLowerCase()
              .includes(searchLower)
          );

        return matchesStatic || matchesTechSpecs;
      });
    }

    return data;
  }, [filteredData, localSearch]);

  // Stats
  const stats = useMemo(() => {
    const total = assignedAssets.length;
    const users = {};
    assignedAssets.forEach((item) => {
      const user = item.assignTo || 'Unknown';
      users[user] = (users[user] || 0) + 1;
    });
    const topUsers = Object.entries(users)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const uniqueUsers = Object.keys(users).length;

    return { total, topUsers, uniqueUsers };
  }, [assignedAssets]);

  // ── Build dynamic tech_spec columns for this tab ──
  const dynamicTechSpecColumns = useMemo(() => {
    return techSpecKeys
      .filter((key) => dynamicColumns[key])
      .map((key) => ({
        title: (
          <span>
            {key}
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
        key: `techSpec_${key}`,
        dataIndex: ['tech_specs', key],
        filters: getTechSpecFilters ? getTechSpecFilters(key) : [],
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) =>
          String(record.tech_specs?.[key] || '') === String(value),
        sorter: (a, b) =>
          String(a.tech_specs?.[key] || '').localeCompare(
            String(b.tech_specs?.[key] || '')
          ),
        render: (text, record) => {
          const val = record.tech_specs?.[key];
          return val !== undefined && val !== null && val !== ''
            ? String(val)
            : 'N/A';
        },
      }));
  }, [techSpecKeys, dynamicColumns, getTechSpecFilters]);

  // Build columns specific to Return tab
  const returnColumns = useMemo(() => {
    const staticColumns = [
      visibleColumns.assetId && {
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
        filters: getColumnFilters('assetId'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) => record.assetId === value,
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
              onClick={() => openModal('info', record)}
            />
          </span>
        ),
      },
      visibleColumns.assetCode && {
        title: (
          <span>
            Asset Code
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
        dataIndex: 'assetCode',
        key: 'assetCode',
        filters: getColumnFilters('assetCode'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) => record.assetCode === value,
        sorter: (a, b) =>
          (a.assetCode || '').localeCompare(b.assetCode || ''),
      },
      visibleColumns.name && {
        title: (
          <span>
            Name
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
        dataIndex: 'name',
        key: 'name',
        filters: getColumnFilters('name'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) => record.name === value,
        sorter: (a, b) =>
          (a.name || '').localeCompare(b.name || ''),
      },
      {
        title: 'Status',
        dataIndex: 'assetStatus',
        key: 'assetStatus',
        render: () => (
          <Tag color="orange" icon={<ClockCircleOutlined />}>
            Assigned
          </Tag>
        ),
      },
      {
        title: (
          <span>
            Assigned To
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
        dataIndex: 'assignTo',
        key: 'assignTo',
        filters: getColumnFilters('assignTo'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) => record.assignTo === value,
        sorter: (a, b) =>
          (a.assignTo || '').localeCompare(b.assignTo || ''),
        render: (text, record) => (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Avatar size="small" icon={<UserOutlined />} />
            <span>{text}</span>
            <InfoCircleOutlined
              style={{
                marginLeft: 4,
                cursor: 'pointer',
                color: '#1890ff',
              }}
              onClick={() => handleUserInfo(record)}
            />
          </span>
        ),
      },
      visibleColumns.assignedToEmployeeCode && {
        title: (
          <span>
            Employee Code
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
        dataIndex: 'assignedToEmployeeCode',
        key: 'assignedToEmployeeCode',
        filters: getColumnFilters('assignedToEmployeeCode'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) =>
          record.assignedToEmployeeCode === value,
        sorter: (a, b) =>
          (a.assignedToEmployeeCode || '').localeCompare(
            b.assignedToEmployeeCode || ''
          ),
      },
      visibleColumns.handoverDate && {
        title: (
          <span>
            Handover Date
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
        dataIndex: 'handoverDate',
        key: 'handoverDate',
        filters: getColumnFilters('handoverDate'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) =>
          record.handoverDate === value,
        sorter: (a, b) =>
          new Date(a.handoverDate) - new Date(b.handoverDate),
      },
      visibleColumns.whoAssigned && {
        title: (
          <span>
            Who Assigned
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
        dataIndex: 'whoAssigned',
        key: 'whoAssigned',
        filters: getColumnFilters('whoAssigned'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) =>
          record.whoAssigned === value,
        sorter: (a, b) =>
          (a.whoAssigned || '').localeCompare(
            b.whoAssigned || ''
          ),
        render: (text, record) => (
          <span>
            {text}
            <InfoCircleOutlined
              style={{
                marginLeft: 8,
                cursor: 'pointer',
                color: '#1890ff',
              }}
              onClick={() => handleAssignerInfo(record)}
            />
          </span>
        ),
      },
      visibleColumns.brand && {
        title: (
          <span>
            Brand
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
        dataIndex: 'brand',
        key: 'brand',
        filters: getColumnFilters('brand'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) => record.brand === value,
        sorter: (a, b) =>
          (a.brand || '').localeCompare(b.brand || ''),
      },
      visibleColumns.location && {
        title: (
          <span>
            Location
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
        dataIndex: 'location',
        key: 'location',
        filters: getColumnFilters('location'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) => record.location === value,
        sorter: (a, b) =>
          (a.location || '').localeCompare(b.location || ''),
      },
      visibleColumns.companyName && {
        title: (
          <span>
            Company
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
        dataIndex: 'companyName',
        key: 'companyName',
        filters: getColumnFilters('companyName'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) =>
          record.companyName === value,
        sorter: (a, b) =>
          (a.companyName || '').localeCompare(
            b.companyName || ''
          ),
      },
      visibleColumns.received && {
        title: 'Received',
        dataIndex: 'received',
        key: 'received',
        filters: getColumnFilters('received'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) => record.received === value,
        render: (text) => (
          <Tag color={text === 'Yes' ? 'green' : 'red'}>
            {text}
          </Tag>
        ),
      },
      visibleColumns.documents && {
        title: 'Documents',
        dataIndex: 'documents',
        key: 'documents',
        render: (documents) => (
          <>
            {documents && documents.length > 0
              ? documents.map((doc, index) => (
                <a
                  key={index}
                  href={doc}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginRight: 10 }}
                >
                  Doc {index + 1}
                </a>
              ))
              : 'N/A'}
          </>
        ),
      },
    ].filter(Boolean);

    // ── Actions column (always last) ──
    const actionsColumn = {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 280,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button
            type="default"
            size="small"
            icon={<FileWordOutlined />}
            onClick={() => handleDownloadHandover(record, 'docx')}
          >
            Word
          </Button>
          <Button
            type="default"
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => handleDownloadHandover(record, 'pdf')}
          >
            PDF
          </Button>
          <Button
            type="default"
            size="small"
            icon={<SwapOutlined />}
            onClick={() => handleUnassign(record)}
            style={{
              borderColor: '#faad14',
              color: '#faad14',
            }}
          >
            Return
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setSelectedRecord(record);
              setActiveView('editAsset');
            }}
          />
        </div>
      ),
    };

    // ── Merge: static + dynamic tech_spec + actions ──
    return [
      ...staticColumns,
      ...dynamicTechSpecColumns,
      actionsColumn,
    ];
  }, [
    visibleColumns,
    dynamicTechSpecColumns,
    getColumnFilters,
    openModal,
    handleUnassign,
    handleUserInfo,
    handleAssignerInfo,
    handleDeleteAsset,
    setSelectedRecord,
    setActiveView,
  ]);

  return (
    <div className="return-asset-tab">
      {/* Header Section */}
      <Row
        gutter={[16, 16]}
        style={{ marginBottom: 20 }}
        align="middle"
      >
        <Col xs={24} sm={8} md={6}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #faad14',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <SwapOutlined
                style={{ fontSize: 28, color: '#faad14' }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8c8c8c',
                    fontWeight: 500,
                  }}
                >
                  Assigned Assets
                </div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>
                  {stats.total}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #722ed1',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <UserOutlined
                style={{ fontSize: 28, color: '#722ed1' }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8c8c8c',
                    fontWeight: 500,
                  }}
                >
                  Unique Users
                </div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>
                  {stats.uniqueUsers}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #13c2c2',
              borderRadius: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: '#8c8c8c',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                Top Holders
              </div>
              {stats.topUsers.length > 0 ? (
                stats.topUsers
                  .slice(0, 3)
                  .map(([user, count]) => (
                    <Tag
                      key={user}
                      color="cyan"
                      style={{ marginBottom: 2 }}
                    >
                      {user}: {count}
                    </Tag>
                  ))
              ) : (
                <span style={{ color: '#bfbfbf' }}>No data</span>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={6}>
          <Input
            placeholder="Search assigned assets..."
            allowClear
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            prefix={
              <SearchOutlined style={{ color: '#bfbfbf' }} />
            }
            style={{ borderRadius: 8 }}
            size="large"
          />
        </Col>
      </Row>

      {/* Table */}
      <Table
        columns={returnColumns}
        dataSource={assignedAssets}
        onChange={handleTableChange}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} assigned assets`,
        }}
        rowKey="assetId"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No assigned assets to return"
            />
          ),
        }}
        rowClassName={() => 'return-row'}
      />
    </div>
  );
};

export default ReturnAssetTab;