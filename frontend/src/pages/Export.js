import React from 'react';
import { Card, Row, Col, Button, message, Typography, Space, Tag } from 'antd';
import {
  FileExcelOutlined, FilePdfOutlined, DownloadOutlined,
  DatabaseOutlined, SafetyOutlined, PictureOutlined, BookOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ExportPage = () => {
  const exportCards = [
    {
      id: 1,
      title: '识别记录导出',
      description: '导出所有AI识别任务记录，包含图片、识别结果、隐患类型、置信度等信息',
      icon: <DatabaseOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
      formats: ['Excel', 'CSV', 'JSON'],
      recordCount: 12856,
      color: '#e6f7ff',
      borderColor: '#1890ff',
    },
    {
      id: 2,
      title: '标准库导出',
      description: '导出安全标准库全部数据，包含标准编号、名称、分类、内容等',
      icon: <SafetyOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
      formats: ['Excel', 'PDF'],
      recordCount: 245,
      color: '#f6ffed',
      borderColor: '#52c41a',
    },
    {
      id: 3,
      title: '样本库导出',
      description: '导出图片样本库数据，包含样本图片、标注信息、标签等',
      icon: <PictureOutlined style={{ fontSize: 48, color: '#fa8c16' }} />,
      formats: ['ZIP', 'JSON'],
      recordCount: 3892,
      color: '#fff7e6',
      borderColor: '#fa8c16',
    },
    {
      id: 4,
      title: '隐患字典导出',
      description: '导出隐患字典全部数据，包含隐患名称、风险等级、整改措施等',
      icon: <BookOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
      formats: ['Excel', 'CSV', 'JSON'],
      recordCount: 178,
      color: '#f9f0ff',
      borderColor: '#722ed1',
    },
  ];

  const handleExport = (card, format) => {
    message.loading(`正在导出${card.title}（${format}格式）...`, 2);
    setTimeout(() => {
      message.success(`${card.title}导出成功！`);
    }, 2000);
  };

  return (
    <div>
      <Title level={4}><DownloadOutlined /> 数据导出中心</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        选择需要导出的数据类型和格式，导出完成后将自动下载到本地
      </Text>

      <Row gutter={[24, 24]}>
        {exportCards.map(card => (
          <Col xs={24} sm={12} lg={12} xl={12} key={card.id}>
            <Card
              hoverable
              style={{
                borderLeft: `4px solid ${card.borderColor}`,
                background: card.color,
                height: '100%',
              }}
            >
              <Row gutter={[16, 16]}>
                <Col span={6} style={{ textAlign: 'center' }}>
                  {card.icon}
                </Col>
                <Col span={18}>
                  <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>{card.title}</Title>
                  <Text type="secondary">{card.description}</Text>
                  <div style={{ marginTop: 12 }}>
                    <Tag color="blue">{card.recordCount.toLocaleString()} 条记录</Tag>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Space wrap>
                      {card.formats.map(format => (
                        <Button
                          key={format}
                          type="primary"
                          ghost
                          icon={format === 'PDF' ? <FilePdfOutlined /> : <FileExcelOutlined />}
                          onClick={() => handleExport(card, format)}
                        >
                          导出 {format}
                        </Button>
                      ))}
                    </Space>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 24 }} title="导出历史">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card size="small">
              <StatisticCard title="今日导出" value={3} suffix="次" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <StatisticCard title="本周导出" value={12} suffix="次" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <StatisticCard title="本月导出" value={45} suffix="次" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <StatisticCard title="累计导出" value={256} suffix="次" />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

// 辅助组件
const StatisticCard = ({ title, value, suffix }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
      {value}<span style={{ fontSize: 14, color: '#999', marginLeft: 4 }}>{suffix}</span>
    </div>
  </div>
);

export default ExportPage;
