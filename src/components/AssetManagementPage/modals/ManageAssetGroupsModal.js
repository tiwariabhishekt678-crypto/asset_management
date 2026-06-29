import React, { useEffect, useState } from 'react';
import { Modal, Select, notification, Spin, Alert } from 'antd';
import { REACT_BASE_URL } from '../../config';

const ManageAssetGroupsModal = ({ visible, onCancel, assetRecord, onSuccess, isOtherAssetPage = false }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && assetRecord?.assetId) {
      fetchData(assetRecord.assetId);
    } else if (!visible) {
      setGroups([]);
      setSelectedGroups([]);
      setError(null);
    }
  }, [visible, assetRecord]);

  const fetchData = async (assetId) => {
    setFetching(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      
      const allGroupsUrl = isOtherAssetPage ? `${REACT_BASE_URL}/other-asset-groups/` : `${REACT_BASE_URL}/asset-groups/`;
      const byAssetUrl = isOtherAssetPage ? `${REACT_BASE_URL}/other-asset-groups/by-asset/${assetId}` : `${REACT_BASE_URL}/asset-groups/by-asset/${assetId}`;
      
      const [allGroupsRes, assetGroupsRes] = await Promise.all([
        fetch(allGroupsUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(byAssetUrl, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!allGroupsRes.ok) throw new Error('Failed to fetch all groups');
      
      const allGroupsData = await allGroupsRes.json();
      setGroups(allGroupsData || []);

      if (assetGroupsRes.ok) {
        const assetGroupsData = await assetGroupsRes.json();
        setSelectedGroups((assetGroupsData || []).map(g => g.id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!assetRecord) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      
      // Determine what to add and what to remove
      // We will loop through all groups, and if it's selected but wasn't before -> add-asset for that group
      // This might require a custom endpoint like POST /asset-groups/update-asset-groups if we want it efficient,
      // But we can just use the existing endpoints per group:
      
      // We know `selectedGroups` is the new desired state.
      // We don't have the original state locally easily, so we can re-fetch or derive it:
      const byAssetUrl = isOtherAssetPage ? `${REACT_BASE_URL}/other-asset-groups/by-asset/${assetRecord.assetId}` : `${REACT_BASE_URL}/asset-groups/by-asset/${assetRecord.assetId}`;
      const initialAssetGroupsRes = await fetch(byAssetUrl, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const initialAssetGroupsData = await initialAssetGroupsRes.json();
      const initialSelected = (initialAssetGroupsData || []).map(g => g.id);
      
      const toAdd = selectedGroups.filter(id => !initialSelected.includes(id));
      const toRemove = initialSelected.filter(id => !selectedGroups.includes(id));

      const requests = [];
      const baseUrl = isOtherAssetPage ? `${REACT_BASE_URL}/other-asset-groups` : `${REACT_BASE_URL}/asset-groups`;
      toAdd.forEach(groupId => {
        requests.push(fetch(`${baseUrl}/${groupId}/add-assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ asset_ids: [assetRecord.assetId] })
        }));
      });

      toRemove.forEach(groupId => {
        const baseUrl = isOtherAssetPage ? `${REACT_BASE_URL}/other-asset-groups` : `${REACT_BASE_URL}/asset-groups`;
        requests.push(fetch(`${baseUrl}/${groupId}/remove-assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ asset_ids: [assetRecord.assetId] })
        }));
      });

      await Promise.all(requests);

      notification.success({ message: 'Asset groups updated successfully' });
      onCancel();
      if (onSuccess) onSuccess();
    } catch (err) {
      notification.error({ message: 'Failed to update asset groups', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Manage Groups for ${assetRecord?.name || assetRecord?.assetCode}`}
      visible={visible}
      onCancel={onCancel}
      onOk={handleSave}
      confirmLoading={loading}
      destroyOnClose
    >
      {fetching ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="Loading groups..." />
        </div>
      ) : error ? (
        <Alert type="error" message="Error" description={error} />
      ) : (
        <>
          <p>Select which groups this asset belongs to:</p>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select groups"
            value={selectedGroups}
            onChange={setSelectedGroups}
            options={groups.map(g => ({ label: g.name, value: g.id }))}
          />
        </>
      )}
    </Modal>
  );
};

export default ManageAssetGroupsModal;
