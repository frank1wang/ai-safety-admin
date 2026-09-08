import React, { useState } from 'react';
import {
  Card, Row, Col, Select, Button, Upload, Tag, Modal, message, Empty, Badge
} from 'antd';
import {
  UploadOutlined, StarOutlined, StarFilled, EyeOutlined
} from '@ant-design/icons';

const { Option } = Select;

const Samples = () => {
  const [hazardType, setHazardType] = useState('all');
  const [sampleType, setSampleType] = useState('all');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const [samples, setSamples] = useState([
    { id: 1, name: '未佩戴安全帽-场景1', type: 'positive', hazardType: '安全帽', riskLevel: 'high', isFeatured: true, tags: ['典型样本', '白天场景'] },
    { id: 2, name: '高处作业未系安全带', type: 'positive', hazardType: '安全带', riskLevel: 'high', isFeatured: true, tags: ['典型样本'] },
    { id: 3, name: '安全帽正确佩戴', type: 'negative', hazardType: '安全帽', riskLevel: 'low', isFeatured: false, tags: ['正常样本'] },
    { id: 4, name: '脚手架不规范搭建', type: 'positive', hazardType: '脚手架', riskLevel: 'medium', isFeatured: false, tags: ['复杂场景'] },
    { id: 5, name: '临边防护缺失', type: 'positive', hazardType: '临边防护', riskLevel: 'high', isFeatured: true, tags: ['典型样本'] },
    { id: 6, name: '正常作业场景', type: 'negative', hazardType: '其他', riskLevel: 'low', isFeatured: false, tags: ['正常样本'] },
  ]);

  const filteredSamples = samples.filter(item => {
    const matchHazard = hazardType === 'all' || item.hazardType === hazardType;
    const matchType = sampleType === 'all' || item.type === sampleType;
    return matchHazard && matchType;
  });

  const riskLevelMap = {
    high: { color: 'red', text: '高风险' },
    medium: { color: 'orange', text: '中风险' },
    low: { color: 'green', text: '低风险' },
  };

  const typeMap = {
    positive: { color: 'red', text: '隐患样本' },
    negative: { color: 'green', text: '正常样本' },
  };

  const toggleFeatured = (id) => {
    setSamples(samples.map(item =>
      item.id === id ? { ...item, isFeatured: !item.isFeatured } : item
    ));
    message.success('已更新精选状态');
  };

  const handlePreview = (sample) => {
    setPreviewImage(`https://via.placeholder.com/800x600/1890ff/ffffff?text=${encodeURIComponent(sample.name)}`);
    setPreviewVisible(true);
  };

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} lg={6}>
            <Select style={{ width: '100%' }} value={hazardType} onChange={setHazardType} placeholder="隐患类型">
              <Option value="all">全部隐患类型</Option>
              <Option value="安全帽">安全帽</Option>
              <Option value="安全带">安全带</Option>
              <Option value="脚手架">脚手架</Option>
              <Option value="临边防护">临边防护</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} lg={6}>
            <Select style={{ width: '100%' }} value={sampleType} onChange={setSampleType} placeholder="样本类型">
              <Option value="all">全部类型</Option>
              <Option value="positive">隐患样本</Option>
              <Option value="negative">正常样本</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} lg={12} style={{ textAlign: 'right' }}>
            <Upload accept="image/*" multiple showUploadList={false}>
              <Button type="primary" icon={<UploadOutlined />}>上传样本</Button>
            </Upload>
          </Col>
        </Row>

        {filteredSamples.length === 0 ? (
          <Empty description="暂无样本数据" />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredSamples.map(sample => (
              <Col xs={24} sm={12} lg={8} xl={6} key={sample.id}>
                <Card
                  hoverable
                  cover={
                    <div
                      style={{
                        height: 200,
                        background: '#f0f2f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                      onClick={() => handlePreview(sample)}
                    >
                      <img
                        src={`https://via.placeholder.com/300x200/1890ff/ffffff?text=${encodeURIComponent(sample.name)}`}
                        alt={sample.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                      />
                      <Badge
                        count={sample.isFeatured ? '精选' : 0}
                        style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#faad14' }}
                      />
                    </div>
                  }
                  actions={[
                    <Button type="link" icon={<EyeOutlined />} onClick={() => handlePreview(sample)}>查看</Button>,
                    <Button
                      type="link"
                      icon={sample.isFeatured ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                      onClick={() => toggleFeatured(sample.id)}
                    >
                      {sample.isFeatured ? '已精选' : '标记精选'}
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={sample.name}
                    description={
                      <div>
                        <Tag color={typeMap[sample.type].color}>{typeMap[sample.type].text}</Tag>
                        <Tag color={riskLevelMap[sample.riskLevel].color}>{riskLevelMap[sample.riskLevel].text}</Tag>
                        <div style={{ marginTop: 8 }}>
                          {sample.tags.map(tag => <Tag key={tag} size="small">{tag}</Tag>)}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <img alt="预览" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </div>
  );
};

export default Samples;