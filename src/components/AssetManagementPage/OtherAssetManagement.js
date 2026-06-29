import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Input,
  Modal,
  Table,
  Button,
  Form,
  Drawer,
  Checkbox,
  Select,
  Tabs,
  Dropdown,
  Menu,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  AppstoreAddOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './AssetManagement.css';
import AddAssetTypeForm from './Addassetpage/AddAssetTypeForm';
import AddAssetForm from './Addassetpage/AddAssetForm';
import EditAssetForm from './Addassetpage/EditAssetForm';
import Swal from 'sweetalert2';
import { REACT_BASE_URL } from '../config';

import HomeTab from './InsideTabs/HomeTab';
import AssignAssetTab from './InsideTabs/AssignAssetTab';
import ReturnAssetTab from './InsideTabs/ReturnAssetTab';
import GroupAssetTab from './InsideTabs/GroupAssetTab';
import MaintenanceTab from './InsideTabs/MaintenanceTab';
import DecommissionTab from './InsideTabs/DecommissionTab';
import AssetTypeTab from './InsideTabs/AssetTypeTab';

import AddAssetModal from './modals/AddAssetModal';
import EditAssetModal from './modals/EditAssetModal';
import AssignAssetModal from './modals/AssignAssetModal';
import AssetInfoModal from './modals/AssetInfoModal';
import UserInfoModal from './modals/UserInfoModal';
import AssignerInfoModal from './modals/AssignerInfoModal';
import ManageAssetGroupsModal from './modals/ManageAssetGroupsModal';

const { TabPane } = Tabs;

const DEFAULT_VISIBLE_COLUMNS = {
  assetId: true,
  assetCode: true,
  name: true,
  assetStatus: false,
  location: false,
  warrantyExpiry: false,
  companyName: false,
  assetTypeCategory: false,
  assignTo: true,
  assignedToEmployeeCode: false,
  isOtherAsset: false,
  createdAt: false,
  updatedAt: false,
  documents: false,
  handoverDate: false,
  received: false,
  invoiceNo: false,
  price: false,
  brand: true,
  whoAssigned: true,
};

const INITIAL_MODAL_STATE = {
  add: false,
  edit: false,
  assign: false,
  info: false,
  userInfo: false,
  assignerInfo: false,
  filterDrawer: false,
};

