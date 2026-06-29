import React, { useEffect, useState } from 'react';
import { Modal, Table, Spin, Alert, Tag, Button, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';

const ACTION_COLORS = {
  Assigned: 'green',
  Returned: 'orange',
  default: 'default',
};

const UserInfoModal = ({ visible, onCancel, userInfo }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [employeeMeta, setEmployeeMeta] = useState({});

  useEffect(() => {
    if (visible && userInfo?.employeeId) {
      fetchLogs(userInfo.employeeId);
    }
    if (!visible) {
      setLogs([]);
      setError(null);
      setEmployeeMeta({});
    }
  }, [visible, userInfo]);

  const fetchLogs = async (employeeId) => {
    setLoading(true);
    setError(null);
    try {
      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');
      const res = await fetch(
        `${REACT_BASE_URL}/asset-logs/by-assigned-to/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setEmployeeMeta({
        name: data.employee_name,
        code: data.employee_code,
      });
      setLogs((data.logs || []).map((l, i) => ({ ...l, key: i })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const endpoint = `${REACT_BASE_URL}/reports/logs/assigned-to/${userInfo.employeeId}/${format}`;
    try {
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee_history_${userInfo.employeeId}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (text) => (
        <Tag color={ACTION_COLORS[text] || ACTION_COLORS.default}>{text}</Tag>
      ),
    },
    { title: 'Assigned By', dataIndex: 'assignedBy', key: 'assignedBy' },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (text) => text && text !== 'N/A' ? text : '-' },
    { title: 'Received', dataIndex: 'received', key: 'received' },
    { title: 'Applied for Fix', dataIndex: 'appliedForFix', key: 'appliedForFix' },
  ];

  return (
    <Modal
      title="Assigned To — Asset History"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={950}
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
              <strong>Employee:</strong> {employeeMeta.name || userInfo?.user} &nbsp;|&nbsp;
              <strong>Employee Code:</strong> {employeeMeta.code || '—'}
            </div>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => handleExport('excel')}>Excel</Button>
              <Button icon={<DownloadOutlined />} onClick={() => handleExport('pdf')}>PDF</Button>
            </Space>
          </div>
          {logs.length === 0 ? (
            <Alert type="info" message="No asset logs found for this employee." showIcon />
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

export default UserInfoModal;