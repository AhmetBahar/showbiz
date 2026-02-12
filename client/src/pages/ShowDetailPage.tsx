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
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  ScanOutlined,
  BarChartOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { showApi } from '../services/api';
import { Show, TicketCategory } from '../types';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

export default function ShowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryForm] = Form.useForm();
  const user = useAuthStore((s) => s.user);

  const fetchShow = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await showApi.get(parseInt(id, 10));
      setShow(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShow();
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

  const handleCreateCategory = async (values: { name: string; price: number; color?: string; description?: string }) => {
    if (!show) return;
    setCategorySaving(true);
    try {
      await showApi.addCategory(show.id, values);
      message.success('Kategori oluşturuldu');
      setCategoryModalOpen(false);
      categoryForm.resetFields();
      await fetchShow();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Kategori oluşturulamadı');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (category: TicketCategory) => {
    if (!show) return;
    if (show.categories.length <= 1) {
      message.error('En az bir kategori kalmalıdır');
      return;
    }

    try {
      await showApi.deleteCategory(show.id, category.id);
      message.success('Kategori silindi');
      await fetchShow();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Kategori silinemedi');
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
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            {show.categories.map((cat) => (
              <Space key={cat.id} size={8}>
                <Tag color={cat.color || 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {cat.name} - {cat.price} TL
                </Tag>
                {user?.role === 'admin' && (
                  <Popconfirm
                    title={`"${cat.name}" kategorisi silinsin mi?`}
                    onConfirm={() => handleDeleteCategory(cat)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            ))}
          </Space>
        </Space>
        {user?.role === 'admin' && (
          <>
            <Divider />
            <Space>
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setCategoryModalOpen(true)}>
                Kategori Ekle
              </Button>
              <Button onClick={handleInitializeTickets}>
                Biletleri Yeniden Oluştur
              </Button>
            </Space>
          </>
        )}
      </Card>

      <Modal
        title="Kategori Ekle"
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={() => categoryForm.submit()}
        okButtonProps={{ loading: categorySaving }}
        okText="Kaydet"
        cancelText="Vazgeç"
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCreateCategory}
          initialValues={{ color: '#1890ff', price: 0 }}
        >
          <Form.Item name="name" label="Kategori Adı" rules={[{ required: true, message: 'Kategori adı giriniz' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="price" label="Fiyat (TL)" rules={[{ required: true, message: 'Fiyat giriniz' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="color" label="Renk">
            <Input type="color" style={{ width: 64, padding: 4 }} />
          </Form.Item>
          <Form.Item name="description" label="Açıklama">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
