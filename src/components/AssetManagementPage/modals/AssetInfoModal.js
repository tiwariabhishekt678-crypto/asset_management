import React, { useEffect, useState } from 'react';
import { Modal, Table, Spin, Alert, Tag, Tabs, Button, Dropdown, Menu } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';

const ACTION_COLORS = {
  Created: 'blue',
  Assigned: 'green',
  Returned: 'orange',
  Repaired: 'purple',
  default: 'default',
};

const AssetInfoModal = ({ visible, onCancel, infoRecord, isOtherAssetPage = false }) => {
  const [logs, setLogs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [assetData, setAssetData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assetMeta, setAssetMeta] = useState({});

  useEffect(() => {
    if (visible && infoRecord?.assetId) {
      fetchData(infoRecord.assetId);
    }
    // Reset on close
    if (!visible) {
      setLogs([]);
      setGroups([]);
      setError(null);
      setAssetMeta({});
      setAssetData(null);
    }
  }, [visible, infoRecord]);

  const fetchData = async (assetId) => {
    setLoading(true);
    setError(null);
    try {
      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');
        
      const logsUrl = isOtherAssetPage 
        ? `${REACT_BASE_URL}/other-asset-logs/${assetId}`
        : `${REACT_BASE_URL}/asset-logs/by-asset/${assetId}`;
        
      const groupsUrl = isOtherAssetPage
        ? `${REACT_BASE_URL}/other-asset-groups/by-asset/${assetId}`
        : `${REACT_BASE_URL}/asset-groups/by-asset/${assetId}`;
        
      const assetUrl = isOtherAssetPage
        ? `${REACT_BASE_URL}/other-assets/${assetId}`
        : `${REACT_BASE_URL}/asset/${assetId}`;

      const [logsRes, groupsRes, assetRes] = await Promise.all([
        fetch(logsUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(groupsUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(assetUrl, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        // Structure might be different for other-asset-logs vs asset-logs
        if (isOtherAssetPage) {
            setLogs((logsData || []).map((l, i) => ({ 
                ...l, 
                key: i,
                action: l.action,
                by: l.requested_by_name || 'Admin',
                to: l.employee_name || '-',
                date: l.created_at ? l.created_at.split('T')[0] : 'N/A',
                location: l.meta?.location || '-',
                remarks: l.comments || '-'
            })));
        } else {
            setAssetMeta({ assetCode: logsData.asset_code, assetName: logsData.asset_name });
            setLogs((logsData.logs || []).map((l, i) => ({ ...l, key: i })));
        }
      }
      
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData || []);
      }

      if (assetRes.ok) {
        setAssetData(await assetRes.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportLog = async (format) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    try {
      const response = await fetch(`${REACT_BASE_URL}/reports/logs/asset/${infoRecord.assetId}/${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asset_logs_${assetMeta.assetCode}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const columns = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (text) => (
        <Tag color={ACTION_COLORS[text] || ACTION_COLORS.default}>{text}</Tag>
      ),
    },
    { title: 'By', dataIndex: 'by', key: 'by' },
    {
      title: 'To / Assigned To',
      dataIndex: 'to',
      key: 'to',
      render: (text) => text || '—',
    },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Location', dataIndex: 'location', key: 'location', render: (text) => text || 'N/A' },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (text) => text && text !== 'N/A' ? text : '-' },
  ];

  const invoiceColumns = [
    { title: 'Invoice No', dataIndex: 'invoice_number', key: 'invoice_number' },
    { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor_name' },
    { title: 'Date', dataIndex: 'invoice_date', key: 'invoice_date' },
    { title: 'Amount', dataIndex: 'total_amount', key: 'total_amount' },
    { 
        title: 'Documents', 
        dataIndex: 'documents', 
        key: 'documents',
        render: (docs) => docs?.map((doc, idx) => (
            <a key={idx} href={`${REACT_BASE_URL}/${doc}`} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8 }}>
                Doc {idx + 1}
            </a>
        )) || 'None'
    }
  ];

  const upgradeColumns = [
    { title: 'Asset Code', dataIndex: 'asset_code', key: 'asset_code' },
    { title: 'Type', dataIndex: 'type_name', key: 'type_name' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Linked To (Spec)', dataIndex: 'parent_field', key: 'parent_field' },
    { 
      title: 'Invoice Amount', 
      dataIndex: 'invoice_amount', 
      key: 'invoice_amount',
      render: (amount) => amount ? `₹${amount.toLocaleString()}` : '—'
    },
  ];

  return (
    <Modal
      title="Asset Information & Logs"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="Loading data..." />
        </div>
      ) : error ? (
        <Alert
          type="error"
          message="Failed to load data"
          description={error}
          showIcon
        />
      ) : (
        <>
          {isOtherAssetPage && assetData?.parent_asset && (
            <Alert
              style={{ marginBottom: 16 }}
              type="warning"
              message="Linked as Hardware Upgrade"
              description={
                <span>
                  This component is currently linked to parent asset <strong>{assetData.parent_asset.asset_code}</strong> for the <strong>{assetData.parent_asset.field}</strong> specification. 
                  Maintenance and assignment actions are restricted while it is linked.
                </span>
              }
              showIcon
            />
          )}

          <div style={{ marginBottom: 16, color: '#555' }}>
            <strong>Asset Code:</strong> {assetMeta.assetCode || infoRecord?.assetCode} &nbsp;|&nbsp;
            <strong>Asset Name:</strong> {assetMeta.assetName || infoRecord?.name}
            {groups.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Associated Groups: </strong>
                {groups.map((g) => (
                  <Tag key={g.id} color={g.color || 'blue'}>{g.name}</Tag>
                ))}
              </div>
            )}
          </div>

          <Tabs defaultActiveKey="logs">
            <Tabs.TabPane tab="Lifecycle Logs" key="logs">
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => handleExportLog('excel')}
                    >
                        Export Excel
                    </Button>
                    <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => handleExportLog('pdf')}
                    >
                        Export PDF
                    </Button>
                </div>
                {logs.length === 0 ? (
                    <Alert type="info" message="No logs found for this asset." showIcon style={{ marginTop: 16 }} />
                ) : (
                    <Table
                    dataSource={logs}
                    pagination={false}
                    bordered
                    size="middle"
                    columns={columns}
                    style={{ marginTop: 16 }}
                    />
                )}
            </Tabs.TabPane>
            <Tabs.TabPane tab="Invoices" key="invoices">
                {assetData?.invoices?.length > 0 ? (
                    <Table
                        dataSource={assetData.invoices}
                        pagination={false}
                        bordered
                        size="middle"
                        columns={invoiceColumns}
                        style={{ marginTop: 16 }}
                        rowKey="id"
                    />
                ) : (
                    <Alert type="info" message="No invoices associated with this asset." showIcon style={{ marginTop: 16 }} />
                )}
            </Tabs.TabPane>
            {!isOtherAssetPage && (
              <Tabs.TabPane tab="Upgrades" key="upgrades">
                  {assetData?.upgrades?.length > 0 ? (
                      <Table
                          dataSource={assetData.upgrades}
                          pagination={false}
                          bordered
                          size="middle"
                          columns={upgradeColumns}
                          style={{ marginTop: 16 }}
                          rowKey="id"
                      />
                  ) : (
                      <Alert type="info" message="No hardware upgrades linked to this asset." showIcon style={{ marginTop: 16 }} />
                  )}
              </Tabs.TabPane>
            )}
          </Tabs>
        </>
      )}
    </Modal>
  );
};

export default AssetInfoModal;