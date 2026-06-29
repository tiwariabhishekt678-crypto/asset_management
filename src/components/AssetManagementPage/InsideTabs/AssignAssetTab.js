import React, { useMemo, useState, useCallback } from 'react';
import {
  Table,
  Tag,
  Card,
  Row,
  Col,
  Empty,
  Input,
  Button,
  Tooltip,
  Badge,
} from 'antd';
import {
  CheckCircleOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';

const AssignAssetTab = ({
  filteredData,
  columns,
  handleTableChange,
  loading,
  handleAssign,
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

  // Filter only available assets
  const availableAssets = useMemo(() => {
    let data = filteredData.filter(
      (item) => item.assetStatus === 'available' && !item.parentAsset
    );

    // Apply local search across static fields + tech_specs
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
    const total = availableAssets.length;
    const categories = {};
    availableAssets.forEach((item) => {
      const cat = item.assetTypeCategory || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    const topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, topCategories };
  }, [availableAssets]);

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

  // Build columns specific to Assign tab
  const assignColumns = useMemo(() => {
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
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Available
          </Tag>
        ),
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
      visibleColumns.assetTypeCategory && {
        title: (
          <span>
            Category
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
        dataIndex: 'assetTypeCategory',
        key: 'assetTypeCategory',
        filters: getColumnFilters('assetTypeCategory'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) =>
          record.assetTypeCategory === value,
        sorter: (a, b) =>
          (a.assetTypeCategory || '').localeCompare(
            b.assetTypeCategory || ''
          ),
      },
      visibleColumns.assignTo && {
        title: (<span>Assigned To<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'assignTo', key: 'assignTo',
        filters: getColumnFilters('assignTo'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.assignTo === value,
        sorter: (a, b) => (a.assignTo || '').localeCompare(b.assignTo || ''),
        render: (text, record) => (
          <span>
            {text}
            <InfoCircleOutlined style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }} onClick={() => handleUserInfo(record)} />
          </span>
        ),
      },
      visibleColumns.whoAssigned && {
        title: (<span>Who Assigned<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'whoAssigned', key: 'whoAssigned',
        filters: getColumnFilters('whoAssigned'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.whoAssigned === value,
        sorter: (a, b) => (a.whoAssigned || '').localeCompare(b.whoAssigned || ''),
        render: (text, record) => (
          <span>
            {text}
            <InfoCircleOutlined style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }} onClick={() => handleAssignerInfo(record)} />
          </span>
        ),
      },
      visibleColumns.warrantyExpiry && {
        title: (
          <span>
            Warranty Expiry
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
        dataIndex: 'warrantyExpiry',
        key: 'warrantyExpiry',
        filters: getColumnFilters('warrantyExpiry'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) =>
          record.warrantyExpiry === value,
        sorter: (a, b) =>
          new Date(a.warrantyExpiry) -
          new Date(b.warrantyExpiry),
      },
      visibleColumns.createdAt && {
        title: (
          <span>
            Created At
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
        dataIndex: 'createdAt',
        key: 'createdAt',
        filters: getColumnFilters('createdAt'),
        filterIcon: () => (
          <img
            src="/icons/filter.svg"
            alt="Filter"
            style={{ width: 12 }}
          />
        ),
        onFilter: (value, record) => record.createdAt === value,
        sorter: (a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt),
      },
      visibleColumns.invoiceNo && {
        title: (
          <span>
            Invoice No
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
        dataIndex: 'invoiceNo',
        key: 'invoiceNo',
        sorter: (a, b) =>
          (a.invoiceNo || '').localeCompare(
            b.invoiceNo || ''
          ),
      },
      visibleColumns.price && {
        title: (
          <span>
            Price
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
        dataIndex: 'price',
        key: 'price',
        sorter: (a, b) => {
          const priceA = parseFloat(
            String(a.price || '0').replace(/[$,]/g, '')
          );
          const priceB = parseFloat(
            String(b.price || '0').replace(/[$,]/g, '')
          );
          return priceA - priceB;
        },
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
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            type="primary"
            size="small"
            onClick={() => handleAssign(record)}
            style={{
              background: '#52c41a',
              borderColor: '#52c41a',
            }}
          >
            Assign
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
    handleAssign,
    handleDeleteAsset,
    setSelectedRecord,
    setActiveView,
    handleUserInfo,
    handleAssignerInfo,
  ]);

  return (
    <div className="assign-asset-tab">
      {/* Header Section */}
      <Row
        gutter={[16, 16]}
        style={{ marginBottom: 20 }}
        align="middle"
      >
        <Col xs={24} sm={12} md={8}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #52c41a',
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
              <CheckCircleOutlined
                style={{ fontSize: 28, color: '#52c41a' }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#8c8c8c',
                    fontWeight: 500,
                  }}
                >
                  Available for Assignment
                </div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>
                  {stats.total}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            size="small"
            style={{
              borderLeft: '4px solid #1890ff',
              borderRadius: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: '#8c8c8c',
                  fontWeight: 500,
                  marginBottom: 6,
                }}
              >
                Top Categories
              </div>
              {stats.topCategories.length > 0 ? (
                stats.topCategories.map(([cat, count]) => (
                  <Tag
                    key={cat}
                    color="blue"
                    style={{ marginBottom: 4 }}
                  >
                    {cat}: {count}
                  </Tag>
                ))
              ) : (
                <span style={{ color: '#bfbfbf' }}>No data</span>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Input
            placeholder="Search available assets..."
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
        columns={assignColumns}
        dataSource={availableAssets}
        onChange={handleTableChange}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} available assets`,
        }}
        rowKey="assetId"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No available assets to assign"
            />
          ),
        }}
        rowClassName={() => 'assign-row'}
      />
    </div>
  );
};

export default AssignAssetTab;