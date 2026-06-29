import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Spin, Input, Divider, Tag, Space, Button } from 'antd';
import { FilePdfOutlined, FileWordOutlined, DownloadOutlined } from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';

const { Option } = Select;

const AssignAssetModal = ({ visible, onCancel, form, onFinish, assetRecord, isOtherAssetPage = false }) => {
  const [employees, setEmployees] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchEmployees();
      fetchAvailableAssets();
      if (assetRecord) {
        setSelectedAssets([{
          id: assetRecord.assetId || assetRecord.id,
          name: assetRecord.name,
          assetCode: assetRecord.assetCode,
          isOther: isOtherAssetPage
        }]);
      } else {
        setSelectedAssets([]);
      }
    }
  }, [visible, assetRecord, isOtherAssetPage]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');

      const response = await fetch(`${REACT_BASE_URL}/employees/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAssets = async () => {
    try {
      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');

      // Fetch standard assets
      const standardResponse = await fetch(`${REACT_BASE_URL}/assets?is_other_asset=false`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const standardData = await standardResponse.json();

      // Fetch other assets
      const otherResponse = await fetch(`${REACT_BASE_URL}/other-assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const otherData = await otherResponse.json();

      const available = [
        ...standardData.filter(a => a.asset_status === 'available').map(a => ({
          value: `std_${a.id}`,
          label: `${a.name} (${a.asset_code}) - Standard`,
          id: a.id,
          name: a.name,
          assetCode: a.asset_code,
          isOther: false
        })),
        ...otherData.filter(a => a.asset_status === 'available').map(a => ({
          value: `oth_${a.id}`,
          label: `${a.name} (${a.asset_code}) - Other`,
          id: a.id,
          name: a.name,
          assetCode: a.asset_code,
          isOther: true
        }))
      ];

      setAvailableAssets(available);
    } catch (error) {
      console.error('Error fetching available assets:', error);
    }
  };

  const handleAssetSelect = (value) => {
    const asset = availableAssets.find(a => a.value === value);
    if (asset && !selectedAssets.find(sa => sa.id === asset.id)) {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  const removeAsset = (id) => {
    setSelectedAssets(selectedAssets.filter(a => a.id !== id));
  };

  const handleDownloadHandover = async (format) => {
    try {
      const values = await form.validateFields(['assignTo', 'projectName']);
      if (selectedAssets.length === 0) {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire('Error', 'Please select at least one asset', 'error');
        return;
      }
      
      setGenerating(true);
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      
      const payload = {
        employee_id: values.assignTo,
        asset_ids: selectedAssets.filter(a => !a.isOther).map(a => a.id),
        other_asset_ids: selectedAssets.filter(a => a.isOther).map(a => a.id),
        project_name: values.projectName || "N/A",
        format: format
      };

      const response = await fetch(`${REACT_BASE_URL}/handover/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to generate document');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const emp = employees.find(e => e.id === values.assignTo);
      a.download = `Handover_${emp?.full_name || 'Employee'}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating handover:', error);
      const Swal = (await import('sweetalert2')).default;
      if (error.message.includes('approval')) {
        Swal.fire('Request Sent', error.message, 'info');
      } else {
        Swal.fire('Error!', error.message, 'error');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedAssets.length === 0) {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire('Error', 'Please select at least one asset to assign', 'error');
        return;
      }
      setSubmitting(true);

      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');

      let successCount = 0;
      let approvalCount = 0;
      let lastResponseData = null;
      let approvalMessage = '';

      const standardAssets = selectedAssets.filter(a => !a.isOther);
      const otherAssets = selectedAssets.filter(a => a.isOther);
      const selectedEmployee = employees.find(emp => emp.id === values.assignTo);

      // 1. Handle Standard Assets Bulk Assignment
      if (standardAssets.length > 0) {
        const payload = {
          asset_ids: standardAssets.map(a => a.id),
          employee_id: values.assignTo,
          location: values.location,
          remarks: values.remarks,
          project_name: values.projectName || null,
          // Metadata for approval UI
          asset_summary: standardAssets.map(a => `${a.name} (${a.assetCode})`).join(', '),
          employee_name: selectedEmployee?.full_name || 'N/A'
        };

        const response = await fetch(`${REACT_BASE_URL}/asset-assignment/bulk-assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        const isApproval = (res, data) => 
          res.status === 403 && (
            String(data.message || '').toLowerCase().includes('approval') || 
            String(data.detail || '').toLowerCase().includes('approval')
          );

        if (response.ok) {
          successCount += standardAssets.length;
          lastResponseData = result;
        } else if (isApproval(response, result)) {
          approvalCount++; // Just 1 request for all bulk assets
          approvalMessage = result.message || result.detail;
        } else {
          console.error(`Failed to assign standard assets:`, result.message || result.detail);
        }
      }

      // 2. Handle Other Assets (Still one by one but with better metadata)
      for (const asset of otherAssets) {
        const payload = {
          other_asset_id: asset.id,
          employee_id: values.assignTo,
          assigned_location: values.location,
          assign_remarks: values.remarks,
          project_name: values.projectName || null,
          // Metadata for approval UI
          asset_code: asset.assetCode,
          asset_name: asset.name,
          employee_name: selectedEmployee?.full_name || 'N/A'
        };

        const response = await fetch(`${REACT_BASE_URL}/other-asset-assignment/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        const isApproval = (res, data) => 
          res.status === 403 && (
            String(data.message || '').toLowerCase().includes('approval') || 
            String(data.detail || '').toLowerCase().includes('approval')
          );

        if (response.ok) {
          successCount++;
          lastResponseData = result;
        } else if (isApproval(response, result)) {
          approvalCount++;
          approvalMessage = result.message || result.detail;
        } else {
          console.error(`Failed to assign asset ${asset.assetCode}:`, result.message || result.detail);
        }
      }

      if (successCount === 0 && approvalCount === 0) {
        throw new Error('Failed to assign any assets');
      }

      if (approvalCount > 0 && successCount === 0) {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire('Request Sent', approvalMessage, 'info').then(() => {
          onCancel();
        });
        return;
      }
      
      onFinish({
        assignTo: selectedEmployee?.full_name || 'Unknown',
        employee_id: values.assignTo,
        responseData: lastResponseData,
        message: approvalCount > 0 
          ? `${successCount} asset(s) successfully assigned, others pending approval.`
          : `${successCount} asset(s) assigned successfully`
      });
    } catch (error) {
      console.error('Error assigning asset:', error);
      const Swal = (await import('sweetalert2')).default;
      if (error.message?.includes('approval')) {
        Swal.fire('Request Sent', error.message, 'info');
      } else {
        Swal.fire('Error!', error.message || 'Operation failed', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={<span><DownloadOutlined style={{ marginRight: 8 }} />Assign Assets & Handover</span>}
      open={visible}
      onCancel={() => {
        setSelectedAssets([]);
        onCancel();
      }}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button 
          key="docx" 
          icon={<FileWordOutlined />} 
          loading={generating}
          onClick={() => handleDownloadHandover('docx')}
          style={{ backgroundColor: '#2b579a', color: 'white' }}
        >
          Download Handover (Word)
        </Button>,
        <Button 
          key="pdf" 
          icon={<FilePdfOutlined />} 
          loading={generating}
          danger 
          onClick={() => handleDownloadHandover('pdf')}
        >
          Download Handover (PDF)
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
          {selectedAssets.length > 1 ? `Assign ${selectedAssets.length} Assets` : "Assign"}
        </Button>
      ]}
      width={700}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form 
          form={form} 
          layout="vertical" 
          preserve={false}
          initialValues={{
            location: assetRecord?.location || '',
            projectName: 'N/A'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="assignTo"
              label="Assign To"
              rules={[{ required: true, message: 'Please select an employee' }]}
            >
              <Select
                placeholder="Select an employee"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children?.[0]?.toLowerCase().includes(input.toLowerCase()) ||
                  option.children?.join('')?.toLowerCase().includes(input.toLowerCase())
                }
                allowClear
                size="large"
              >
                {employees.map((employee) => (
                  <Option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_code} - {employee.department})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="projectName" label="Project Name">
              <Input size="large" placeholder="e.g. Asset ERP, Bhugol GIS" />
            </Form.Item>
          </div>

          <Divider orientation="left" style={{ margin: '12px 0' }}>Assets to Assign</Divider>
          
          <div style={{ marginBottom: 16 }}>
            <Space wrap style={{ marginBottom: 8 }}>
              {selectedAssets.map(asset => (
                <Tag 
                  key={asset.id} 
                  closable 
                  onClose={() => removeAsset(asset.id)}
                  color={asset.isOther ? "orange" : "blue"}
                  style={{ padding: '4px 8px', fontSize: '14px' }}
                >
                  {asset.name} ({asset.assetCode})
                </Tag>
              ))}
            </Space>
            
            <Select
              showSearch
              placeholder="Search and add more assets..."
              style={{ width: '100%' }}
              onSelect={handleAssetSelect}
              value={null}
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              options={availableAssets.filter(a => !selectedAssets.find(sa => sa.id === a.id))}
              size="large"
            />
          </div>

          <Form.Item 
            name="location" 
            label="Assign Location"
            rules={[
              { required: true, message: 'Please specify the assignment location' },
              {
                validator: (_, value) => {
                  if (value && value.trim().toLowerCase() === 'it room') {
                    return Promise.reject(new Error("Assignment location cannot be 'IT Room'"));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input size="large" placeholder="e.g. Server Room, Head Office" />
          </Form.Item>
          
          <Form.Item name="remarks" label="Remarks (Optional)">
            <Input.TextArea size="large" rows={3} placeholder="Add any comments" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default AssignAssetModal;