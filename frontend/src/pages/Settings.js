import React, { useState } from 'react';
import {
  Card, Form, Input, Button, message, Tabs, Table, Switch, Modal,
  Space, Tag, Row, Col, Slider, InputNumber, Divider, Typography
} from 'antd';
import {
  LockOutlined, SafetyOutlined, MobileOutlined,
  SaveOutlined, PlusOutlined, DeleteOutlined, ApiOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Password } = Input;

const Settings = () => {
  const [passwordForm] = Form.useForm();
  const [blacklistForm] = Form.useForm();
  const [rateLimitForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('password');

  // 设备黑名单
  const [blacklist, setBlacklist] = useState([
    { id: 1, deviceId: 'Device-099', reason: '设备故障，频繁上报异常数据', addedTime: '2026-09-01 10:00:00', operator: 'admin' },
    { id: 2, deviceId: 'Device-105', reason: '未经审批接入系统', addedTime: '2026-09-03 14:30:00', operator: 'admin' },
  ]);

  const [isBlacklistModalVisible, setIsBlacklistModalVisible] = useState(false);

  // API限流设置
  const [rateLimit, setRateLimit] = useState({
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 5000,
    maxRequestsPerDay: 50000,
    burstLimit: 200,
    enabled: true,
  });

  const handlePasswordChange = (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }
    message.success('密码修改成功');
    passwordForm.resetFields();
  };

  const handleAddBlacklist = (values) => {
    const newEntry = {
      id: Date.now(),
      deviceId: values.deviceId,
      reason: values.reason,
      addedTime: new Date().toLocaleString('zh-CN'),
      operator: 'admin',
    };
    setBlacklist([...blacklist, newEntry]);
    message.success('设备已加入黑名单');
    setIsBlacklistModalVisible(false);
    blacklistForm.resetFields();
  };

  const handleRemoveBlacklist = (id) => {
    Modal.confirm({
      title: '确认移除',
      content: '确定将该设备从黑名单中移除吗？',
      onOk: () => {
        setBlacklist(blacklist.filter(item => item.id !== id));
        message.success('已移除黑名单');
      },
    });
  };

  const handleRateLimitSave = (values) => {
    setRateLimit(values);
    message.success('API限流设置已保存');
  };

  const blacklistColumns = [
    { title: '设备ID', dataIndex: 'deviceId' },
    { title: '封禁原因', dataIndex: 'reason' },
    { title: '添加时间', dataIndex: 'addedTime' },
    { title: '操作人', dataIndex: 'operator' },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemoveBlacklist(record.id)}>
          移除
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}><SafetyOutlined /> 系统设置</Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={<span><LockOutlined /> 密码修改</span>}
          key="password"
        >
          <Card style={{ maxWidth: 600 }}>
            <Form form={passwordForm} onFinish={handlePasswordChange} layout="vertical">
              <Form.Item
                name="oldPassword"
                label="当前密码"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Password placeholder="输入当前密码" />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 8, message: '密码长度至少8位' },
                ]}
              >
                <Password placeholder="输入新密码（至少8位）" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                rules={[{ required: true, message: '请确认新密码' }]}
              >
                <Password placeholder="再次输入新密码" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={<span><MobileOutlined /> 设备黑名单</span>}
          key="blacklist"
        >
          <Card>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsBlacklistModalVisible(true)}>
                添加黑名单
              </Button>
            </div>
            <Table
              columns={blacklistColumns}
              dataSource={blacklist}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '暂无黑名单记录' }}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={<span><ApiOutlined /> API限流设置</span>}
          key="rateLimit"
        >
          <Card style={{ maxWidth: 800 }}>
            <Form
              form={rateLimitForm}
              onFinish={handleRateLimitSave}
              layout="vertical"
              initialValues={rateLimit}
            >
              <Form.Item label="限流开关" name="enabled" valuePropName="checked">
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>

              <Divider />

              <Title level={5}>请求限制配置</Title>

              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <Form.Item label="每分钟最大请求数" name="maxRequestsPerMinute">
                    <Slider min={10} max={1000} marks={{ 10: '10', 500: '500', 1000: '1000' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="每小时最大请求数" name="maxRequestsPerHour">
                    <Slider min={100} max={20000} marks={{ 100: '100', 10000: '10K', 20000: '20K' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <Form.Item label="每日最大请求数" name="maxRequestsPerDay">
                    <Slider min={1000} max={200000} marks={{ 1000: '1K', 100000: '100K', 200000: '200K' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="突发流量限制" name="burstLimit">
                    <Slider min={50} max={1000} marks={{ 50: '50', 500: '500', 1000: '1000' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                  保存限流设置
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            <div style={{ background: '#f6ffed', padding: 16, borderRadius: 4 }}>
              <Text strong>当前限流配置：</Text>
              <div style={{ marginTop: 8 }}>
                <Space direction="vertical">
                  <Text>限流状态：<Tag color={rateLimit.enabled ? 'green' : 'red'}>{rateLimit.enabled ? '已启用' : '已禁用'}</Tag></Text>
                  <Text>每分钟限制：{rateLimit.maxRequestsPerMinute} 请求</Text>
                  <Text>每小时限制：{rateLimit.maxRequestsPerHour.toLocaleString()} 请求</Text>
                  <Text>每日限制：{rateLimit.maxRequestsPerDay.toLocaleString()} 请求</Text>
                  <Text>突发限制：{rateLimit.burstLimit} 请求</Text>
                </Space>
              </div>
            </div>
          </Card>
        </TabPane>
      </Tabs>

      {/* 添加黑名单模态框 */}
      <Modal
        title="添加设备到黑名单"
        open={isBlacklistModalVisible}
        onOk={blacklistForm.submit}
        onCancel={() => setIsBlacklistModalVisible(false)}
        width={500}
      >
        <Form form={blacklistForm} onFinish={handleAddBlacklist} layout="vertical">
          <Form.Item
            name="deviceId"
            label="设备ID"
            rules={[{ required: true, message: '请输入设备ID' }]}
          >
            <Input placeholder="如：Device-XXX" />
          </Form.Item>
          <Form.Item
            name="reason"
            label="封禁原因"
            rules={[{ required: true, message: '请输入封禁原因' }]}
          >
            <Input.TextArea rows={3} placeholder="输入封禁原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
