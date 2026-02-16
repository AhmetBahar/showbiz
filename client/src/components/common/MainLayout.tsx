import { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, Modal, Input, Form, message } from 'antd';
import {
  HomeOutlined,
  BankOutlined,
  CalendarOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  LockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';

const { Header, Sider, Content } = Layout;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Ana Sayfa' },
    { key: '/venues', icon: <BankOutlined />, label: 'Salonlar' },
    { key: '/shows', icon: <CalendarOutlined />, label: 'Gösteriler' },
    ...(user?.role === 'admin'
      ? [{ key: '/users', icon: <TeamOutlined />, label: 'Kullanıcılar' }]
      : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setPasswordLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Şifre başarıyla değiştirildi');
      setPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Şifre değiştirilemedi');
    } finally {
      setPasswordLoading(false);
    }
  };

  const userMenu = {
    items: [
      { key: 'role', label: `Rol: ${user?.role === 'admin' ? 'Yönetici' : user?.role === 'agent' ? 'Gişe Görevlisi' : 'Kapı Görevlisi'}`, disabled: true },
      { type: 'divider' as const },
      { key: 'change-password', icon: <LockOutlined />, label: 'Şifre Değiştir', onClick: () => setPasswordModalOpen(true) },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Çıkış Yap', onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography.Title
            level={4}
            style={{ color: '#fff', margin: 0, fontSize: collapsed ? 14 : 18 }}
          >
            {collapsed ? 'TF' : 'TÜFEMIX'}
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#7c3aed' }} />
              <span>{user?.name}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>

      <Modal
        title="Şifre Değiştir"
        open={passwordModalOpen}
        onCancel={() => { setPasswordModalOpen(false); passwordForm.resetFields(); }}
        onOk={() => passwordForm.submit()}
        confirmLoading={passwordLoading}
        okText="Değiştir"
        cancelText="İptal"
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="currentPassword"
            label="Mevcut Şifre"
            rules={[{ required: true, message: 'Mevcut şifrenizi girin' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Yeni Şifre"
            rules={[
              { required: true, message: 'Yeni şifrenizi girin' },
              { min: 6, message: 'Şifre en az 6 karakter olmalıdır' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Yeni Şifre Tekrar"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Yeni şifrenizi tekrar girin' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Şifreler eşleşmiyor'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
