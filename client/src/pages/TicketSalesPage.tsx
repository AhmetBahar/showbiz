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
import TheaterSeatMap from '../components/TheaterSeatMap';

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
    const isSelected = selectedTickets.some((t) => t.id === ticket.id);
    if (isSelected) {
      setSelectedTickets(selectedTickets.filter((t) => t.id !== ticket.id));
    } else {
      setSelectedTickets([...selectedTickets, ticket]);
    }
  };

  const openAction = (type: 'reserve' | 'sell') => {
    setActionType(type);
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

  // Build a ticket lookup by seatId for TheaterSeatMap integration
  const ticketBySeatId = new Map<number, Ticket>();
  tickets.forEach((t) => ticketBySeatId.set(t.seatId, t));

  // Group tickets by floor, then build sections with type info
  const floorMap: Record<string, { floorName: string; sections: Record<string, { sectionType: string; tickets: Ticket[] }> }> = {};
  tickets.forEach((ticket) => {
    const floorName = ticket.seat.section.floor.name;
    const sectionName = ticket.seat.section.name;
    const sectionType = ticket.seat.section.type || 'orchestra';

    if (!floorMap[floorName]) floorMap[floorName] = { floorName, sections: {} };
    if (!floorMap[floorName].sections[sectionName]) {
      floorMap[floorName].sections[sectionName] = { sectionType, tickets: [] };
    }
    floorMap[floorName].sections[sectionName].tickets.push(ticket);
  });

  const stats = {
    available: tickets.filter((t) => t.status === 'available').length,
    reserved: tickets.filter((t) => t.status === 'reserved').length,
    sold: tickets.filter((t) => t.status === 'sold').length,
    cancelled: tickets.filter((t) => t.status === 'cancelled').length,
  };

  const canReserve = selectedTickets.length > 0 && selectedTickets.every((t) => t.status === 'available');
  const canSell = selectedTickets.length > 0 && selectedTickets.every((t) => t.status === 'available' || t.status === 'reserved');

  const selectedSeatIds = new Set(selectedTickets.map((t) => t.seatId));

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
      {Object.entries(floorMap).map(([floorName, floorData]) => {
        const theaterSections = Object.entries(floorData.sections).map(([sectionName, sectionData]) => ({
          name: sectionName,
          type: sectionData.sectionType,
          seats: sectionData.tickets.map((ticket) => ({
            id: ticket.seatId,
            row: ticket.seat.row,
            number: ticket.seat.number,
            status: ticket.status,
            categoryColor: ticket.category.color || undefined,
          })),
        }));

        return (
          <Card key={floorName} title={floorName} style={{ marginBottom: 16 }}>
            <TheaterSeatMap
              sections={theaterSections}
              selectedSeatIds={selectedSeatIds}
              onSeatClick={(seat) => {
                const ticket = ticketBySeatId.get(seat.id!);
                if (ticket) handleSeatClick(ticket);
              }}
              renderSeat={(seat, defaultEl) => {
                const ticket = ticketBySeatId.get(seat.id!);
                if (!ticket) return defaultEl;
                return (
                  <Tooltip
                    title={
                      <div>
                        <div>{`${ticket.seat.row}-${ticket.seat.number}`}</div>
                        <div>{ticket.category.name} - {ticket.category.price}TL</div>
                        {ticket.holderName && <div>{ticket.holderName}</div>}
                        <div>{ticket.status === 'available' ? 'Boş' : ticket.status === 'reserved' ? 'Rezerve' : ticket.status === 'sold' ? 'Satılmış' : 'İptal'}</div>
                      </div>
                    }
                  >
                    {defaultEl}
                  </Tooltip>
                );
              }}
            />
          </Card>
        );
      })}

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
