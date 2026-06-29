import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Input, Select, Space, Tag, Card, Row, Col, Statistic, Modal, Form, notification, Segmented, Tabs, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, WarningOutlined, DownloadOutlined, LinkOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UserAddOutlined, UserDeleteOutlined, HomeOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';
import { REACT_BASE_URL } from '../config';
import './StockManagement.css';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

const StockManagement = () => {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('all');
  const [mainCategory, setMainCategory] = useState('ALL'); // ALL, ASSETS, OTHER ASSETS
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [stockToLink, setStockToLink] = useState(null);
  const [form] = Form.useForm();
  const [linkForm] = Form.useForm();
  const [importForm] = Form.useForm();
  const [assetTypes, setAssetTypes] = useState([]);
  const [otherAssetTypes, setOtherAssetTypes] = useState([]);
  const [assetClass, setAssetClass] = useState('ASSET');
  const [addMethod, setAddMethod] = useState('MANUAL'); // MANUAL, INVOICE
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stockSummary, setStockSummary] = useState(null);

  // Fetch stock items
  const fetchStockItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      let url = `${REACT_BASE_URL}/stock/items?`;
      
      if (filterLowStock) {
        url += 'low_stock_only=true&';
      }
      if (searchTerm) {
        url += `search=${searchTerm}&`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStockItems(data);
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
      notification.error({ message: 'Error', description: 'Failed to fetch stock items' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary stats
  const fetchStockSummary = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/stock/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStockSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  // Fetch asset types for dropdown
  const fetchAssetTypes = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/asset-types/asset-types-dropdown`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAssetTypes(data);
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
    }
  };

  // Fetch other asset types for dropdown
  const fetchOtherAssetTypes = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/other-asset-types/dropdown`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOtherAssetTypes(data);
      }
    } catch (error) {
      console.error('Error fetching other asset types:', error);
    }
  };

  // Fetch invoices for dropdown
  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      // Fetch more invoices for the dropdown (default size is 10)
      const response = await fetch(`${REACT_BASE_URL}/invoices/?size=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  // Fetch companies
  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  useEffect(() => {
    fetchStockItems();
    fetchStockSummary();
    fetchAssetTypes();
    fetchOtherAssetTypes();
    fetchInvoices();
    fetchCompanies();
  }, [filterLowStock, searchTerm]);

  // Handle add stock item
  const handleAddStock = async (values) => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const isEditing = Boolean(selectedStockItem);
      const url = isEditing
        ? `${REACT_BASE_URL}/stock/items/${selectedStockItem.id}`
        : `${REACT_BASE_URL}/stock/items`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        if (isEditing) {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Stock item updated successfully',
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          notification.success({
            message: 'Success',
            description: 'Stock item created successfully',
          });
        }
        setIsAddModalVisible(false);
        setSelectedStockItem(null);
        setAddMethod('MANUAL');
        form.resetFields();
        fetchStockItems();
        fetchStockSummary();
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('approval') || errorData.detail?.includes('approval')) {
          Swal.fire('Request Sent', errorData.message || errorData.detail, 'info');
        } else {
          notification.error({ message: 'Error', description: errorData.message || errorData.detail || 'Failed to save stock item' });
        }
      }
    } catch (error) {
      notification.error({ message: 'Error', description: 'Failed to save stock item' });
    }
  };

  const handleEditStock = (record) => {
    setSelectedStockItem(record);
    setAssetClass(record.other_asset_type_id ? 'OTHER' : 'ASSET');
    setAddMethod('MANUAL');
    form.setFieldsValue({
      item_name: record.item_name,
      sku: record.sku,
      asset_type_id: record.asset_type_id,
      other_asset_type_id: record.other_asset_type_id,
      quantity_total: record.quantity_total,
      unit_price: record.unit_price,
      description: record.description,
      reorder_level: record.reorder_level,
      reorder_quantity: record.reorder_quantity,
      warehouse_name: record.warehouse_name,
      warehouse_zone: record.warehouse_zone,
      warehouse_aisle: record.warehouse_aisle,
      warehouse_shelf: record.warehouse_shelf,
      warehouse_bin: record.warehouse_bin,
      location_notes: record.location_notes,
    });
    setIsAddModalVisible(true);
  };

  const handleDeleteStock = async (record) => {
    Swal.fire({
      title: 'Delete Stock Item?',
      text: 'This will remove the stock item from active inventory.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const response = await fetch(`${REACT_BASE_URL}/stock/items/${record.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || data.message || 'Failed to delete stock item');
          }
          Swal.fire('Deleted!', 'Stock item deleted successfully', 'success');
          fetchStockItems();
          fetchStockSummary();
        } catch (error) {
          if (error.message.includes('approval')) {
            Swal.fire('Request Sent', error.message, 'info');
          } else {
            Swal.fire('Error!', error.message, 'error');
          }
        }
      }
    });
  };

  // Handle import stock item from invoice
  const handleImportStock = async (values) => {
    console.log('handleImportStock called', values);
    if (!values.import_invoice_id) {
      notification.error({ message: 'Error', description: 'Please select an invoice' });
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/invoices/${values.import_invoice_id}/add-to-stock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        Swal.fire('Success!', data.message || 'Stock imported successfully', 'success');
        setIsAddModalVisible(false);
        importForm.resetFields();
        fetchStockItems();
        fetchStockSummary();
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('approval') || errorData.detail?.includes('approval')) {
          Swal.fire('Request Sent', errorData.message || errorData.detail, 'info');
        } else {
          notification.error({ message: 'Error', description: errorData.detail || errorData.message || 'Failed to import stock' });
        }
      }
    } catch (error) {
      console.error('Error importing stock:', error);
      notification.error({ message: 'Error', description: 'Failed to import stock from invoice' });
    }
  };

  // Handle link invoice
  const handleLinkInvoice = async (values) => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/stock/items/${stockToLink.id}/link-invoice?invoice_id=${values.invoice_id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        notification.success({ message: 'Success', description: 'Invoice linked successfully' });
        setIsLinkModalVisible(false);
        linkForm.resetFields();
        setStockToLink(null);
        fetchStockItems();
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('approval') || errorData.detail?.includes('approval')) {
          Swal.fire('Request Sent', errorData.message || errorData.detail, 'info');
        } else {
          notification.error({ message: 'Error', description: errorData.detail || errorData.message || 'Failed to link invoice' });
        }
      }
    } catch (error) {
      console.error('Error linking invoice:', error);
      notification.error({ message: 'Error', description: 'Failed to link invoice to stock item' });
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/stock/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock_inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      notification.error({ message: 'Error', description: 'Failed to export stock data' });
    }
  };

  // Process and group stock items by asset type with filtering
  const groupedStock = useMemo(() => {
    const grouped = Object.values(stockItems.reduce((acc, item) => {
      // Determine high-level category
      const highLevel = ['hardware', 'software'].includes(item.asset_type_category) ? 'ASSETS' : 'OTHER ASSETS';
      
      // Filter by main category (Segmented) if not 'ALL'
      if (mainCategory !== 'ALL' && highLevel !== mainCategory) {
        return acc;
      }

      const key = item.asset_type_id;
      if (!acc[key]) {
        acc[key] = {
          key: key,
          asset_type_id: key,
          item_name: item.item_name,
          asset_type_category: item.asset_type_category,
          main_category: highLevel,
          quantity_total: 0,
          quantity_available: 0,
          quantity_assigned: 0,
          total_value: 0,
          reorder_level: item.reorder_level,
          batches: []
        };
      }
      acc[key].quantity_total += item.quantity_total;
      acc[key].quantity_available += item.quantity_available;
      acc[key].quantity_assigned += item.quantity_assigned;
      acc[key].total_value += parseFloat(item.total_value);
      acc[key].batches.push({ ...item, key: item.id });
      return acc;
    }, {}));

    // Filter by Tab (activeTabKey)
    let filtered = grouped;
    if (activeTabKey === 'available') {
      filtered = filtered.filter(item => item.quantity_available > 0);
    } else if (activeTabKey === 'low_stock') {
      filtered = filtered.filter(item => item.quantity_available <= item.reorder_level && item.quantity_available > 0);
    }

    // Filter by Category Select (filterCategory)
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.asset_type_category === filterCategory);
    }

    return filtered;
  }, [stockItems, mainCategory, activeTabKey, filterCategory]);

  // Memoized column filters generator
  const getColumnFilters = useCallback((dataIndex) => {
    const uniqueValues = [...new Set(stockItems.map((item) => item[dataIndex]).filter(Boolean))];
    return uniqueValues.map((value) => ({ text: value, value }));
  }, [stockItems]);

  // Table columns for main table
  const columns = [
    {
      title: (
        <span>
          Stock Name
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'item_name',
      key: 'item_name',
      filters: getColumnFilters('item_name'),
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.item_name === value,
      sorter: (a, b) => a.item_name.localeCompare(b.item_name),
    },
    {
      title: (
        <span>
          Category
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'asset_type_category',
      key: 'asset_type_category',
      filters: getColumnFilters('asset_type_category'),
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.asset_type_category === value,
      sorter: (a, b) => (a.asset_type_category || '').localeCompare(b.asset_type_category || ''),
      render: (category) => (
        <Tag color={
          category === 'it_accessories' ? 'blue' :
          category === 'hardware' ? 'green' :
          category === 'software' ? 'purple' : 'default'
        }>
          {category?.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: (
        <span>
          Total Available
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'quantity_available',
      key: 'quantity_available',
      sorter: (a, b) => a.quantity_available - b.quantity_available,
      render: (qty, record) => (
        <span style={{ 
          color: qty <= record.reorder_level ? '#ff4d4f' : qty <= record.reorder_level * 2 ? '#faad14' : '#52c41a',
          fontWeight: 'bold'
        }}>
          {qty}
        </span>
      ),
    },
    {
      title: (
        <span>
          Total Stock
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'quantity_total',
      key: 'quantity_total',
      sorter: (a, b) => a.quantity_total - b.quantity_total,
    },
    {
      title: (
        <span>
          Grand Value
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'total_value',
      key: 'total_value',
      sorter: (a, b) => a.total_value - b.total_value,
      render: (value) => `₹${parseFloat(value).toFixed(2)}`,
    },
    {
      title: 'Status',
      key: 'status',
      filters: [
        { text: 'In Stock', value: 'In Stock' },
        { text: 'Low Stock', value: 'Low Stock' },
        { text: 'Out of Stock', value: 'Out of Stock' },
      ],
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => {
        let status = '';
        if (record.quantity_available === 0) status = 'Out of Stock';
        else if (record.quantity_available <= record.reorder_level) status = 'Low Stock';
        else status = 'In Stock';
        return status === value;
      },
      render: (_, record) => {
        if (record.quantity_available === 0) {
          return <Tag color="red">Out of Stock</Tag>;
        } else if (record.quantity_available <= record.reorder_level) {
          return <Tag color="orange">Low Stock</Tag>;
        }
        return <Tag color="green">In Stock</Tag>;
      },
    },
  ];

  const renderStockTable = () => (
    <div className="asset-table-container">
      <Table
        columns={columns}
        dataSource={groupedStock}
        loading={loading}
        rowKey="key"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '8px 48px', background: '#f8fafc', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Purchase Batches</h4>
              <Table
                columns={batchColumns}
                dataSource={record.batches}
                pagination={false}
                size="small"
                rowKey="id"
              />
            </div>
          ),
          rowExpandable: (record) => record.batches.length > 0,
        }}
      />
    </div>
  );

  // Batch Table Columns (for expanded row)
  const batchColumns = [
    {
      title: 'Invoice Details',
      key: 'invoice_details',
      render: (_, record) => (
        <div style={{ minWidth: '180px' }}>
          {record.invoice_id ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                📄 {record.invoice_number || 'INTERNAL'}
              </div>
              {record.vendor_name && (
                <div style={{ fontSize: '11px', color: '#64748b' }}>🏢 {record.vendor_name}</div>
              )}
            </>
          ) : (
            <Tag color="warning">No Invoice</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Purchase Date',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Available',
      dataIndex: 'quantity_available',
      key: 'quantity_available',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => `₹${parseFloat(price).toFixed(2)}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditStock(record)}
            title="Edit Stock Item"
          />
          <Button
            type="link"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDeleteStock(record)}
            title="Delete Stock Item"
          />
          {!record.invoice_id ? (
            <Button
              type="link"
              icon={<LinkOutlined />}
              onClick={() => {
                setStockToLink(record);
                setIsLinkModalVisible(true);
              }}
            >
              Link Invoice
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div className="stock-management-container" style={{ padding: '16px 24px' }}>
      <div className="top-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 className="header-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
            Stock Management
          </h1>
          <Segmented
            options={[
              { label: 'All Items', value: 'ALL' },
              { label: 'Assets', value: 'ASSETS' },
              { label: 'Other Assets', value: 'OTHER ASSETS' },
            ]}
            value={mainCategory}
            onChange={setMainCategory}
            className="custom-segmented"
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by stock name"
            size="large"
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<img src="/icons/search.svg" alt="Search" style={{ width: 16, height: 16, marginRight: 4 }} />}
            className="custom-search-input"
            style={{ width: 280, maxWidth: '100%' }}
          />

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddModalVisible(true)} className="btn-new">
            Add Stock Item
          </Button>

          <Button icon={<DownloadOutlined />} onClick={handleExport} className="btn-edit-columns">
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {stockSummary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #1890ff', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => setActiveTabKey('all')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Total Items</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{stockSummary.total_items}</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #52c41a', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => setActiveTabKey('available')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserAddOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Available</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{stockSummary.total_available}</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #faad14', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => setActiveTabKey('low_stock')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <WarningOutlined style={{ fontSize: 24, color: '#faad14' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Low Stock</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{stockSummary.low_stock_count}</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters Row */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
        <Text strong>Category Filter:</Text>
        <Select
          value={filterCategory}
          onChange={setFilterCategory}
          style={{ width: 200 }}
          className="custom-select"
        >
          <Option value="all">All Categories</Option>
          <Option value="hardware">Hardware</Option>
          <Option value="software">Software</Option>
          <Option value="it_accessories">IT Accessories</Option>
          <Option value="other_assets">Other Assets</Option>
        </Select>
      </div>

      <Tabs
        activeKey={activeTabKey}
        className="asset-tabs"
        onChange={(key) => setActiveTabKey(key)}
      >
        <TabPane
          tab={
            <span>
              <img src="/icons/home.svg" alt="Total" style={{ width: 16, marginRight: 8 }} />
              Total
            </span>
          }
          key="all"
        >
          {renderStockTable()}
        </TabPane>
        <TabPane
          tab={
            <span>
              <img src="/icons/assign.svg" alt="Available" style={{ width: 16, marginRight: 8 }} />
              Available
            </span>
          }
          key="available"
        >
          {renderStockTable()}
        </TabPane>
        <TabPane
          tab={
            <span>
              <img src="/icons/stock.svg" alt="Low Stock" style={{ width: 16, marginRight: 8 }} />
              Low Stock
            </span>
          }
          key="low_stock"
        >
          {renderStockTable()}
        </TabPane>
      </Tabs>

      {/* Add Stock Modal */}
      <Modal
        title={selectedStockItem ? 'Edit Stock Item' : 'Add Stock Item'}
        open={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          setSelectedStockItem(null);
          setAddMethod('MANUAL');
          form.resetFields();
          importForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        {!selectedStockItem && (
          <Tabs
            activeKey={addMethod}
            onChange={(key) => setAddMethod(key)}
            centered
            style={{ marginBottom: '24px' }}
          >
            <TabPane tab="Add Manually" key="MANUAL">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleAddStock}
              >
                <Form.Item name="item_name" hidden>
                  <Input />
                </Form.Item>

                <div style={{ marginBottom: '16px' }}>
                  <Segmented
                    options={[
                      { label: 'IT Asset', value: 'ASSET' },
                      { label: 'Other Asset', value: 'OTHER' }
                    ]}
                    value={assetClass}
                    onChange={(value) => {
                      setAssetClass(value);
                      form.setFieldsValue({ asset_type_id: undefined, other_asset_type_id: undefined, item_name: undefined });
                    }}
                    style={{ marginBottom: 16 }}
                  />
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    {assetClass === 'ASSET' ? (
                      <Form.Item
                        name="asset_type_id"
                        label="Asset Type"
                        rules={[{ required: true, message: 'Please select asset type' }]}
                      >
                        <Select 
                          placeholder="Select IT asset type"
                          onChange={(value) => {
                            const selected = assetTypes.find(t => t.value === value);
                            if (selected) {
                              form.setFieldsValue({ item_name: selected.label });
                            }
                          }}
                        >
                          {assetTypes.map((type) => (
                            <Option key={type.value} value={type.value}>
                              {type.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    ) : (
                      <Form.Item
                        name="other_asset_type_id"
                        label="Other Asset Type"
                        rules={[{ required: true, message: 'Please select other asset type' }]}
                      >
                        <Select 
                          placeholder="Select other asset type"
                          onChange={(value) => {
                            const selected = otherAssetTypes.find(t => t.value === value);
                            if (selected) {
                              form.setFieldsValue({ item_name: selected.label });
                            }
                          }}
                        >
                          {otherAssetTypes.map((type) => (
                            <Option key={type.value} value={type.value}>
                              {type.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    )}
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="quantity_total"
                      label="Total Expected Quantity"
                      initialValue={0}
                      rules={[{ required: true, message: 'Please enter quantity' }]}
                    >
                      <Input type="number" min={0} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="unit_price"
                      label="Unit Price (INR)"
                      initialValue={0}
                      rules={[{ required: true, message: 'Please enter unit price' }]}
                    >
                      <Input type="number" min={0} step={0.01} prefix="₹" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="description"
                  label="Description"
                >
                  <Input.TextArea rows={3} placeholder="Item description" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '16px' }}>
                  <Button onClick={() => {
                    setIsAddModalVisible(false);
                    setSelectedStockItem(null);
                    setAddMethod('MANUAL');
                    form.resetFields();
                  }} style={{ marginRight: 8, borderRadius: '6px' }}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit" className="btn-new" style={{ borderRadius: '6px' }}>
                    {selectedStockItem ? 'Save Changes' : 'Create Stock Item'}
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
            <TabPane tab="Import from Invoice" key="INVOICE">
              <Form form={importForm} layout="vertical" onFinish={handleImportStock}>
                <Form.Item
                  name="import_invoice_id"
                  label="Select Invoice to Import"
                  rules={[{ required: true, message: 'Please select an invoice' }]}
                >
                  <Select placeholder="Search and select invoice" allowClear showSearch optionFilterProp="children">
                    {invoices.map((inv) => (
                      <Option key={inv.id} value={inv.id}>
                        {inv.invoice_number} - {inv.vendor_name} ({inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : 'N/A'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                  This will create stock items based on the selected invoice's line items.
                </Text>
                <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '16px' }}>
                  <Button onClick={() => setIsAddModalVisible(false)} style={{ marginRight: 8, borderRadius: '6px' }}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit" className="btn-new" style={{ borderRadius: '6px' }}>
                    Import Stock
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        )}

        {selectedStockItem && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddStock}
        >
          <Form.Item name="item_name" hidden initialValue={selectedStockItem.item_name}>
            <Input />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity_total"
                label="Total Expected Quantity"
                initialValue={selectedStockItem.quantity_total}
                rules={[{ required: true, message: 'Please enter quantity' }]}
              >
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_price"
                label="Unit Price (INR)"
                initialValue={selectedStockItem.unit_price}
                rules={[{ required: true, message: 'Please enter unit price' }]}
              >
                <Input type="number" min={0} step={0.01} prefix="₹" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            initialValue={selectedStockItem.description}
          >
            <Input.TextArea rows={3} placeholder="Item description" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '16px' }}>
            <Button onClick={() => {
              setIsAddModalVisible(false);
              setSelectedStockItem(null);
              setAddMethod('MANUAL');
              form.resetFields();
            }} style={{ marginRight: 8, borderRadius: '6px' }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" className="btn-new" style={{ borderRadius: '6px' }}>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
        )}

      </Modal>

      {/* Link Invoice Modal */}
      <Modal
        title={`Link Invoice to Stock`}
        open={isLinkModalVisible}
        onCancel={() => {
          setIsLinkModalVisible(false);
          linkForm.resetFields();
          setStockToLink(null);
        }}
        footer={null}
      >
        <Form form={linkForm} layout="vertical" onFinish={handleLinkInvoice}>
          <Form.Item
            name="invoice_id"
            label="Select Invoice"
            rules={[{ required: true, message: 'Please select an invoice' }]}
          >
            <Select placeholder="Search and select invoice" allowClear showSearch optionFilterProp="children">
              {invoices.map((inv) => (
                <Option key={inv.id} value={inv.id}>
                  {inv.invoice_number} - {inv.vendor_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '16px' }}>
            <Button 
              onClick={() => {
                setIsLinkModalVisible(false);
                linkForm.resetFields();
                setStockToLink(null);
              }} 
              style={{ marginRight: 8, borderRadius: '6px' }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" className="btn-new" style={{ borderRadius: '6px' }}>
              Link Invoice
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StockManagement;
