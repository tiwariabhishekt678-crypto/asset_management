import React, { useState, useEffect } from 'react';
import {
    Button,
    Input,
    Select,
    Typography,
    Row,
    Col,
    message,
    DatePicker,
    Upload,
    Spin
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';
import './AddAssetForm.css';
import Swal from 'sweetalert2';

const { Option } = Select;
const { Title, Text } = Typography;

export default function AddAssetForm({ onBack, isOtherAssetPage = false }) {
    const [loading, setLoading] = useState(false);
    const [fieldsLoading, setFieldsLoading] = useState(false);
    const [assetTypes, setAssetTypes] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [stockItems, setStockItems] = useState([]);

    // Custom fields loaded from the API
    const [customFieldsSchema, setCustomFieldsSchema] = useState([]);

    const [formData, setFormData] = useState({
        assetTypeId: '',
        assetTypeName: '',
        assetCode: '',
        warrantyExpiry: null,
        companyId: '',
        location: 'IT Room',
        customFields: {},
        stockItemId: ''
    });

    const [documentFiles, setDocumentFiles] = useState([]);
    const [invoices, setInvoices] = useState([{
        invoiceNumber: '',
        vendorName: '',
        invoiceDate: null,
        totalAmount: '',
        fileList: []
    }]);

    const addInvoice = () => {
        setInvoices([...invoices, {
            invoiceNumber: '',
            vendorName: '',
            invoiceDate: null,
            totalAmount: '',
            fileList: []
        }]);
    };

    const removeInvoice = (index) => {
        const newInvoices = [...invoices];
        newInvoices.splice(index, 1);
        setInvoices(newInvoices);
    };

    const handleInvoiceChange = (index, field, value) => {
        const newInvoices = [...invoices];
        newInvoices[index][field] = value;
        setInvoices(newInvoices);
    };

    const handleInvoiceFilesChange = (index, fileList) => {
        const newInvoices = [...invoices];
        newInvoices[index].fileList = fileList;
        setInvoices(newInvoices);
    };

    useEffect(() => {
        fetchAssetTypes();
        fetchCompanies();
        fetchStockItems();
    }, [isOtherAssetPage]);

    const getAccessToken = () => {
        return (
            localStorage.getItem('access_token') ||
            sessionStorage.getItem('access_token')
        );
    };

    const fetchAssetTypes = async () => {
        try {
            const url = isOtherAssetPage 
                ? `${REACT_BASE_URL}/other-asset-types/dropdown`
                : `${REACT_BASE_URL}/asset-types/asset-types-dropdown`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                // Filter by category only if not already filtered by separate API
                // For other-asset-types, the API return already covers it, but we can double check
                const filtered = isOtherAssetPage ? data : data.filter(type => {
                    return ['hardware'].includes(type.category);
                });
                setAssetTypes(filtered);
            }
        } catch (error) {
            console.error('Failed to fetch asset types:', error);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await fetch(`${REACT_BASE_URL}/companies`);
            if (response.ok) {
                const data = await response.json();
                setCompanies(data);
                // Auto-select Amiand consulting by default
                const amiand = data.find(c => c.name && c.name.toLowerCase().includes('amiand consulting'));
                if (amiand) {
                    setFormData(prev => ({ ...prev, companyId: prev.companyId || amiand.id }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        }
    };

    const fetchStockItems = async () => {
        try {
            const token = getAccessToken();
            const response = await fetch(`${REACT_BASE_URL}/stock/items?status=available`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const stockList = Array.isArray(data) ? data : (data.items || []);
                const availableStocks = stockList.filter(item => item.quantity_available > 0);
                
                // Filter stock items based on asset type (IT Asset vs Other Asset)
                const filteredStocks = isOtherAssetPage
                    ? availableStocks.filter(item => item.other_asset_type_id) // Only other assets
                    : availableStocks.filter(item => item.asset_type_id); // Only IT assets
                
                setStockItems(filteredStocks);
            }
        } catch (error) {
            console.error('Failed to fetch stock items:', error);
        }
    };

    // ──────────────────────────────────────────────
    // Fetch dynamic fields for the selected asset type
    // ──────────────────────────────────────────────
    const fetchAssetTypeFields = async (assetTypeId) => {
        setFieldsLoading(true);
        try {
            const url = isOtherAssetPage
                ? `${REACT_BASE_URL}/other-asset-types/${assetTypeId}`
                : `${REACT_BASE_URL}/asset-types/asset-types/${assetTypeId}/fields`;
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch asset type fields');
            }

            const data = await response.json();

            // data.fields → array of {name, type, is_required, options}
            if (data.fields && Array.isArray(data.fields)) {
                setCustomFieldsSchema(data.fields);
            } else {
                setCustomFieldsSchema([]);
            }
        } catch (error) {
            console.error('Failed to fetch asset type fields:', error);
            setCustomFieldsSchema([]);
        } finally {
            setFieldsLoading(false);
        }
    };


    const handleInputChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCustomFieldChange = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            customFields: {
                ...prev.customFields,
                [name]: value
            }
        }));
    };

    // ──────────────────────────────────────────────
    // When the user picks an asset type → hit the API
    // ──────────────────────────────────────────────
    const handleAssetTypeChange = (typeId) => {
        const selectedType = assetTypes.find((type) => type.value === typeId);
        if (!selectedType) return;

        // Reset custom fields & schema, then fetch fresh ones
        setFormData((prev) => ({
            ...prev,
            assetTypeId: typeId,
            assetTypeName: selectedType.label,
            customFields: {} // clear old values
        }));

        setCustomFieldsSchema([]); // clear old schema while loading
        fetchAssetTypeFields(typeId);
    };

    // ──────────────────────────────────────────────
    // Submit
    // ──────────────────────────────────────────────
    const handleSubmit = async () => {
        // ── basic validations ──
        if (!formData.assetTypeId || !formData.assetCode) {
            message.error(
                'Please fill in required basic fields (Asset Type, Asset Code)'
            );
            return;
        }

        // ── validate required custom / dynamic fields ──
        for (const field of customFieldsSchema) {
            const value = formData.customFields[field.name];
            if (
                field.is_required &&
                (value === undefined || value === null || value === '')
            ) {
                message.error(`Please fill in the required field: ${field.name}`);
                return;
            }
        }

        const token = getAccessToken();
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Authentication token not found. Please log in again.'
            });
            return;
        }

        setLoading(true);

        try {
            const submitData = new FormData();
            if (isOtherAssetPage) {
                submitData.append('other_asset_type_id', formData.assetTypeId);
                submitData.append('other_asset_type_name', formData.assetTypeName);
            } else {
                submitData.append('asset_type_id', formData.assetTypeId);
                submitData.append('asset_type_name', formData.assetTypeName);
            }
            submitData.append('asset_code', formData.assetCode);
            submitData.append('is_other_asset', isOtherAssetPage ? 'true' : 'false');

            if (formData.warrantyExpiry) {
                submitData.append(
                    'warranty_expiry',
                    formData.warrantyExpiry.format('YYYY-MM-DD')
                );
            }
            if (formData.companyId) {
                submitData.append('company_id', formData.companyId);
            }
            if (formData.location) {
                submitData.append('location', formData.location);
            }

            if (formData.stockItemId) {
                submitData.append('stock_item_id', formData.stockItemId);
            }

            // ── Dynamic / Custom Fields ──
            submitData.append(
                'field_values',
                JSON.stringify(formData.customFields)
            );

            // Append document files
            documentFiles.forEach((file) => {
                submitData.append('documents', file.originFileObj);
            });

            const url = isOtherAssetPage 
                ? `${REACT_BASE_URL}/other-assets/create`
                : `${REACT_BASE_URL}/asset/create`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: submitData
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.message?.includes('approval') || result.detail?.includes('approval')) {
                    Swal.fire('Request Sent', result.message || result.detail, 'info').then(() => {
                        onBack();
                    });
                    return;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message || result.detail || 'Failed to create asset'
                });
                return;
            }

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Asset created successfully!'
            }).then(() => {
                onBack();
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text:
                    error.message || 'Something went wrong. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────────────────────
    // Render a single dynamic field based on its schema
    // ──────────────────────────────────────────────
    const renderDynamicField = (field) => {
        switch (field.type) {
            case 'dropdown':
                return (
                    <Select
                        className="asset-select"
                        placeholder={`Select ${field.name}`}
                        value={formData.customFields[field.name] || undefined}
                        onChange={(v) => handleCustomFieldChange(field.name, v)}
                        allowClear
                    >
                        {(field.options || []).map((opt) => (
                            <Option key={opt} value={opt}>
                                {opt}
                            </Option>
                        ))}
                    </Select>
                );

            case 'number':
                return (
                    <Input
                        type="number"
                        className="asset-input"
                        placeholder={`Enter ${field.name}`}
                        value={formData.customFields[field.name] || ''}
                        onChange={(e) =>
                            handleCustomFieldChange(field.name, e.target.value)
                        }
                    />
                );

            case 'date':
                return (
                    <DatePicker
                        className="asset-input"
                        style={{ width: '100%' }}
                        placeholder={`Select ${field.name}`}
                        onChange={(date, dateString) =>
                            handleCustomFieldChange(field.name, dateString)
                        }
                    />
                );

            case 'textarea':
                return (
                    <Input.TextArea
                        className="asset-input"
                        rows={3}
                        placeholder={`Enter ${field.name}`}
                        value={formData.customFields[field.name] || ''}
                        onChange={(e) =>
                            handleCustomFieldChange(field.name, e.target.value)
                        }
                    />
                );

            // text (default)
            default:
                return (
                    <Input
                        className="asset-input"
                        placeholder={`Enter ${field.name}`}
                        value={formData.customFields[field.name] || ''}
                        onChange={(e) =>
                            handleCustomFieldChange(field.name, e.target.value)
                        }
                    />
                );
        }
    };

    // ──────────────────────────────────────────────
    // JSX
    // ──────────────────────────────────────────────
    return (
        <div className="asset-form-wrapper">
            {/* HEADER */}
            <div className="asset-form-header">
                <div className="asset-header-left">
                    <Button
                        type="text"
                        size="large"
                        onClick={onBack}
                        className="asset-back-button"
                    >
                        <img
                            src="/icons/back.svg"
                            alt="Back"
                            className="asset-back-icon"
                        />
                    </Button>
                    <Title level={3} className="asset-header-title">
                        Add Asset
                    </Title>
                </div>
                <Button
                    type="primary"
                    size="large"
                    className="asset-submit-button"
                    onClick={handleSubmit}
                    loading={loading}
                >
                    <img
                        src="/icons/submittick.svg"
                        alt="Submit"
                        className="submit-icon"
                    />
                    Submit
                </Button>
            </div>

            {/* ─── SECTION 1 : BASIC INFORMATION ─── */}
            <div className="asset-section">
                <Title level={4} className="asset-section-title">
                    1. Basic Information
                </Title>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">
                            Asset Type <span style={{ color: 'red' }}>*</span>
                        </Text>
                        <Select
                            value={formData.assetTypeId || undefined}
                            onChange={handleAssetTypeChange}
                            placeholder="Select asset type"
                            className="asset-select"
                        >
                            {assetTypes.map((type) => (
                                <Option key={type.value} value={type.value}>
                                    {type.label}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">
                            Asset Code{' '}
                            <span style={{ color: 'red' }}>*</span>
                        </Text>
                        <Input
                            value={formData.assetCode}
                            onChange={(e) =>
                                handleInputChange('assetCode', e.target.value)
                            }
                            placeholder="e.g. LPT-001"
                            className="asset-input"
                        />
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">
                            Company
                        </Text>
                        <Select
                            value={formData.companyId || undefined}
                            onChange={(v) => handleInputChange('companyId', v)}
                            placeholder="Select company"
                            className="asset-select"
                        >
                            {companies.map((company) => (
                                <Option key={company.id} value={company.id}>
                                    {company.name}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">
                            Location
                        </Text>
                        <Input
                            value={formData.location}
                            onChange={(e) =>
                                handleInputChange('location', e.target.value)
                            }
                            placeholder="e.g. Head Office, IT Dept"
                            className="asset-input"
                        />
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">
                            Warranty Expiry
                        </Text>
                        <DatePicker
                            className="asset-input"
                            style={{ width: '100%' }}
                            value={formData.warrantyExpiry}
                            onChange={(date) =>
                                handleInputChange('warrantyExpiry', date)
                            }
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">
                            Asset Documents
                        </Text>
                        <Upload
                            multiple
                            beforeUpload={() => false}
                            onChange={({ fileList }) =>
                                setDocumentFiles(fileList)
                            }
                            fileList={documentFiles}
                        >
                            <Button icon={<UploadOutlined />}>
                                Upload Documents (PDF, IMG, etc.)
                            </Button>
                        </Upload>
                    </Col>
                </Row>
            </div>

            {/* ─── SECTION 2 : DYNAMIC ASSET-TYPE FIELDS ─── */}
            {fieldsLoading && (
                <div className="asset-section" style={{ textAlign: 'center' }}>
                    <Spin tip="Loading fields..." />
                </div>
            )}

            {!fieldsLoading && customFieldsSchema.length > 0 && (
                <div className="asset-section">
                    <Title level={4} className="asset-section-title">
                        2. Technical Specifications ({formData.assetTypeName})
                    </Title>
                    <Row gutter={24}>
                        {customFieldsSchema.map((field, idx) => (
                            <Col xs={24} md={12} key={idx}>
                                <Text strong className="asset-label">
                                    {field.name}{' '}
                                    {field.is_required && (
                                        <span style={{ color: 'red' }}>*</span>
                                    )}
                                </Text>
                                {renderDynamicField(field)}
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* ─── SECTION 3 : LINK FROM STOCK ─── */}
            <div className="asset-section">
                <Title level={4} className="asset-section-title">
                    {customFieldsSchema.length > 0 ? '3.' : '2.'} Link from Stock
                    {!isOtherAssetPage && (
                        <span style={{ color: '#999', fontSize: 13, fontWeight: 400, marginLeft: 8 }}>(Optional)</span>
                    )}
                </Title>
                <Row gutter={24}>
                    <Col xs={24} md={16}>
                        <Text strong className="asset-label">
                            Available Stock Item
                        </Text>
                        <Select
                            value={formData.stockItemId || undefined}
                            onChange={(v) => handleInputChange('stockItemId', v)}
                            placeholder={isOtherAssetPage ? 'Select a stock item' : 'Select a stock item (optional)'}
                            className="asset-select"
                            showSearch
                            optionFilterProp="children"
                            allowClear
                        >
                            {stockItems.map((item) => (
                                <Option key={item.id} value={item.id}>
                                    {item.item_name} ({item.sku || 'N/A'}) — Qty: {item.quantity_available} | {item.invoice_number ? `Inv: ${item.invoice_number}` : 'No Invoice'}
                                </Option>
                            ))}
                        </Select>
                        <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
                            Selecting a stock item will automatically link its invoice details and decrease available stock by 1.
                        </Text>
                    </Col>
                </Row>
            </div>
        </div>
    );
}