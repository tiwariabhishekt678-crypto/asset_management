import React, { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Input,
    Select,
    Typography,
    Row,
    Col,
    message,
    DatePicker,
    Upload
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { REACT_BASE_URL } from '../../config';
import './AddEmployeeForm.css';
import Swal from 'sweetalert2';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

export default function AddEmployeeForm({ onBack, editRecord = null }) {
    const [loading, setLoading] = useState(false);
    const [companyActionLoading, setCompanyActionLoading] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [employees, setEmployees] = useState([]);

    const isEditMode = !!editRecord;

    const [formData, setFormData] = useState({
        employeeCode: '',
        fullName: '',
        email: '',
        department: '',
        designation: '',
        companyId: '',
        reportingManagerId: '',
        mobileNumber: '',
        aadharNumber: '',
        dateOfJoining: null,
        resignedAt: null,
        lastWorkingDate: null,
        status: 'active',
    });

    // 🔑 Store original values for comparison in edit mode
    const [originalValues, setOriginalValues] = useState(null);

    const [documentFiles, setDocumentFiles] = useState([]);

    useEffect(() => {
        fetchCompanies();
        fetchEmployees();

        if (isEditMode && editRecord) {
            const initialValues = {
                employeeCode: editRecord.employeeCode || '',
                fullName: editRecord.fullName || '',
                email: editRecord.email === 'N/A' ? '' : editRecord.email || '',
                department: editRecord.department === 'N/A' ? '' : editRecord.department || '',
                designation: editRecord.designation === 'N/A' ? '' : editRecord.designation || '',
                companyId: editRecord.companyId || '',
                reportingManagerId: editRecord.reportingManagerId || '',
                mobileNumber: editRecord.mobileNumber === 'N/A' ? '' : editRecord.mobileNumber || '',
                aadharNumber: editRecord.aadharNumber === 'N/A' ? '' : editRecord.aadharNumber || '',
                dateOfJoining: editRecord.dateOfJoining && editRecord.dateOfJoining !== 'N/A' ? moment(editRecord.dateOfJoining) : null,
                resignedAt: editRecord.resignedAt && editRecord.resignedAt !== 'N/A' ? moment(editRecord.resignedAt) : null,
                lastWorkingDate: editRecord.lastWorkingDate && editRecord.lastWorkingDate !== 'N/A' ? moment(editRecord.lastWorkingDate) : null,
                status: editRecord.status || 'active',
            };

            setFormData(initialValues);
            setOriginalValues(initialValues); // 🔑 Save snapshot for diffing
        }
    }, [editRecord, isEditMode]);

    const getAccessToken = () => {
        return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
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

    const fetchEmployees = async () => {
        try {
            const token = getAccessToken();
            const response = await fetch(`${REACT_BASE_URL}/employees`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const filtered = isEditMode
                    ? data.filter(emp => emp.id !== editRecord.key)
                    : data;
                setEmployees(filtered);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const addCompanyToList = (company) => {
        setCompanies((prev) => {
            const exists = prev.some((item) => item.id === company.id);
            return exists ? prev.map((item) => (item.id === company.id ? company : item)) : [...prev, company];
        });
        setFormData((prev) => ({ ...prev, companyId: company.id }));
    };

    const handleAddCompany = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Add New Company',
            html:
                '<input id="company-name" class="swal2-input" placeholder="Company name">' +
                '<input id="company-domain" class="swal2-input" placeholder="Company domain">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Add Company',
            preConfirm: () => {
                const name = document.getElementById('company-name')?.value?.trim();
                const domain = document.getElementById('company-domain')?.value?.trim();
                if (!name || !domain) {
                    Swal.showValidationMessage('Both name and domain are required');
                    return;
                }
                return { name, domain };
            },
        });

        if (!formValues) return;

        const token = getAccessToken();
        if (!token) {
            Swal.fire('Unauthorized', 'Authentication token not found. Please log in again.', 'error');
            return;
        }

        setCompanyActionLoading(true);

        try {
            const response = await fetch(`${REACT_BASE_URL}/companies`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formValues),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || result.message || 'Failed to add company');
            }

            addCompanyToList(result);
            Swal.fire('Added!', `${result.name} has been added to companies.`, 'success');
        } catch (error) {
            Swal.fire('Error', error.message || 'Unable to add company', 'error');
        } finally {
            setCompanyActionLoading(false);
        }
    };

    const handleEditCompany = async () => {
        const selectedCompany = companies.find((company) => company.id === formData.companyId);
        if (!selectedCompany) {
            Swal.fire('Select Company', 'Please select a company before editing it.', 'info');
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: 'Edit Company',
            html:
                `<input id="company-name" class="swal2-input" placeholder="Company name" value="${selectedCompany.name}">` +
                `<input id="company-domain" class="swal2-input" placeholder="Company domain" value="${selectedCompany.domain}">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            preConfirm: () => {
                const name = document.getElementById('company-name')?.value?.trim();
                const domain = document.getElementById('company-domain')?.value?.trim();
                if (!name || !domain) {
                    Swal.showValidationMessage('Both name and domain are required');
                    return;
                }
                return { name, domain };
            },
        });

        if (!formValues) return;

        const token = getAccessToken();
        if (!token) {
            Swal.fire('Unauthorized', 'Authentication token not found. Please log in again.', 'error');
            return;
        }

        setCompanyActionLoading(true);

        try {
            const response = await fetch(`${REACT_BASE_URL}/companies/${selectedCompany.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formValues),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || result.message || 'Failed to update company');
            }

            addCompanyToList(result);
            Swal.fire('Saved!', `${result.name} has been updated.`, 'success');
        } catch (error) {
            Swal.fire('Error', error.message || 'Unable to update company', 'error');
        } finally {
            setCompanyActionLoading(false);
        }
    };

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 🔑 Helper: Compare current vs original and return only changed fields
    const getChangedFields = (current, original) => {
        const changed = {};

        Object.keys(current).forEach((key) => {
            const currVal = current[key];
            const origVal = original[key];

            // Handle moment objects for dates
            const currDate = currVal && moment.isMoment(currVal) ? currVal.format('YYYY-MM-DD') : currVal;
            const origDate = origVal && moment.isMoment(origVal) ? origVal.format('YYYY-MM-DD') : origVal;

            // Compare values (handle null/empty string equivalence)
            const isSame =
                currDate === origDate ||
                (currDate === '' && origVal === null) ||
                (currDate === null && origVal === '');

            if (!isSame && currVal !== undefined) {
                // Format for API: convert camelCase to snake_case + format dates
                if (key === 'dateOfJoining' || key === 'resignedAt' || key === 'lastWorkingDate') {
                    if (key === 'dateOfJoining') {
                        changed.date_of_joining = currVal ? currVal.format('YYYY-MM-DD') : null;
                    } else if (key === 'resignedAt') {
                        changed.resigned_at = currVal ? currVal.format('YYYY-MM-DD') : null;
                    } else {
                        changed.last_working_date = currVal ? currVal.format('YYYY-MM-DD') : null;
                    }
                } else if (key === 'employeeCode') {
                    changed.employee_code = currVal;
                } else if (key === 'fullName') {
                    changed.full_name = currVal;
                } else if (key === 'mobileNumber') {
                    changed.mobile_number = currVal;
                } else if (key === 'aadharNumber') {
                    changed.aadhar_number = currVal;
                } else if (key === 'companyId') {
                    changed.company_id = currVal;
                } else if (key === 'reportingManagerId') {
                    changed.reporting_manager_id = currVal || null;
                } else {
                    // email, department, designation, status
                    changed[key] = currVal || null;
                }
            }
        });

        return changed;
    };

    const handleSubmit = async () => {
        console.log("Submit button clicked");
        console.log("Current formData:", formData);

        // Validation
        if (!formData.employeeCode || !formData.fullName || !formData.companyId || !formData.dateOfJoining) {
            console.warn("Validation failed: Missing required fields");
            message.error('Please fill in required fields (Employee Code, Full Name, Company, Date of Joining)');
            return;
        }

        const token = getAccessToken();
        if (!token) {
            console.error("No access token found");
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Authentication token not found. Please log in again.',
            });
            return;
        }

        setLoading(true);

        try {
            let payload;

            // Helper to safely format dates (works with moment and dayjs)
            const formatDate = (dateObj) => {
                if (!dateObj) return null;
                if (typeof dateObj.format === 'function') return dateObj.format('YYYY-MM-DD');
                return dateObj;
            };

            if (isEditMode && originalValues) {
                console.log("Edit mode detected, generating diff...");
                payload = getChangedFields(formData, originalValues);
                console.log("Diff payload:", payload);

                if (Object.keys(payload).length === 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'No Changes',
                        text: 'No modifications detected. Nothing to update.',
                    });
                    setLoading(false);
                    return;
                }
            } else {
                console.log("Create mode detected");
                payload = {
                    employee_code: formData.employeeCode,
                    full_name: formData.fullName,
                    email: formData.email || null,
                    department: formData.department || null,
                    designation: formData.designation || null,
                    company_id: formData.companyId,
                    reporting_manager_id: formData.reportingManagerId || null,
                    mobile_number: formData.mobileNumber || null,
                    aadhar_number: formData.aadharNumber || null,
                    date_of_joining: formatDate(formData.dateOfJoining),
                    resigned_at: formatDate(formData.resignedAt),
                    last_working_date: formatDate(formData.lastWorkingDate),
                    status: formData.status,
                };
            }

            const url = isEditMode
                ? `${REACT_BASE_URL}/employees/${editRecord.key}`
                : `${REACT_BASE_URL}/employees/`;

            console.log(`Sending ${isEditMode ? 'PATCH' : 'POST'} request to: ${url}`);
            console.log("Payload being sent:", payload);

            const response = await fetch(url, {
                method: isEditMode ? 'PATCH' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log("Response status:", response.status);
            const result = await response.json();
            console.log("Response data:", result);

            if (!response.ok) {
                if ((result.message && result.message.includes('approval')) || (result.detail && result.detail.includes('approval'))) {
                    Swal.fire('Request Sent', result.message || result.detail, 'info').then(() => {
                        onBack();
                    });
                    return;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message || result.detail || `Failed to ${isEditMode ? 'update' : 'create'} employee`,
                });
                return;
            }

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: `Employee ${isEditMode ? 'updated' : 'created'} successfully!`,
            }).then(() => {
                onBack();
            });

        } catch (error) {
            console.error("Submission error:", error);
            Swal.fire({
                icon: 'error',
                title: 'Submission Error',
                text: error.message || 'Something went wrong. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    const statusOptions = [
        { value: 'active', label: 'Active' },
        // { value: 'inactive', label: 'Inactive' },
        { value: 'resigned', label: 'Resigned' },
        // { value: 'on_leave', label: 'On Leave' },
    ];

    return (
        <div className="asset-form-wrapper">
            {/* HEADER */}
            <div className="asset-form-header">
                <div className="asset-header-left">
                    <Button type="text" size="large" onClick={onBack} className="asset-back-button">
                        <img src="/icons/back.svg" alt="Back" className="asset-back-icon" />
                    </Button>
                    <Title level={3} className="asset-header-title">
                        {isEditMode ? 'Edit Employee' : 'Add Employee'}
                    </Title>
                </div>
                <Button
                    type="primary"
                    size="large"
                    className="asset-submit-button"
                    onClick={handleSubmit}
                    loading={loading}
                >
                    <img src="/icons/submittick.svg" alt="Submit" className="submit-icon" />
                    {isEditMode ? 'Update' : 'Submit'}
                </Button>
            </div>

            {/* BASIC INFORMATION SECTION */}
            <div className="asset-section">
                <Title level={4} className="asset-section-title">1. Basic Information</Title>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Employee Code <span style={{ color: 'red' }}>*</span></Text>
                        <Input
                            value={formData.employeeCode}
                            onChange={(e) => handleInputChange('employeeCode', e.target.value)}
                            placeholder="e.g. EMP001"
                            className="asset-input"
                            disabled={isEditMode}
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Full Name <span style={{ color: 'red' }}>*</span></Text>
                        <Input
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            placeholder="e.g. John Doe"
                            className="asset-input"
                        />
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Email</Text>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="e.g. john.doe@company.com"
                            className="asset-input"
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Mobile Number</Text>
                        <Input
                            value={formData.mobileNumber}
                            onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                            placeholder="e.g. 9876543210"
                            className="asset-input"
                        />
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Aadhar Number</Text>
                        <Input
                            value={formData.aadharNumber}
                            onChange={(e) => handleInputChange('aadharNumber', e.target.value)}
                            placeholder="e.g. 1234 5678 9012"
                            className="asset-input"
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Date of Joining <span style={{ color: 'red' }}>*</span></Text>
                        <DatePicker
                            className="asset-input"
                            style={{ width: '100%' }}
                            value={formData.dateOfJoining}
                            onChange={(date) => handleInputChange('dateOfJoining', date)}
                            format="YYYY-MM-DD"
                        />
                    </Col>
                </Row>
            </div>

            {/* COMPANY & ROLE SECTION */}
            <div className="asset-section">
                <Title level={4} className="asset-section-title">2. Company & Role Details</Title>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Company <span style={{ color: 'red' }}>*</span></Text>
                        <Select
                            value={formData.companyId}
                            onChange={(v) => handleInputChange('companyId', v)}
                            placeholder="Select company"
                            className="asset-select"
                            showSearch
                            optionFilterProp="children"
                            dropdownRender={(menu) => (
                                <div>
                                    {menu}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, borderTop: '1px solid #f0f0f0' }}>
                                        <Button type="text" size="small" onClick={handleAddCompany} loading={companyActionLoading}>
                                            + Add company
                                        </Button>
                                        <Button type="text" size="small" onClick={fetchCompanies}>
                                            Refresh
                                        </Button>
                                        {formData.companyId && (
                                            <Button type="text" size="small" onClick={handleEditCompany} loading={companyActionLoading}>
                                                Edit selected
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        >
                            {companies.map(company => (
                                <Option key={company.id} value={company.id}>
                                    {company.name}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Department</Text>
                        <Input
                            value={formData.department}
                            onChange={(e) => handleInputChange('department', e.target.value)}
                            placeholder="e.g. IT, HR, Finance"
                            className="asset-input"
                        />
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Designation</Text>
                        <Input
                            value={formData.designation}
                            onChange={(e) => handleInputChange('designation', e.target.value)}
                            placeholder="e.g. Software Engineer"
                            className="asset-input"
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Status</Text>
                        <Select
                            value={formData.status}
                            onChange={(v) => handleInputChange('status', v)}
                            className="asset-select"
                        >
                            {statusOptions.map(opt => (
                                <Option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </div>

            {/* REPORTING MANAGER SECTION */}
            <div className="asset-section">
                <Title level={4} className="asset-section-title">3. Reporting Structure</Title>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Reporting Manager</Text>
                        <Select
                            value={formData.reportingManagerId}
                            onChange={(v) => handleInputChange('reportingManagerId', v)}
                            placeholder="Select reporting manager (optional)"
                            className="asset-select"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                        >
                            {employees.map(emp => (
                                <Option key={emp.id} value={emp.id}>
                                    {emp.full_name} ({emp.employee_code})
                                </Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </div>

            {/* RESIGNATION SECTION */}
            {(isEditMode || formData.status === 'resigned') && (
                <div className="asset-section">
                    <Title level={4} className="asset-section-title">4. Resignation Details</Title>
                    <Row gutter={24}>
                        <Col xs={24} md={12}>
                            <Text strong className="asset-label">Resigned At</Text>
                            <DatePicker
                                className="asset-input"
                                style={{ width: '100%' }}
                                value={formData.resignedAt}
                                onChange={(date) => handleInputChange('resignedAt', date)}
                                format="YYYY-MM-DD"
                                placeholder="Select resignation date"
                            />
                        </Col>
                        <Col xs={24} md={12}>
                            <Text strong className="asset-label">Last Working Date</Text>
                            <DatePicker
                                className="asset-input"
                                style={{ width: '100%' }}
                                value={formData.lastWorkingDate}
                                onChange={(date) => handleInputChange('lastWorkingDate', date)}
                                format="YYYY-MM-DD"
                                placeholder="Select last working date"
                            />
                        </Col>
                    </Row>
                </div>
            )}

            {/* DOCUMENTS SECTION */}
            <div className="asset-section">
                <Title level={4} className="asset-section-title">5. Documents</Title>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Text strong className="asset-label">Employee Documents</Text>
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
        </div>
    );
}