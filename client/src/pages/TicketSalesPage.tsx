import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Spin,
  Button,
  Space,
  Tag,
  Drawer,
  Form,
  Input,
  Select,
  message,
  Badge,
  Tooltip,
  Divider,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { showApi, ticketApi } from '../services/api';
import { Show, Ticket } from '../types';

export default function TicketSalesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionType, setActionType] = useState<'reserve' | 'sell'>('reserve');
  const [processing, setProcessing] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [showRes, ticketRes] = await Promise.all([
        showApi.get(parseInt(id!)),
        ticketApi.getByShow(parseInt(id!)),
      ]);
      setShow(showRes.data);
      setTickets(ticketRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSeatClick = (ticket: Ticket) => {
    if (ticket.status === 'cancelled') return;

    const isSelected = selectedTickets.some((t) => t.id === ticket.id);
    if (isSelected) {
      setSelectedTickets(selectedTickets.filter((t) => t.id !== ticket.id));
    } else {
      setSelectedTickets([...selectedTickets, ticket]);
    }
  };

  const openAction = (type: 'reserve' | 'sell') => {
    setActionType(type);
    // Seçili biletlerden bilgi varsa doldur
    const first = selectedTickets[0];
    if (first) {
      form.setFieldsValue({
        holderName: first.holderName || '',
        holderPhone: first.holderPhone || '',
        holderEmail: first.holderEmail || '',
      });
    }
    setDrawerOpen(true);
  };

  const handleAction = async (values: any) => {
    setProcessing(true);
    try {
      const ids = selectedTickets.map((t) => t.id);

      if (actionType === 'reserve') {
        if (ids.length === 1) {
          await ticketApi.reserve(ids[0], values);
        } else {
          await ticketApi.bulkReserve({ ticketIds: ids, ...values });
        }
        message.success(`${ids.length} bilet rezerve edildi`);
      } else {
        if (ids.length === 1) {
          await ticketApi.sell(ids[0], values);
        } else {
          await ticketApi.bulkSell({ ticketIds: ids, ...values });
        }
        message.success(`${ids.length} bilet satıldı`);
      }

      setDrawerOpen(false);
      setSelectedTickets([]);
      form.resetFields();
      await fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'İşlem başarısız');
    } finally {
      setProcessing(false);
    }
  };

  const handleRelease = async (ticketId: number) => {
    try {
      await ticketApi.release(ticketId);
      message.success('Rezervasyon çözüldü');
      setSelectedTickets([]);
      await fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'İşlem başarısız');
    }
  };

  const handleCancel = async (ticketId: number) => {
    try {
      await ticketApi.cancel(ticketId);
      message.success('Bilet iptal edildi');
      setSelectedTickets([]);
      await fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'İşlem başarısız');
    }
  };

  const handleReset = async (ticketId: number) => {
    try {
      await ticketApi.reset(ticketId);
      message.success('Bilet sıfırlandı');
      setSelectedTickets([]);
      await fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'İşlem başarısız');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!show) return <Typography.Text>Gösteri bulunamadı</Typography.Text>;

  // Biletleri kat > bölüm > sıra yapısına dönüştür
  const groupedByFloor: Record<string, Record<string, Record<string, Ticket[]>>> = {};
  tickets.forEach((ticket) => {
    const floorName = ticket.seat.section.floor.name;
    const sectionName = ticket.seat.section.name;
    const row = ticket.seat.row;

    if (!groupedByFloor[floorName]) groupedByFloor[floorName] = {};
    if (!groupedByFloor[floorName][sectionName]) groupedByFloor[floorName][sectionName] = {};
    if (!groupedByFloor[floorName][sectionName][row]) groupedByFloor[floorName][sectionName][row] = [];
    groupedByFloor[floorName][sectionName][row].push(ticket);
  });

  const stats = {
    available: tickets.filter((t) => t.status === 'available').length,
    reserved: tickets.filter((t) => t.status === 'reserved').length,
    sold: tickets.filter((t) => t.status === 'sold').length,
    cancelled: tickets.filter((t) => t.status === 'cancelled').length,
  };

  const canReserve = selectedTickets.length > 0 && selectedTickets.every((t) => t.status === 'available');
  const canSell = selectedTickets.length > 0 && selectedTickets.every((t) => t.status === 'available' || t.status === 'reserved');

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/shows/${id}`)} style={{ marginBottom: 16 }}>
        Geri
      </Button>

      <Typography.Title level={3}>{show.name} - Bilet Satış</Typography.Title>

      {/* Durum çubuğu */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space size="large">
              <Badge color="#52c41a" text={`Boş: ${stats.available}`} />
              <Badge color="#faad14" text={`Rezerve: ${stats.reserved}`} />
              <Badge color="#ff4d4f" text={`Satılmış: ${stats.sold}`} />
              <Badge color="#d9d9d9" text={`İptal: ${stats.cancelled}`} />
            </Space>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Tag>{selectedTickets.length} koltuk seçili</Tag>
              <Button type="primary" disabled={!canReserve} onClick={() => openAction('reserve')}>
                Rezerve Et
              </Button>
              <Button type="primary" danger disabled={!canSell} onClick={() => openAction('sell')}>
                Satış Yap
              </Button>
              {selectedTickets.length === 1 && selectedTickets[0].status === 'reserved' && (
                <Popconfirm title="Rezervasyon çözülsün mü?" onConfirm={() => handleRelease(selectedTickets[0].id)}>
                  <Button>Rezervasyon Çöz</Button>
                </Popconfirm>
              )}
              {selectedTickets.length === 1 && (selectedTickets[0].status === 'reserved' || selectedTickets[0].status === 'sold') && (
                <Popconfirm title="Bilet iptal edilsin mi?" onConfirm={() => handleCancel(selectedTickets[0].id)}>
                  <Button danger>İptal Et</Button>
                </Popconfirm>
              )}
              {selectedTickets.length === 1 && selectedTickets[0].status === 'cancelled' && (
                <Popconfirm title="Bilet sıfırlansın mı?" onConfirm={() => handleReset(selectedTickets[0].id)}>
                  <Button>Sıfırla</Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Koltuk Haritası */}
      {Object.entries(groupedByFloor).map(([floorName, sections]) => (
        <Card key={floorName} title={floorName} style={{ marginBottom: 16 }}>
          {Object.entries(sections).map(([sectionName, rows]) => (
            <div key={sectionName} style={{ marginBottom: 24 }}>
              <Typography.Text strong style={{ fontSize: 16 }}>{sectionName}</Typography.Text>
              <div className="seat-map">
                <div className="stage">SAHNE</div>
                {Object.entries(rows).map(([row, rowTickets]) => (
                  <div key={row} className="seat-row">
                    <span className="seat-row-label">{row}</span>
                    {rowTickets
                      .sort((a, b) => a.seat.number - b.seat.number)
                      .map((ticket) => {
                        const isSelected = selectedTickets.some((t) => t.id === ticket.id);
                        return (
                          <Tooltip
                            key={ticket.id}
                            title={
                              <div>
                                <div>{`${ticket.seat.row}-${ticket.seat.number}`}</div>
                                <div>{ticket.category.name} - {ticket.category.price}TL</div>
                                {ticket.holderName && <div>{ticket.holderName}</div>}
                                <div>{ticket.status === 'available' ? 'Boş' : ticket.status === 'reserved' ? 'Rezerve' : ticket.status === 'sold' ? 'Satılmış' : 'İptal'}</div>
                              </div>
                            }
                          >
                            <div
                              className={`seat ${ticket.status} ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSeatClick(ticket)}
                              style={ticket.category.color ? {
                                backgroundColor: ticket.status === 'available' ? ticket.category.color : undefined,
                              } : undefined}
                            >
                              {ticket.seat.number}
                            </div>
                          </Tooltip>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      ))}

      {/* Seçili bilet bilgileri */}
      {selectedTickets.length === 1 && selectedTickets[0].holderName && (
        <Card size="small" title="Bilet Bilgileri" style={{ marginBottom: 16 }}>
          <p><strong>İsim:</strong> {selectedTickets[0].holderName}</p>
          <p><strong>Telefon:</strong> {selectedTickets[0].holderPhone || '-'}</p>
          <p><strong>E-posta:</strong> {selectedTickets[0].holderEmail || '-'}</p>
          <p><strong>Barkod:</strong> {selectedTickets[0].barcode || '-'}</p>
          {selectedTickets[0].reservedBy && <p><strong>Rezerve Eden:</strong> {selectedTickets[0].reservedBy.name}</p>}
          {selectedTickets[0].soldBy && <p><strong>Satan:</strong> {selectedTickets[0].soldBy.name}</p>}
        </Card>
      )}

      {/* İşlem Drawer */}
      <Drawer
        title={actionType === 'reserve' ? 'Rezervasyon Yap' : 'Satış Yap'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={400}
      >
        <Typography.Paragraph>
          <strong>Seçili Koltuklar:</strong>{' '}
          {selectedTickets.map((t) => `${t.seat.section.name} ${t.seat.row}-${t.seat.number}`).join(', ')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <strong>Toplam:</strong>{' '}
          {selectedTickets.reduce((sum, t) => sum + t.category.price, 0)} TL
        </Typography.Paragraph>
        <Divider />

        <Form form={form} layout="vertical" onFinish={handleAction}>
          <Form.Item name="holderName" label="Ad Soyad" rules={[{ required: true, message: 'İsim giriniz' }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="holderPhone" label="Telefon">
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item name="holderEmail" label="E-posta">
            <Input prefix={<MailOutlined />} type="email" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={processing}
              block
              danger={actionType === 'sell'}
            >
              {actionType === 'reserve' ? 'Rezerve Et' : 'Satış Yap'}
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
