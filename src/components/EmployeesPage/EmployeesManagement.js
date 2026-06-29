import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlusOutlined, EditOutlined, InfoCircleOutlined, DeleteOutlined, UserOutlined, UserAddOutlined, UserDeleteOutlined, UsergroupAddOutlined, TeamOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  Input, Table, Button, Form, Drawer, Checkbox, Tabs, Tag, Modal, Spin, Alert, Typography, Card, Row, Col
} from 'antd';
import './EmployeesManagement.css';
import Swal from 'sweetalert2';
import { REACT_BASE_URL } from '../config';
import AddEmployeeForm from './AddEmployeeForm/AddEmployeeForm';

const { TabPane } = Tabs;
const { Text } = Typography;

// Constants
const DEFAULT_VISIBLE_COLUMNS = {
  employeeCode: true,
  fullName: true,
  email: true,
  department: true,
  designation: true,
  company: true,
  status: true,
  mobileNumber: false,
  dateOfJoining: false,
  aadharNumber: false,
  reportingManager: false,
};

const INITIAL_MODAL_STATE = {
  add: false,
  edit: false,
  info: false,
  filterDrawer: false,
};

// Helper: Normalize status for comparison (handles "Active", "active", "ACTIVE")
const normalizeStatus = (status) => {
  if (!status) return '';
  return status.toString().toLowerCase().trim();
};

