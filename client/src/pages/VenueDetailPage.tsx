import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Spin, Descriptions, Tag, Divider, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { venueApi } from '../services/api';
import { Venue } from '../types';

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

  const sectionTypeLabels: Record<string, string> = {
    orchestra: 'Orkestra',
    balcony: 'Balkon',
    box: 'Loca',
  };

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
          {floor.sections.map((section) => (
            <div key={section.id} style={{ marginBottom: 16 }}>
              <Typography.Text strong>
                {section.name}{' '}
                <Tag>{sectionTypeLabels[section.type] || section.type}</Tag>
                <Tag color="green">{section.seats.length} koltuk</Tag>
              </Typography.Text>
              <div className="seat-map" style={{ marginTop: 8 }}>
                <div className="stage">SAHNE</div>
                {Object.entries(
                  section.seats.reduce((acc, seat) => {
                    if (!acc[seat.row]) acc[seat.row] = [];
                    acc[seat.row].push(seat);
                    return acc;
                  }, {} as Record<string, typeof section.seats>)
                ).map(([row, seats]) => (
                  <div key={row} className="seat-row">
                    <span className="seat-row-label">{row}</span>
                    {seats
                      .sort((a, b) => a.number - b.number)
                      .map((seat) => (
                        <div
                          key={seat.id}
                          className={`seat ${seat.isActive ? 'available' : 'inactive'}`}
                        >
                          {seat.number}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
