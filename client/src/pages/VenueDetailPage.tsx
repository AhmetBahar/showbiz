import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Spin, Descriptions, Tag, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { venueApi } from '../services/api';
import { Venue } from '../types';
import TheaterSeatMap from '../components/TheaterSeatMap';

export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    venueApi
      .get(parseInt(id!))
      .then((res) => setVenue(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!venue) return <Typography.Text>Salon bulunamadı</Typography.Text>;

  const totalSeats = venue.floors.reduce(
    (sum, f) => sum + f.sections.reduce((s, sec) => s + sec.seats.length, 0),
    0
  );

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/venues')} style={{ marginBottom: 16 }}>
        Geri
      </Button>

      <Typography.Title level={3}>{venue.name}</Typography.Title>

      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Adres">{venue.address}</Descriptions.Item>
        <Descriptions.Item label="Toplam Koltuk">
          <Tag color="blue">{totalSeats}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Kat Sayısı">{venue.floors.length}</Descriptions.Item>
        {venue.description && (
          <Descriptions.Item label="Açıklama" span={2}>
            {venue.description}
          </Descriptions.Item>
        )}
      </Descriptions>

      {venue.floors.map((floor) => (
        <Card key={floor.id} title={floor.name} style={{ marginBottom: 16 }}>
          <TheaterSeatMap
            sections={floor.sections.map((section) => ({
              name: section.name,
              type: section.type,
              seats: section.seats.map((seat) => ({
                id: seat.id,
                row: seat.row,
                number: seat.number,
                status: seat.isActive ? 'available' : 'inactive',
              })),
            }))}
          />
        </Card>
      ))}
    </div>
  );
}
