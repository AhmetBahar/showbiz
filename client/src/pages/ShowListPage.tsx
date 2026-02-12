import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, ShoppingCartOutlined, ScanOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { showApi } from '../services/api';
import { Show } from '../types';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

export default function ShowListPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const fetchShows = () => {
    setLoading(true);
    showApi.list().then((res) => setShows(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchShows(); }, []);

  const handleDelete = async (id: number) => {
    try {
      await showApi.delete(id);
      message.success('Gösteri silindi');
      fetchShows();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Gösteri silinemedi');
    }
  };

  const statusConfig: Record<string, { color: string; text: string }> = {
    upcoming: { color: 'blue', text: 'Yaklaşan' },
    ongoing: { color: 'green', text: 'Devam Eden' },
    completed: { color: 'default', text: 'Tamamlandı' },
    cancelled: { color: 'red', text: 'İptal' },
  };

  const columns = [
    { title: 'Gösteri Adı', dataIndex: 'name', key: 'name' },
    {
      title: 'Salon',
      key: 'venue',
      render: (_: any, r: Show) => r.venue.name,
    },
    {
      title: 'Tarih',
      key: 'date',
      render: (_: any, r: Show) => dayjs(r.date).format('DD.MM.YYYY HH:mm'),
      sorter: (a: Show, b: Show) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Durum',
      key: 'status',
      render: (_: any, r: Show) => (
        <Tag color={statusConfig[r.status]?.color}>{statusConfig[r.status]?.text}</Tag>
      ),
    },
    {
      title: 'Kategoriler',
      key: 'categories',
      render: (_: any, r: Show) => r.categories.map((c) => (
        <Tag key={c.id} color={c.color || 'default'}>{c.name} - {c.price}TL</Tag>
      )),
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_: any, r: Show) => (
        <Space wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/shows/${r.id}`)}>
            Detay
          </Button>
          <Button size="small" type="primary" icon={<ShoppingCartOutlined />} onClick={() => navigate(`/shows/${r.id}/tickets`)}>
            Biletler
          </Button>
          <Button size="small" icon={<ScanOutlined />} onClick={() => navigate(`/shows/${r.id}/checkin`)}>
            Giriş
          </Button>
          <Button size="small" icon={<BarChartOutlined />} onClick={() => navigate(`/shows/${r.id}/reports`)}>
            Rapor
          </Button>
          {user?.role === 'admin' && (
            <Popconfirm title="Gösteri silinsin mi?" onConfirm={() => handleDelete(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3}>Gösteriler</Typography.Title>
        {user?.role === 'admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/shows/new')}>
            Yeni Gösteri
          </Button>
        )}
      </div>
      <Table
        dataSource={shows}
        columns={columns}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: 'Henüz gösteri oluşturulmamış' }}
      />
    </div>
  );
}
