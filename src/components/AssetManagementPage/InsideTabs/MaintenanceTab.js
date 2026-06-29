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
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  ToolOutlined,
  InfoCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const MaintenanceTab = ({
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

  // Filter only maintenance assets + local search
  const maintenanceAssets = useMemo(() => {
    let data = filteredData.filter(
      (item) => item.assetStatus === 'maintenance' && !item.parentAsset
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
      total: maintenanceAssets.length,
    };
  }, [maintenanceAssets]);

  // Build columns specific to Maintenance tab
  const maintenanceColumns = useMemo(() => {
    const baseCols = columns.filter(col => col.key !== 'actions' && col.key !== 'assetStatus');
    
    // Inject status column with specific maintenance look
    const statusCol = {
      title: 'Status',
      dataIndex: 'assetStatus',
      key: 'assetStatus',
      render: () => (
        <Tag color="error" icon={<ExclamationCircleOutlined />}>
          Maintenance
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
            icon={<CheckCircleOutlined />}
            onClick={() => handleUpdateStatus(record, 'available')}
            style={{
              borderColor: '#52c41a',
              color: '#52c41a',
            }}
          >
            Recover
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

    // Find location of status in original or just append
    return [...baseCols, statusCol, actionsCol];
  }, [columns, handleUpdateStatus, setSelectedRecord, setActiveView]);

  return (
    <div className="maintenance-asset-tab">
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Card
            size="small"
            style={{ borderLeft: '4px solid #ff4d4f', borderRadius: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ToolOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>
                  Assets in Maintenance
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
            placeholder="Search maintenance assets..."
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
        columns={maintenanceColumns}
        dataSource={maintenanceAssets}
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
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No assets in maintenance" />,
        }}
      />
    </div>
  );
};

export default MaintenanceTab;
