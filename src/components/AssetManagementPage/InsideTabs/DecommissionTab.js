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
} from 'antd';
import {
  SearchOutlined,
  StopOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  RedoOutlined
} from '@ant-design/icons';

const DecommissionTab = ({
  filteredData,
  columns,
  handleTableChange,
  loading,
  handleUpdateStatus,
  openModal,
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

  // Filter only decommissioned assets + local search
  const decommissionedAssets = useMemo(() => {
    let data = filteredData.filter(
      (item) => item.assetStatus === 'decommissioned' && !item.parentAsset
    );

    if (localSearch.trim()) {
      const searchLower = localSearch.toLowerCase();
      data = data.filter((record) => {
        const matchesStatic = Object.entries(record).some(
          ([key, value]) => {
            if (key === 'tech_specs') return false;
            return value?.toString().toLowerCase().includes(searchLower);
          }
        );

        const matchesTechSpecs =
          record.tech_specs &&
          typeof record.tech_specs === 'object' &&
          Object.values(record.tech_specs).some((value) =>
            value?.toString().toLowerCase().includes(searchLower)
          );

        return matchesStatic || matchesTechSpecs;
      });
    }

    return data;
  }, [filteredData, localSearch]);

  const stats = useMemo(() => {
    return { 
      total: decommissionedAssets.length,
    };
  }, [decommissionedAssets]);

  // Build columns specific to Decommission tab
  const decommissionColumns = useMemo(() => {
    const baseCols = columns.filter(col => col.key !== 'actions' && col.key !== 'assetStatus');
    
    // Inject status column with decommissioned look
    const statusCol = {
      title: 'Status',
      dataIndex: 'assetStatus',
      key: 'assetStatus',
      render: () => (
        <Tag color="default" icon={<StopOutlined />} style={{ color: '#000', borderColor: '#d9d9d9' }}>
          Decommissioned
        </Tag>
      ),
    };

    const actionsCol = {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            type="default"
            size="small"
            icon={<RedoOutlined />}
            onClick={() => handleUpdateStatus(record, 'available')}
            style={{
              borderColor: '#1890ff',
              color: '#1890ff',
            }}
          >
            Re-enlist
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

    return [...baseCols, statusCol, actionsCol];
  }, [columns, handleUpdateStatus, setSelectedRecord, setActiveView]);

  return (
    <div className="decommission-asset-tab">
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Card
            size="small"
            style={{ borderLeft: '4px solid #000000', borderRadius: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StopOutlined style={{ fontSize: 28, color: '#000000' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>
                  Total Decommissioned
                </div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>
                  {stats.total}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={16}>
          <Input
            placeholder="Search decommissioned assets..."
            allowClear
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ borderRadius: 8 }}
            size="large"
          />
        </Col>
      </Row>

      <Table
        columns={decommissionColumns}
        dataSource={decommissionedAssets}
        onChange={handleTableChange}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} assets`,
        }}
        rowKey="assetId"
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No assets decommissioned" />,
        }}
      />
    </div>
  );
};

export default DecommissionTab;
