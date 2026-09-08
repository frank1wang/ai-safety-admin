import React, { useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, DatePicker, message, Space,
  Tag, Image, Row, Col, Statistic, Radio
} from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Tasks = () => {
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [reviewingTask, setReviewingTask] = useState(null);
  const [reviewForm] = Form.useForm();
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [hazardTypeFilter, setHazardTypeFilter] = useState('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);

  const [tasks, setTasks] = useState([
    {
      id: 1, image: 'https://via.placeholder.com/100x80/1890ff/ffffff?text=Task1',
      device: 'Device-001', hazardCount: 3, status: 'completed', reviewStatus: 'pending',
      hazardTypes: ['未佩戴安全帽', '临边防护缺失'], time: '2026-09-07 14:23:00'
    },
    {
      id: 2, image: 'https://via.placeholder.com/100x80/52c41a/ffffff?text=Task2',
      device: 'Device-002', hazardCount: 1, status: 'completed', reviewStatus: 'correct',
      hazardTypes: ['未系安全带'], time: '2026-09-07 13:45:00'
    },
    {
      id: 3, image: 'https://via.placeholder.com/100x80/fa8c16/ffffff?text=Task3',
      device: 'Device-003', hazardCount: 2, status: 'completed', reviewStatus: 'false_positive',
      hazardTypes: ['脚手架不规范'], time: '2026-09-07 12:30:00'
    },
    {
      id: 4, image: 'https://via.placeholder.com/100x80/f5222d/ffffff?text=Task4',
      device: 'Device-001', hazardCount: 5, status: 'completed', reviewStatus: 'pending',
      hazardTypes: ['消防器材缺失', '通道堵塞'], time: '2026-09-07 11:15:00'
    },
    {
      id: 5, image: 'https://via.placeholder.com/100x80/1890ff/ffffff?text=Task5',
      device: 'Device-004', hazardCount: 0, status: 'completed', reviewStatus: 'correct',
      hazardTypes: [], time: '2026-09-07 10:00:00'
    },
  ]);

  const filteredTasks = tasks.filter(task => {
    const matchDevice = deviceFilter === 'all' || task.device === deviceFilter;
    const matchHazard = hazardTypeFilter === 'all' || task.hazardTypes.includes(hazardTypeFilter);
    const matchReview = reviewStatusFilter === 'all' || task.reviewStatus === reviewStatusFilter;
    const matchDate = !dateRange || (
      dayjs(task.time).isAfter(dateRange[0]) && dayjs(task.time).isBefore(dateRange[1])
    );
    return matchDevice && matchHazard && matchReview && matchDate;
  });

  const statusMap = {
    completed: { color: 'green', text: '已完成' },
    processing: { color: 'blue', text: '处理中' },
    failed: { color: 'red', text: '失败' },
  };

  const reviewStatusMap = {
    pending: { color: 'gold', text: '待复核' },
    correct: { color: 'green', text: '正确' },
    false_positive: { color: 'red', text: '误判' },
    missed: { color: 'orange', text: '漏判' },
  };

  const columns = [
    {
      title: '图片',
      dataIndex: 'image',
      width: 120,
      render: (src) => <Image src={src} width={80} height={60} style={{ objectFit: 'cover', borderRadius: 4 }} />
    },
    { title: '设备', dataIndex: 'device' },
    { title: '隐患数', dataIndex: 'hazardCount', render: (count) => <Tag color={count > 0 ? 'red' : 'green'}>{count}</Tag> },
    {
      title: '隐患类型',
      dataIndex: 'hazardTypes',
      render: (types) => types.map(t => <Tag key={t} size="small">{t}</Tag>)
    },
    { title: '状态', dataIndex: 'status', render: (s) => <Tag color={statusMap[s].color}>{statusMap[s].text}</Tag> },
    { title: '复核状态', dataIndex: 'reviewStatus', render: (s) => <Tag color={reviewStatusMap[s].color}>{reviewStatusMap[s].text}</Tag> },
    { title: '识别时间', dataIndex: 'time' },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />}>详情</Button>
          {record.reviewStatus === 'pending' && (
            <Button type="link" onClick={() => handleReview(record)}>复核</Button>
          )}
        </Space>
      ),
    },
  ];

  const handleReview = (task) => {
    setReviewingTask(task);
    reviewForm.resetFields();
    setIsReviewModalVisible(true);
  };

  const handleReviewSubmit = (values) => {
    const updatedTasks = tasks.map(task =>
      task.id === reviewingTask.id ? { ...task, reviewStatus: values.result } : task
    );
    setTasks(updatedTasks);
    message.success('复核结果已保存');
    setIsReviewModalVisible(false);
  };

  // 统计
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.reviewStatus === 'pending').length,
    correct: tasks.filter(t => t.reviewStatus === 'correct').length,
    issues: tasks.filter(t => t.reviewStatus === 'false_positive' || t.reviewStatus === 'missed').length,
  };

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6} lg={4}>
            <Statistic title="总任务" value={stats.total} />
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Statistic title="待复核" value={stats.pending} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Statistic title="正确识别" value={stats.correct} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Statistic title="误判/漏判" value={stats.issues} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={5}>
            <Select style={{ width: '100%' }} value={deviceFilter} onChange={setDeviceFilter} placeholder="设备筛选">
              <Option value="all">全部设备</Option>
              <Option value="Device-001">Device-001</Option>
              <Option value="Device-002">Device-002</Option>
              <Option value="Device-003">Device-003</Option>
              <Option value="Device-004">Device-004</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select style={{ width: '100%' }} value={hazardTypeFilter} onChange={setHazardTypeFilter} placeholder="隐患类型">
              <Option value="all">全部类型</Option>
              <Option value="未佩戴安全帽">未佩戴安全帽</Option>
              <Option value="未系安全带">未系安全带</Option>
              <Option value="临边防护缺失">临边防护缺失</Option>
              <Option value="脚手架不规范">脚手架不规范</Option>
              <Option value="消防器材缺失">消防器材缺失</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select style={{ width: '100%' }} value={reviewStatusFilter} onChange={setReviewStatusFilter} placeholder="复核状态">
              <Option value="all">全部状态</Option>
              <Option value="pending">待复核</Option>
              <Option value="correct">正确</Option>
              <Option value="false_positive">误判</Option>
              <Option value="missed">漏判</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={9}>
            <RangePicker style={{ width: '100%' }} onChange={setDateRange} />
          </Col>
        </Row>

        <Table columns={columns} dataSource={filteredTasks} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={`复核任务 - ${reviewingTask?.device || ''}`}
        open={isReviewModalVisible}
        onOk={reviewForm.submit}
        onCancel={() => setIsReviewModalVisible(false)}
        width={700}
      >
        {reviewingTask && (
          <div style={{ marginBottom: 16 }}>
            <Image src={reviewingTask.image} width={200} style={{ borderRadius: 4, marginBottom: 16 }} />
            <p><strong>设备：</strong>{reviewingTask.device}</p>
            <p><strong>识别隐患：</strong>{reviewingTask.hazardTypes.join(', ') || '无'}</p>
            <p><strong>识别时间：</strong>{reviewingTask.time}</p>
          </div>
        )}
        <Form form={reviewForm} onFinish={handleReviewSubmit} layout="vertical">
          <Form.Item name="result" label="复核结果" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="correct"><CheckCircleOutlined /> 正确</Radio.Button>
              <Radio.Button value="false_positive"><CloseCircleOutlined /> 误判</Radio.Button>
              <Radio.Button value="missed"><ExclamationCircleOutlined /> 漏判</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="comment" label="复核意见">
            <Select placeholder="选择复核意见">
              <Option value="识别准确">识别准确</Option>
              <Option value="误将正常场景识别为隐患">误将正常场景识别为隐患</Option>
              <Option value="遗漏了实际存在的隐患">遗漏了实际存在的隐患</Option>
              <Option value="隐患类型判断有误">隐患类型判断有误</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <textarea rows={3} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d9d9d9' }} placeholder="输入备注..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Tasks;
