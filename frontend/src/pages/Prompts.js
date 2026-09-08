import React, { useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, message, Space, Tag, Row, Col
} from 'antd';
import { EditOutlined, PlayCircleOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const Prompts = () => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const [data, setData] = useState([
    {
      id: 1, name: '安全帽检测', type: 'detection', version: 'v3.2',
      content: `你是一个施工现场安全监察AI助手。请仔细分析图片，识别是否有人未佩戴安全帽。

识别规则：
1. 检测图片中所有人员头部
2. 判断是否佩戴安全帽
3. 未佩戴安全帽的人员用红色框标注
4. 输出JSON格式：{"hazards": [{"type": "未佩戴安全帽", "bbox": [x1,y1,x2,y2], "confidence": 0.95}]}

注意事项：
- 区分安全帽与普通帽子
- 考虑不同光照条件
- 处理遮挡情况`,
      status: 'active'
    },
    {
      id: 2, name: '高处作业检测', type: 'detection', version: 'v2.1',
      content: `你是一个施工现场安全监察AI助手。请识别高处作业人员是否系安全带。

检查要点：
1. 识别2米以上作业高度
2. 检测人员是否佩戴安全带
3. 安全带是否正确挂扣
4. 挂点是否可靠

输出格式：{"hazards": [...], "recommendations": [...]}`
`,
      status: 'active'
    },
    {
      id: 3, name: '综合安全评估', type: 'analysis', version: 'v1.5',
      content: `你是一个施工现场安全评估专家。请对图片进行全面安全评估。

评估维度：
1. 人员防护（安全帽、安全带、防护服）
2. 设备安全（脚手架、起重机械、电气设备）
3. 环境安全（消防、通道、临边防护）
4. 作业规范（动火、用电、高处作业）

输出格式：
{"overall_risk": "高/中/低", "hazards": [...], "recommendations": [...]}`
`,
      status: 'active'
    },
  ]);

  const columns = [
    { title: '模板名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (type) => <Tag color={type === 'detection' ? 'blue' : 'purple'}>{type === 'detection' ? '检测' : '分析'}</Tag> },
    { title: '版本', dataIndex: 'version' },
    { title: 'Prompt长度', dataIndex: 'content', render: (text) => `${text.length} 字符` },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      width: 300,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>预览</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" icon={<PlayCircleOutlined />} onClick={() => handleTest(record)}>测试</Button>
        </Space>
      ),
    },
  ];

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsEditModalVisible(true);
  };

  const handleView = (record) => {
    Modal.info({
      title: record.name,
      width: 700,
      content: (
        <pre style={{ background: '#f6ffed', padding: 16, borderRadius: 4, maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {record.content}
        </pre>
      ),
    });
  };

  const handleTest = (record) => {
    setEditingRecord(record);
    testForm.resetFields();
    setTestResult(null);
    setIsTestModalVisible(true);
  };

  const handleSave = (values) => {
    if (editingRecord) {
      setData(data.map(item => item.id === editingRecord.id ? { ...item, ...values, version: incrementVersion(item.version) } : item));
      message.success('模板已更新，版本号已升级');
    }
    setIsEditModalVisible(false);
  };

  const handleRunTest = async (values) => {
    setTestLoading(true);
    // 模拟测试
    setTimeout(() => {
      setTestResult({
        success: true,
        hazards: [
          { type: '未佩戴安全帽', confidence: 0.95, bbox: [120, 200, 180, 280] },
          { type: '临边防护缺失', confidence: 0.88, bbox: [400, 300, 600, 350] },
        ],
        overallRisk: '高',
        reasoning: '检测到2处安全隐患：1人未佩戴安全帽，1处临边防护缺失。',
      });
      setTestLoading(false);
      message.success('测试完成');
    }, 2000);
  };

  const incrementVersion = (version) => {
    const parts = version.replace('v', '').split('.');
    parts[1] = (parseInt(parts[1]) + 1).toString();
    return `v${parts.join('.')}`;
  };

  return (
    <div>
      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      {/* 编辑模态框 */}
      <Modal
        title={`编辑模板 - ${editingRecord?.name || ''}`}
        open={isEditModalVisible}
        onOk={form.submit}
        onCancel={() => setIsEditModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Prompt内容" rules={[{ required: true }]}>
            <TextArea rows={20} placeholder="输入Prompt模板内容..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 测试模态框 */}
      <Modal
        title={`测试模板 - ${editingRecord?.name || ''}`}
        open={isTestModalVisible}
        onCancel={() => setIsTestModalVisible(false)}
        width={900}
        footer={null}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form form={testForm} onFinish={handleRunTest} layout="vertical">
              <Form.Item name="imageUrl" label="测试图片URL" rules={[{ required: true }]}>
                <Input placeholder="输入图片URL进行测试" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" icon={<PlayCircleOutlined />} loading={testLoading} htmlType="submit">
                  运行测试
                </Button>
              </Form.Item>
            </Form>
          </Col>
          <Col span={12}>
            {testResult ? (
              <Card title="AI识别结果" size="small">
                <p><strong>整体风险：</strong><Tag color={testResult.overallRisk === '高' ? 'red' : 'green'}>{testResult.overallRisk}</Tag></p>
                <p><strong>隐患数量：</strong>{testResult.hazards.length}</p>
                <p><strong>推理过程：</strong></p>
                <pre style={{ background: '#f6ffed', padding: 8, borderRadius: 4, fontSize: 12 }}>
                  {testResult.reasoning}
                </pre>
                <p><strong>检测详情：</strong></p>
                {testResult.hazards.map((h, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: 8, background: '#fff2f0', borderRadius: 4 }}>
                    <Tag color="red">{h.type}</Tag>
                    <span style={{ marginLeft: 8 }}>置信度: {(h.confidence * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </Card>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                输入图片URL后点击运行测试
              </div>
            )}
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default Prompts;
