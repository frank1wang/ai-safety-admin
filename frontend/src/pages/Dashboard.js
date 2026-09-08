import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, List, Typography } from 'antd';
import { Pie, Column, Line } from '@ant-design/charts';
import {
  EyeOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  MobileOutlined,
  BellOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Dashboard = () => {
  // 统计数据
  const statistics = [
    { title: '今日识别数', value: 1286, prefix: <EyeOutlined />, color: '#1890ff' },
    { title: '待复核数', value: 42, prefix: <ExclamationCircleOutlined />, color: '#faad14' },
    { title: '高危隐患数', value: 15, prefix: <WarningOutlined />, color: '#ff4d4f' },
    { title: '活跃设备数', value: 89, prefix: <MobileOutlined />, color: '#52c41a' },
  ];

  // 风险分布数据
  const riskData = [
    { type: '高风险', value: 15 },
    { type: '中风险', value: 42 },
    { type: '低风险', value: 156 },
    { type: '正常', value: 1073 },
  ];

  const pieConfig = {
    data: riskData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
    interactions: [{ type: 'element-active' }],
    color: ['#ff4d4f', '#faad14', '#52c41a', '#1890ff'],
  };

  // TOP10隐患数据
  const topHazards = [
    { name: '未佩戴安全帽', count: 234 },
    { name: '未系安全带', count: 189 },
    { name: '临边防护缺失', count: 156 },
    { name: '脚手架不规范', count: 132 },
    { name: '电气线路裸露', count: 98 },
    { name: '消防器材缺失', count: 87 },
    { name: '物料堆放过高', count: 76 },
    { name: '通道堵塞', count: 65 },
    { name: '动火作业无监护', count: 54 },
    { name: '吊装区域无警戒', count: 43 },
  ];

  const columnConfig = {
    data: topHazards,
    xField: 'name',
    yField: 'count',
    label: {
      position: 'top',
    },
    xAxis: {
      label: {
        autoRotate: true,
      },
    },
    color: '#1890ff',
  };

  // 近30天趋势数据
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      value: Math.floor(Math.random() * 200) + 800,
    };
  });

  const lineConfig = {
    data: trendData,
    xField: 'date',
    yField: 'value',
    smooth: true,
    point: {
      size: 3,
      shape: 'circle',
    },
    color: '#1890ff',
    area: {
      style: {
        fill: 'l(270) 0:#1890ff 1:#ffffff',
      },
    },
  };

  // 告警列表
  const alerts = [
    { id: 1, device: 'Device-001', location: 'A区3号楼', hazard: '未佩戴安全帽', level: 'high', time: '2026-09-07 14:23:00' },
    { id: 2, device: 'Device-015', location: 'B区塔吊区域', hazard: '吊装区域无警戒', level: 'medium', time: '2026-09-07 13:45:00' },
    { id: 3, device: 'Device-008', location: 'C区地下室', hazard: '电气线路裸露', level: 'high', time: '2026-09-07 12:30:00' },
    { id: 4, device: 'Device-022', location: 'A区脚手架', hazard: '脚手架不规范', level: 'medium', time: '2026-09-07 11:15:00' },
    { id: 5, device: 'Device-003', location: 'D区动火点', hazard: '动火作业无监护', level: 'high', time: '2026-09-07 10:00:00' },
  ];

  const getLevelTag = (level) => {
    const map = {
      high: { color: 'red', text: '高危' },
      medium: { color: 'orange', text: '中危' },
      low: { color: 'green', text: '低危' },
    };
    return <Tag color={map[level].color}>{map[level].text}</Tag>;
  };

  return (
    <div>
      <Title level={4}>数据看板</Title>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statistics.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.prefix}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="风险分布">
            <Pie {...pieConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="TOP10隐患类型">
            <Column {...columnConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="近30天识别趋势">
            <Line {...lineConfig} />
          </Card>
        </Col>
      </Row>

      {/* 告警列表 */}
      <Card title={<span><BellOutlined /> 实时告警</span>}>
        <Table
          dataSource={alerts}
          rowKey="id"
          pagination={false}
          columns={[
            { title: '设备', dataIndex: 'device' },
            { title: '位置', dataIndex: 'location' },
            { title: '隐患类型', dataIndex: 'hazard' },
            { title: '风险等级', dataIndex: 'level', render: getLevelTag },
            { title: '时间', dataIndex: 'time' },
          ]}
        />
      </Card>
    </div>
  );
};

export default Dashboard;