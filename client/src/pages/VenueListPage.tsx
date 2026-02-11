import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { venueApi } from '../services/api';
import { Venue } from '../types';
import { useAuthStore } from '../store/authStore';

export default function VenueListPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const fetchVenues = () => {
    setLoading(true);
    venueApi.list().then((res) => setVenues(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleDelete = async (id: number) => {
    try {
      await venueApi.delete(id);
      message.success('Salon silindi');
      fetchVenues();
    } catch {
      message.error('Salon silinemedi');
    }
  };

  const columns = [
    { title: 'Salon Adı', dataIndex: 'name', key: 'name' },
    { title: 'Adres', dataIndex: 'address', key: 'address' },
    {
      title: 'Katlar',
      key: 'floors',
      render: (_: any, record: Venue) => record.floors?.length || 0,
    },
    {
      title: 'Toplam Koltuk',
      key: 'seats',
      render: (_: any, record: Venue) => <Tag color="blue">{record.totalSeats || 0}</Tag>,
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_: any, record: Venue) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/venues/${record.id}`)}>
            Detay
          </Button>
          {user?.role === 'admin' && (
            <Popconfirm title="Salon silinsin mi?" onConfirm={() => handleDelete(record.id)}>
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3}>Salonlar</Typography.Title>
        {user?.role === 'admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/venues/new')}>
            Yeni Salon
          </Button>
        )}
      </div>
      <Table
        dataSource={venues}
        columns={columns}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: 'Henüz salon tanımlanmamış' }}
      />
    </div>
  );
}
