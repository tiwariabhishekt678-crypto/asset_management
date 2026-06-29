import React from 'react';
import { Modal, Form, Input, Row, Col } from 'antd';

const EditAssetModal = ({ visible, onCancel, onOk, form, onFinish }) => {
  return (
    <Modal
      title="Edit Asset"
      visible={visible}
      onCancel={onCancel}
      onOk={onOk}
      width={800}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Asset Code" name="assetCode" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Name" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Assigned To" name="assignTo">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Handover Date" name="handoverDate">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Received" name="received">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Invoice No" name="invoiceNo">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Price" name="price">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Brand" name="brand">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Who Assigned" name="whoAssigned">
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EditAssetModal;