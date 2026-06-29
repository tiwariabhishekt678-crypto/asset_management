import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, notification, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';
import { REACT_BASE_URL } from '../../config';

const AssetTypeTab = ({ isOtherAssetPage, onEdit, onAdd }) => {
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const typeLabel = isOtherAssetPage ? 'Other Asset Type' : 'Asset Type';

  const fetchAssetTypes = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const url = isOtherAssetPage 
        ? `${REACT_BASE_URL}/other-asset-types/`
        : `${REACT_BASE_URL}/asset-types/`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAssetTypes(data.map(item => ({ ...item, key: item.id })));
      }
    } catch (error) {
      console.error(`Error fetching ${typeLabel.toLowerCase()}s:`, error);
      notification.error({ message: 'Error', description: `Failed to fetch ${typeLabel.toLowerCase()}s` });
    } finally {
      setLoading(false);
    }
  }, [isOtherAssetPage, typeLabel]);

  useEffect(() => {
    fetchAssetTypes();
  }, [fetchAssetTypes]);

  const handleDelete = (record) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `You won't be able to revert this! It will only succeed if no assets are linked to this ${typeLabel.toLowerCase()}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const url = isOtherAssetPage 
            ? `${REACT_BASE_URL}/other-asset-types/${record.id}`
            : `${REACT_BASE_URL}/asset-types/${record.id}`;
          
          const response = await fetch(url, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await response.json();

          if (response.ok) {
            Swal.fire('Deleted!', data.message || `${typeLabel} deleted.`, 'success');
            fetchAssetTypes();
          } else {
            Swal.fire('Error!', data.detail || `Failed to delete ${typeLabel.toLowerCase()}.`, 'error');
          }
        } catch (error) {
          Swal.fire('Error!', 'An unexpected error occurred.', 'error');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="blue">{category?.toUpperCase().replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            icon={<EditOutlined />} 
            onClick={() => onEdit(record)}
            title={`Edit ${typeLabel} & Fields`}
          />
          <Button 
            icon={<DeleteOutlined />} 
            danger 
            onClick={() => handleDelete(record)}
            title={`Delete ${typeLabel}`}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={onAdd}
          className="btn-new"
        >
          Add {typeLabel}
        </Button>
      </div>
      <Table 
        columns={columns} 
        dataSource={assetTypes} 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default AssetTypeTab;
