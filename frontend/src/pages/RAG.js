import React, { useState } from 'react';
import {
  Card, Table, Button, Upload, Modal, Form, Input, message, Space,
  Tag, Row, Col, Divider, Typography, List, Spin
} from 'antd';
import {
  UploadOutlined, FileTextOutlined, FilePdfOutlined,
  FileWordOutlined, EyeOutlined, DeleteOutlined, SearchOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RAG = () => {
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [testForm] = Form.useForm();
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);

  const [documents, setDocuments] = useState([
    { id: 1, name: '施工现场安全管理规范.pdf', type: 'pdf', size: '2.5MB', uploadTime: '2026-09-01 10:30:00', status: 'indexed', chunks: 156 },
    { id: 2, name: '建筑安全检查标准.docx', type: 'word', size: '1.8MB', uploadTime: '2026-09-02 14:20:00', status: 'indexed', chunks: 89 },
    { id: 3, name: '高处作业安全规程.pdf', type: 'pdf', size: '3.2MB', uploadTime: '2026-09-03 09:15:00', status: 'processing', chunks: 0 },
    { id: 4, name: '消防安全管理制度.pdf', type: 'pdf', size: '1.5MB', uploadTime: '2026-09-04 16:45:00', status: 'indexed', chunks: 67 },
    { id: 5, name: '脚手架搭设规范.docx', type: 'word', size: '4.1MB', uploadTime: '2026-09-05 11:00:00', status: 'error', chunks: 0 },
  ]);

  const getFileIcon = (type) => {
    if (type === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />;
    if (type === 'word') return <FileWordOutlined style={{ color: '#1890ff', fontSize: 20 }} />;
    return <FileTextOutlined style={{ color: '#52c41a', fontSize: 20 }} />;
  };

  const getStatusTag = (status) => {
    const map = {
      indexed: { color: 'green', text: '已索引' },
      processing: { color: 'blue', text: '处理中' },
      error: { color: 'red', text: '失败' },
    };
    return <Tag color={map[status]?.color || 'default'}>{map[status]?.text || status}</Tag>;
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后该文档将不再用于RAG检索，确定要继续吗？',
      onOk: () => {
        setDocuments(documents.filter(doc => doc.id !== id));
        message.success('文档已删除');
      },
    });
  };

  const handleTest = () => {
    testForm.resetFields();
    setTestResults([]);
    setIsTestModalVisible(true);
  };

  const handleRunTest = async (values) => {
    setTestLoading(true);
    // 模拟RAG检索
    setTimeout(() => {
      setTestResults([
        {
          id: 1,
          source: '施工现场安全管理规范.pdf',
          content: '进入施工现场必须正确佩戴安全帽。安全帽应符合GB 2811标准，佩戴时应调整帽衬，使帽衬与帽壳之间保持适当间隙。',
          relevance: 0.95,
        },
        {
          id: 2,
          source: '建筑安全检查标准.docx',
          content: '安全检查应包括以下内容：个人防护用品的佩戴情况、临边洞口防护措施、脚手架搭设质量、临时用电安全等。',
          relevance: 0.87,
        },
        {
          id: 3,
          source: '高处作业安全规程.pdf',
          content: '高处作业人员必须系好安全带，安全带应高挂低用，挂在牢固可靠处。作业平台应设置防护栏杆。',
          relevance: 0.82,
        },
      ]);
      setTestLoading(false);
      message.success('RAG检索完成，返回3条相关知识');
    }, 2000);
  };

  const columns = [
    {
      title: '文档',
      dataIndex: 'name',
      render: (text, record) => (
        <Space>
          {getFileIcon(record.type)}
          <span>{text}</span>
        </Space>
      ),
    },
    { title: '大小', dataIndex: 'size', width: 100 },
    { title: '上传时间', dataIndex: 'uploadTime' },
    { title: '状态', dataIndex: 'status', render: getStatusTag },
    { title: '分块数', dataIndex: 'chunks', render: (chunks) => chunks > 0 ? chunks : '-' },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />}>预览</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={5} style={{ margin: 0 }}><FileTextOutlined /> RAG知识库文档</Title>
          </Col>
          <Col>
            <Space>
              <Upload accept=".pdf,.doc,.docx" showUploadList={false}>
                <Button type="primary" icon={<UploadOutlined />}>上传文档</Button>
              </Upload>
              <Button icon={<ExperimentOutlined />} onClick={handleTest}>RAG测试</Button>
            </Space>
          </Col>
        </Row>

        <Table columns={columns} dataSource={documents} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      {/* RAG测试模态框 */}
      <Modal
        title="RAG知识检索测试"
        open={isTestModalVisible}
        onCancel={() => setIsTestModalVisible(false)}
        width={900}
        footer={null}
      >
        <Form form={testForm} onFinish={handleRunTest} layout="vertical">
          <Form.Item
            name="query"
            label="测试查询"
            rules={[{ required: true, message: '请输入测试查询内容' }]}
          >
            <TextArea
              rows={3}
              placeholder="输入测试问题，例如：施工现场如何检查安全帽佩戴情况？"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} loading={testLoading} htmlType="submit">
              执行检索
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        {testLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" tip="正在检索相关知识..." />
          </div>
        ) : testResults.length > 0 ? (
          <div>
            <Title level={5}>检索结果（{testResults.length}条相关知识片段）</Title>
            <List
              dataSource={testResults}
              renderItem={(item) => (
                <List.Item>
                  <Card size="small" style={{ width: '100%' }}>
                    <Row justify="space-between">
                      <Col>
                        <Text strong>{item.source}</Text>
                      </Col>
                      <Col>
                        <Tag color="blue">相关度: {(item.relevance * 100).toFixed(1)}%</Tag>
                      </Col>
                    </Row>
                    <div style={{ marginTop: 8, padding: 8, background: '#f6ffed', borderRadius: 4 }}>
                      {item.content}
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            输入查询内容后点击"执行检索"按钮进行测试
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RAG;
