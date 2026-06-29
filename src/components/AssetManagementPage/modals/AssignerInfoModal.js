import React, { useEffect, useState } from 'react';
import { Modal, Table, Spin, Alert, Button, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';

const AssignerInfoModal = ({ visible, onCancel, assignerInfo }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userMeta, setUserMeta] = useState({});

  useEffect(() => {
    if (visible && assignerInfo?.userId) {
      fetchLogs(assignerInfo.userId);
    }
    if (!visible) {
      setLogs([]);
      setError(null);
      setUserMeta({});
    }
  }, [visible, assignerInfo]);

  const fetchLogs = async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');
      const res = await fetch(
        `${REACT_BASE_URL}/asset-logs/by-assigned-by/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUserMeta({ name: data.user_name });
      setLogs((data.logs || []).map((l, i) => ({ ...l, key: i })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const endpoint = `${REACT_BASE_URL}/reports/logs/assigned-by/${assignerInfo.userId}/${format}`;
    try {
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `operation_report_${assignerInfo.userId}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error("Export error", err);
    }
  };

  const columns = [
    { title: 'Asset Name', dataIndex: 'assetName', key: 'assetName' },
    { title: 'Asset Code', dataIndex: 'assetCode', key: 'assetCode' },
    { title: 'Assigned To', dataIndex: 'assignedTo', key: 'assignedTo' },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (text) => text && text !== 'N/A' ? text : '-' },
  ];

  return (
    <Modal
      title="Assigned By — Asset History"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={850}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="Loading logs..." />
        </div>
      ) : error ? (
        <Alert
          type="error"
          message="Failed to load logs"
          description={error}
          showIcon
        />
      ) : (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#555' }}>
              <strong>Assigned By:</strong> {userMeta.name || assignerInfo?.assigner} &nbsp;|&nbsp;
              <strong>Total Assets Assigned:</strong> {logs.length}
            </div>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => handleExport('excel')}>Excel</Button>
              <Button icon={<DownloadOutlined />} onClick={() => handleExport('pdf')}>PDF</Button>
            </Space>
          </div>
          {logs.length === 0 ? (
            <Alert type="info" message="No assets assigned by this user." showIcon />
          ) : (
            <Table
              dataSource={logs}
              pagination={false}
              bordered
              size="middle"
              columns={columns}
            />
          )}
        </>
      )}
    </Modal>
  );
};

export default AssignerInfoModal;