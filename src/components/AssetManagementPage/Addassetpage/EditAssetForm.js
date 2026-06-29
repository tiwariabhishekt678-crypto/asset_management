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
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';
import './AddAssetForm.css';
import Swal from 'sweetalert2';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;


export default function EditAssetForm({ onBack, editRecord, isOtherAssetPage = false }) {
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [assetTypes, setAssetTypes] = useState([]);
    const [companies, setCompanies] = useState([]);

    const [stockItems, setStockItems] = useState([]);
    const [availableOtherAssets, setAvailableOtherAssets] = useState([]);

    const [statusOptions, setStatusOptions] = useState([]);
    const [fieldsLoading, setFieldsLoading] = useState(false);
    const [customFieldsSchema, setCustomFieldsSchema] = useState([]);

    const [formData, setFormData] = useState({
        assetTypeId: '',
        assetTypeName: '',
        assetCode: '',
        warrantyExpiry: null,
        companyId: '',
        location: '',
        assetStatus: '',
        remarks: '',
        customFields: {},
        stockItemId: '',
        upgradeLinks: [] // [{ field_name: '', asset_id: '' }]
    });

    const [documentFiles, setDocumentFiles] = useState([]);

    useEffect(() => {
        fetchAssetTypes();
        fetchCompanies();
        fetchStatusOptions();
        fetchStockItems();
        if (!isOtherAssetPage) {
            fetchAvailableOtherAssets();
        }
    }, []);

    // Wait until we have basic options, then fetch the asset
    useEffect(() => {
        // We only wait for editRecord.id, the dropdowns can populate in parallel
        if (editRecord?.id) {
            fetchAssetData(editRecord.id);
        } else if (!editRecord?.id) {
            setFetchingData(false);
        }
    }, [editRecord]);

    useEffect(() => {
        if (assetTypes.length > 0 && formData.assetTypeId) {
            const t = assetTypes.find(item => (item.id === formData.assetTypeId || item.value === formData.assetTypeId));
            if (t) {
                setFormData(prev => ({ ...prev, assetTypeName: t.name || t.label }));
            }
        }
    }, [assetTypes, formData.assetTypeId]);

    const getAccessToken = () => {
        return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    };

    const fetchAssetTypes = async () => {
        try {
            const url = isOtherAssetPage 
                ? `${REACT_BASE_URL}/other-asset-types/dropdown`
                : `${REACT_BASE_URL}/asset-types/asset-types-dropdown`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
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
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        }
    };

    const fetchStatusOptions = async () => {
        try {
            const response = await fetch(`${REACT_BASE_URL}/asset/status-options`);
            if (response.ok) {
                const data = await response.json();
                setStatusOptions(data);
            }
        } catch (error) {
            console.error('Failed to fetch status options:', error);
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
                
                const filteredStocks = isOtherAssetPage
                    ? availableStocks.filter(item => item.other_asset_type_id)
                    : availableStocks.filter(item => item.asset_type_id);
                
                setStockItems(filteredStocks);
            }
        } catch (error) {
            console.error('Failed to fetch stock items:', error);
        }
    };

    const fetchAvailableOtherAssets = async () => {
        try {
            const token = getAccessToken();
            const response = await fetch(`${REACT_BASE_URL}/other-assets/available`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAvailableOtherAssets(data);
            }
        } catch (error) {
            console.error('Failed to fetch available other assets:', error);
        }
    };

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

            if (data.fields && Array.isArray(data.fields)) {
                setCustomFieldsSchema(data.fields);
            } else {
                setCustomFieldsSchema([]);
            }
        } catch (error) {
            console.error('Failed to fetch asset type fields:', error);
            message.error('Could not load fields for the selected asset type');
            setCustomFieldsSchema([]);
        } finally {
            setFieldsLoading(false);
        }
    };

    const fetchAssetData = async (assetId) => {
        try {
            const url = isOtherAssetPage
                ? `${REACT_BASE_URL}/other-assets/${assetId}`
                : `${REACT_BASE_URL}/asset/${assetId}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${getAccessToken()}`
                }
            });
            if (response.ok) {
                const data = await response.json();

                const actualTypeId = isOtherAssetPage ? data.other_asset_type_id : data.asset_type_id;

                setFormData({
                    assetTypeId: actualTypeId,
                    assetCode: data.asset_code,
                    warrantyExpiry: data.warranty_expiry ? moment(data.warranty_expiry) : null,
                    companyId: data.company_id || '',
                    location: data.location || '',
                    assetStatus: data.asset_status || '',
                    customFields: data.tech_specs || {},
                    stockItemId: data.stock_item_id || '', 
                    upgradeLinks: !isOtherAssetPage ? (data.upgrades || []).map(u => ({
                        field_name: u.parent_field,
                        asset_id: u.id
                    })) : []
                });
                
                // If the linked stock item is not in the list of available ones, fetch it specifically
                if (data.stock_item_id) {
                    setStockItems(prev => {
                        const exists = prev.some(s => s.id === data.stock_item_id);
                        if (!exists) {
                            // We need to fetch it. Since we are in a sync-like block, we'll do it separately
                            fetchStockItemById(data.stock_item_id);
                        }
                        return prev;
                    });
                }

                // If some current upgrades are not in the "available" list (because they are linked), 
                // we should add them to available list so they appear in the dropdown as selected
                if (!isOtherAssetPage && data.upgrades && data.upgrades.length > 0) {
                    setAvailableOtherAssets(prev => {
                        const existingIds = new Set(prev.map(a => a.id));
                        const newItems = data.upgrades.filter(u => !existingIds.has(u.id)).map(u => ({
                            id: u.id,
                            asset_code: u.asset_code,
                            name: u.name,
                            type: u.type_name
                        }));
                        return [...prev, ...newItems];
                    });
                }

                // Initial fetch of fields
                if (actualTypeId) {
                    fetchAssetTypeFields(actualTypeId);
                }
            }
        } catch (error) {
            console.error("Failed to load asset data", error);
        } finally {
            setFetchingData(false);
        }
    };

    const fetchStockItemById = async (id) => {
        try {
            const token = getAccessToken();
            const response = await fetch(`${REACT_BASE_URL}/stock/items/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const item = await response.json();
                setStockItems(prev => {
                    const exists = prev.some(s => s.id === item.id);
                    if (!exists) return [...prev, item];
                    return prev;
                });
            }
        } catch (err) {
            console.error("Failed to fetch specific stock item", err);
        }
    };

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const normalizeFieldKey = (key) =>
        String(key || '').toLowerCase().replace(/[\s_-]+/g, '');

    const getCustomFieldKey = (name) => {
        const customFields = formData.customFields || {};
        if (Object.prototype.hasOwnProperty.call(customFields, name)) {
            return name;
        }

        const normalizedName = normalizeFieldKey(name);
        return Object.keys(customFields).find(
            (key) => normalizeFieldKey(key) === normalizedName
        ) || name;
    };

    const getCustomFieldValue = (name) => {
        const key = getCustomFieldKey(name);
        return formData.customFields?.[key];
    };

    const handleCustomFieldChange = (name, value) => {
        const key = getCustomFieldKey(name);
        setFormData(prev => ({
            ...prev,
            customFields: {
                ...prev.customFields,
                [key]: value
            }
        }));
    };

    const handleSubmit = async () => {
        const token = getAccessToken();
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Authentication token not found.',
            });
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: 'Confirm Asset Update',
            html: `
              <div style="text-align: left; margin-bottom: 12px;">
                <label style="font-size: 14px; font-weight: bold;">Current/Update Location:</label>
                <input id="swal-input-location" class="swal2-input" style="width: 100%; box-sizing: border-box; margin: 0; margin-top: 6px;" placeholder="e.g. Head Office" value="${formData.location || ''}">
              </div>
              <div style="text-align: left;">
                <label style="font-size: 14px; font-weight: bold;">Remarks / Change Reason (Required):</label>
                <textarea id="swal-input-remarks" class="swal2-textarea" style="width: 100%; box-sizing: border-box; margin: 0; margin-top: 6px;" placeholder="What changes did you make and why?"></textarea>
              </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, update asset!',
            preConfirm: () => {
                const remarks = document.getElementById('swal-input-remarks').value;
                const location = document.getElementById('swal-input-location').value;
                if (!remarks) {
                    Swal.showValidationMessage('Please provide a remark for the update log.');
                    return false;
                }
                return { location, remarks };
            }
        });

        if (!formValues) return;

        setLoading(true);

        try {
            const submitData = new FormData();
            if (formData.assetCode) submitData.append('asset_code', formData.assetCode);
            if (formData.warrantyExpiry) submitData.append('warranty_expiry', formData.warrantyExpiry.format('YYYY-MM-DD'));
            if (formData.companyId) submitData.append('company_id', formData.companyId);
            
            submitData.append('location', formValues.location);
            submitData.append('remarks', formValues.remarks);
            
            if (formData.assetStatus) submitData.append('asset_status', formData.assetStatus);
            if (formData.stockItemId) submitData.append('stock_item_id', formData.stockItemId);

            if (formData.customFields) submitData.append('field_values', JSON.stringify(formData.customFields));

            if (!isOtherAssetPage) {
                const validLinks = (formData.upgradeLinks || []).filter(link => link.field_name && link.asset_id);
                submitData.append('upgrade_links', JSON.stringify(validLinks));
            }

            documentFiles.forEach(file => {
                submitData.append('documents', file.originFileObj);
            });

            const url = isOtherAssetPage
                ? `${REACT_BASE_URL}/other-assets/${editRecord.id}/update`
                : `${REACT_BASE_URL}/asset/${editRecord.id}/update`;

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
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
                    text: result.message || result.detail || 'Failed to update asset',
                });
                return;
            }

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Asset updated successfully!',
            }).then(() => {
                onBack();
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: error.message || 'Something went wrong.',
            });
        } finally {
            setLoading(false);
        }
    };

    const renderDynamicField = (field) => {
        switch (field.type) {
            case 'dropdown':
                return (
                    <Select
                        className="asset-select"
                        placeholder={`Select ${field.name}`}
                        value={getCustomFieldValue(field.name) || undefined}
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
                        value={getCustomFieldValue(field.name) || ''}
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
                        value={getCustomFieldValue(field.name) ? moment(getCustomFieldValue(field.name)) : null}
                        onChange={(date, dateString) =>
                            handleCustomFieldChange(field.name, dateString)
                        }
                    />
                );

            case 'textarea':
                return (
                    <TextArea
                        className="asset-input"
                        rows={3}
                        placeholder={`Enter ${field.name}`}
                        value={getCustomFieldValue(field.name) || ''}
                        onChange={(e) =>
                            handleCustomFieldChange(field.name, e.target.value)
                        }
                    />
                );

            default:
                return (
                    <Input
                        className="asset-input"
                        placeholder={`Enter ${field.name}`}
                        value={getCustomFieldValue(field.name) || ''}
                        onChange={(e) =>
                            handleCustomFieldChange(field.name, e.target.value)
                        }
                    />
                );
        }
    };

    if (fetchingData) return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;


    return (
        <div className="asset-form-wrapper">
            <div className="asset-form-header">
                <div className="asset-header-left">
                    <Button type="text" size="large" onClick={onBack} className="asset-back-button">
                        <img src="/icons/back.svg" alt="Back" className="asset-back-icon" />
                    </Button>
                    <Title level={3} className="asset-header-title">Edit Asset</Title>
                </div>
                <Button
                    type="primary"
                    size="large"
                    className="asset-submit-button"
                    onClick={handleSubmit}
                    loading={loading}
                >
                    <img src="/icons/submittick.svg" alt="Submit" className="submit-icon" />
                    Update
                </Button>
            </div>

            <div className="asset-section">
                <Title level={4} className="asset-section-title">1. Basic Information</Title>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Asset Type (Not Editable)</Text>
                        <Input disabled value={formData.assetTypeName || formData.assetTypeId} className="asset-input" />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Asset Code <span style={{ color: 'red' }}>*</span></Text>
                        <Input
                            value={formData.assetCode}
                            onChange={(e) => handleInputChange('assetCode', e.target.value)}
                            className="asset-input"
                        />
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Company</Text>
                        <Select
                            value={formData.companyId}
                            onChange={(v) => handleInputChange('companyId', v)}
                            className="asset-select"
                        >
                            {companies.map(company => (
                                <Option key={company.id} value={company.id}>
                                    {company.name}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Location</Text>
                        <Input
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className="asset-input"
                        />
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Warranty Expiry</Text>
                        <DatePicker
                            className="asset-input"
                            style={{ width: '100%' }}
                            value={formData.warrantyExpiry}
                            onChange={(date) => handleInputChange('warrantyExpiry', date)}
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Status</Text>
                        <Select
                            value={formData.assetStatus}
                            onChange={(v) => handleInputChange('assetStatus', v)}
                            className="asset-select"
                            placeholder="Select Status"
                        >
                            {statusOptions.map(opt => (
                                <Option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Asset Documents</Text>
                        <Upload
                            multiple
                            beforeUpload={() => false}
                            onChange={({ fileList }) => setDocumentFiles(fileList)}
                            fileList={documentFiles}
                        >
                            <Button icon={<UploadOutlined />}>Upload Documents (PDF, IMG, etc.)</Button>
                        </Upload>
                    </Col>
                </Row>
            </div>

            {/* SECTION 2: DYNAMIC ASSET-TYPE FIELDS */}
            {fieldsLoading && (
                <div className="asset-section" style={{ textAlign: 'center' }}>
                    <Spin tip="Loading fields..." />
                </div>
            )}

            {!fieldsLoading && customFieldsSchema.length > 0 && (
                <div className="asset-section">
                    <Title level={4} className="asset-section-title">2. Technical Specifications ({formData.assetTypeName})</Title>

                    <Row gutter={24}>
                        {customFieldsSchema.map((field, idx) => (
                            <Col xs={24} md={12} key={idx}>
                                <Text strong className="asset-label">
                                    {field.name} {field.is_required && <span style={{ color: 'red' }}>*</span>}
                                </Text>
                                {renderDynamicField(field)}
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* SECTION 3: UPGRADES (ROW-BASED) */}
            {!isOtherAssetPage && (
                <div className="asset-section">
                    <Title level={4} className="asset-section-title">
                        {customFieldsSchema.length > 0 ? '3.' : '2.'} Linked Hardware Components (Upgrades)
                        <span style={{ color: '#999', fontSize: 13, fontWeight: 400, marginLeft: 8 }}>(Optional)</span>
                    </Title>
                    
                    <div className="upgrades-list">
                        {(formData.upgradeLinks || []).map((link, index) => (
                            <Row gutter={16} key={index} style={{ marginBottom: 12, alignItems: 'center' }}>
                                <Col span={10}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Specification Field</Text>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select Field (e.g. RAM)"
                                        value={link.field_name}
                                        onChange={(v) => {
                                            const newLinks = [...formData.upgradeLinks];
                                            newLinks[index].field_name = v;
                                            setFormData(prev => ({ ...prev, upgradeLinks: newLinks }));
                                        }}
                                    >
                                        {customFieldsSchema.map(f => (
                                            <Option key={f.name} value={f.name}>{f.name}</Option>
                                        ))}
                                    </Select>
                                </Col>
                                <Col span={10}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Component to Link</Text>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select Component..."
                                        value={link.asset_id}
                                        showSearch
                                        optionFilterProp="children"
                                        onChange={(v) => {
                                            const newLinks = [...formData.upgradeLinks];
                                            newLinks[index].asset_id = v;
                                            setFormData(prev => ({ ...prev, upgradeLinks: newLinks }));
                                        }}
                                    >
                                        {availableOtherAssets.map(item => (
                                            <Option key={item.id} value={item.id}>
                                                {item.name} ({item.asset_code})
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>
                                <Col span={4} style={{ paddingTop: 20 }}>
                                    <Button 
                                        danger 
                                        icon={<DeleteOutlined />} 
                                        onClick={() => {
                                            const newLinks = formData.upgradeLinks.filter((_, i) => i !== index);
                                            setFormData(prev => ({ ...prev, upgradeLinks: newLinks }));
                                        }}
                                    />
                                </Col>
                            </Row>
                        ))}
                        
                        <Button 
                            type="dashed" 
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    upgradeLinks: [...prev.upgradeLinks, { field_name: '', asset_id: '' }]
                                }));
                            }}
                            icon={<PlusOutlined />}
                            style={{ width: '100%', marginTop: 8 }}
                        >
                            Add Component Link
                        </Button>
                    </div>
                </div>
            )}

            {/* SECTION 3: LINK FROM STOCK */}
            <div className="asset-section">
                <Title level={4} className="asset-section-title">
                    {customFieldsSchema.length > 0 ? '3.' : '2.'} Link from Stock
                    <span style={{ color: '#999', fontSize: 13, fontWeight: 400, marginLeft: 8 }}>(Optional)</span>
                </Title>
                <Row gutter={24}>
                    <Col xs={24} md={16}>
                        <Text strong className="asset-label">Available Stock Item</Text>
                        <Select
                            value={formData.stockItemId || undefined}
                            onChange={(v) => handleInputChange('stockItemId', v)}
                            placeholder={'Select a stock item (optional)'}
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
