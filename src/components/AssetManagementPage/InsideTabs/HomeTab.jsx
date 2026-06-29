import React, { useMemo } from 'react';
import { Table, Tag, Card, Row, Col, Empty } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';

const HomeTab = ({ filteredData, columns, handleTableChange, loading, setActiveTabKey }) => {
  const stats = useMemo(() => {
    const total = filteredData.length;
    const available = filteredData.filter(
      (item) => item.assetStatus === 'available'
    ).length;
    const assigned = filteredData.filter(
      (item) => item.assetStatus === 'assigned'
    ).length;
    const maintenance = filteredData.filter(
      (item) => item.assetStatus === 'maintenance'
    ).length;
    const decommissioned = filteredData.filter(
      (item) => item.assetStatus === 'decommissioned'
    ).length;

    return { total, available, assigned, maintenance, decommissioned };
  }, [filteredData]);

  return (
    <div className="home-tab">
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6} md={4} lg={4}>
          <Card
            size="small"
            hoverable
            onClick={() => setActiveTabKey('home')}
            style={{
              borderLeft: '4px solid #1890ff',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DatabaseOutlined
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
                  Total Assets
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.total}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4} lg={4}>
          <Card
            size="small"
            hoverable
            onClick={() => setActiveTabKey('assign')}
            style={{
              borderLeft: '4px solid #52c41a',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  Available
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.available}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4} lg={4}>
          <Card
            size="small"
            hoverable
            onClick={() => setActiveTabKey('return')}
            style={{
              borderLeft: '4px solid #faad14',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  Assigned
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.assigned}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4} lg={4}>
          <Card
            size="small"
            hoverable
            onClick={() => setActiveTabKey('maintenance')}
            style={{
              borderLeft: '4px solid #ff4d4f',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ExclamationCircleOutlined
                style={{ fontSize: 24, color: '#ff4d4f' }}
              />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>
                  Maintenance
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.maintenance}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4} lg={4}>
          <Card
            size="small"
            hoverable
            onClick={() => setActiveTabKey('decommission')}
            style={{
              borderLeft: '4px solid #000000',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DatabaseOutlined
                style={{ fontSize: 24, color: '#000000' }}
              />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>
                  Decommissioned
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats.decommissioned}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        onChange={handleTableChange}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} assets`,
        }}
        rowKey="assetId"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No assets found"
            />
          ),
        }}
      />
    </div>
  );
};

export default HomeTab;