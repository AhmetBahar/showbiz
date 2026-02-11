import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Typography,
  Space,
  Popconfirm,
  message,
  Tag,
  Modal,
  Form,
  Input,
  Select,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { authApi } from '../services/api';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const currentUser = useAuthStore((s) => s.user);

  const fetchUsers = () => {
    setLoading(true);
    authApi.getUsers().then((res) => setUsers(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (values: any) => {
    setCreating(true);
    try {
      await authApi.register(values);
      message.success('Kullanıcı oluşturuldu');
      setModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await authApi.deleteUser(id);
      message.success('Kullanıcı silindi');
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Silinemedi');
    }
  };

  const roleLabels: Record<string, { text: string; color: string }> = {
    admin: { text: 'Yönetici', color: 'red' },
    agent: { text: 'Gişe Görevlisi', color: 'blue' },
    usher: { text: 'Kapı Görevlisi', color: 'green' },
  };

  const columns = [
    { title: 'İsim', dataIndex: 'name', key: 'name' },
    { title: 'E-posta', dataIndex: 'email', key: 'email' },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={roleLabels[role]?.color}>{roleLabels[role]?.text || role}</Tag>
      ),
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          {record.id !== currentUser?.id && (
            <Popconfirm title="Kullanıcı silinsin mi?" onConfirm={() => handleDelete(record.id)}>
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3}>Kullanıcılar</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Yeni Kullanıcı
        </Button>
      </div>

      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} />

      <Modal
        title="Yeni Kullanıcı"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="İsim" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Şifre" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'admin', label: 'Yönetici' },
                { value: 'agent', label: 'Gişe Görevlisi' },
                { value: 'usher', label: 'Kapı Görevlisi' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating} block>
              Oluştur
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
