import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Typography, Button, Spin } from 'antd';
import {
  CalendarOutlined,
  BankOutlined,
  DollarOutlined,
  TeamOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { showApi, venueApi } from '../services/api';
import { Show, Venue } from '../types';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

export default function DashboardPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    Promise.all([showApi.list(), venueApi.list()])
      .then(([showRes, venueRes]) => {
        setShows(showRes.data);
        setVenues(venueRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const upcomingShows = shows.filter((s) => s.status === 'upcoming');
  const totalSeats = venues.reduce((sum, v) => sum + (v.totalSeats || 0), 0);

  const statusColor: Record<string, string> = {
    upcoming: 'blue',
    ongoing: 'green',
    completed: 'default',
    cancelled: 'red',
  };

  const statusText: Record<string, string> = {
    upcoming: 'Yaklaşan',
    ongoing: 'Devam Eden',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  };

  return (
    <div>
      <Typography.Title level={3}>
        Hoş Geldiniz, {user?.name}
      </Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Salonlar" value={venues.length} prefix={<BankOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Toplam Koltuk" value={totalSeats} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Toplam Gösteri" value={shows.length} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Yaklaşan Gösteri" value={upcomingShows.length} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Yaklaşan Gösteriler"
            extra={
              user?.role === 'admin' && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/shows/new')}>
                  Yeni Gösteri
                </Button>
              )
            }
          >
            <List
              dataSource={upcomingShows.slice(0, 5)}
              locale={{ emptyText: 'Yaklaşan gösteri yok' }}
              renderItem={(show) => (
                <List.Item
                  actions={[
                    <Button size="small" onClick={() => navigate(`/shows/${show.id}/tickets`)}>
                      Biletler
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <a onClick={() => navigate(`/shows/${show.id}`)}>
                        {show.name}
                      </a>
                    }
                    description={
                      <>
                        {show.venue.name} - {dayjs(show.date).format('DD.MM.YYYY HH:mm')}
                        {' '}
                        <Tag color={statusColor[show.status]}>{statusText[show.status]}</Tag>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Salonlar"
            extra={
              user?.role === 'admin' && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/venues/new')}>
                  Yeni Salon
                </Button>
              )
            }
          >
            <List
              dataSource={venues.slice(0, 5)}
              locale={{ emptyText: 'Henüz salon tanımlanmamış' }}
              renderItem={(venue) => (
                <List.Item
                  actions={[
                    <Button size="small" onClick={() => navigate(`/venues/${venue.id}`)}>
                      Detay
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={venue.name}
                    description={`${venue.address} - ${venue.totalSeats || 0} koltuk`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
