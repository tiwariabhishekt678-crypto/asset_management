import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Input, Select, Space, Tag, Card, Row, Col, Statistic, Modal, Form, notification, DatePicker, InputNumber, Upload, message, Divider, Empty, Checkbox, Tabs, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined, UploadOutlined, DeleteOutlined, EditOutlined, ShoppingCartOutlined, TeamOutlined, UserAddOutlined, UserDeleteOutlined, HomeOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';
import { REACT_BASE_URL } from '../config';
import './InvoiceManagement.css';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [form] = Form.useForm();
  const [invoiceStats, setInvoiceStats] = useState(null);
  const [assetTypes, setAssetTypes] = useState([]);
  const [otherAssetTypes, setOtherAssetTypes] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Fetch asset types for line items
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

  // Fetch other asset types for line items
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

  // Fetch invoices with pagination
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      let url = `${REACT_BASE_URL}/invoices/?page=${currentPage}&size=${pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.items);
        setTotalInvoices(data.total);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      if (error.message.includes('approval')) {
          Swal.fire('Request Sent', error.message, 'info');
      } else {
          notification.error({ message: 'Error', description: 'Failed to fetch invoices' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoice stats
  const fetchInvoiceStats = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/invoices/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoiceStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchInvoiceStats();
    fetchAssetTypes();
    fetchOtherAssetTypes();
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchInvoices();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle add line item
  const handleAddLineItem = () => {
    const newItem = {
      id: Date.now(),
      main_category: 'ASSETS',
      asset_type_id: null,
      quantity: 1,
      unit_price: 0,
      amount: 0,
      sku: '',
    };
    setLineItems([...lineItems, newItem]);
  };

  // Remove line item
  const handleRemoveLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Update line item
  const handleUpdateLineItem = (id, field, value) => {
    const updatedItems = lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // Reset asset_type_id when category changes
        if (field === 'main_category') {
          updated.asset_type_id = null;
        }

        // Calculate amount when quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          const qty = field === 'quantity' ? value : item.quantity;
          const price = field === 'unit_price' ? value : item.unit_price;
          updated.amount = parseFloat(qty || 0) * parseFloat(price || 0);
        }

        return updated;
      }
      return item;
    });
    setLineItems(updatedItems);
  };

  const handleSelectDocument = (file) => {
    const fileWithUid = {
      ...file,
      uid: file.uid || `${Date.now()}-${Math.random()}`,
      name: file.name,
      originFileObj: file.originFileObj || file,
    };
    setSelectedDocuments((prev) => [...prev, fileWithUid]);
    return false;
  };

  const handleRemoveSelectedDocument = (file) => {
    setSelectedDocuments((prev) => prev.filter((item) => item.uid !== file.uid));
  };

  const uploadInvoiceDocumentFile = async (file, invoiceId) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const formData = new FormData();
    const uploadFile = file.originFileObj || file;
    formData.append('document', uploadFile);

    return fetch(`${REACT_BASE_URL}/invoices/${invoiceId}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  };

  // Handle add invoice
  const handleAddInvoice = async (values) => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const formData = new FormData();

      if (lineItems.length === 0) {
        notification.error({ message: 'Error', description: 'Please add at least one line item' });
        return;
      }

      // Validate line items
      const invalidItems = lineItems.filter(item => !item.asset_type_id);
      if (invalidItems.length > 0) {
        notification.error({ 
          message: 'Validation Error', 
          description: 'Please select an asset type for all line items' 
        });
        return;
      }

      formData.append('invoice_number', values.invoice_number);
      formData.append('vendor_name', values.vendor_name);
      if (values.vendor_contact) formData.append('vendor_contact', values.vendor_contact);
      if (values.vendor_email) formData.append('vendor_email', values.vendor_email);
      formData.append('invoice_date', values.invoice_date.format('YYYY-MM-DD'));
      if (values.due_date) formData.append('due_date', values.due_date.format('YYYY-MM-DD'));

      const computedSubtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const computedTotal = values.total_amount !== undefined && values.total_amount !== null
        ? values.total_amount
        : computedSubtotal + Number(values.tax_amount || 0) + Number(values.shipping_cost || 0);

      formData.append('subtotal', computedSubtotal.toFixed(2));
      formData.append('tax_amount', values.tax_amount || 0);
      formData.append('tax_rate', values.tax_rate || 0);
      formData.append('shipping_cost', values.shipping_cost || 0);
      formData.append('total_amount', computedTotal.toFixed(2));
      formData.append('payment_status', values.payment_status || 'pending');
      if (values.payment_date) formData.append('payment_date', values.payment_date.format('YYYY-MM-DD'));
      if (values.payment_method) formData.append('payment_method', values.payment_method);
      if (values.warehouse_location) formData.append('warehouse_location', values.warehouse_location);
      if (values.received_date) formData.append('received_date', values.received_date.format('YYYY-MM-DD'));
      if (values.notes) formData.append('notes', values.notes);
      
      // Explicitly control add_to_stock flag
      if (values.add_to_stock) {
        formData.append('add_to_stock', 'true');
      }

      formData.append('line_items', JSON.stringify(lineItems));

      const response = await fetch(`${REACT_BASE_URL}/invoices/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const createdInvoice = await response.json();

        if (selectedDocuments.length > 0) {
          const uploadResults = await Promise.all(
            selectedDocuments.map((file) => uploadInvoiceDocumentFile(file, createdInvoice.id))
          );
          const failedUploads = uploadResults.filter((result) => !result.ok);
          if (failedUploads.length > 0) {
            message.warning(`${failedUploads.length} document upload(s) failed after invoice creation.`);
          }
        }

        Swal.fire({
          icon: 'success',
          title: 'Invoice created successfully',
          html: `Invoice <strong>${createdInvoice.invoice_number}</strong> has been created.<br/>Total: <strong>₹${parseFloat(createdInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>`,
          showCloseButton: true,
        });
        setIsAddModalVisible(false);
        form.resetFields();
        setLineItems([]);
        setSelectedDocuments([]);
        fetchInvoices();
        fetchInvoiceStats();
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('approval') || errorData.detail?.includes('approval')) {
          Swal.fire('Request Sent', errorData.message || errorData.detail, 'info');
        } else {
          let errorMessage = errorData.message || errorData.detail || 'Failed to create invoice';
          Swal.fire({
            icon: 'error',
            title: 'Failed to create invoice',
            text: errorMessage,
            showCloseButton: true,
          });
        }
      }
    } catch (error) {
      if (error.message.includes('approval')) {
        Swal.fire('Request Sent', error.message, 'info');
      } else {
        notification.error({ message: 'Error', description: error?.message || 'Failed to create invoice' });
      }
    }
  };

  const handleUpdateInvoice = async (values) => {
    try {
      if (!selectedInvoice) return;
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const formData = new FormData();

      if (values.invoice_number) formData.append('invoice_number', values.invoice_number);
      if (values.vendor_name) formData.append('vendor_name', values.vendor_name);
      if (values.vendor_contact) formData.append('vendor_contact', values.vendor_contact);
      if (values.vendor_email) formData.append('vendor_email', values.vendor_email);
      if (values.invoice_date) formData.append('invoice_date', values.invoice_date.format('YYYY-MM-DD'));
      if (values.due_date) formData.append('due_date', values.due_date.format('YYYY-MM-DD'));
      if (values.total_amount !== undefined && values.total_amount !== null) formData.append('total_amount', values.total_amount);
      if (values.subtotal !== undefined && values.subtotal !== null) formData.append('subtotal', values.subtotal);
      if (values.tax_amount !== undefined && values.tax_amount !== null) formData.append('tax_amount', values.tax_amount);
      if (values.shipping_cost !== undefined && values.shipping_cost !== null) formData.append('shipping_cost', values.shipping_cost);
      if (values.payment_status) formData.append('payment_status', values.payment_status);
      if (values.payment_date) formData.append('payment_date', values.payment_date.format('YYYY-MM-DD'));
      if (values.payment_method) formData.append('payment_method', values.payment_method);
      if (values.warehouse_location) formData.append('warehouse_location', values.warehouse_location);
      if (values.received_date) formData.append('received_date', values.received_date.format('YYYY-MM-DD'));
      if (values.notes) formData.append('notes', values.notes);

      if (selectedDocuments.length > 0) {
        selectedDocuments.forEach((file) => {
          const uploadFile = file.originFileObj || file;
          formData.append('documents', uploadFile);
        });
      }

      const response = await fetch(`${REACT_BASE_URL}/invoices/${selectedInvoice.id}/update`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const updatedInvoice = await response.json();
        Swal.fire({
          icon: 'success',
          title: 'Invoice updated successfully',
          html: `Invoice <strong>${updatedInvoice.invoice_number}</strong> has been updated.`,
          showCloseButton: true,
        });
        setIsAddModalVisible(false);
        setSelectedInvoice(null);
        form.resetFields();
        setLineItems([]);
        setSelectedDocuments([]);
        fetchInvoices();
        fetchInvoiceStats();
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('approval') || errorData.detail?.includes('approval')) {
          Swal.fire('Request Sent', errorData.message || errorData.detail, 'info');
        } else {
          let errorMessage = errorData.message || errorData.detail || 'Failed to update invoice';
          Swal.fire({
            icon: 'error',
            title: 'Failed to update invoice',
            text: errorMessage,
            showCloseButton: true,
          });
        }
      }
    } catch (error) {
      if (error.message.includes('approval')) {
        Swal.fire('Request Sent', error.message, 'info');
      } else {
        notification.error({ message: 'Error', description: error?.message || 'Failed to update invoice' });
      }
    }
  };

  const handleSaveInvoice = async (values) => {
    if (selectedInvoice) {
      await handleUpdateInvoice(values);
    } else {
      await handleAddInvoice(values);
    }
  };

  const handleOpenEditInvoice = (record) => {
    setSelectedInvoice(record);
    setIsAddModalVisible(true);
    form.setFieldsValue({
      invoice_number: record.invoice_number,
      vendor_name: record.vendor_name,
      vendor_contact: record.vendor_contact,
      vendor_email: record.vendor_email,
      invoice_date: record.invoice_date ? dayjs(record.invoice_date) : null,
      due_date: record.due_date ? dayjs(record.due_date) : null,
      subtotal: record.subtotal,
      tax_amount: record.tax_amount,
      shipping_cost: record.shipping_cost,
      total_amount: record.total_amount,
      payment_status: record.payment_status,
      payment_date: record.payment_date ? dayjs(record.payment_date) : null,
      payment_method: record.payment_method,
      warehouse_location: record.warehouse_location,
      received_date: record.received_date ? dayjs(record.received_date) : null,
      notes: record.notes,
    });
    setLineItems([]);
    setSelectedDocuments([]);
  };

  const handleDeleteInvoice = async (record) => {
    Swal.fire({
      title: 'Delete Invoice?',
      text: 'This will permanently delete the invoice if there are no linked assets or stock items.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const response = await fetch(`${REACT_BASE_URL}/invoices/${record.id}/delete`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || data.message || 'Failed to delete invoice');
          }
          Swal.fire('Deleted!', 'The invoice has been deleted.', 'success');
          fetchInvoices();
          fetchInvoiceStats();
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

  // Handle export
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/invoices/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      if (error.message.includes('approval')) {
        Swal.fire('Request Sent', error.message, 'info');
      } else {
        notification.error({ message: 'Error', description: 'Failed to export invoices' });
      }
    }
  };

  // Handle download invoice document
  const handleDownloadInvoice = async (invoiceId, invoiceNumber, documents = []) => {
    if (!documents || documents.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Document not available',
        text: 'No uploaded invoice document found for this invoice.',
        showCloseButton: true,
      });
      return;
    }

    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/invoices/${invoiceId}/download-document`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoiceNumber.replace(/\//g, '_')}_${documents[0]?.split(/[/\\]/).pop()}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        message.success('Invoice document downloaded successfully');
      } else {
        let errorText = 'Failed to download invoice document';
        try {
          const error = await response.json();
          errorText = error.detail || error.message || errorText;
        } catch (parseError) {
          const text = await response.text();
          if (text) errorText = text;
        }
        if (errorText.includes('approval')) {
          Swal.fire('Request Sent', errorText, 'info');
        } else {
          message.error(errorText);
        }
      }
    } catch (error) {
      message.error('Failed to download invoice document');
    }
  };

  // Handle upload invoice document
  const handleUploadDocument = async (file, invoiceId) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const formData = new FormData();
    const uploadFile = file.originFileObj || file;
    formData.append('document', uploadFile);

    try {
      const response = await fetch(`${REACT_BASE_URL}/invoices/${invoiceId}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        message.success('Document uploaded successfully');
        fetchInvoices();
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('approval') || errorData.detail?.includes('approval')) {
          Swal.fire('Request Sent', errorData.message || errorData.detail, 'info');
        } else {
          message.error(errorData.message || errorData.detail || 'Failed to upload document');
        }
      }
    } catch (error) {
      if (error.message.includes('approval')) {
        Swal.fire('Request Sent', error.message, 'info');
      } else {
        message.error('Failed to upload document');
      }
    }

    return false;
  };

  // Handle Add to Stock manually
  const handleAddInvoiceToStock = async (invoiceId) => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${REACT_BASE_URL}/invoices/${invoiceId}/add-to-stock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        message.success(data.message || 'Invoice added to stock successfully');
        fetchInvoices();
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('approval') || errorData.detail?.includes('approval')) {
          Swal.fire('Request Sent', errorData.message || errorData.detail, 'info');
        } else {
          message.error(errorData.message || errorData.detail || 'Failed to add invoice to stock');
        }
      }
    } catch (error) {
      console.error('Error adding invoice to stock:', error);
      if (error.message.includes('approval')) {
        Swal.fire('Request Sent', error.message, 'info');
      } else {
        message.error('Failed to add invoice to stock');
      }
    }
  };

  // Get available asset types based on category
  const getAssetTypeOptions = (category) => {
    if (category === 'OTHER ASSETS') {
      return otherAssetTypes;
    }
    return assetTypes.filter(type => ['hardware', 'software'].includes(type.category?.toLowerCase()));
  };

  // Memoized column filters generator
  const getColumnFilters = useCallback((dataIndex) => {
    const uniqueValues = [...new Set(invoices.map((item) => item[dataIndex]).filter(Boolean))];
    return uniqueValues.map((value) => ({ text: value, value }));
  }, [invoices]);

  // Table columns
  const columns = [
    {
      title: (
        <span>
          Invoice Number
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      sorter: (a, b) => (a.invoice_number || '').localeCompare(b.invoice_number || ''),
    },
    {
      title: (
        <span>
          Vendor
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'vendor_name',
      key: 'vendor_name',
      filters: getColumnFilters('vendor_name'),
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.vendor_name === value,
      sorter: (a, b) => (a.vendor_name || '').localeCompare(b.vendor_name || ''),
    },
    {
      title: (
        <span>
          Invoice Date
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : 'N/A',
      sorter: (a, b) => new Date(a.invoice_date) - new Date(b.invoice_date),
    },
    {
      title: (
        <span>
          Total Amount
          <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
        </span>
      ),
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      sorter: (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount),
    },
    {
      title: 'Warehouse',
      dataIndex: 'warehouse_location',
      key: 'warehouse_location',
      filters: getColumnFilters('warehouse_location'),
      filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
      onFilter: (value, record) => record.warehouse_location === value,
      render: (location) => location || 'N/A',
    },
    {
      title: 'Items',
      key: 'item_summary',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text size="small" type="secondary">Assets: {record.asset_count || 0}</Text>
          <Text size="small" type="secondary">Stock: {record.stock_count || 0}</Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadInvoice(record.id, record.invoice_number, record.documents)}
            title="Download Invoice"
            className="action-btn-blue"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditInvoice(record)}
            title="Edit Invoice"
            className="action-btn-gray"
          />
          <Button
            type="link"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDeleteInvoice(record)}
            title="Delete Invoice"
          />
          <Upload
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
            showUploadList={false}
            beforeUpload={(file) => handleUploadDocument(file, record.id)}
          >
            <Button type="link" icon={<UploadOutlined />} title="Upload Document" className="action-btn-green" />
          </Upload>
          {record.stock_count === 0 && record.line_items && record.line_items.length > 0 && (
            <Button
              type="link"
              icon={<ShoppingCartOutlined />}
              onClick={() => handleAddInvoiceToStock(record.id)}
              title="Add to Stock"
              className="action-btn-orange"
            />
          )}
        </Space>
      ),
    },
  ];

  // Reusable Table Component for Tabs
  const renderInvoiceTable = () => (
    <div className="invoice-table-container">
      <Table
        columns={columns}
        dataSource={invoices}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalInvoices,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`,
        }}
        scroll={{ x: 'max-content' }}
        className="invoice-table"
      />
    </div>
  );

  return (
    <div className="invoice-management-container" style={{ padding: '16px 24px' }}>
      <div className="top-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 className="header-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          Invoice Management
        </h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by invoice number or vendor"
            size="large"
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<img src="/icons/search.svg" alt="Search" style={{ width: 16, height: 16, marginRight: 4 }} />}
            className="custom-search-input"
            style={{ width: 300, maxWidth: '100%' }}
          />

          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedInvoice(null); setIsAddModalVisible(true); }} className="btn-new">
            Add Invoice
          </Button>

          <Button icon={<DownloadOutlined />} onClick={handleExport} className="btn-edit-columns">
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {invoiceStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #1890ff', borderRadius: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Total Invoices</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{invoiceStats.total_invoices}</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card 
              size="small" 
              style={{ borderLeft: '4px solid #52c41a', borderRadius: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingCartOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Total Amount</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>₹{parseFloat(invoiceStats.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {renderInvoiceTable()}

      {/* Add Invoice Modal */}
      <Modal
        title={selectedInvoice ? 'Edit Invoice' : 'Add Invoice'}
        open={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          setSelectedInvoice(null);
          form.resetFields();
          setLineItems([]);
          setSelectedDocuments([]);
        }}
        footer={null}
        width={1200}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveInvoice}
        >
          {/* Basic Invoice Info */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="invoice_number"
                label="Invoice Number"
                rules={[{ required: true, message: 'Please enter invoice number' }]}
              >
                <Input placeholder="e.g. INV-2024-001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="invoice_date"
                label="Invoice Date"
                rules={[{ required: true, message: 'Please select invoice date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vendor_name"
                label="Vendor Name"
                rules={[{ required: true, message: 'Please enter vendor name' }]}
              >
                <Input placeholder="Vendor name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="total_amount"
                label="Total Amount (₹)"
                rules={[{ required: true, message: 'Please enter total amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  prefix="₹"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/₹\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="warehouse_location"
                label="Warehouse Location"
                initialValue="IT Room"
              >
                <Input placeholder="e.g. IT Room" />
              </Form.Item>
            </Col>
          </Row>

          {!selectedInvoice && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="add_to_stock"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Checkbox>Add to Stock Items immediately</Checkbox>
                </Form.Item>
              </Col>
            </Row>
          )}

          {selectedInvoice ? (
            <div style={{ marginTop: 16, padding: 16, background: '#fffbe6', borderRadius: 8 }}>
              <Text type="secondary">
                Line items are not editable in edit mode. You can update invoice header details and upload new documents.
              </Text>
            </div>
          ) : (
            <>
              {/* Line Items Section */}
              <Divider orientation="left">Line Items (Asset Types)</Divider>
              
              <div className="line-items-section">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Items ({lineItems.length})</h4>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddLineItem}
              >
                Add Line Item
              </Button>
            </div>

            {lineItems.length === 0 ? (
              <Empty description="No line items added. Click 'Add Line Item' to start." />
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fafafa', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '8px', border: '1px solid #f0f0f0', width: '40px' }}>#</th>
                      <th style={{ padding: '8px', border: '1px solid #f0f0f0', width: '140px' }}>Category</th>
                      <th style={{ padding: '8px', border: '1px solid #f0f0f0', minWidth: '200px' }}>Asset Type</th>
                      <th style={{ padding: '8px', border: '1px solid #f0f0f0', width: '120px' }}>SKU</th>
                      <th style={{ padding: '8px', border: '1px solid #f0f0f0', width: '80px' }}>Qty</th>
                      <th style={{ padding: '8px', border: '1px solid #f0f0f0', width: '120px' }}>Unit Price</th>
                      <th style={{ padding: '8px', border: '1px solid #f0f0f0', width: '120px' }}>Amount</th>
                      <th style={{ padding: '8px', border: '1px solid #f0f0f0', width: '60px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => {
                      const availableOptions = getAssetTypeOptions(item.main_category);

                      return (
                        <tr key={item.id}>
                          <td style={{ padding: '8px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #f0f0f0' }}>
                            <Select
                              value={item.main_category}
                              onChange={(value) => handleUpdateLineItem(item.id, 'main_category', value)}
                              style={{ width: '100%' }}
                            >
                              <Option value="ASSETS">ASSETS</Option>
                              <Option value="OTHER ASSETS">OTHER ASSETS</Option>
                            </Select>
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #f0f0f0' }}>
                            <Select
                              placeholder={item.main_category === 'OTHER ASSETS' ? 'Select Other Asset' : 'Select Asset Type'}
                              value={item.asset_type_id || undefined}
                              onChange={(value) => handleUpdateLineItem(item.id, 'asset_type_id', value)}
                              style={{ width: '100%' }}
                              showSearch
                              optionFilterProp="children"
                              filterOption={(input, option) =>
                                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                              }
                            >
                              {availableOptions.map((type) => (
                                <Option key={type.value} value={type.value}>
                                  {type.label}
                                </Option>
                              ))}
                            </Select>
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #f0f0f0' }}>
                            <Input
                              placeholder="SKU"
                              value={item.sku}
                              onChange={(e) => handleUpdateLineItem(item.id, 'sku', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #f0f0f0' }}>
                            <InputNumber
                              min={1}
                              value={item.quantity}
                              onChange={(value) => handleUpdateLineItem(item.id, 'quantity', value)}
                              style={{ width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #f0f0f0' }}>
                            <InputNumber
                              min={0}
                              step={0.01}
                              value={item.unit_price}
                              onChange={(value) => handleUpdateLineItem(item.id, 'unit_price', value)}
                              style={{ width: '100%' }}
                              prefix="₹"
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(value) => value.replace(/₹\s?|(,*)/g, '')}
                            />
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #f0f0f0' }}>
                            <InputNumber
                              value={item.amount}
                              disabled
                              style={{ width: '100%' }}
                              prefix="₹"
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveLineItem(item.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ background: '#fafafa', fontWeight: 'bold' }}>
                    <tr>
                      <td colSpan="6" style={{ padding: '8px', border: '1px solid #f0f0f0', textAlign: 'right' }}>
                        Subtotal:
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #f0f0f0' }}>
                        ₹{lineItems.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #f0f0f0' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          </>
          )}

          {/* Invoice Documents Upload */}
          <Divider orientation="left">Invoice Documents</Divider>
          <Form.Item
            label="Upload Documents"
            extra="Upload invoice PDF, images, or other documents"
          >
            <Upload
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
              fileList={selectedDocuments}
              onRemove={handleRemoveSelectedDocument}
              beforeUpload={(file) => {
                const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
                const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.doc', '.docx'];
                if (!allowedExtensions.includes(extension)) {
                  message.error('Invalid file type!');
                  return Upload.LIST_IGNORE;
                }
                return handleSelectDocument(file);
              }}
            >
              <Button icon={<UploadOutlined />}>Select Files</Button>
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsAddModalVisible(false);
                form.resetFields();
                setLineItems([]);
                setSelectedDocuments([]);
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {selectedInvoice ? 'Save Changes' : 'Create Invoice'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceManagement;