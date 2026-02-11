import { useEffect, useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, Typography, message, Space, Table, InputNumber, ColorPicker } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { venueApi, showApi } from '../services/api';
import { Venue } from '../types';
import dayjs from 'dayjs';

export default function ShowCreatePage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showId, setShowId] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ name: string; price: number; color: string }[]>([
    { name: 'Normal', price: 100, color: '#52c41a' },
  ]);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    venueApi.list().then((res) => setVenues(res.data));
  }, []);

  const handleCreateShow = async (values: any) => {
    setLoading(true);
    try {
      const show = await showApi.create({
        venueId: values.venueId,
        name: values.name,
        description: values.description,
        date: values.date.toISOString(),
      });

      const createdShowId = show.data.id;

      // Kategorileri ekle
      for (const cat of categories) {
        await showApi.addCategory(createdShowId, cat);
      }

      // Biletleri oluştur
      await showApi.initializeTickets(createdShowId);

      message.success('Gösteri ve biletler oluşturuldu!');
      navigate(`/shows/${createdShowId}`);
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Gösteri oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    setCategories([...categories, { name: '', price: 0, color: '#1890ff' }]);
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: string, value: any) => {
    const updated = [...categories];
    (updated[index] as any)[field] = value;
    setCategories(updated);
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/shows')} style={{ marginBottom: 16 }}>
        Geri
      </Button>
      <Typography.Title level={3}>Yeni Gösteri Oluştur</Typography.Title>

      <Card title="Gösteri Bilgileri" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleCreateShow} style={{ maxWidth: 600 }}>
          <Form.Item name="name" label="Gösteri Adı" rules={[{ required: true, message: 'Gösteri adı giriniz' }]}>
            <Input placeholder="Örn: Romeo ve Juliet" />
          </Form.Item>
          <Form.Item name="venueId" label="Salon" rules={[{ required: true, message: 'Salon seçiniz' }]}>
            <Select
              placeholder="Salon seçiniz"
              options={venues.map((v) => ({ value: v.id, label: `${v.name} (${v.totalSeats} koltuk)` }))}
            />
          </Form.Item>
          <Form.Item name="date" label="Tarih ve Saat" rules={[{ required: true, message: 'Tarih seçiniz' }]}>
            <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Açıklama">
            <Input.TextArea rows={3} placeholder="Gösteri hakkında bilgi" />
          </Form.Item>

          <Typography.Title level={5} style={{ marginTop: 24 }}>Bilet Kategorileri</Typography.Title>
          {categories.map((cat, i) => (
            <Space key={i} align="center" style={{ display: 'flex', marginBottom: 8 }}>
              <Input
                placeholder="Kategori adı"
                value={cat.name}
                onChange={(e) => updateCategory(i, 'name', e.target.value)}
                style={{ width: 150 }}
              />
              <InputNumber
                placeholder="Fiyat"
                value={cat.price}
                onChange={(v) => updateCategory(i, 'price', v)}
                min={0}
                addonAfter="TL"
                style={{ width: 140 }}
              />
              <Input
                type="color"
                value={cat.color}
                onChange={(e) => updateCategory(i, 'color', e.target.value)}
                style={{ width: 50, padding: 2, height: 32 }}
              />
              {categories.length > 1 && (
                <Button danger icon={<DeleteOutlined />} onClick={() => removeCategory(i)} />
              )}
            </Space>
          ))}
          <Button type="dashed" onClick={addCategory} icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
            Kategori Ekle
          </Button>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Gösteriyi Oluştur
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
