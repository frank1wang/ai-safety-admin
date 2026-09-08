import React, { useState } from 'react';
import {
  Layout as AntLayout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge
} from 'antd';
import {
  DashboardOutlined,
  SafetyOutlined,
  BookOutlined,
  PictureOutlined,
  RobotOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  DatabaseOutlined,
  ExportOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  DownOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../utils/storage';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: 'standards', icon: <SafetyOutlined />, label: '安全标准库' },
  { key: 'hazards', icon: <BookOutlined />, label: '隐患字典' },
  { key: 'samples', icon: <PictureOutlined />, label: '图片样本库' },
  { key: 'models', icon: <RobotOutlined />, label: 'AI模型配置' },
  { key: 'prompts', icon: <FileTextOutlined />, label: 'Prompt模板' },
  { key: 'inference', icon: <ThunderboltOutlined />, label: '推理设置' },
  { key: 'tasks', icon: <ToolOutlined />, label: '识别任务' },
  { key: 'rag', icon: <DatabaseOutlined />, label: 'RAG知识库' },
  { key: 'export', icon: <ExportOutlined />, label: '数据导出' },
  { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
];

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = storage.getUser() || { username: 'admin', role: '管理员' };

  const selectedKey = location.pathname.split('/')[1] || 'dashboard';

  const handleLogout = () => {
    storage.clear();
    navigate('/login');
  };

  const dropdownItems = [
    {
      key: 'profile',
      label: '个人信息',
      icon: <UserOutlined />,
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 14 : 18,
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? 'AI' : 'AI安全王'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(`/${key}`)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Text strong style={{ fontSize: 16 }}>
            AI安全王管理后台
          </Text>
          <Space>
            <Badge dot>
              <Avatar icon={<UserOutlined />} />
            </Badge>
            <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Text>{user.username}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({user.role})
                </Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            minHeight: 280,
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
