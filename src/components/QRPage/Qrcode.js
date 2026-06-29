import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Typography, Row, Col, Spin, Button, Divider, List, Tag, Modal, Form, Input, Select, message, Alert } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { REACT_BASE_URL } from '../config';
import { ArrowLeftOutlined, DownloadOutlined, QrcodeOutlined, MessageOutlined, SendOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';

const { Title, Text } = Typography;
const { TextArea } = Input;

function Qrcode() {
  const { assetId } = useParams();
  const [assetData, setAssetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef(null);

  // Ticket states
  const [isTicketModalVisible, setIsTicketModalVisible] = useState(false);
  const [ticketStep, setTicketStep] = useState(1); // 1: Initial, 2: Enter OTP, 3: Message
  const [otp, setOtp] = useState('');
  const [ticketData, setTicketData] = useState({ subject: '', description: '', priority: 'medium' });
  const [ticketLoading, setTicketLoading] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

    const fetchAsset = async () => {
      try {
        // Try regular assets first
        let response = await fetch(`${REACT_BASE_URL}/asset/${assetId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 404) {
          // Try other assets
          response = await fetch(`${REACT_BASE_URL}/other-assets/${assetId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Normalize fields if needed
        const normalizedData = {
          ...data,
          asset_type_name: data.asset_type_name || (data.other_asset_type ? data.other_asset_type.name : 'Unknown'),
          company_name: data.company_name || (data.company ? data.company.name : 'N/A')
        };
        
        setAssetData(normalizedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [assetId]);

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;  // padding
      canvas.height = img.height + 40;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngFile;
      downloadLink.download = `QR_${assetData?.asset_code || 'asset'}.png`;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleRequestOTP = async () => {
    setTicketLoading(true);
    try {
      const response = await fetch(`${REACT_BASE_URL}/tickets/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to send OTP');

      message.success(data.message);
      setTicketStep(2);
    } catch (err) {
      if (err.message.includes('approval')) {
        Swal.fire('Request Sent', err.message, 'info');
      } else {
        message.error(err.message);
      }
    } finally {
      setTicketLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return message.warning('Please enter OTP');
    setTicketLoading(true);
    try {
      const response = await fetch(`${REACT_BASE_URL}/tickets/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId, otp_code: otp })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Invalid OTP');

      message.success('OTP Verified!');
      setTicketStep(3);
    } catch (err) {
      if (err.message.includes('approval')) {
        Swal.fire('Request Sent', err.message, 'info');
      } else {
        message.error(err.message);
      }
    } finally {
      setTicketLoading(false);
    }
  };

  const handleRaiseTicket = async () => {
    if (!ticketData.subject || !ticketData.description) {
      return message.warning('Please fill in both subject and description');
    }
    setTicketLoading(true);
    try {
      const response = await fetch(`${REACT_BASE_URL}/tickets/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticketData, asset_id: assetId, otp_code: otp })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to raise ticket');

      Swal.fire('Success', 'Ticket raised successfully!', 'success');
      setIsTicketModalVisible(false);
      setTicketStep(1);
      setOtp('');
      setTicketData({ subject: '', description: '', priority: 'medium' });
    } catch (err) {
      if (err.message.includes('approval')) {
        Swal.fire('Request Sent', err.message, 'info');
      } else {
        message.error(err.message);
      }
    } finally {
      setTicketLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Fetching Asset Details..." />
      </div>
    );
  }

  if (!assetData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Title level={4} type="danger">Asset not found</Title>
        <Text>The asset with ID {assetId} could not be located.</Text>
        <br />
        <Link to="/dashboard">Go back to Dashboard</Link>
      </div>
    );
  }

  const mainFields = [
    { label: 'Asset Code', value: assetData.asset_code },
    { label: 'Asset Name', value: assetData.name },
    { label: 'Type', value: assetData.asset_type_name },
    { label: 'Status', value: assetData.asset_status, tag: true },
    { label: 'Current Location', value: assetData.location },
    { label: 'Warranty Expiry', value: assetData.warranty_expiry || 'N/A' },
    { label: 'Company', value: assetData.company_name || 'N/A' },
  ];

  const filteredTechSpecs = Object.entries(assetData.tech_specs || {})
    .filter(([key]) => ![
      'asset_type_short',
      'first_user_name',
      'user_name',
      'asset_type_name',
      'asset_type_short',
      'first_name',
      'last_name'
    ].includes(key))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return 'green';
      case 'assigned': return 'blue';
      case 'maintenance': return 'orange';
      case 'decommissioned': return 'red';
      default: return 'default';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '40px 20px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link to="/dashboard" style={{ marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeftOutlined /> Back to Dashboard
        </Link>

        <Card
          bordered={false}
          style={{
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            borderRadius: '16px',
            overflow: 'hidden'
          }}
        >
          <Row gutter={[40, 24]}>
            {/* Left: QR Side */}
            <Col xs={24} md={8} style={{
              background: '#fafafa',
              padding: '32px',
              textAlign: 'center',
              borderRight: '1px solid #f0f0f0'
            }}>
              <div
                ref={qrRef}
                style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  marginBottom: '20px'
                }}
              >
                <QRCodeSVG
                  value={window.location.host + "/qr/" + assetData.id}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <Title level={4} style={{ marginBottom: 4 }}>{assetData.asset_code}</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>Scan for details</Text>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Button
                  onClick={downloadQRCode}
                  type="default"
                  shape="round"
                  icon={<DownloadOutlined />}
                  size="large"
                  block
                >
                  Download QR
                </Button>

                {assetData.asset_status === 'assigned' && (
                  <Button
                    onClick={() => setIsTicketModalVisible(true)}
                    type="primary"
                    shape="round"
                    icon={<MessageOutlined />}
                    size="large"
                    block
                    danger
                  >
                    Raise Ticket
                  </Button>
                )}
              </div>
            </Col>

            {/* Right: Info Side */}
            <Col xs={24} md={16} style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Title level={2} style={{ margin: 0 }}>Asset Details</Title>
                <Tag color={getStatusColor(assetData.asset_status)} style={{ padding: '4px 12px', borderRadius: 4, fontSize: 14 }}>
                  {assetData.asset_status?.toUpperCase()}
                </Tag>
              </div>

              <Divider style={{ margin: '24px 0 16px' }} />

              <Row gutter={[16, 16]}>
                {mainFields.map((field, index) => (
                  <Col xs={24} sm={12} key={index}>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>{field.label}</Text>
                    </div>
                    <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                      {field.value || 'N/A'}
                    </Title>
                  </Col>
                ))}
              </Row>

              {/* Tech Specs */}
              {filteredTechSpecs && Object.keys(filteredTechSpecs).length > 0 && (
                <>
                  <Divider orientation="left" style={{ margin: '24px 0 16px' }}>
                    <Text strong style={{ fontSize: 16 }}>Technical Specifications</Text>
                  </Divider>
                  <div style={{
                    background: '#f9f9f9',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #f0f0f0'
                  }}>
                    <Row gutter={[16, 24]}>
                      {Object.entries(filteredTechSpecs).map(([key, value], idx) => (
                        <Col xs={24} sm={12} key={idx}>
                          <div style={{ fontSize: 12, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{key}</div>
                          <div style={{ fontWeight: 500, fontSize: 15, color: '#262626' }}>{String(value)}</div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </>
              )}
            </Col>
          </Row>
        </Card>
      </div>

      {/* Raising Ticket Modal */}
      <Modal
        title={
          <span>
            <MessageOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
            Raise Support Ticket
          </span>
        }
        visible={isTicketModalVisible}
        onCancel={() => {
          setIsTicketModalVisible(false);
          setTicketStep(1);
          setOtp('');
        }}
        footer={null}
        destroyOnClose
      >
        <div style={{ padding: '10px 0' }}>
          {ticketStep === 1 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Title level={4}>Identity Verification</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                To raise a ticket, we need to verify your identity. We will send a 6-digit OTP to the email address registered for this asset's holder.
              </Text>
              <Button 
                type="primary" 
                size="large" 
                shape="round" 
                onClick={handleRequestOTP}
                loading={ticketLoading}
                block
              >
                Send OTP to Email
              </Button>
            </div>
          )}

          {ticketStep === 2 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Title level={4}>Enter Verification Code</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Verification code has been sent. Please check your inbox.
              </Text>
              <Input 
                placeholder="6-Digit OTP" 
                size="large" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px', marginBottom: 24 }}
              />
              <Button 
                type="primary" 
                size="large" 
                shape="round" 
                onClick={handleVerifyOTP}
                loading={ticketLoading}
                block
              >
                Verify OTP
              </Button>
              <Button type="link" onClick={handleRequestOTP} style={{ marginTop: 12 }}>Resend OTP</Button>
            </div>
          )}

          {ticketStep === 3 && (
            <div>
              <Alert 
                message="Verification Successful" 
                type="success" 
                showIcon 
                icon={<CheckCircleOutlined />} 
                style={{ marginBottom: 20 }}
              />
              <Form layout="vertical">
                <Form.Item label="Subject / Issue Summary" required>
                  <Input 
                    placeholder="e.g. Laptop screen flickering" 
                    value={ticketData.subject}
                    onChange={(e) => setTicketData({...ticketData, subject: e.target.value})}
                  />
                </Form.Item>
                <Form.Item label="Detailed Description" required>
                  <TextArea 
                    rows={4} 
                    placeholder="Provide details about the issue..." 
                    value={ticketData.description}
                    onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
                  />
                </Form.Item>
                <Form.Item label="Priority">
                  <Select 
                    value={ticketData.priority}
                    onChange={(value) => setTicketData({...ticketData, priority: value})}
                  >
                    <Select.Option value="low">Low</Select.Option>
                    <Select.Option value="medium">Medium</Select.Option>
                    <Select.Option value="high">High</Select.Option>
                    <Select.Option value="critical">Critical</Select.Option>
                  </Select>
                </Form.Item>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<SendOutlined />} 
                  onClick={handleRaiseTicket}
                  loading={ticketLoading}
                  block
                  danger
                >
                  Raise Ticket
                </Button>
              </Form>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default Qrcode;
