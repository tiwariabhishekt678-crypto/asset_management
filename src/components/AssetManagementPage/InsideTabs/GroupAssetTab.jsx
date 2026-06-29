import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Modal, Select, Row, Col, Card, Badge, Tag, Space, notification } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';
import Swal from 'sweetalert2';

const GroupAssetTab = ({ cardData, handleAssign, handleUnassign, onEditAsset, activeTabKey, updateTrigger, isOtherAssetPage = false }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form] = Form.useForm();
  
  const [manageAssetsVisible, setManageAssetsVisible] = useState(false);
  const [selectedGroupForAssets, setSelectedGroupForAssets] = useState(null);
  const [assetSelection, setAssetSelection] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const baseUrl = isOtherAssetPage ? `${REACT_BASE_URL}/other-asset-groups` : `${REACT_BASE_URL}/asset-groups`;

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${baseUrl}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setGroups(data);
    } catch (err) {
      notification.error({ message: 'Error fetching groups', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTabKey === 'assetGroups') {
      fetchGroups();
    }
  }, [activeTabKey, updateTrigger]);

  const handleCreateOrUpdate = async (values) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const url = editingGroup 
        ? `${baseUrl}/${editingGroup.id}`
        : `${baseUrl}/create`;
      const method = editingGroup ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (response.status === 403 && (result.message?.includes('approval') || result.detail?.includes('approval'))) {
          Swal.fire('Request Sent', result.message || result.detail, 'info');
          setModalVisible(false);
          form.resetFields();
          setEditingGroup(null);
          return;
        }
        throw new Error(result.message || result.detail || 'Failed to save group');
      }
      
      notification.success({ message: `Group successfully ${editingGroup ? 'updated' : 'created'}` });
      setModalVisible(false);
      form.resetFields();
      setEditingGroup(null);
      fetchGroups();
    } catch (err) {
      if (err.message.includes('approval')) {
        Swal.fire('Request Sent', err.message, 'info');
      } else {
        notification.error({ message: 'Error saving group', description: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const response = await fetch(`${baseUrl}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            if (response.status === 403 && (result.message?.includes('approval') || result.detail?.includes('approval'))) {
              Swal.fire('Request Sent', result.message || result.detail, 'info');
              return;
            }
            throw new Error(result.message || result.detail || 'Failed to delete group');
          }
          Swal.fire('Deleted!', 'Asset group has been deleted.', 'success');
          fetchGroups();
        } catch (err) {
          if (err.message.includes('approval')) {
            Swal.fire('Request Sent', err.message, 'info');
          } else {
            notification.error({ message: 'Error deleting group', description: err.message });
          }
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const openManageAssets = (group) => {
    setSelectedGroupForAssets(group);
    setAssetSelection((group.assets || []).map(a => a.id));
    setManageAssetsVisible(true);
  };

  const handleSaveAssets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const existing = (selectedGroupForAssets.assets || []).map(a => a.id);
      const addIds = assetSelection.filter(id => !existing.includes(id));
      const removeIds = existing.filter(id => !assetSelection.includes(id));

      if (addIds.length) {
        const response = await fetch(`${baseUrl}/${selectedGroupForAssets.id}/add-assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ asset_ids: addIds })
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          if (response.status === 403 && (result.message?.includes('approval') || result.detail?.includes('approval'))) {
             Swal.fire('Request Sent', result.message || result.detail, 'info');
             setManageAssetsVisible(false);
             return;
          }
          throw new Error(result.message || result.detail || 'Failed to add assets');
        }
      }
      if (removeIds.length) {
        const response = await fetch(`${baseUrl}/${selectedGroupForAssets.id}/remove-assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ asset_ids: removeIds })
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          if (response.status === 403 && (result.message?.includes('approval') || result.detail?.includes('approval'))) {
             Swal.fire('Request Sent', result.message || result.detail, 'info');
             setManageAssetsVisible(false);
             return;
          }
          throw new Error(result.message || result.detail || 'Failed to remove assets');
        }
      }
      notification.success({ message: 'Assets updated successfully' });
      setManageAssetsVisible(false);
      fetchGroups();
    } catch (err) {
      if (err.message.includes('approval')) {
        Swal.fire('Request Sent', err.message, 'info');
      } else {
        notification.error({ message: 'Failed to update assets', description: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(g => 
    (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (g.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: groups.length,
    totalAssets: groups.reduce((acc, g) => acc + (g.asset_count || 0), 0)
  };

  return (
    <div className="group-asset-tab">
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #1890ff', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FolderOpenOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Total Groups</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AppstoreOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Assets Tracked</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.totalAssets}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row style={{ marginBottom: 16 }} gutter={[16, 16]} align="middle" justify="space-between">
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="Search groups..."
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ borderRadius: 8 }}
            size="large"
          />
        </Col>
        <Col>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => { setEditingGroup(null); form.resetFields(); setModalVisible(true); }}
            style={{ borderRadius: 8 }}
            size="large"
          >
            Create Group
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={filteredGroups}
        loading={loading}
        rowKey="id"
        columns={[
          { title: 'Group Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
          { title: 'Description', dataIndex: 'description', key: 'description' },
          { 
            title: 'Theme Color', 
            dataIndex: 'color', 
            key: 'color', 
            render: (text) => text ? <Tag color={text}>{text}</Tag> : 'None' 
          },
          { 
            title: 'No. of Assets', 
            dataIndex: 'asset_count', 
            key: 'asset_count',
            render: (count) => <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
          },
          {
            title: 'Actions', key: 'actions', render: (_, record) => (
              <Space>
                <Button size="small" type="dashed" onClick={() => openManageAssets(record)}>Manage Assets</Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingGroup(record); form.setFieldsValue(record); setModalVisible(true); }} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
              </Space>
            )
          }
        ]}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingGroup ? "Edit Asset Group" : "Create Asset Group"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Form.Item name="name" label="Group Name" rules={[{ required: true, message: 'Please enter a name for the group' }]}> 
            <Input placeholder="e.g. Graphic Designers, Laptops" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Enter a short description" rows={3} />
          </Form.Item>
          <Form.Item name="color" label="Theme Color">
            <Input type="color" style={{ width: 60, padding: 0 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Manage Assets: ${selectedGroupForAssets?.name}`}
        visible={manageAssetsVisible}
        onCancel={() => setManageAssetsVisible(false)}
        onOk={handleSaveAssets}
        confirmLoading={loading}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <strong>Add New Assets to Group:</strong>
          <Select
            mode="multiple"
            style={{ width: '100%', marginTop: 8 }}
            value={[]}
            onChange={(selectedValues) => setAssetSelection(prev => [...prev, ...selectedValues])}
            options={cardData
              .filter(a => !assetSelection.includes(a.id))
              .map(asset => ({ 
                label: `${asset.assetCode} - ${asset.name} (${asset.brand || 'No Brand'})`, 
                value: asset.id 
              }))}
            placeholder="Search and select assets to add"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
        
        <strong>Current Assets in Group:</strong>
        <Table
          style={{ marginTop: 8 }}
          dataSource={cardData.filter(a => assetSelection.includes(a.id))}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
          columns={[
            { title: 'Code', dataIndex: 'assetCode', key: 'code' },
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { 
              title: 'Status', 
              dataIndex: 'assetStatus', 
              key: 'status', 
              render: text => <Tag color={text === 'available' ? 'green' : (text === 'assigned' ? 'blue' : 'default')}>{text}</Tag> 
            },
            { 
              title: 'Actions', 
              key: 'actions', 
              render: (_, record) => (
                <Space>
                  {record.assetStatus === 'available' ? (
                    <Button type="primary" size="small" onClick={() => handleAssign(record)}>Assign</Button>
                  ) : record.assetStatus === 'assigned' ? (
                    <Button size="small" onClick={() => handleUnassign(record)}>Return</Button>
                  ) : null}
                  <Button icon={<EditOutlined />} size="small" onClick={() => { onEditAsset(record); setManageAssetsVisible(false); }} />
                  <Button 
                    danger 
                    size="small" 
                    icon={<DeleteOutlined />} 
                    onClick={() => setAssetSelection(prev => prev.filter(id => id !== record.id))} 
                  />
                </Space>
              )
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default GroupAssetTab;
