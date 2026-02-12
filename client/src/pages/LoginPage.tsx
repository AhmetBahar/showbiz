import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (user) {
    navigate('/');
    return null;
  }

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Giriş başarılı!');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            TÜFEMIX
          </Typography.Title>
          <Typography.Text type="secondary">
            Gösteri Bilet Yönetim Sistemi
          </Typography.Text>
        </div>
        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'E-posta giriniz' },
              { type: 'email', message: 'Geçerli bir e-posta giriniz' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="E-posta" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Şifre giriniz' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Şifre" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Giriş Yap
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
