import React, { useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Switch, message, Space, Tag, Select
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, KeyOutlined
} from '@ant-design/icons';

const { Option } = Select;

const Models = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  const [data, setData] = useState([
    {
      id: 1, name: 'GPT-4o', keyStatus: 'valid', isDefault: true,
      provider: 'OpenAI', modelId: 'gpt-4o', remark: '多模态大模型，默认使用'
    },
    {
      id: 2, name: 'Claude-3.5-Sonnet', keyStatus: 'valid', isDefault: false,
      provider: 'Anthropic', modelId: 'claude-3-5-sonnet-20241022', remark: '高性能视觉模型'
    },
    {
      id: 3, name: 'Gemini-1.5-Pro', keyStatus: 'invalid', isDefault: false,
      provider: 'Google', modelId: 'gemini-1.5-pro', remark: '待验证Key'
    },
    {
      id: 4, name: 'Qwen-VL-Max', keyStatus: 'valid', isDefault: false,
      provider: '阿里云', modelId: 'qwen-vl-max', remark: '国产多模态模型'
    },
  ]);

  const columns = [
    { title: '模型名称', dataIndex: 'name' },
    { title: '提供商', dataIndex: 'provider', render: (text) => <Tag color="blue">{text}</Tag> },
    {
      title: 'Key状态',
      dataIndex: 'keyStatus',
      render: (status) => (
        <Tag color={status === 'valid' ? 'green' : 'red'}>
          <KeyOutlined /> {status === 'valid' ? '有效' : '无效'}
        </Tag>
      ),
    },
    {
      title: '是否默认',
      dataIndex: 'isDefault',
      render: (isDefault) => (
        isDefault ? <Tag color="gold" icon={<CheckCircleOutlined />}>默认</Tag> : <Tag>否</Tag>
      ),
    },
    { title: '模型ID', dataIndex: 'modelId', render: (text) => <code>{text}</code> },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      width: 280,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button
            type="link"
            disabled={record.isDefault}
            onClick={() => handleSetDefault(record.id)}
          >
            设为默认
          </Button>
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
      content: '确定要删除这个模型配置吗？',
      onOk: () => {
        setData(data.filter(item => item.id !== id));
        message.success('删除成功');
      },
    });
  };

  const handleSetDefault = (id) => {
    setData(data.map(item => ({ ...item, isDefault: item.id === id })));
    message.success('默认模型已更新');
  };

  const handleSave = (values) => {
    if (editingRecord) {
      setData(data.map(item => item.id === editingRecord.id ? { ...item, ...values } : item));
      message.success('更新成功');
    } else {
      const newRecord = { ...values, id: Date.now(), keyStatus: 'valid', isDefault: false };
      setData([...data, newRecord]);
      message.success('新增成功');
    }
    setIsModalVisible(false);
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增模型</Button>
        </div>
        <Table columns={columns} dataSource={data} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingRecord ? '编辑模型' : '新增模型'}
        open={isModalVisible}
        onOk={form.submit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="name" label="模型名称" rules={[{ required: true }]}>
            <Input placeholder="如：GPT-4o" />
          </Form.Item>
          <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
            <Select placeholder="选择提供商">
              <Option value="OpenAI">OpenAI</Option>
              <Option value="Anthropic">Anthropic</Option>
              <Option value="Google">Google</Option>
              <Option value="阿里云">阿里云</Option>
              <Option value="百度智能云">百度智能云</Option>
            </Select>
          </Form.Item>
          <Form.Item name="modelId" label="模型ID" rules={[{ required: true }]}>
            <Input placeholder="如：gpt-4o" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: !editingRecord }]}>
            <Input.Password placeholder="输入API Key" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Models;
