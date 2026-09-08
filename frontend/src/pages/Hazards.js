import React, { useState } from 'react';
import {
  Card, Table, Button, Input, Select, Modal, Form, message,
  Space, Tag, Upload, Row, Col
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ImportOutlined,
  EditOutlined, DeleteOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

const Hazards = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const [data, setData] = useState([
    {
      id: 1, name: '未佩戴安全帽', riskLevel: 'high', relatedStandard: 'GB 2811-2019',
      correctiveAction: '立即佩戴安全帽，加强安全教育', deadline: '立即整改', status: 'active', version: 'v2.1'
    },
    {
      id: 2, name: '高处作业未系安全带', riskLevel: 'high', relatedStandard: 'GB 30871-2022',
      correctiveAction: '立即停止作业，佩戴安全带', deadline: '立即整改', status: 'active', version: 'v1.5'
    },
    {
      id: 3, name: '脚手架立杆间距过大', riskLevel: 'medium', relatedStandard: 'JGJ 130-2011',
      correctiveAction: '调整立杆间距至规范要求', deadline: '3日内', status: 'active', version: 'v1.0'
    },
    {
      id: 4, name: '消防器材过期', riskLevel: 'medium', relatedStandard: 'GB 50720-2011',
      correctiveAction: '更换过期器材，定期检查', deadline: '7日内', status: 'active', version: 'v1.2'
    },
  ]);

  const riskLevels = ['all', 'high', 'medium', 'low'];
  const riskLevelMap = { high: { color: 'red', text: '高风险' }, medium: { color: 'orange', text: '中风险' }, low: { color: 'green', text: '低风险' } };

  const filteredData = data.filter(item => {
    const matchSearch = item.name.includes(searchText);
    const matchRisk = riskFilter === 'all' || item.riskLevel === riskFilter;
    return matchSearch && matchRisk;
  });

  const columns = [
    { title: '隐患名称', dataIndex: 'name' },
    { title: '风险等级', dataIndex: 'riskLevel', render: (level) => <Tag color={riskLevelMap[level].color}>{riskLevelMap[level].text}</Tag> },
    { title: '关联标准', dataIndex: 'relatedStandard' },
    { title: '整改措施', dataIndex: 'correctiveAction', ellipsis: true },
    { title: '整改期限', dataIndex: 'deadline' },
    { title: '版本', dataIndex: 'version' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条隐患记录吗？',
      onOk: () => {
        setData(data.filter(item => item.id !== id));
        message.success('删除成功');
      },
    });
  };

  const handleSave = (values) => {
    if (editingRecord) {
      setData(data.map(item => item.id === editingRecord.id ? { ...item, ...values } : item));
      message.success('更新成功');
    } else {
      const newRecord = { ...values, id: Date.now(), status: 'active', version: 'v1.0' };
      setData([...data, newRecord]);
      message.success('新增成功');
    }
    setIsModalVisible(false);
  };

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <Input
              placeholder="搜索隐患名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select style={{ width: '100%' }} value={riskFilter} onChange={setRiskFilter}>
              <Option value="all">全部风险等级</Option>
              <Option value="high">高风险</Option>
              <Option value="medium">中风险</Option>
              <Option value="low">低风险</Option>
            </Select>
          </Col>
          <Col xs={24} lg={10} style={{ textAlign: 'right' }}>
            <Space>
              <Upload accept=".xlsx,.xls" showUploadList={false}>
                <Button icon={<ImportOutlined />}>批量导入</Button>
              </Upload>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增隐患</Button>
            </Space>
          </Col>
        </Row>

        <Table columns={columns} dataSource={filteredData} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingRecord ? '编辑隐患' : '新增隐患'}
        open={isModalVisible}
        onOk={form.submit}
        onCancel={() => setIsModalVisible(false)}
        width={700}
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="name" label="隐患名称" rules={[{ required: true }]}>
            <Input placeholder="输入隐患名称" />
          </Form.Item>
          <Form.Item name="riskLevel" label="风险等级" rules={[{ required: true }]}>
            <Select placeholder="选择风险等级">
              <Option value="high">高风险</Option>
              <Option value="medium">中风险</Option>
              <Option value="low">低风险</Option>
            </Select>
          </Form.Item>
          <Form.Item name="relatedStandard" label="关联标准">
            <Input placeholder="如：GB 30871-2022" />
          </Form.Item>
          <Form.Item name="correctiveAction" label="整改措施">
            <TextArea rows={3} placeholder="输入整改措施" />
          </Form.Item>
          <Form.Item name="deadline" label="整改期限">
            <Input placeholder="如：立即整改 / 3日内 / 7日内" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Hazards;