const useAssetData = (isOtherAssetPage) => {
  const [cardData, setCardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');
      
      const url = `${REACT_BASE_URL}/other-assets`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const enrichedData = data.map((item) => {
        // Other assets use other_asset_type, not asset_type
        const assetType = item.other_asset_type || item.asset_type || null;
        // Invoice info: check invoices array, or stock_item linked invoice
        const invoiceList = item.invoices && item.invoices.length > 0 ? item.invoices : [];
        const stockInvoice = item.stock_item?.invoice_number || null;
        const invoiceNo = invoiceList.length > 0
          ? invoiceList.map(inv => inv.invoice_number).join(', ')
          : (stockInvoice || 'N/A');
        const price = invoiceList.length > 0
          ? invoiceList.reduce((sum, inv) => sum + (parseFloat(inv.asset_cost) || 0), 0)
          : (item.stock_item?.unit_price || 0);

        return {
          ...item,
          key: item.id,
          assetId: item.id,
          assetCode: item.asset_code,
          name: item.name,
          assetStatus: item.asset_status,
          location: item.location,
          warrantyExpiry: item.warranty_expiry,
          companyName: item.company ? item.company.name : 'N/A',
          assetTypeCategory: assetType ? assetType.category : 'N/A',
          assignTo: item.assigned_to ? item.assigned_to.full_name : 'Unassigned',
          assignedToId: item.assigned_to ? item.assigned_to.id : null,
          lastAssignedToId: item.last_assigned_to ? item.last_assigned_to.id : null,
          assignedToEmployeeCode: item.assigned_to ? item.assigned_to.employee_code : (item.last_assigned_to ? item.last_assigned_to.employee_code : 'N/A'),
          isOtherAsset: item.is_other_asset,
          createdAt: item.created_at ? item.created_at.split('T')[0] : 'N/A',
          updatedAt: item.updated_at ? item.updated_at.split('T')[0] : 'N/A',
          documents: item.documents,
          handoverDate: item.updated_at ? item.updated_at.split('T')[0] : 'N/A',
          received: 'Yes',
          brand: assetType ? assetType.name : 'N/A',
          whoAssigned: item.assigned_by ? item.assigned_by.name : 'N/A',
          assignedByUserId: item.assigned_by ? item.assigned_by.id : null,
          tech_specs: item.tech_specs || {},
          invoices: invoiceList,
          invoiceNo,
          price,
          parentAsset: item.parent_asset || null,
          assetHistory: [
            {
              action: 'Created',
              by: 'Admin',
              to: null,
              date: item.created_at?.split('T')[0],
              location: item.location || 'Warehouse',
            },
          ],
        };
      });

      setCardData(enrichedData);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { cardData, setCardData, loading, error, fetchData };
};

const useModalState = () => {
  const [modalState, setModalState] = useState(INITIAL_MODAL_STATE);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [assignerInfo, setAssignerInfo] = useState(null);

  const openModal = useCallback((modalName, record = null) => {
    setModalState((prev) => ({ ...prev, [modalName]: true }));
    if (record) setSelectedRecord(record);
  }, []);

  const closeModal = useCallback((modalName) => {
    setModalState((prev) => ({ ...prev, [modalName]: false }));
    if (modalName !== 'filterDrawer') {
      setSelectedRecord(null);
      setUserInfo(null);
      setAssignerInfo(null);
    }
  }, []);

  return {
    modalState, selectedRecord, setSelectedRecord,
    userInfo, setUserInfo, assignerInfo, setAssignerInfo,
    openModal, closeModal,
  };
};

function OtherAssetManagement() {
  const isOtherAssetPage = true; // Hardcoded for this separate component
  const [activeView, setActiveView] = useState('assetManagement');
  const [activeTabKey, setActiveTabKey] = useState('home');
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilters, setTableFilters] = useState({});
  const [selectedTypeForEdit, setSelectedTypeForEdit] = useState(null);
  const role = localStorage.getItem('user_role') || sessionStorage.getItem('user_role');
  const getInitialVisibleColumns = () => {
    if (isOtherAssetPage) {
      return {
        ...DEFAULT_VISIBLE_COLUMNS,
        assetCode: false,
        brand: false,
        location: true,
        price: true,
        invoiceNo: true,
        assetTypeCategory: true,
      };
    }
    return DEFAULT_VISIBLE_COLUMNS;
  };

  const [visibleColumns, setVisibleColumns] = useState(getInitialVisibleColumns());
  const [dynamicColumns, setDynamicColumns] = useState({});

  const { cardData, setCardData, loading, error, fetchData } = useAssetData(isOtherAssetPage);
  const {
    modalState, selectedRecord, setSelectedRecord,
    userInfo, setUserInfo, assignerInfo, setAssignerInfo,
    openModal, closeModal,
  } = useModalState();

  useEffect(() => {
    if (activeView === 'assetManagement') {
      fetchData();
    }
  }, [activeView, fetchData]);

  // ── Extract ALL unique tech_spec keys ──
  const techSpecKeys = useMemo(() => {
    const keys = new Set();
    cardData.forEach((item) => {
      if (item.tech_specs && typeof item.tech_specs === 'object') {
        Object.keys(item.tech_specs).forEach((key) => keys.add(key));
      }
    });
    return [...keys].sort();
  }, [cardData]);

  // ── Auto-register new tech_spec keys (default unchecked) ──
  useEffect(() => {
    setDynamicColumns((prev) => {
      const updated = { ...prev };
      let changed = false;
      techSpecKeys.forEach((key) => {
        if (!(key in updated)) {
          updated[key] = false;
          changed = true;
        }
      });
      Object.keys(updated).forEach((key) => {
        if (!techSpecKeys.includes(key)) {
          delete updated[key];
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [techSpecKeys]);

  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const navigate = useNavigate();

  const filteredData = useMemo(() => {
    return cardData.filter((record) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesStaticSearch = Object.entries(record).some(([key, value]) => {
        if (key === 'tech_specs') return false;
        return value?.toString().toLowerCase().includes(searchLower);
      });
      const matchesTechSpecSearch =
        record.tech_specs &&
        typeof record.tech_specs === 'object' &&
        Object.values(record.tech_specs).some((value) =>
          value?.toString().toLowerCase().includes(searchLower)
        );
      const matchesSearch = !searchTerm || matchesStaticSearch || matchesTechSpecSearch;
      const matchesFilters = Object.keys(tableFilters).every((key) => {
        const filterValues = tableFilters[key];
        if (!filterValues || filterValues.length === 0) return true;
        return filterValues.includes(record[key]);
      });
      return matchesSearch && matchesFilters;
    });
  }, [cardData, searchTerm, tableFilters]);

  const getColumnFilters = useCallback(
    (dataIndex) => {
      const uniqueValues = [...new Set(cardData.map((item) => item[dataIndex]))].filter(Boolean);
      return uniqueValues.map((value) => ({ text: value, value }));
    },
    [cardData]
  );

  // ── Tech spec filter helper ──
  const getTechSpecFilters = useCallback(
    (specKey) => {
      const uniqueValues = [
        ...new Set(
          cardData
            .map((item) => item.tech_specs?.[specKey])
            .filter((v) => v !== undefined && v !== null && v !== '')
        ),
      ];
      return uniqueValues.map((value) => ({
        text: String(value),
        value: String(value),
      }));
    },
    [cardData]
  );

  const handleEdit = useCallback(
    (record) => {
      form.setFieldsValue(record);
      openModal('edit', record);
    },
    [form, openModal]
  );

  const handleEditSave = useCallback(
    (values) => {
      setCardData((prev) =>
        prev.map((item) =>
          item.assetId === selectedRecord.assetId
            ? { ...selectedRecord, ...values }
            : item
        )
      );
      closeModal('edit');
    },
    [selectedRecord, setCardData, closeModal]
  );

  const handleAddAsset = useCallback(
    () => {
      setUpdateTrigger(prev => prev + 1);
      setActiveView('assetManagement');
    },
    [setUpdateTrigger, setActiveView]
  );

  const handleAssignSave = useCallback(
    (assignData) => {
      const { assignTo, responseData, message } = assignData;
      setCardData((prev) =>
        prev.map((item) =>
          item.assetId === selectedRecord.assetId
            ? {
              ...item,
              assetStatus: 'assigned',
              assignTo,
              // Preserve or set assignedToId — if responseData has it use it, else keep existing
              assignedToId: responseData.employee_id || item.assignedToId || null,
              // assignedByUserId comes from responseData.assigned_by (the logged-in user id)
              assignedByUserId: responseData.assigned_by || item.assignedByUserId || null,
              whoAssigned: responseData.assigned_by_name || item.whoAssigned || 'Admin',
              handoverDate: responseData.assigned_at
                ? responseData.assigned_at.split('T')[0]
                : new Date().toISOString().split('T')[0],
              location: responseData.assigned_location || item.location || 'Office',
              assetHistory: [
                ...(item.assetHistory || []),
                {
                  action: 'Assigned',
                  by: 'Current User',
                  to: assignTo,
                  date: responseData.assigned_at
                    ? responseData.assigned_at.split('T')[0]
                    : new Date().toISOString().split('T')[0],
                  location: responseData.assigned_location || item.location || 'Office',
                  remarks: responseData.assign_remarks || 'N/A'
                },
              ],
            }
            : item
        )
      );
      closeModal('assign');
      assignForm.resetFields();
      // Re-fetch to get the latest data including real assignedToId & assignedByUserId
      fetchData();
      Swal.fire('Success!', message || `Asset has been assigned to ${assignTo} successfully.`, 'success');
    },
    [selectedRecord, setCardData, closeModal, assignForm, fetchData]
  );

  const handleUserInfo = useCallback(
    (record) => {
      // Use current ID or fallback to last ID if unassigned
      const empId = record.assignedToId || record.lastAssignedToId;
      const empName = record.assignedToId ? record.assignTo : (record.last_assigned_to ? record.last_assigned_to.full_name : record.assignTo);
      
      setUserInfo({ user: empName, employeeId: empId });
      openModal('userInfo');
    },
    [setUserInfo, openModal]
  );

  const handleAssignerInfo = useCallback(
    (record) => {
      // Pass both the display name and the real user UUID for the API
      setAssignerInfo({ assigner: record.whoAssigned, userId: record.assignedByUserId });
      openModal('assignerInfo');
    },
    [setAssignerInfo, openModal]
  );

  const handleQRView = useCallback(
    (record) => {
      navigate(`/qr/${record.id || record.assetId}`);
    },
    [navigate]
  );

  const handleDeleteAsset = useCallback(
    async (record) => {
      const attemptDeletion = async () => {
        const token =
          localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const response = await fetch(
          `${REACT_BASE_URL}/other-assets/${record.assetId || record.id}/delete`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const detail = data.detail || data.message || data;
          const message = typeof detail === 'string' ? detail : detail?.message || 'Failed to delete asset';
          const cleanupActionLogId = detail?.cleanup_action_log_id;
          throw { message, cleanupActionLogId };
        }
        return true;
      };

      const runCleanup = async (cleanupActionLogId) => {
        const token =
          localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const response = await fetch(
          `${REACT_BASE_URL}/asset-logs/cleanup/${cleanupActionLogId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const detail = data.detail || data.message || 'Failed to clean up broken history log';
          throw new Error(typeof detail === 'string' ? detail : detail?.message || 'Failed to clean up broken history log');
        }
      };

      Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await attemptDeletion();
            setCardData((prev) =>
              prev.filter((item) => item.assetId !== record.assetId && item.id !== record.id)
            );
            Swal.fire('Deleted!', 'The asset has been deleted.', 'success');
          } catch (error) {
            const errorMessage = error.message || 'Failed to delete asset';
            const cleanupActionLogId = error.cleanupActionLogId;
            if (cleanupActionLogId) {
              const cleanupResult = await Swal.fire({
                title: 'Broken history record found',
                html: `${errorMessage}<br/><br/>Do you want to remove the broken history entry and retry deletion?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, clean and retry',
                cancelButtonText: 'No, keep it',
              });
              if (cleanupResult.isConfirmed) {
                try {
                  await runCleanup(cleanupActionLogId);
                  await attemptDeletion();
                  setCardData((prev) =>
                    prev.filter((item) => item.assetId !== record.assetId && item.id !== record.id)
                  );
                  Swal.fire('Deleted!', 'The asset has been deleted after cleanup.', 'success');
                } catch (cleanupError) {
                  Swal.fire('Error!', cleanupError.message || 'Failed to clean up broken history entry', 'error');
                }
              }
              return;
            }

            if (errorMessage.includes('approval')) {
              Swal.fire('Request Sent', errorMessage, 'info');
            } else {
              Swal.fire('Error!', errorMessage, 'error');
            }
          }
        }
      });
    },
    [setCardData]
  );

  const handleUnassign = useCallback(
    async (record) => {
      Swal.fire({
        title: 'Return Asset',
        html: `
          <div style="text-align: left; margin-bottom: 12px;">
            <label style="font-size: 14px; font-weight: bold;">Return Location:</label>
            <input id="swal-input-location" class="swal2-input" style="width: 100%; box-sizing: border-box; margin: 0; margin-top: 6px;" placeholder="e.g. Head Office" value="IT Room">
          </div>
          <div style="text-align: left;">
            <label style="font-size: 14px; font-weight: bold;">Remarks (Optional):</label>
            <textarea id="swal-input-remarks" class="swal2-textarea" style="width: 100%; box-sizing: border-box; margin: 0; margin-top: 6px;" placeholder="Add any comments"></textarea>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, return it!',
        preConfirm: () => {
          return {
            location: document.getElementById('swal-input-location').value,
            remarks: document.getElementById('swal-input-remarks').value
          }
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          const { location, remarks } = result.value;
          try {
            const token =
              localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            const response = await fetch(`${REACT_BASE_URL}/other-asset-assignment/unassign`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ other_asset_id: record.assetId, location, remarks }),
            });
            if (!response.ok) {
              const data = await response.json().catch(() => ({}));
              throw new Error(data.detail || data.message || 'Failed to return asset');
            }
            setCardData((prev) =>
              prev.map((item) =>
                item.assetId === record.assetId
                  ? {
                    ...item,
                    assetStatus: 'available',
                    assignTo: 'Unassigned',
                    assignedToId: null,      // Clear employee ID
                    assignedByUserId: null,  // Clear user ID
                    assetHistory: [
                      ...(item.assetHistory || []),
                      {
                        action: 'Returned',
                        by: 'Current User',
                        to: item.assignTo || 'Unknown',
                        date: new Date().toISOString().split('T')[0],
                        location: location || record.location || 'Warehouse',
                        remarks: remarks || 'N/A'
                      },
                    ],
                  }
                  : item
              )
            );
            // Re-fetch to get latest state from server
            fetchData();
            Swal.fire('Unassigned!', 'The asset has been unassigned successfully.', 'success');
          } catch (error) {
            if (error.message.includes('approval')) {
              Swal.fire('Request Sent', error.message, 'info');
            } else {
              Swal.fire('Error!', error.message, 'error');
            }
          }
        }
      });
    },
    [setCardData]
  );
  const handleUpdateStatus = useCallback(
    async (record, newStatus) => {
      const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      
      const { value: formValues } = await Swal.fire({
        title: `Move to ${statusLabel}`,
        html:
          `<div style="text-align: left;">` +
          `<label><b>Location:</b></label>` +
          `<input id="swal-input-location" class="swal2-input" placeholder="Enter Location" value="${newStatus === 'available' ? 'IT Room' : (record.location || '')}">` +
          `<label><b>Remarks:</b></label>` +
          `<textarea id="swal-input-remarks" class="swal2-textarea" placeholder="Enter Remarks (optional)"></textarea>` +
          `</div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: `Move to ${statusLabel}`,
        preConfirm: () => {
          const loc = document.getElementById('swal-input-location').value;
          if (newStatus === 'available' && (!loc || loc.trim().toLowerCase() !== 'it room')) {
            Swal.showValidationMessage('Recovery/Re-listing must be to "IT Room" for stock synchronization');
            return false;
          }
          if (newStatus === 'maintenance' && (!loc || loc.trim().toLowerCase() === 'it room')) {
            Swal.showValidationMessage('Specific location is mandatory for Maintenance (cannot be IT Room)');
            return false;
          }
          return {
            location: loc,
            remarks: document.getElementById('swal-input-remarks').value
          }
        }
      });

      if (formValues) {
        try {
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const formData = new FormData();
          formData.append('asset_status', newStatus);
          formData.append('location', formValues.location);
          if (formValues.remarks) {
            formData.append('remarks', formValues.remarks);
          }

          const response = await fetch(`${REACT_BASE_URL}/other-assets/${record.assetId}/update`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || data.message || 'Failed to update asset status');
          }

          fetchData();
          Swal.fire('Updated!', `Asset is now in ${newStatus}.`, 'success');
        } catch (error) {
          if (error.message.includes('approval')) {
            Swal.fire('Request Sent', error.message, 'info');
          } else {
            Swal.fire('Error!', error.message, 'error');
          }
        }
      }
    },
    [fetchData]
  );

  const handleAssign = useCallback(
    (record) => {
      assignForm.resetFields();
      openModal('assign', record);
    },
    [assignForm, openModal]
  );

  const handleColumnChange = useCallback((e) => {
    const { name, checked } = e.target;
    setVisibleColumns((prev) => ({ ...prev, [name]: checked }));
  }, []);

  const handleDynamicColumnChange = useCallback((specKey, checked) => {
    setDynamicColumns((prev) => ({ ...prev, [specKey]: checked }));
  }, []);

  const handleTableChange = useCallback((pagination, filters, sorter) => {
    setTableFilters(filters);
  }, []);

  // ── Dynamic tech_spec columns ──
  const dynamicTableColumns = useMemo(() => {
    return techSpecKeys
      .filter((key) => dynamicColumns[key])
      .map((key) => ({
        title: (
          <span>
            {key}
            <img
              src="/icons/sort.svg"
              alt="Sort"
              style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }}
            />
          </span>
        ),
        key: `techSpec_${key}`,
        dataIndex: ['tech_specs', key],
        filters: getTechSpecFilters(key),
        filterIcon: () => (
          <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />
        ),
        onFilter: (value, record) =>
          String(record.tech_specs?.[key] || '') === String(value),
        sorter: (a, b) =>
          String(a.tech_specs?.[key] || '').localeCompare(String(b.tech_specs?.[key] || '')),
        render: (text, record) => {
          const val = record.tech_specs?.[key];
          return val !== undefined && val !== null && val !== '' ? String(val) : 'N/A';
        },
      }));
  }, [techSpecKeys, dynamicColumns, getTechSpecFilters]);

  // ── Home tab columns ──
  const columns = useMemo(() => {
    const staticColumns = [
      visibleColumns.assetId && {
        title: (
          <>
            <span>Asset ID</span>
            <img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} />
          </>
        ),
        dataIndex: 'assetId',
        key: 'assetId',
        filters: getColumnFilters('assetId'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.assetId === value,
        sorter: (a, b) => String(a.assetId).localeCompare(String(b.assetId)),
        render: (text, record) => (
          <span>
            <span title={text}>
              {text && String(text).length > 8 ? `${String(text).substring(0, 8)}...` : text}
            </span>
            <InfoCircleOutlined style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }} onClick={() => openModal('info', record)} />
          </span>
        ),
      },
      visibleColumns.assetCode && {
        title: (<span>Asset Code<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'assetCode', key: 'assetCode',
        filters: getColumnFilters('assetCode'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.assetCode === value,
        sorter: (a, b) => (a.assetCode || '').localeCompare(b.assetCode || ''),
      },
      visibleColumns.name && {
        title: (<span>Name<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'name', key: 'name',
        filters: getColumnFilters('name'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.name === value,
        sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      },
      visibleColumns.assetStatus && {
        title: (<span>Asset Status<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'assetStatus', key: 'assetStatus',
        filters: getColumnFilters('assetStatus'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.assetStatus === value,
        sorter: (a, b) => (a.assetStatus || '').localeCompare(b.assetStatus || ''),
      },
      visibleColumns.location && {
        title: (<span>Location<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'location', key: 'location',
        filters: getColumnFilters('location'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.location === value,
        sorter: (a, b) => (a.location || '').localeCompare(b.location || ''),
      },
      visibleColumns.warrantyExpiry && {
        title: (<span>Warranty Expiry<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'warrantyExpiry', key: 'warrantyExpiry',
        filters: getColumnFilters('warrantyExpiry'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.warrantyExpiry === value,
        sorter: (a, b) => new Date(a.warrantyExpiry) - new Date(b.warrantyExpiry),
      },
      visibleColumns.companyName && {
        title: (<span>Company Name<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'companyName', key: 'companyName',
        filters: getColumnFilters('companyName'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.companyName === value,
        sorter: (a, b) => (a.companyName || '').localeCompare(b.companyName || ''),
      },
      visibleColumns.assetTypeCategory && {
        title: (<span>Asset Type Category<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'assetTypeCategory', key: 'assetTypeCategory',
        filters: getColumnFilters('assetTypeCategory'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.assetTypeCategory === value,
        sorter: (a, b) => (a.assetTypeCategory || '').localeCompare(b.assetTypeCategory || ''),
      },
      visibleColumns.assignedToEmployeeCode && {
        title: (<span>Employee Code<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'assignedToEmployeeCode', key: 'assignedToEmployeeCode',
        filters: getColumnFilters('assignedToEmployeeCode'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.assignedToEmployeeCode === value,
        sorter: (a, b) => (a.assignedToEmployeeCode || '').localeCompare(b.assignedToEmployeeCode || ''),
      },
      visibleColumns.isOtherAsset && {
        title: 'Is Other Asset', dataIndex: 'isOtherAsset', key: 'isOtherAsset',
        filters: [{ text: 'Yes', value: true }, { text: 'No', value: false }],
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.isOtherAsset === value,
        render: (text) => (text ? 'Yes' : 'No'),
      },
      visibleColumns.createdAt && {
        title: (<span>Created At<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'createdAt', key: 'createdAt',
        filters: getColumnFilters('createdAt'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.createdAt === value,
        sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      },
      visibleColumns.updatedAt && {
        title: (<span>Updated At<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'updatedAt', key: 'updatedAt',
        filters: getColumnFilters('updatedAt'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.updatedAt === value,
        sorter: (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt),
      },
      visibleColumns.documents && {
        title: 'Documents', dataIndex: 'documents', key: 'documents',
        render: (documents) => (
          <>
            {documents && documents.length > 0
              ? documents.map((doc, index) => (
                <a key={index} href={`${REACT_BASE_URL}/${doc}`} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>
                  Document {index + 1}
                </a>
              ))
              : 'N/A'}
          </>
        ),
      },
      visibleColumns.assignTo && {
        title: (<span>Assigned To<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'assignTo', key: 'assignTo',
        filters: getColumnFilters('assignTo'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.assignTo === value,
        sorter: (a, b) => (a.assignTo || '').localeCompare(b.assignTo || ''),
        render: (text, record) => (
          <span>
            {text}
            <InfoCircleOutlined style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }} onClick={() => handleUserInfo(record)} />
          </span>
        ),
      },
      visibleColumns.handoverDate && {
        title: (<span>Handover Date<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'handoverDate', key: 'handoverDate',
        filters: getColumnFilters('handoverDate'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.handoverDate === value,
        sorter: (a, b) => new Date(a.handoverDate) - new Date(b.handoverDate),
      },
      visibleColumns.received && {
        title: 'Received', dataIndex: 'received', key: 'received',
        filters: getColumnFilters('received'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.received === value,
        sorter: (a, b) => (a.received || '').localeCompare(b.received || ''),
      },
      visibleColumns.invoiceNo && {
        title: (<span>Invoice No<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'invoiceNo', key: 'invoiceNo',
        filters: getColumnFilters('invoiceNo'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.invoiceNo === value,
        sorter: (a, b) => (a.invoiceNo || '').localeCompare(b.invoiceNo || ''),
      },
      visibleColumns.price && {
        title: (<span>Price<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'price', key: 'price',
        filters: getColumnFilters('price'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.price === value,
        sorter: (a, b) => {
          const priceA = parseFloat(String(a.price || '0').replace(/[$,]/g, ''));
          const priceB = parseFloat(String(b.price || '0').replace(/[$,]/g, ''));
          return priceA - priceB;
        },
      },
      visibleColumns.brand && {
        title: (<span>Brand<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'brand', key: 'brand',
        filters: getColumnFilters('brand'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.brand === value,
        sorter: (a, b) => (a.brand || '').localeCompare(b.brand || ''),
      },
      visibleColumns.whoAssigned && {
        title: (<span>Who Assigned<img src="/icons/sort.svg" alt="Sort" style={{ width: 12, marginLeft: 6, position: 'absolute', right: '-20px', top: '2px' }} /></span>),
        dataIndex: 'whoAssigned', key: 'whoAssigned',
        filters: getColumnFilters('whoAssigned'),
        filterIcon: () => <img src="/icons/filter.svg" alt="Filter" style={{ width: 12 }} />,
        onFilter: (value, record) => record.whoAssigned === value,
        sorter: (a, b) => (a.whoAssigned || '').localeCompare(b.whoAssigned || ''),
        render: (text, record) => (
          <span>
            {text}
            <InfoCircleOutlined style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }} onClick={() => handleAssignerInfo(record)} />
          </span>
        ),
      },
    ].filter(Boolean);

    const actionsColumn = {
      title: 'Actions', key: 'actions', fixed: 'right', width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {!record.parentAsset && (record.assetStatus === 'available') && (
            <>
              <Button type="primary" size="small" onClick={() => handleAssign(record)}>Assign</Button>
              <Button type="default" size="small" style={{ borderColor: '#faad14', color: '#faad14' }} onClick={() => handleUpdateStatus(record, 'maintenance')}>Maintain</Button>
            </>
          )}
          {!record.parentAsset && record.assetStatus === 'assigned' && (
            <Button type="default" size="small" onClick={() => handleUnassign(record)}>Return</Button>
          )}
          {record.assetStatus === 'maintenance' && (
            <Button type="default" size="small" style={{ borderColor: '#52c41a', color: '#52c41a' }} onClick={() => handleUpdateStatus(record, 'available')}>Recover</Button>
          )}
          {!record.parentAsset && record.assetStatus !== 'decommissioned' && (
             <Button danger size="small" onClick={() => handleUpdateStatus(record, 'decommissioned')}>Decom</Button>
          )}
          <Button icon={<EditOutlined />} size="small" onClick={() => { setSelectedRecord(record); setActiveView('editAsset'); }} />
          <Button icon={<DeleteOutlined />} danger size="small" onClick={() => handleDeleteAsset(record)} title="Delete Asset" />
          <Button icon={<QrcodeOutlined />} size="small" onClick={() => handleQRView(record)} title="View QR Code" />
          <Button icon={<AppstoreAddOutlined />} size="small" title="Manage Groups" onClick={() => openModal('manageAssetGroups', record)} />
        </div>
      ),
    };

    return [...staticColumns, ...dynamicTableColumns, actionsColumn];
  }, [
    visibleColumns, dynamicTableColumns, getColumnFilters, handleEdit,
    openModal, handleUserInfo, handleAssignerInfo, handleAssign,
    handleQRView, handleUnassign, setSelectedRecord, setActiveView, handleDeleteAsset,
  ]);

  if (error) {
    return <div className="error-message">Error loading data: {error}</div>;
  }

  const handleDropdownClick = ({ key }) => {
    if (key === 'add') setActiveView('addAsset');
    else if (key === 'addType') setActiveView('addAssetType');
  };

  const handleExport = async (format) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    try {
      const response = await fetch(`${REACT_BASE_URL}/reports/assets/${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assets_report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        Swal.fire('Error', 'Failed to generate report', 'error');
      }
    } catch (error) {
       Swal.fire('Error', 'An error occurred while exporting', 'error');
    }
  };

  const menu = (
    <Menu onClick={handleDropdownClick}>
      <Menu.Item key="add">Add {isOtherAssetPage ? 'Other Asset' : 'Asset'}</Menu.Item>
      <Menu.Item key="addType">Add {isOtherAssetPage ? 'Other Asset Type' : 'Asset Type'}</Menu.Item>
    </Menu>
  );

  const exportMenu = (
    <Menu onClick={({ key }) => handleExport(key)}>
      <Menu.Item key="excel">Export as Excel</Menu.Item>
      <Menu.Item key="pdf">Export as PDF</Menu.Item>
    </Menu>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 m-4 md:m-6 lg:m-8" style={{ margin: '1rem 1rem' }}>
      {activeView === 'assetManagement' ? (
        <>
          <div className="top-header-row">
            <h1 className="header-title">{isOtherAssetPage ? 'Other Asset Management' : 'Asset Management'}</h1>
            <div className="header-search">
              <Input
                placeholder="Search by Asset Name or ID"
                size="large"
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={<img src="/icons/search.svg" alt="Search Icon" style={{ width: 16, height: 16 }} />}
                className="custom-search-input"
              />
            </div>
            <div className="header-buttons">
              <Dropdown overlay={menu} trigger={['click']}>
                <Button
                  icon={<img src="/icons/assign.svg" alt="Add" style={{ width: 12, marginRight: 6 }} />}
                  className="btn-edit-columns"
                >
                  New
                </Button>
              </Dropdown>
              <Dropdown overlay={exportMenu} trigger={['click']}>
                <Button
                  icon={<DownloadOutlined />}
                  className="btn-edit-columns"
                >
                  Export
                </Button>
              </Dropdown>
              <Button
                icon={<img src="/icons/editcolumn.svg" alt="Filter" style={{ width: 12 }} />}
                className="btn-edit-columns"
                onClick={() => openModal('filterDrawer')}
              >
                Edit Columns
              </Button>
            </div>
          </div>

          <Tabs defaultActiveKey="home" activeKey={activeTabKey} onChange={setActiveTabKey} className="asset-tabs">
            <TabPane
              tab={<span><img src="/icons/home.svg" alt="Home" style={{ width: 16, marginRight: 8 }} />Home</span>}
              key="home"
            >
              <HomeTab
                filteredData={filteredData}
                columns={columns}
                handleTableChange={handleTableChange}
                loading={loading}
                setActiveTabKey={setActiveTabKey}
              />
            </TabPane>

            <TabPane
              tab={<span><img src="/icons/assign.svg" alt="Assign" style={{ width: 16, marginRight: 8 }} />Assign Asset</span>}
              key="assign"
            >
              {/* ══════════════════════════════════════════════ */}
              {/*  PASSING ALL 3 NEW PROPS HERE                */}
              {/* ══════════════════════════════════════════════ */}
              <AssignAssetTab
                filteredData={filteredData}
                columns={columns}
                handleTableChange={handleTableChange}
                loading={loading}
                handleAssign={handleAssign}
                openModal={openModal}
                handleUserInfo={handleUserInfo}
                handleAssignerInfo={handleAssignerInfo}
                handleDeleteAsset={handleDeleteAsset}
                setSelectedRecord={setSelectedRecord}
                setActiveView={setActiveView}
                getColumnFilters={getColumnFilters}
                visibleColumns={visibleColumns}
                dynamicColumns={dynamicColumns}
                techSpecKeys={techSpecKeys}
                getTechSpecFilters={getTechSpecFilters}
              />
            </TabPane>

            <TabPane
              tab={<span><img src="/icons/return.svg" alt="Return" style={{ width: 16, marginRight: 8 }} />Return Asset</span>}
              key="return"
            >
              {/* ══════════════════════════════════════════════ */}
              {/*  PASSING ALL 3 NEW PROPS HERE                */}
              {/* ══════════════════════════════════════════════ */}
              <ReturnAssetTab
                filteredData={filteredData}
                columns={columns}
                handleTableChange={handleTableChange}
                loading={loading}
                handleUnassign={handleUnassign}
                openModal={openModal}
                handleUserInfo={handleUserInfo}
                handleAssignerInfo={handleAssignerInfo}
                handleDeleteAsset={handleDeleteAsset}
                setSelectedRecord={setSelectedRecord}
                setActiveView={setActiveView}
                getColumnFilters={getColumnFilters}
                visibleColumns={visibleColumns}
                dynamicColumns={dynamicColumns}
                techSpecKeys={techSpecKeys}
                getTechSpecFilters={getTechSpecFilters}
              />
            </TabPane>

            <TabPane
              tab={<span><img src="/icons/maintenance.svg" alt="Maintenance" style={{ width: 16, marginRight: 8 }} />Maintenance</span>}
              key="maintenance"
            >
              <MaintenanceTab
                filteredData={filteredData}
                columns={columns}
                handleTableChange={handleTableChange}
                loading={loading}
                handleUpdateStatus={handleUpdateStatus}
                setSelectedRecord={setSelectedRecord}
                setActiveView={setActiveView}
                getColumnFilters={getColumnFilters}
                visibleColumns={visibleColumns}
                dynamicColumns={dynamicColumns}
                techSpecKeys={techSpecKeys}
                getTechSpecFilters={getTechSpecFilters}
              />
            </TabPane>

            <TabPane
              tab={<span><img src="/icons/decommission.svg" alt="Decommission" style={{ width: 16, marginRight: 8 }} />Decommission</span>}
              key="decommission"
            >
              <DecommissionTab
                filteredData={filteredData}
                columns={columns}
                handleTableChange={handleTableChange}
                loading={loading}
                handleUpdateStatus={handleUpdateStatus}
                setSelectedRecord={setSelectedRecord}
                setActiveView={setActiveView}
                getColumnFilters={getColumnFilters}
                visibleColumns={visibleColumns}
                dynamicColumns={dynamicColumns}
                techSpecKeys={techSpecKeys}
                getTechSpecFilters={getTechSpecFilters}
              />
            </TabPane>

            <TabPane
              tab={<span><img src="/icons/editassettype.svg" alt="Other Asset Types" style={{ width: 16, marginRight: 8 }} />Other Asset Types</span>}
              key="assetTypes"
            >
              <AssetTypeTab 
                isOtherAssetPage={isOtherAssetPage} 
                onEdit={(type) => { setSelectedTypeForEdit(type); setActiveView('addAssetType'); }}
                onAdd={() => { setSelectedTypeForEdit(null); setActiveView('addAssetType'); }}
              />
            </TabPane>

            {/* <TabPane
              tab={<span><img src="/icons/group.svg" alt="Groups" style={{ width: 16, marginRight: 8 }} />Asset Groups</span>}
              key="assetGroups"
            >
              <GroupAssetTab 
                cardData={cardData} 
                handleAssign={handleAssign}
                handleUnassign={handleUnassign}
                onEditAsset={(record) => { setSelectedRecord(record); setActiveView('editAsset'); }}
                activeTabKey={activeTabKey}
                updateTrigger={updateTrigger}
                isOtherAssetPage={true}
              />
            </TabPane> */}

          </Tabs>

          {/* Modals */}
          <AddAssetModal visible={modalState.add} onCancel={() => closeModal('add')} onOk={() => addForm.submit()} form={addForm} onFinish={handleAddAsset} />
          <EditAssetModal visible={modalState.edit} onCancel={() => closeModal('edit')} onOk={() => form.submit()} form={form} onFinish={handleEditSave} />
          <AssignAssetModal
            visible={modalState.assign}
            onCancel={() => { closeModal('assign'); assignForm.resetFields(); }}
            form={assignForm}
            onFinish={handleAssignSave}
            assetRecord={selectedRecord}
            isOtherAssetPage={true}
          />
          <AssetInfoModal visible={modalState.info} onCancel={() => closeModal('info')} infoRecord={selectedRecord} isOtherAssetPage={true} />
          <UserInfoModal visible={modalState.userInfo} onCancel={() => closeModal('userInfo')} userInfo={userInfo} />
          <AssignerInfoModal visible={modalState.assignerInfo} onCancel={() => closeModal('assignerInfo')} assignerInfo={assignerInfo} />
          <ManageAssetGroupsModal 
            visible={modalState.manageAssetGroups} 
            onCancel={() => closeModal('manageAssetGroups')} 
            assetRecord={selectedRecord}
            onSuccess={() => {
              setUpdateTrigger(prev => prev + 1);
              fetchData();
            }}
            isOtherAssetPage={true}
          />

          {/* ══════════════════════════════════════════════ */}
          {/*  EDIT COLUMNS DRAWER WITH DYNAMIC CHECKBOXES */}
          {/* ══════════════════════════════════════════════ */}
          <Drawer
            title="Edit Columns"
            placement="right"
            onClose={() => closeModal('filterDrawer')}
            visible={modalState.filterDrawer}
            width={300}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* ── Static Columns Section ── */}
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1890ff', marginBottom: 4 }}>
                Standard Columns
              </div>
              {Object.keys(visibleColumns).map((col) => (
                <Checkbox
                  key={col}
                  name={col}
                  checked={visibleColumns[col]}
                  onChange={handleColumnChange}
                >
                  {col.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </Checkbox>
              ))}

              {/* ── Dynamic Tech Spec Columns Section ── */}
              {techSpecKeys.length > 0 && (
                <>
                  <Divider style={{ margin: '12px 0 8px' }} />
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#52c41a', marginBottom: 4 }}>
                    Technical Specifications
                  </div>
                  {techSpecKeys.map((specKey) => (
                    <Checkbox
                      key={`techSpec_${specKey}`}
                      checked={dynamicColumns[specKey] || false}
                      onChange={(e) => handleDynamicColumnChange(specKey, e.target.checked)}
                    >
                      {specKey}
                    </Checkbox>
                  ))}
                </>
              )}
            </div>
          </Drawer>
        </>
      ) : activeView === 'addAssetType' ? (
        <AddAssetTypeForm 
          onBack={() => { fetchData(); setActiveView('assetManagement'); }} 
          isOtherAssetPage={isOtherAssetPage} 
          selectedType={selectedTypeForEdit}
        />
      ) : activeView === 'addAsset' ? (
        <AddAssetForm onBack={() => { fetchData(); setActiveView('assetManagement'); }} isOtherAssetPage={isOtherAssetPage} />
      ) : activeView === 'editAsset' ? (
        <EditAssetForm onBack={() => { fetchData(); setActiveView('assetManagement'); }} editRecord={selectedRecord} isOtherAssetPage={true} />
      ) : null}
    </div>
  );
}

export default OtherAssetManagement;