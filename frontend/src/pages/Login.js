import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      // 模拟登录请求
      setTimeout(() => {
        storage.setToken('demo_token_' + Date.now());
        storage.setUser({ username: values.username, role: '管理员' });
        message.success('登录成功');
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      message.error('登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 420,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        bodyStyle={{ padding: '40px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <SafetyOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={3} style={{ margin: 0 }}>AI安全王</Title>
          <Text type="secondary">管理后台登录</Text>
        </div>
        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
