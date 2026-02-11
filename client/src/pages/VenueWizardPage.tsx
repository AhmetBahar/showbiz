import { useState } from 'react';
import {
  Steps,
  Form,
  Input,
  Button,
  Card,
  Space,
  InputNumber,
  Select,
  Typography,
  message,
  Divider,
  Tag,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { venueApi } from '../services/api';
import TheaterSeatMap from '../components/TheaterSeatMap';

interface RowDef {
  row: string;
  start: number;
  end: number;
  step: number;
}

interface FloorDef {
  name: string;
  level: number;
  sections: SectionDef[];
}

interface SectionDef {
  name: string;
  type: string;
  rows: RowDef[];
}

const generateSeatNumbers = (row: RowDef): number[] => {
  const seats: number[] = [];
  for (let n = row.start; n <= row.end; n += row.step) {
    seats.push(n);
  }
  return seats;
};

export default function VenueWizardPage() {
  const [current, setCurrent] = useState(0);
  const [venueInfo, setVenueInfo] = useState({ name: '', address: '', description: '' });
  const [floors, setFloors] = useState<FloorDef[]>([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { title: 'Salon Bilgileri' },
    { title: 'Katlar' },
    { title: 'Bölümler & Koltuklar' },
    { title: 'Önizleme' },
  ];

  const next = () => setCurrent(current + 1);
  const prev = () => setCurrent(current - 1);

  const addFloor = () => {
    setFloors([
      ...floors,
      { name: `${floors.length === 0 ? 'Zemin Kat' : `${floors.length}. Balkon`}`, level: floors.length, sections: [] },
    ]);
  };

  const removeFloor = (index: number) => {
    setFloors(floors.filter((_, i) => i !== index));
  };

  const updateFloor = (index: number, field: string, value: any) => {
    const updated = [...floors];
    (updated[index] as any)[field] = value;
    setFloors(updated);
  };

  const addSection = (floorIndex: number) => {
    const updated = [...floors];
    updated[floorIndex].sections.push({
      name: '',
      type: 'orchestra',
      rows: [{ row: 'A', start: 1, end: 10, step: 1 }],
    });
    setFloors(updated);
  };

  const removeSection = (floorIndex: number, sectionIndex: number) => {
    const updated = [...floors];
    updated[floorIndex].sections = updated[floorIndex].sections.filter((_, i) => i !== sectionIndex);
    setFloors(updated);
  };

  const updateSection = (floorIndex: number, sectionIndex: number, field: string, value: any) => {
    const updated = [...floors];
    (updated[floorIndex].sections[sectionIndex] as any)[field] = value;
    setFloors(updated);
  };

  const addRow = (floorIndex: number, sectionIndex: number) => {
    const updated = [...floors];
    const rows = updated[floorIndex].sections[sectionIndex].rows;
    const lastRow = rows[rows.length - 1];
    const nextRowChar = lastRow ? String.fromCharCode(lastRow.row.charCodeAt(0) + 1) : 'A';
    rows.push({ row: nextRowChar, start: lastRow?.start || 1, end: lastRow?.end || 10, step: lastRow?.step || 1 });
    setFloors(updated);
  };

  const removeRow = (floorIndex: number, sectionIndex: number, rowIndex: number) => {
    const updated = [...floors];
    updated[floorIndex].sections[sectionIndex].rows = updated[floorIndex].sections[sectionIndex].rows.filter(
      (_, i) => i !== rowIndex
    );
    setFloors(updated);
  };

  const updateRow = (floorIndex: number, sectionIndex: number, rowIndex: number, field: string, value: any) => {
    const updated = [...floors];
    (updated[floorIndex].sections[sectionIndex].rows[rowIndex] as any)[field] = value;
    setFloors(updated);
  };

  const getRowSeatCount = (row: RowDef): number => {
    return generateSeatNumbers(row).length;
  };

  const getTotalSeats = () => {
    return floors.reduce(
      (sum, f) =>
        sum + f.sections.reduce((s, sec) => s + sec.rows.reduce((r, row) => r + getRowSeatCount(row), 0), 0),
      0
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...venueInfo,
        floors: floors.map((f) => ({
          name: f.name,
          level: f.level,
          sections: f.sections.map((s) => ({
            name: s.name,
            type: s.type,
            seats: s.rows.flatMap((r) =>
              generateSeatNumbers(r).map((num) => ({
                row: r.row,
                number: num,
              }))
            ),
          })),
        })),
      };

      await venueApi.create(payload);
      message.success('Salon başarıyla oluşturuldu!');
      navigate('/venues');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Salon oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const sectionTypes = [
    { value: 'orchestra', label: 'Orkestra' },
    { value: 'balcony', label: 'Balkon' },
    { value: 'box', label: 'Loca' },
    { value: 'left_wing', label: 'Sol Kanat' },
    { value: 'center', label: 'Orta' },
    { value: 'right_wing', label: 'Sağ Kanat' },
  ];

  const buildPreviewSections = (floor: FloorDef) => {
    return floor.sections.map((section) => ({
      name: section.name,
      type: section.type,
      seats: section.rows.flatMap((r) =>
        generateSeatNumbers(r).map((num) => ({
          row: r.row,
          number: num,
        }))
      ),
    }));
  };

  return (
    <div>
      <Typography.Title level={3}>Yeni Salon Oluştur</Typography.Title>

      <Steps current={current} items={steps} style={{ marginBottom: 32 }} />

      {/* Adım 1: Salon Bilgileri */}
      {current === 0 && (
        <Card>
          <Form layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item label="Salon Adı" required>
              <Input
                value={venueInfo.name}
                onChange={(e) => setVenueInfo({ ...venueInfo, name: e.target.value })}
                placeholder="Örn: AKM Ana Sahne"
              />
            </Form.Item>
            <Form.Item label="Adres" required>
              <Input
                value={venueInfo.address}
                onChange={(e) => setVenueInfo({ ...venueInfo, address: e.target.value })}
                placeholder="Örn: Taksim, İstanbul"
              />
            </Form.Item>
            <Form.Item label="Açıklama">
              <Input.TextArea
                value={venueInfo.description}
                onChange={(e) => setVenueInfo({ ...venueInfo, description: e.target.value })}
                placeholder="Salon hakkında ek bilgi"
                rows={3}
              />
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" onClick={next} disabled={!venueInfo.name || !venueInfo.address}>
              İleri
            </Button>
          </div>
        </Card>
      )}

      {/* Adım 2: Katlar */}
      {current === 1 && (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {floors.map((floor, fi) => (
              <Card
                key={fi}
                size="small"
                title={`Kat ${fi + 1}`}
                extra={
                  <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeFloor(fi)} />
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Kat Adı">
                      <Input
                        value={floor.name}
                        onChange={(e) => updateFloor(fi, 'name', e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Seviye">
                      <InputNumber
                        value={floor.level}
                        onChange={(v) => updateFloor(fi, 'level', v)}
                        min={0}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" onClick={addFloor} icon={<PlusOutlined />} block>
              Kat Ekle
            </Button>
          </Space>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={prev}>Geri</Button>
              <Button type="primary" onClick={next} disabled={floors.length === 0}>
                İleri
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* Adım 3: Bölümler & Koltuklar */}
      {current === 2 && (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {floors.map((floor, fi) => (
              <Card key={fi} title={`${floor.name} - Bölümler`} type="inner">
                {floor.sections.map((section, si) => (
                  <Card
                    key={si}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={`Bölüm ${si + 1}`}
                    extra={
                      <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeSection(fi, si)} />
                    }
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="Bölüm Adı">
                          <Input
                            value={section.name}
                            onChange={(e) => updateSection(fi, si, 'name', e.target.value)}
                            placeholder="Örn: Orkestra"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="Tür">
                          <Select
                            value={section.type}
                            onChange={(v) => updateSection(fi, si, 'type', v)}
                            options={sectionTypes}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Typography.Text strong>Sıralar:</Typography.Text>
                    {section.rows.map((row, ri) => {
                      const seatNums = generateSeatNumbers(row);
                      return (
                        <div key={ri} style={{ marginTop: 8 }}>
                          <Row gutter={8} align="middle">
                            <Col span={4}>
                              <Input
                                addonBefore="Sıra"
                                value={row.row}
                                onChange={(e) => updateRow(fi, si, ri, 'row', e.target.value)}
                              />
                            </Col>
                            <Col span={4}>
                              <InputNumber
                                addonBefore="Başlangıç"
                                value={row.start}
                                onChange={(v) => updateRow(fi, si, ri, 'start', v || 1)}
                                min={1}
                                style={{ width: '100%' }}
                              />
                            </Col>
                            <Col span={4}>
                              <InputNumber
                                addonBefore="Bitiş"
                                value={row.end}
                                onChange={(v) => updateRow(fi, si, ri, 'end', v || 1)}
                                min={row.start}
                                style={{ width: '100%' }}
                              />
                            </Col>
                            <Col span={4}>
                              <InputNumber
                                addonBefore="Artış"
                                value={row.step}
                                onChange={(v) => updateRow(fi, si, ri, 'step', v || 1)}
                                min={1}
                                max={10}
                                style={{ width: '100%' }}
                              />
                            </Col>
                            <Col>
                              <Button
                                danger
                                size="small"
                                icon={<MinusCircleOutlined />}
                                onClick={() => removeRow(fi, si, ri)}
                              />
                            </Col>
                          </Row>
                          <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                            {seatNums.length} koltuk: {seatNums.length <= 12 ? seatNums.join(', ') : `${seatNums.slice(0, 6).join(', ')} ... ${seatNums.slice(-3).join(', ')}`}
                          </Typography.Text>
                        </div>
                      );
                    })}
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => addRow(fi, si)}
                      style={{ marginTop: 8 }}
                    >
                      Sıra Ekle
                    </Button>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => addSection(fi)} icon={<PlusOutlined />} block>
                  Bölüm Ekle
                </Button>
              </Card>
            ))}
          </Space>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={prev}>Geri</Button>
              <Button type="primary" onClick={next}>
                Önizleme
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* Adım 4: Önizleme */}
      {current === 3 && (
        <Card>
          <Typography.Title level={4}>{venueInfo.name}</Typography.Title>
          <Typography.Paragraph type="secondary">{venueInfo.address}</Typography.Paragraph>
          {venueInfo.description && <Typography.Paragraph>{venueInfo.description}</Typography.Paragraph>}
          <Divider />
          <Typography.Text strong>Toplam Koltuk: </Typography.Text>
          <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>{getTotalSeats()}</Tag>
          <Divider />

          {floors.map((floor, fi) => (
            <Card key={fi} title={floor.name} size="small" style={{ marginBottom: 16 }}>
              <TheaterSeatMap
                sections={buildPreviewSections(floor)}
              />
            </Card>
          ))}

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={prev}>Geri</Button>
              <Button type="primary" onClick={handleSave} loading={saving}>
                Salonu Oluştur
              </Button>
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
}
