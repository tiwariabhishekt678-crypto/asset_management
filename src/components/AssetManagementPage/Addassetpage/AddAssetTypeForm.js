import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  Modal,
  Table,
  Space,
  Radio,
  Typography,
  Row,
  Col,
  message
} from 'antd';
import { REACT_BASE_URL } from '../../config';
import './AddAssetTypeForm.css';
import Swal from 'sweetalert2';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const assetCategoryOptions = [
  { label: "Hardware", value: "hardware" },
  { label: "Software", value: "software" },
  { label: "IT Accessories", value: "it_accessories" },
  { label: "Other Assets", value: "other_assets" }
];

export default function AddAssetTypeForm({ onBack, isOtherAssetPage = false, selectedType = null }) {
  const [formData, setFormData] = useState({
    assetTypeName: selectedType ? selectedType.name : '',
    assetCategory: selectedType ? selectedType.category : (isOtherAssetPage ? 'it_accessories' : 'hardware'),
    description: selectedType ? selectedType.description : ''
  });

  const [customFields, setCustomFields] = useState([
    { id: 1, fieldLabel: 'Brand', fieldType: 'Text', required: true, dropdownOptions: [] },
    { id: 2, fieldLabel: 'Model Name', fieldType: 'Text', required: true, dropdownOptions: [] }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedType) {
      const fetchFields = async () => {
        try {
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const url = isOtherAssetPage
            ? `${REACT_BASE_URL}/other-asset-types/${selectedType.id}`
            : `${REACT_BASE_URL}/asset-types/asset-types/${selectedType.id}/fields`;
          
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            // Regular asset fields are in data.fields, other asset detail already has fields
            const fields = data.fields || [];
            if (fields.length > 0) {
              setCustomFields(fields.map((f, index) => ({
                id: index + 1,
                fieldLabel: f.name,
                fieldType: f.type.charAt(0).toUpperCase() + f.type.slice(1),
                required: f.is_required,
                dropdownOptions: f.options || []
              })));
            }
          }
        } catch (error) {
          console.error('Error fetching fields:', error);
        }
      };
      fetchFields();
    }
  }, [selectedType, isOtherAssetPage]);

  const filteredCategoryOptions = isOtherAssetPage
    ? assetCategoryOptions.filter(opt => ['software', 'it_accessories', 'other_assets'].includes(opt.value))
    : assetCategoryOptions.filter(opt => ['hardware'].includes(opt.value));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const [modalData, setModalData] = useState({
    fieldLabel: '',
    fieldType: 'Dropdown',
    required: false,
    dropdownOptions: []
  });

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (field = null) => {
    if (field) {
      setEditingField(field.id);
      setModalData({
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        required: field.required,
        dropdownOptions: field.dropdownOptions || []
      });
    } else {
      setEditingField(null);
      setModalData({ fieldLabel: '', fieldType: 'Dropdown', required: false, dropdownOptions: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingField(null);
    setModalData({ fieldLabel: '', fieldType: 'Dropdown', required: false, dropdownOptions: [] });
  };

  const saveField = () => {
    if (!modalData.fieldLabel.trim()) return;
    const fieldData = {
      id: editingField || Date.now(),
      fieldLabel: modalData.fieldLabel,
      fieldType: modalData.fieldType,
      required: modalData.required,
      dropdownOptions: modalData.fieldType === 'Dropdown'
        ? modalData.dropdownOptions.filter(opt => opt && opt.trim())
        : []
    };
    if (editingField) {
      setCustomFields(prev => prev.map(field => field.id === editingField ? fieldData : field));
    } else {
      setCustomFields(prev => [...prev, fieldData]);
    }
    closeModal();
  };

  const deleteField = (id) => {
    setCustomFields(prev => prev.filter(field => field.id !== id));
  };

  const getAccessToken = () => {
    return (
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token')
    );
  };

const handleSubmit = async () => {
  if (!formData.assetTypeName || !formData.assetCategory) {
    message.error('Please fill in all required fields');
    return;
  }

  const token = getAccessToken();
  if (!token) {
    Swal.fire({
      icon: 'error',
      title: 'Unauthorized',
      text: 'Authentication token not found. Please log in again.',
    });
    return;
  }

  setLoading(true);

  const payload = {
    name: formData.assetTypeName,
    description: formData.description,
    category: formData.assetCategory,
    fields: customFields.map(field => ({
      name: field.fieldLabel,
      type: field.fieldType.toLowerCase(),
      is_required: field.required,
      options: field.fieldType === 'Dropdown' ? field.dropdownOptions : undefined
    })).filter(field => field.name)
  };

  try {
    let url = isOtherAssetPage 
      ? `${REACT_BASE_URL}/other-asset-types/create`
      : `${REACT_BASE_URL}/asset-types/create`;
    
    let method = 'POST';
    if (selectedType) {
      method = 'PUT';
      url = isOtherAssetPage
        ? `${REACT_BASE_URL}/other-asset-types/${selectedType.id}`
        : `${REACT_BASE_URL}/asset-types/${selectedType.id}`;
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
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
        text: result.message || result.detail || 'Failed to save asset type',
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: result.message || 'Asset type saved successfully',
    });

    onBack();

  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Network Error',
      text: error.message || 'Something went wrong. Please try again.',
    });
  } finally {
    setLoading(false);
  }
};


  const columns = [
    {
      title: 'Field Label',
      dataIndex: 'fieldLabel',
      key: 'fieldLabel',
      width: '20%',
      render: (text) => <span className="asset-type-field-label">{text}</span>
    },
    {
      title: 'Field Type',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: '15%',
    },
    {
      title: 'Required?',
      dataIndex: 'required',
      key: 'required',
      width: '10%',
      render: (required) => required ? 'Yes' : 'No',
    },
    {
      title: 'Dropdown Options',
      dataIndex: 'dropdownOptions',
      key: 'dropdownOptions',
      width: '35%',
      render: (options, record) => {
        if (record.fieldType === 'Dropdown' && options?.length > 0) {
          return options.join(', ');
        }
        return '-';
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '20%',
      render: (_, record) => (
        <Space>
          <Button type="text" size="small" onClick={() => openModal(record)} className="asset-type-icon-button">
            <img src="/icons/editassettype.svg" alt="Edit" className="icon" />
          </Button>
          <Button type="text" size="small" onClick={() => deleteField(record.id)} className="asset-type-icon-button">
            <img src="/icons/deleteasset.svg" alt="Delete" className="icon" />
          </Button>
        </Space>
      )
    },
  ];

  return (
    <div className="asset-type-form-wrapper">
      {/* --- HEADER --- */}
      <div className="asset-type-form-header">
        <div className="asset-type-header-left">
          <Button type="text" size="large" onClick={onBack} className="asset-type-back-button">
            <img src="/icons/back.svg" alt="Back" className="asset-type-back-icon" />
          </Button>
          <Title level={3} className="asset-type-header-title">{selectedType ? 'Edit' : 'Add'} {isOtherAssetPage ? 'Other Asset Type' : 'Asset Type'}</Title>
        </div>
        <Space size="middle">
          <Button
            size="large"
            className="asset-type-preview-button"
            onClick={() => setIsPreviewModalOpen(true)}
          >
            <img src="/icons/preview.svg" alt="Preview" className="icon" />
            Preview
          </Button>
          <Button 
            type="primary" 
            size="large" 
            className="asset-type-submit-button" 
            onClick={handleSubmit}
            loading={loading}
          >
            <img src="/icons/submittick.svg" alt="Submit" className="submit-icon" />
            Submit
          </Button>
        </Space>
      </div>

      {/* --- BASIC INFORMATION SECTION --- */}
      <div className="asset-type-section">
        <Title level={4} className="asset-type-section-title">1. Basic Information</Title>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Text strong className="asset-type-label">{isOtherAssetPage ? 'Other Asset Type Name' : 'Asset Type Name'}</Text>
            <Input
              value={formData.assetTypeName}
              onChange={(e) => handleInputChange('assetTypeName', e.target.value)}
              placeholder={`Enter ${isOtherAssetPage ? 'other ' : ''}asset type name`}
              className="asset-type-input"
            />
          </Col>
          <Col xs={24} md={12}>
            <Text strong className="asset-type-label">{isOtherAssetPage ? 'Other Asset Category' : 'Asset Category'}</Text>
            <Select
              value={formData.assetCategory}
              onChange={(value) => handleInputChange('assetCategory', value)}
              placeholder={`Select ${isOtherAssetPage ? 'other ' : ''}asset category`}
              className="asset-type-select"
            >
              {filteredCategoryOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
        <Text strong className="asset-type-label">Description</Text>
        <TextArea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Enter description"
          rows={4}
          className="asset-type-textarea"
        />
      </div>

      {/* --- CUSTOM FIELDS SECTION --- */}
      <div className="asset-type-section">
        <Title level={4} className="asset-type-section-title">2. Custom Fields Section</Title>
        <Table
          columns={columns}
          dataSource={customFields}
          rowKey="id"
          pagination={false}
          size="middle"
          className="asset-type-custom-table"
        />
        <Button
          type="primary"
          size="large"
          onClick={() => openModal()}
          className="asset-type-add-field-button"
        >
          <img src="/icons/plus.svg" alt="Add" className="submit-icon" />
          Add More Fields
        </Button>
      </div>

      {/* --- MODALS --- */}
      {/* Add/Edit Field Modal */}
      <Modal
        title={editingField ? 'Edit Field' : 'Add Fields'}
        open={isModalOpen}
        onCancel={closeModal}
        width={500}
        footer={[
          <Button key="cancel" size="large" onClick={closeModal}>Cancel</Button>,
          <Button key="save" type="primary" size="large" onClick={saveField} className="asset-type-save-button">
            <img src="/icons/submittick.svg" alt="Save" className="submit-icon" />
            SAVE
          </Button>
        ]}
      >
        <div className="asset-type-modal-content">
          <div>
            <Text strong className="asset-type-label">Field Label</Text>
            <Input
              value={modalData.fieldLabel}
              onChange={(e) => setModalData(prev => ({ ...prev, fieldLabel: e.target.value }))}
              placeholder="Enter field label"
              className="asset-type-input"
            />
          </div>
          <div>
            <Text strong className="asset-type-label">Field Type</Text>
            <Select
              value={modalData.fieldType}
              onChange={(value) => setModalData(prev => ({ ...prev, fieldType: value }))}
              className="asset-type-select"
            >
              <Option value="Dropdown">Dropdown</Option>
              <Option value="Text">Text</Option>
              <Option value="Number">Number</Option>
            </Select>
          </div>
          {modalData.fieldType === 'Dropdown' && (
            <div>
              <Text strong className="asset-type-label">Options</Text>
              {modalData.dropdownOptions.map((option, index) => (
                <div className="asset-type-option-row" key={index}>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const options = [...modalData.dropdownOptions];
                      options[index] = e.target.value;
                      setModalData(prev => ({ ...prev, dropdownOptions: options }));
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="asset-type-input"
                  />
                  <Button
                    type="text"
                    size="large"
                    onClick={() => {
                      const options = modalData.dropdownOptions.filter((_, i) => i !== index);
                      setModalData(prev => ({ ...prev, dropdownOptions: options }));
                    }}
                    className="asset-type-icon-button"
                  >
                    <img src="/icons/deleteasset.svg" alt="Remove" className="icon" />
                  </Button>
                </div>
              ))}
              <Button
                type="dashed"
                size="large"
                onClick={() => setModalData(prev => ({ ...prev, dropdownOptions: [...prev.dropdownOptions, ''] }))}
                className="asset-type-add-option-button"
              >
                + Add
              </Button>
            </div>
          )}
          <div>
            <Text strong className="asset-type-label">Required?</Text>
            <Radio.Group
              value={modalData.required}
              onChange={(e) => setModalData(prev => ({ ...prev, required: e.target.value }))}
            >
              <Radio value={true}>Yes</Radio>
              <Radio value={false}>No</Radio>
            </Radio.Group>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title="Preview"
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalOpen(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        <div className="asset-type-preview">
          <Title level={4}>Basic Information</Title>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Text strong>Asset Type Name</Text>
              <Input disabled placeholder={formData.assetTypeName || "Enter asset type name"} />
            </Col>
            <Col xs={24} md={12}>
              <Text strong>Asset Category</Text>
              <Select
                disabled
                value={formData.assetCategory}
                placeholder="Select asset category"
                className="asset-type-select"
              >
                {assetCategoryOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
          <Text strong>Description</Text>
          <TextArea
            disabled
            rows={4}
            value={formData.description || "Enter description"}
            className="asset-type-textarea"
          />

          <Title level={4} style={{ marginTop: 24 }}>Technical Specifications</Title>
          {customFields.length === 0 && <Text type="secondary">No custom fields added yet.</Text>}
          {customFields.map((field) => (
            <div key={field.id} style={{ marginBottom: 16 }}>
              <Text strong>
                {field.fieldLabel}
                {field.required && <span style={{ color: 'red' }}> *</span>}
              </Text>
              {field.fieldType === 'Text' && (
                <Input disabled placeholder={`Enter ${field.fieldLabel}`} />
              )}
              {field.fieldType === 'Number' && (
                <Input type="number" disabled placeholder={`Enter ${field.fieldLabel}`} />
              )}
              {field.fieldType === 'Dropdown' && (
                <Select disabled placeholder={`Select ${field.fieldLabel}`} style={{ width: '100%' }}>
                  {field.dropdownOptions.map((option, index) => (
                    <Option key={index} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
