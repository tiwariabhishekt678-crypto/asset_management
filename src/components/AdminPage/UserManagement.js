import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Table, Button, Modal, Form, Input, Checkbox, Space, Tag, Switch, Row, Col, Divider, Tabs, Drawer, Spin, Alert, Card } from "antd";
import { PlusOutlined, EditOutlined, UserOutlined, KeyOutlined, UserAddOutlined, UserDeleteOutlined, TeamOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { REACT_BASE_URL } from "../config";
import "./UserManagement.css";

const { TabPane } = Tabs;

const SIMPLIFIED_PERMISSIONS = [
  { 
    label: "Manage Asset and assignment", 
    value: "category_assets",
    description: "View, Create, Edit, Delete Assets & Manage Groups/Assignments",
    keys: [
      "assets.view", "assets.create", "assets.edit", "assets.delete", 
      "assets.manage_assignment", "assets.view_logs", "groups.view", "groups.manage",
      "dashboard.view", "reports.view", "reports.export"
    ]
  },
  { 
    label: "Manage Other Asset and assignment", 
    value: "category_other_assets",
    description: "Manage Accessories, RAM, GPU and other linked assets",
    keys: ["other_assets.view", "other_assets.create", "other_assets.edit", "other_assets.delete", "other_assets.manage_assignment"]
  },
  { 
    label: "Adding Stocks or Invoice", 
    value: "category_stocks",
    description: "Manage Inventory, Stock Movements and Purchase Invoices",
    keys: [
      "stock.view", "stock.create", "stock.edit", "stock.delete", "stock.adjust", 
      "inventory.view", "inventory.manage", "invoices.view", "invoices.create", 
      "invoices.edit", "invoices.delete", "asset_invoices.view", "asset_invoices.create"
    ]
  },
  { 
    label: "Manage Employees", 
    value: "category_employees",
    description: "View, Create, Edit and Delete employee records",
    keys: ["employees.view", "employees.create", "employees.edit", "employees.delete"]
  },
  { 
    label: "Manage Tickets and Approve", 
    value: "category_tickets",
    description: "Resolve support tickets and approve admin requests",
    keys: [
      "tickets.view", "tickets.update", "tickets.resolve", 
      "admin_requests.view", "admin_requests.approve", "admin.requests.approve",
      "tickets.approve"
    ]
  },
];

const ALL_FINE_GRAINED_KEYS = [...new Set(SIMPLIFIED_PERMISSIONS.flatMap(cat => cat.keys))];
const BASE_PERMISSIONS = ["dashboard.view", "reports.view"];


const DEFAULT_VISIBLE_COLUMNS = {
  fullName: true,
  email: true,
  role: true,
  status: true,
  permissions: true,
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilters, setTableFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [activeTabKey, setActiveTabKey] = useState('all');
  const [isColumnDrawerOpen, setIsColumnDrawerOpen] = useState(false);
  const role = localStorage.getItem("user_role") || sessionStorage.getItem("user_role");

  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${REACT_BASE_URL}/admin/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      
      const enrichedData = data.map((item) => {
        const user = {
          ...item,
          key: item.id,
        };
        if (user.role === 'super_admin') {
          const perms = {};
          ALL_FINE_GRAINED_KEYS.forEach(key => {
            perms[key] = true;
          });
          user.permissions = perms;
        } else {
          user.permissions = user.permissions || {};
        }
        return user;
      });
      setUsers(enrichedData);
      setError(null);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(user => user.is_active).length,
      inactive: users.filter(user => !user.is_active).length,
      superAdmins: users.filter(user => user.role === 'super_admin').length,
      regularAdmins: users.filter(user => user.role === 'admin').length,
    };
  }, [users]);

  const filteredData = useMemo(() => {
    let result = [...users];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((record) =>
        Object.keys(record).some((key) => {
          if (typeof record[key] === 'string') {
            return record[key].toLowerCase().includes(lowerSearch);
          }
          return false;
        })
      );
    }

    if (activeTabKey === 'active') {
      result = result.filter(record => record.is_active);
    } else if (activeTabKey === 'inactive') {
      result = result.filter(record => !record.is_active);
    } else if (activeTabKey === 'super_admin') {
      result = result.filter(record => record.role === 'super_admin');
    }

    Object.keys(tableFilters).forEach((key) => {
      const filterValues = tableFilters[key];
      if (filterValues && filterValues.length > 0) {
        if (key === 'is_active') {
          result = result.filter((record) => filterValues.includes(record.is_active ? 'Active' : 'Inactive'));
        } else {
          result = result.filter((record) => filterValues.includes(record[key]));
        }
      }
    });

    return result;
  }, [users, searchTerm, tableFilters, activeTabKey]);

  const paginatedData = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination]);

  const getColumnFilters = useCallback((dataIndex, transformFn = x => x) => {
    const uniqueValues = [...new Set(users.map((item) => transformFn(item[dataIndex])).filter(Boolean))];
    return uniqueValues.map((value) => ({ text: value, value }));
  }, [users]);

  const handleCreateOrUpdate = async (values) => {
    const isEditing = !!editingUser;
    const url = isEditing 
      ? `${REACT_BASE_URL}/admin/admins/${editingUser.id}`
      : `${REACT_BASE_URL}/admin/admins`;
    
    const permissionsObj = {};
    // Add base permissions by default to any admin
    BASE_PERMISSIONS.forEach(key => permissionsObj[key] = true);

    if (values.permissions) {
      values.permissions.forEach(catValue => {
        const category = SIMPLIFIED_PERMISSIONS.find(c => c.value === catValue);
        if (category) {
          category.keys.forEach(key => permissionsObj[key] = true);
        }
      });
    }

    const payload = {
      ...values,
      permissions: permissionsObj,
      role: editingUser ? editingUser.role : "admin",
    };

    try {
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Operation failed");
      }

      Swal.fire({ icon: 'success', title: 'Success', text: `User ${isEditing ? "updated" : "created"} successfully`, timer: 1500, showConfirmButton: false });
      setIsModalOpen(false);
      form.resetFields();
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      if (error.message?.includes('approval')) {
        Swal.fire('Request Sent', error.message, 'info');
      } else {
        Swal.fire("Error", error.message || "Operation failed", "error");
      }
    }
  };

  const toggleUserStatus = async (user) => {
    const action = user.is_active ? "deactivate" : "activate";
    const url = user.is_active 
      ? `${REACT_BASE_URL}/admin/admins/${user.id}`
      : `${REACT_BASE_URL}/admin/admins/${user.id}/activate`;
    
    const method = user.is_active ? "DELETE" : "POST";

    Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${action} ${user.full_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, ${action}!`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(url, {
            method: method,
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || "Update failed");
          }
          Swal.fire({ icon: "success", title: "Updated!", text: `User has been ${action}d.`, timer: 1500, showConfirmButton: false });
          fetchUsers();
        } catch (error) {
          if (error.message.includes('approval')) {
            Swal.fire('Request Sent', error.message, 'info');
          } else {
            Swal.fire("Error", error.message, "error");
          }
        }
      }
    });
  };

  const openModal = (user = null) => {
    setEditingUser(user);

    // Default permissions for new admin: only specific view rights
    const defaultAdminPermissions = [
      "dashboard.view",
      "assets.view",
      "employees.view",
      "tickets.view",
      "groups.view",
      "reports.view",
      "reports.export",
    ];

    if (user) {
      let permissionsArray = [];
      
      if (user.role === 'super_admin') {
        permissionsArray = SIMPLIFIED_PERMISSIONS.map(cat => cat.value);
      } else {
        // Map granular permissions back to categories if they have any key from that category
        permissionsArray = SIMPLIFIED_PERMISSIONS
          .filter(cat => cat.keys.some(key => user.permissions && user.permissions[key]))
          .map(cat => cat.value);
      }

      form.setFieldsValue({
        full_name: user.full_name,
        email: user.email,
        permissions: permissionsArray,
      });
    } else {
      form.setFieldsValue({
        permissions: ["category_assets"], // Default for new admin
      });
      form.resetFields(['full_name', 'email', 'password']);
    }
    setIsModalOpen(true);
  };

  const handleTableChange = useCallback((pag, filters, sorter) => {
    setPagination({ current: pag.current, pageSize: pag.pageSize });
    setTableFilters(filters);
  }, []);

  const handleColumnChange = useCallback((e) => {
    const { name, checked } = e.target;
    setVisibleColumns(prev => ({ ...prev, [name]: checked }));
  }, []);

  const columns = useMemo(() => {
    return [
      visibleColumns.fullName && {
        title: (<span>Full Name <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} /></span>),
        dataIndex: "full_name",
        key: "full_name",
        filters: getColumnFilters("full_name"),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.full_name?.toString() === value?.toString(),
        sorter: (a, b) => (a.full_name || '').localeCompare(b.full_name || ''),
        render: (text, record) => (
          <Space>
            <UserOutlined />
            <span>{text || "N/A"}</span>
          </Space>
        ),
      },
      visibleColumns.email && {
        title: (<span>Email <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} /></span>),
        dataIndex: "email",
        key: "email",
        filters: getColumnFilters("email"),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.email?.toString() === value?.toString(),
        sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
      },
      visibleColumns.role && {
        title: (<span>Role <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} /></span>),
        dataIndex: "role",
        key: "role",
        filters: [
          { text: "Super Admin", value: "super_admin" },
          { text: "Admin", value: "admin" }
        ],
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.role === value,
        render: (role) => (
          <Tag color={role === 'super_admin' ? 'gold' : 'blue'}>
            {role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Tag>
        ),
      },
      visibleColumns.status && {
        title: (<span>Status <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: "absolute", right: "-20px", top: "2px" }} /></span>),
        dataIndex: "is_active",
        key: "is_active",
        filters: [
          { text: "Active", value: "Active" },
          { text: "Inactive", value: "Inactive" }
        ],
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => (record.is_active ? 'Active' : 'Inactive') === value,
        render: (active) => (
          <span className="status-badge" style={{ color: active ? '#52c41a' : '#ff4d4f', border: `1px solid ${active ? '#b7eb8f' : '#ffa39e'}`, background: active ? '#f6ffed' : '#fff1f0' }}>
            {active ? "Active" : "Inactive"}
          </span>
        ),
      },
      visibleColumns.permissions && {
        title: "Permissions",
        dataIndex: "permissions",
        key: "permissions",
        render: (perms) => {
          if (!perms || Object.keys(perms).length === 0) return <Tag>None</Tag>;
          const count = Object.keys(perms).filter(k => perms[k]).length;
          return <span>{count} specific permissions</span>;
        }
      },
      {
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: 140,
        render: (_, record) => (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button 
              icon={<EditOutlined />} 
              size="small"
              type="primary" 
              ghost 
              onClick={(e) => { e.stopPropagation(); openModal(record); }}
              disabled={record.role === "super_admin" && record.email === localStorage.getItem("user_email")}
              title="Edit Admin"
            />
            {record.role !== "super_admin" && (
              <Switch 
                size="small"
                checked={record.is_active} 
                onChange={() => toggleUserStatus(record)}
                checkedChildren="Active"
                unCheckedChildren="Inactive"
              />
            )}
          </div>
        ),
      },
    ].filter(Boolean);
  }, [visibleColumns, getColumnFilters]);

  if (error) {
    return (
      <div className="error-container" style={{ padding: 24, textAlign: 'center' }}>
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          showIcon
          action={<Button type="primary" onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="top-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 className="header-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          User & Admin Management
        </h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search Admin..."
            size="large"
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<img src="/icons/search.svg" alt="Search" style={{ width: 16, height: 16, marginRight: 4 }} />}
            className="custom-search-input"
            style={{ width: 280, maxWidth: '100%' }}
          />

          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="btn-new"
            onClick={() => openModal()}
          >
            New Admin
          </Button>

          <Button
            icon={<img src="/icons/editcolumn.svg" alt="Columns" style={{ width: 14 }} />}
            className="btn-edit-columns"
            onClick={() => setIsColumnDrawerOpen(true)}
          >
            Edit Columns
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
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Total Admins</div>
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
            style={{ borderLeft: '4px solid #ff4d4f', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => setActiveTabKey('inactive')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserDeleteOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Inactive</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.inactive}</div>
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
          setPagination({ ...pagination, current: 1 });
        }}
      >
        <TabPane tab={<span><img src="/icons/home.svg" alt="All" style={{ width: 16, marginRight: 8 }} />Total</span>} key="all">
          <div className="asset-table-container">
             <Table 
                columns={columns} 
                dataSource={paginatedData} 
                loading={loading}
                onChange={handleTableChange}
                scroll={{ x: 'max-content' }}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: filteredData.length,
                  showSizeChanger: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} admins`,
                  pageSizeOptions: ['10', '25', '50'],
                }}
                locale={{
                  emptyText: loading ? <Spin size="small" /> : 'No admin found'
                }}
              />
          </div>
        </TabPane>
        <TabPane tab="Active" key="active">
          <div className="asset-table-container">
             <Table 
                columns={columns} 
                dataSource={paginatedData} 
                loading={loading}
                onChange={handleTableChange}
                scroll={{ x: 'max-content' }}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: filteredData.length,
                }}
              />
          </div>
        </TabPane>
        <TabPane tab="Inactive" key="inactive">
          <div className="asset-table-container">
             <Table 
                columns={columns} 
                dataSource={paginatedData} 
                loading={loading}
                onChange={handleTableChange}
                scroll={{ x: 'max-content' }}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: filteredData.length,
                }}
              />
          </div>
        </TabPane>
      </Tabs>

      <Drawer
        title={<span style={{ fontWeight: 600 }}>Filter View</span>}
        placement="right"
        onClose={() => setIsColumnDrawerOpen(false)}
        open={isColumnDrawerOpen}
        width={320}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.keys(DEFAULT_VISIBLE_COLUMNS).map((column) => (
            <label key={column} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                name={column}
                checked={visibleColumns[column]}
                onChange={handleColumnChange}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14, textTransform: 'capitalize' }}>
                {column.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </label>
          ))}
        </div>
      </Drawer>

      <Modal
        title={editingUser ? "Edit Admin Permissions" : "Create New Admin"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
        okText={editingUser ? "Update" : "Create"}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email Address" rules={[{ required: true, type: "email" }]}>
                <Input prefix={<UserOutlined />} placeholder="Enter email" disabled={!!editingUser} />
              </Form.Item>
            </Col>
          </Row>
          
          {!editingUser && (
            <Form.Item name="password" label="Temporary Password" rules={[{ required: true, min: 6 }]}>
              <Input.Password prefix={<KeyOutlined />} placeholder="Specify a login password" />
            </Form.Item>
          )}

          <Divider orientation="left">Configure Permissions</Divider>
          
          <Form.Item name="permissions">
            <Checkbox.Group className="permissions-checkbox-group" style={{ width: '100%' }}>
              <div className="simplified-permissions-grid">
                {SIMPLIFIED_PERMISSIONS.map(cat => (
                  <Card 
                    key={cat.value} 
                    size="small" 
                    className="permission-category-card"
                    style={{ marginBottom: 12, border: '1px solid #f0f0f0' }}
                  >
                    <Checkbox value={cat.value} style={{ fontWeight: 600, color: '#3184C5' }}>
                      {cat.label}
                    </Checkbox>
                    <div style={{ paddingLeft: 24, fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                      {cat.description}
                    </div>
                  </Card>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