// Custom hook: Employee Data Fetching
const useEmployeeData = () => {
  const [employeeData, setEmployeeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${REACT_BASE_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const enrichedData = data.map((item) => ({
        ...item,
        key: item.id,
        employeeCode: item.employee_code,
        fullName: item.full_name,
        email: item.email || 'N/A',
        department: item.department || 'N/A',
        designation: item.designation || 'N/A',
        company: item.company_name || 'N/A',
        companyId: item.company_id,
        status: item.status, // Keep original case for display
        mobileNumber: item.mobile_number || 'N/A',
        aadharNumber: item.aadhar_number || 'N/A',
        dateOfJoining: item.date_of_joining || 'N/A',
        resignedAt: item.resigned_at || 'N/A',
        lastWorkingDate: item.last_working_date || 'N/A',
      }));
      setEmployeeData(enrichedData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError(error.message);
    } finally {
        setLoading(false);
      }
    }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { employeeData, setEmployeeData, loading, error, fetchData };
};

// Custom hook: Modal State Management
const useModalState = () => {
  const [modalState, setModalState] = useState(INITIAL_MODAL_STATE);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const openModal = useCallback((modalName, record = null) => {
    setModalState(prev => ({ ...prev, [modalName]: true }));
    if (record) setSelectedRecord(record);
  }, []);

  const closeModal = useCallback((modalName) => {
    setModalState(prev => ({ ...prev, [modalName]: false }));
    if (modalName !== 'filterDrawer') {
      setSelectedRecord(null);
    }
  }, []);

  return {
    modalState,
    selectedRecord,
    setSelectedRecord,
    openModal,
    closeModal,
  };
};

function EmployeesManagement() {
  const [activeView, setActiveView] = useState('employeeList');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilters, setTableFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [activeTabKey, setActiveTabKey] = useState('all');

  const { employeeData, setEmployeeData, loading, error, fetchData } = useEmployeeData();

  const stats = useMemo(() => {
    return {
      total: employeeData.length,
      active: employeeData.filter(e => normalizeStatus(e.status) === 'active').length,
      inactive: employeeData.filter(e => normalizeStatus(e.status) === 'inactive').length,
      resigned: employeeData.filter(e => normalizeStatus(e.status) === 'resigned').length,
      onLeave: employeeData.filter(e => normalizeStatus(e.status) === 'on_leave').length,
    };
  }, [employeeData]);

  const {
    modalState,
    selectedRecord,
    setSelectedRecord,
    openModal,
    closeModal,
  } = useModalState();

  // Memoized filtered and sorted data based on Search, Tab Status, and Column Filters
  const filteredData = useMemo(() => {
    let result = [...employeeData];

    // 1. Global Search Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((record) =>
        Object.values(record).some((value) =>
          value?.toString().toLowerCase().includes(lowerSearch)
        )
      );
    }

    // 2. Tab-based Status Filter (Case-Insensitive)
    const normalizedActiveStatus = normalizeStatus('active');
    const normalizedResignedStatus = normalizeStatus('resigned');

    if (activeTabKey === 'active') {
      result = result.filter(record => normalizeStatus(record.status) === normalizedActiveStatus);
    } else if (activeTabKey === 'resigned') {
      result = result.filter(record => normalizeStatus(record.status) === normalizedResignedStatus);
    }

    // 3. Column Header Filters (if any are applied via Table onChange)
    Object.keys(tableFilters).forEach((key) => {
      const filterValues = tableFilters[key];
      if (filterValues && filterValues.length > 0) {
        // Handle status column filters with case-insensitive comparison too
        if (key === 'status') {
          const normalizedFilterValues = filterValues.map(v => normalizeStatus(v));
          result = result.filter((record) => normalizedFilterValues.includes(normalizeStatus(record[key])));
        } else {
          result = result.filter((record) => filterValues.includes(record[key]));
        }
      }
    });

    return result;
  }, [employeeData, searchTerm, tableFilters, activeTabKey]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination]);

  // Memoized column filters generator
  const getColumnFilters = useCallback((dataIndex) => {
    const uniqueValues = [...new Set(employeeData.map((item) => item[dataIndex]).filter(Boolean))];
    return uniqueValues.map((value) => ({ text: value, value }));
  }, [employeeData]);

  // Event Handlers
  const handleFormBack = useCallback(() => {
    setActiveView('employeeList');
    setSelectedRecord(null);
    fetchData();
  }, [fetchData, setSelectedRecord]);

  const handleEdit = useCallback((record) => {
    setSelectedRecord(record);
    setActiveView('editEmployee');
  }, [setSelectedRecord]);

  const handleDeleteEmployee = async (record) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${record.fullName}. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

          if (!token) {
            throw new Error('Authentication token not found');
          }

          const response = await fetch(`${REACT_BASE_URL}/employees/${record.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.detail || 'Failed to delete employee');
          }

          setEmployeeData(prev => prev.filter(item => item.id !== record.id));

          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'The employee has been deleted successfully.',
            timer: 2000,
            showConfirmButton: false
          });
        } catch (error) {
          console.error('Delete error:', error);
          if (error.message.includes('approval')) {
            Swal.fire('Request Sent', error.message, 'info');
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: error.message || 'Failed to delete employee. Please try again.',
            });
          }
        }
      }
    });
  };

  const handleColumnChange = useCallback((e) => {
    const { name, checked } = e.target;
    setVisibleColumns(prev => ({ ...prev, [name]: checked }));
  }, []);

  const handleExport = async () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    try {
      const response = await fetch(`${REACT_BASE_URL}/reports/employees/excel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employees_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        Swal.fire('Error', 'Failed to generate report', 'error');
      }
    } catch (error) {
       if (error.message.includes('approval')) {
         Swal.fire('Request Sent', error.message, 'info');
       } else {
         Swal.fire('Error', 'An error occurred while exporting', 'error');
       }
    }
  };

  const handleTableChange = useCallback((pag, filters, sorter) => {
    setPagination({
      current: pag.current,
      pageSize: pag.pageSize,
    });
    setTableFilters(filters);
  }, []);

  const renderStatusTag = (status) => {
    const colorMap = {
      active: 'green',
      inactive: 'red',
      resigned: 'orange',
      on_leave: 'blue',
    };
    // Normalize for color lookup but display original
    const normalized = normalizeStatus(status);
    const displayStatus = status?.replace('_', ' ')?.toUpperCase() || 'N/A';
    return <Tag color={colorMap[normalized] || 'default'}>{displayStatus}</Tag>;
  };

  const columns = useMemo(() => {
    const baseColumns = [
      visibleColumns.employeeCode && {
        title: (
          <span>
            Employee Code
            <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
          </span>
        ),
        dataIndex: 'employeeCode',
        key: 'employeeCode',
        filters: getColumnFilters('employeeCode'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.employeeCode?.toString() === value?.toString(),
        sorter: (a, b) => (a.employeeCode || '').localeCompare(b.employeeCode || ''),
        render: (text, record) => (
          <span>
            {text || 'N/A'}
            <InfoCircleOutlined
              style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }}
              onClick={(e) => {
                e.stopPropagation();
                openModal('info', record);
              }}
            />
          </span>
        ),
      },
      visibleColumns.fullName && {
        title: (
          <span>
            Full Name
            <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
          </span>
        ),
        dataIndex: 'fullName',
        key: 'fullName',
        filters: getColumnFilters('fullName'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.fullName?.toString() === value?.toString(),
        sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
      },
      visibleColumns.email && {
        title: (
          <span>
            Email
            <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
          </span>
        ),
        dataIndex: 'email',
        key: 'email',
        filters: getColumnFilters('email'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.email?.toString() === value?.toString(),
        sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
      },
      visibleColumns.department && {
        title: (
          <span>
            Department
            <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
          </span>
        ),
        dataIndex: 'department',
        key: 'department',
        filters: getColumnFilters('department'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.department?.toString() === value?.toString(),
        sorter: (a, b) => (a.department || '').localeCompare(b.department || ''),
      },
      visibleColumns.designation && {
        title: (
          <span>
            Designation
            <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
          </span>
        ),
        dataIndex: 'designation',
        key: 'designation',
        filters: getColumnFilters('designation'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.designation?.toString() === value?.toString(),
        sorter: (a, b) => (a.designation || '').localeCompare(b.designation || ''),
      },
      visibleColumns.company && {
        title: (
          <span>
            Company
            <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
          </span>
        ),
        dataIndex: 'company',
        key: 'company',
        filters: getColumnFilters('company'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.company?.toString() === value?.toString(),
        sorter: (a, b) => (a.company || '').localeCompare(b.company || ''),
      },
      visibleColumns.status && {
        title: (
          <span>
            Status
            <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} />
          </span>
        ),
        dataIndex: 'status',
        key: 'status',
        filters: getColumnFilters('status'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        // Case-insensitive filter for status column
        onFilter: (value, record) => normalizeStatus(record.status) === normalizeStatus(value),
        sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
        render: (text) => renderStatusTag(text),
      },
      visibleColumns.mobileNumber && {
        title: 'Mobile',
        dataIndex: 'mobileNumber',
        key: 'mobileNumber',
      },
      visibleColumns.aadharNumber && {
        title: 'Aadhar',
        dataIndex: 'aadharNumber',
        key: 'aadharNumber',
      },
      visibleColumns.dateOfJoining && {
        title: 'Date of Joining',
        dataIndex: 'dateOfJoining',
        key: 'dateOfJoining',
        sorter: (a, b) => {
          const dateA = a.dateOfJoining && a.dateOfJoining !== 'N/A' ? new Date(a.dateOfJoining) : new Date(0);
          const dateB = b.dateOfJoining && b.dateOfJoining !== 'N/A' ? new Date(b.dateOfJoining) : new Date(0);
          return dateA - dateB;
        },
      },
      visibleColumns.reportingManager && {
        title: 'Reporting Manager',
        dataIndex: 'reportingManager',
        key: 'reportingManager',
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 140,
        render: (_, record) => (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<EditOutlined />}
              size="small"
              type="primary"
              ghost
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(record);
              }}
              title="Edit Employee"
            />
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              ghost
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteEmployee(record);
              }}
              title="Delete Employee"
            />
          </div>
        ),
      },
    ].filter(Boolean);

    return baseColumns;
  }, [visibleColumns, getColumnFilters, handleEdit, openModal]);

  // Reusable Table Component for Tabs
  const renderEmployeeTable = () => (
    <div className="asset-table-container">
      <Table
        columns={columns}
        dataSource={paginatedData}
        loading={loading}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
        rowClassName={(record) => {
          const normalizedStatus = normalizeStatus(record.status);
          return normalizedStatus === 'inactive' || normalizedStatus === 'resigned' ? 'row-inactive' : '';
        }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredData.length,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} employees`,
          pageSizeOptions: ['10', '25', '50', '100'],
        }}
        locale={{
          emptyText: loading ? <Spin size="small" /> : 'No employees found'
        }}
      />
    </div>
  );

  if (error) {
    return (
      <div className="error-container" style={{ padding: 24, textAlign: 'center' }}>
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="employees-management-container" style={{ padding: '16px 24px' }}>
      {activeView === 'employeeList' ? (
        <>
          <div className="top-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <h1 className="header-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              Employee Management
            </h1>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Input
                placeholder="Search by Name, Code, Email..."
                size="large"
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={
                  <img
                    src="/icons/search.svg"
                    alt="Search"
                    style={{ width: 16, height: 16, marginRight: 4 }}
                  />
                }
                className="custom-search-input"
                style={{ width: 280, maxWidth: '100%' }}
              />

              <Button
                icon={<PlusOutlined />}
                type="primary"
                className="btn-new"
                onClick={() => setActiveView('addEmployee')}
              >
                Add Employee
              </Button>

              <Button
                icon={<img src="/icons/editcolumn.svg" alt="Columns" style={{ width: 14 }} />}
                className="btn-edit-columns"
                onClick={() => openModal('filterDrawer')}
              >
                Edit Columns
              </Button>

              <Button
                icon={<DownloadOutlined />}
                className="btn-edit-columns"
                onClick={handleExport}
              >
                Export Excel
              </Button>
            </div>
          </div>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{ borderLeft: '4px solid #1890ff', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setActiveTabKey('all')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Total Employees</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total}</div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{ borderLeft: '4px solid #52c41a', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setActiveTabKey('active')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UserAddOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Active</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.active}</div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{ borderLeft: '4px solid #faad14', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setActiveTabKey('resigned')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UserDeleteOutlined style={{ fontSize: 24, color: '#faad14' }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Resigned</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.resigned}</div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Tabs
            activeKey={activeTabKey}
            className="asset-tabs"
            onChange={(key) => {
              setActiveTabKey(key);
              setPagination({ ...pagination, current: 1 }); // Reset to page 1 on tab change
            }}
          >
            <TabPane
              tab={
                <span>
                  <img src="/icons/home.svg" alt="All" style={{ width: 16, marginRight: 8 }} />
                  Total
                </span>
              }
              key="all"
            >
              {renderEmployeeTable()}
            </TabPane>
            <TabPane
              tab={
                <span>
                  <img src="/icons/assign.svg" alt="Active" style={{ width: 16, marginRight: 8 }} />
                  Active
                </span>
              }
              key="active"
            >
              {renderEmployeeTable()}
            </TabPane>
            <TabPane
              tab={
                <span>
                  <img src="/icons/return.svg" alt="Resigned" style={{ width: 16, marginRight: 8 }} />
                  Resigned
                </span>
              }
              key="resigned"
            >
              {renderEmployeeTable()}
            </TabPane>
          </Tabs>

          <Modal
            title={
              <span>
                <InfoCircleOutlined style={{ marginRight: 8 }} />
                Employee Details
              </span>
            }
            open={modalState.info}
            onCancel={() => closeModal('info')}
            footer={null}
            width={650}
            destroyOnClose
          >
            {selectedRecord && (
              <div className="employee-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><Text strong>Employee Code:</Text> <br />{selectedRecord.employeeCode || 'N/A'}</div>
                <div><Text strong>Full Name:</Text> <br />{selectedRecord.fullName || 'N/A'}</div>
                <div><Text strong>Email:</Text> <br />{selectedRecord.email}</div>
                <div><Text strong>Mobile:</Text> <br />{selectedRecord.mobileNumber}</div>
                <div><Text strong>Aadhar:</Text> <br />{selectedRecord.aadharNumber}</div>
                <div><Text strong>Department:</Text> <br />{selectedRecord.department}</div>
                <div><Text strong>Designation:</Text> <br />{selectedRecord.designation}</div>
                <div><Text strong>Company:</Text> <br />{selectedRecord.company}</div>
                <div><Text strong>Status:</Text> <br />{renderStatusTag(selectedRecord.status)}</div>
                <div><Text strong>Date of Joining:</Text> <br />{selectedRecord.dateOfJoining}</div>
                {selectedRecord.resignedAt && selectedRecord.resignedAt !== 'N/A' && (
                  <div><Text strong>Resigned At:</Text> <br />{selectedRecord.resignedAt}</div>
                )}
                {selectedRecord.lastWorkingDate && selectedRecord.lastWorkingDate !== 'N/A' && (
                  <div><Text strong>Last Working Date:</Text> <br />{selectedRecord.lastWorkingDate}</div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <Text strong>Reporting Manager:</Text> <br />{selectedRecord.reportingManager}
                </div>
              </div>
            )}
          </Modal>

          <Drawer
            title="Edit Visible Columns"
            placement="right"
            onClose={() => closeModal('filterDrawer')}
            open={modalState.filterDrawer}
            width={320}
            destroyOnClose
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Text type="secondary">
                Toggle columns to show/hide them in the employee table.
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(visibleColumns).map(([col, isChecked]) => (
                  <Checkbox
                    key={col}
                    name={col}
                    checked={isChecked}
                    onChange={handleColumnChange}
                  >
                    {col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Checkbox>
                ))}
              </div>
              <Button
                type="link"
                onClick={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
                style={{ marginTop: 8 }}
              >
                Reset to Default
              </Button>
            </div>
          </Drawer>
        </>
      ) : activeView === 'addEmployee' ? (
        <AddEmployeeForm onBack={handleFormBack} />
      ) : activeView === 'editEmployee' ? (
        <AddEmployeeForm onBack={handleFormBack} editRecord={selectedRecord} />
      ) : null}
    </div>
  );
}

export default EmployeesManagement;