import React, { useState } from 'react';
import {
  Card, Table, Button, Input, Select, Modal, Form, message,
  Space, Tag, Upload, Row, Col
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ImportOutlined,
  ExportOutlined, EditOutlined, DeleteOutlined, EyeOutlined
} from '@ant-design/icons';

const { Option } = Select;

const Standards = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [data, setData] = useState([
    { id: 1, code: 'GB 30871-2022', name: '危险化学品企业特殊作业安全规范', category: '作业安全', status: 'active' },
    { id: 2, code: 'JGJ 46-2005', name: '施工现场临时用电安全技术规范', category: '电气安全', status: 'active' },
    { id: 3, code: 'GB 50720-2011', name: '建设工程施工现场消防安全技术规范', category: '消防安全', status: 'active' },
    { id: 4, code: 'JGJ 130-2011', name: '建筑施工扣件式钢管脚手架安全技术规范', category: '脚手架', status: 'active' },
    { id: 5, code: 'GB 2811-2019', name: '头部防护 安全帽', category: '防护用品', status: 'active' },
  ]);

  const categories = ['all', '作业安全', '电气安全', '消防安全', '脚手架', '防护用品'];

  const filteredData = data.filter(item => {
    const matchSearch = item.name.includes(searchText) || item.code.includes(searchText);
    const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const columns = [
    { title: '编号', dataIndex: 'code', width: 180 },
    { title: '名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', render: (text) => <Tag color="blue">{text}</Tag> },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />}>查看</Button>
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
      content: '确定要删除这条标准吗？',
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
      const newRecord = { ...values, id: Date.now(), status: 'active' };
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
              placeholder="搜索标准编号或名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              {categories.map(cat => (
                <Option key={cat} value={cat}>
                  {cat === 'all' ? '全部分类' : cat}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} lg={10} style={{ textAlign: 'right' }}>
            <Space>
              <Upload accept=".xlsx,.xls" showUploadList={false}>
                <Button icon={<ImportOutlined />}>批量导入</Button>
              </Upload>
              <Button icon={<ExportOutlined />}>导出</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增标准</Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑标准' : '新增标准'}
        open={isModalVisible}
        onOk={form.submit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="code" label="标准编号" rules={[{ required: true }]}>
            <Input placeholder="如：GB 30871-2022" />
          </Form.Item>
          <Form.Item name="name" label="标准名称" rules={[{ required: true }]}>
            <Input placeholder="输入标准名称" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select placeholder="选择分类">
              {categories.filter(c => c !== 'all').map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Standards;