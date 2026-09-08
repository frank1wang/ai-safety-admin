import React, { useState } from 'react';
import {
  Card, Form, InputNumber, Switch, Slider, Button, message, Modal,
  Table, Row, Col, Statistic, Alert, Space, Tag, Typography
} from 'antd';
import { Line } from '@ant-design/charts';
import {
  SaveOutlined, PoweroffOutlined, ExclamationCircleOutlined,
  ThunderboltOutlined, BarChartOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Inference = () => {
  const [form] = Form.useForm();
  const [ragEnabled, setRagEnabled] = useState(true);
  const [fewShotEnabled, setFewShotEnabled] = useState(true);

  // 调用统计数据
  const callStats = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      calls: Math.floor(Math.random() * 500) + 800,
      errors: Math.floor(Math.random() * 20),
    };
  });

  const lineConfig = {
    data: callStats,
    xField: 'date',
    yField: 'calls',
    smooth: true,
    point: { size: 3, shape: 'circle' },
    color: '#1890ff',
    yAxis: { title: { text: '调用次数' } },
    xAxis: { title: { text: '日期' } },
  };

  const deviceData = [
    { id: 1, deviceName: 'Device-001', todayCalls: 234, totalCalls: 15678, avgLatency: 1.2, status: 'normal' },
    { id: 2, deviceName: 'Device-002', todayCalls: 189, totalCalls: 12345, avgLatency: 1.5, status: 'normal' },
    { id: 3, deviceName: 'Device-003', todayCalls: 156, totalCalls: 9876, avgLatency: 2.1, status: 'warning' },
    { id: 4, deviceName: 'Device-004', todayCalls: 345, totalCalls: 23456, avgLatency: 0.9, status: 'normal' },
    { id: 5, deviceName: 'Device-005', todayCalls: 78, totalCalls: 5432, avgLatency: 3.5, status: 'error' },
  ];

  const deviceColumns = [
    { title: '设备名称', dataIndex: 'deviceName' },
    { title: '今日调用', dataIndex: 'todayCalls' },
    { title: '累计调用', dataIndex: 'totalCalls' },
    { title: '平均延迟(s)', dataIndex: 'avgLatency' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => {
        const map = { normal: { color: 'green', text: '正常' }, warning: { color: 'orange', text: '警告' }, error: { color: 'red', text: '异常' } };
        return <Tag color={map[status].color}>{map[status].text}</Tag>;
      },
    },
  ];

  const handleSave = (values) => {
    console.log('保存推理设置:', values);
    message.success('推理设置已保存');
  };

  const handleEmergencyStop = () => {
    Modal.confirm({
      title: '⚠️ 紧急关停确认',
      content: (
        <div>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>此操作将立即停止所有AI推理服务！</p>
          <p>关停后，所有设备将无法进行安全隐患识别。</p>
          <p>请确认是否执行？</p>
        </div>
      ),
      okText: '确认关停',
      okButtonProps: { danger: true, size: 'large' },
      cancelText: '取消',
      onOk: () => {
        message.error('所有推理服务已紧急关停！', 5);
      },
    });
  };

  return (
    <div>
      <Title level={4}><ThunderboltOutlined /> 推理设置与限流管控</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="推理参数设置" extra={<Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>保存设置</Button>}>
            <Form form={form} onFinish={handleSave} layout="vertical" initialValues={{ temperature: 0.3, maxTokens: 2048, topP: 0.9 }}>
              <Form.Item name="temperature" label="Temperature (创造性/随机性)">
                <Slider min={0} max={2} step={0.1} marks={{ 0: '精确', 1: '平衡', 2: '创意' }} />
              </Form.Item>
              <Form.Item name="maxTokens" label="Max Tokens (最大输出长度)">
                <Slider min={256} max={4096} step={256} marks={{ 256: '256', 1024: '1024', 2048: '2048', 4096: '4096' }} />
              </Form.Item>
              <Form.Item name="topP" label="Top P (核采样)">
                <Slider min={0.1} max={1} step={0.1} marks={{ 0.1: '0.1', 0.5: '0.5', 1: '1.0' }} />
              </Form.Item>
              <Form.Item label="RAG知识库增强">
                <Switch checked={ragEnabled} onChange={setRagEnabled} checkedChildren="开启" unCheckedChildren="关闭" />
                <Text type="secondary" style={{ marginLeft: 16 }}>启用后，推理时会检索相关安全标准知识</Text>
              </Form.Item>
              <Form.Item label="Few-shot示例">
                <Switch checked={fewShotEnabled} onChange={setFewShotEnabled} checkedChildren="开启" unCheckedChildren="关闭" />
                <Text type="secondary" style={{ marginLeft: 16 }}>启用后，推理时附带示例样本提升识别准确率</Text>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="调用统计" extra={<BarChartOutlined />}>
            <Line {...lineConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="设备调用量监控">
            <Table columns={deviceColumns} dataSource={deviceData} rowKey="id" pagination={{ pageSize: 10 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card>
            <Alert
              message="紧急关停"
              description="当系统出现异常或需要紧急维护时，可使用此功能立即停止所有AI推理服务。"
              type="warning"
              showIcon
              action={
                <Button type="primary" danger size="large" icon={<PoweroffOutlined />} onClick={handleEmergencyStop}>
                  紧急关停
                </Button>
              }
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Inference;
