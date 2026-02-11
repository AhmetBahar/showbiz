import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Spin,
  Descriptions,
  Tag,
  Button,
  Space,
  Select,
  message,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  ScanOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { showApi } from '../services/api';
import { Show } from '../types';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

export default function ShowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    showApi
      .get(parseInt(id!))
      .then((res) => setShow(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!show) return <Typography.Text>Gösteri bulunamadı</Typography.Text>;

  const statusConfig: Record<string, { color: string; text: string }> = {
    upcoming: { color: 'blue', text: 'Yaklaşan' },
    ongoing: { color: 'green', text: 'Devam Eden' },
    completed: { color: 'default', text: 'Tamamlandı' },
    cancelled: { color: 'red', text: 'İptal' },
  };

  const handleStatusChange = async (status: string) => {
    try {
      await showApi.update(show.id, { status });
      setShow({ ...show, status: status as Show['status'] });
      message.success('Durum güncellendi');
    } catch {
      message.error('Güncelleme başarısız');
    }
  };

  const handleInitializeTickets = async () => {
    try {
      const res = await showApi.initializeTickets(show.id);
      message.success(res.data.message);
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Bilet oluşturulamadı');
    }
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/shows')} style={{ marginBottom: 16 }}>
        Geri
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>{show.name}</Typography.Title>
        <Space>
          <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => navigate(`/shows/${show.id}/tickets`)}>
            Bilet Satış
          </Button>
          <Button icon={<ScanOutlined />} onClick={() => navigate(`/shows/${show.id}/checkin`)}>
            Giriş Kontrol
          </Button>
          <Button icon={<BarChartOutlined />} onClick={() => navigate(`/shows/${show.id}/reports`)}>
            Raporlar
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Salon">{show.venue?.name}</Descriptions.Item>
          <Descriptions.Item label="Tarih">{dayjs(show.date).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="Durum">
            {user?.role === 'admin' ? (
              <Select
                value={show.status}
                onChange={handleStatusChange}
                style={{ width: 150 }}
                options={[
                  { value: 'upcoming', label: 'Yaklaşan' },
                  { value: 'ongoing', label: 'Devam Eden' },
                  { value: 'completed', label: 'Tamamlandı' },
                  { value: 'cancelled', label: 'İptal' },
                ]}
              />
            ) : (
              <Tag color={statusConfig[show.status]?.color}>{statusConfig[show.status]?.text}</Tag>
            )}
          </Descriptions.Item>
          {show.description && (
            <Descriptions.Item label="Açıklama" span={2}>{show.description}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Bilet Kategorileri" style={{ marginBottom: 16 }}>
        <Space wrap>
          {show.categories.map((cat) => (
            <Tag key={cat.id} color={cat.color || 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>
              {cat.name} - {cat.price} TL
            </Tag>
          ))}
        </Space>
        {user?.role === 'admin' && (
          <>
            <Divider />
            <Button onClick={handleInitializeTickets}>
              Biletleri Yeniden Oluştur
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
