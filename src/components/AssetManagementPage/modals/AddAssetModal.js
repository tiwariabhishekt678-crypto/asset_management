// AddAssetModal.jsx
import React from "react";
import { Modal, Form, Input as AntdInput } from "antd";

const AddAssetModal = ({
  visible,
  onCancel,
  onOk,
  form,
  onFinish
}) => {
  return (
    <Modal
      title="Add Asset"
      visible={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Asset Code"
          name="assetCode"
          rules={[{ required: true, message: "Please input the asset code!" }]}
        >
          <AntdInput />
        </Form.Item>
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please input the name!" }]}
        >
          <AntdInput />
        </Form.Item>
        <Form.Item label="Assigned To" name="assignTo">
          <AntdInput />
        </Form.Item>
        <Form.Item label="Handover Date" name="handoverDate">
          <AntdInput />
        </Form.Item>
        <Form.Item label="Received" name="received">
          <AntdInput />
        </Form.Item>
        <Form.Item label="Invoice No" name="invoiceNo">
          <AntdInput />
        </Form.Item>
        <Form.Item label="Price" name="price">
          <AntdInput />
        </Form.Item>
        <Form.Item label="Brand" name="brand">
          <AntdInput />
        </Form.Item>
        <Form.Item label="Who Assigned" name="whoAssigned">
          <AntdInput />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddAssetModal;
