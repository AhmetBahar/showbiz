import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Spin,
  Button,
  Tabs,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Space,
  Progress,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  TeamOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { reportApi, showApi } from '../services/api';
import { ReportSummary, AudienceMember, Show } from '../types';

export default function ReportsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [audience, setAudience] = useState<AudienceMember[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      showApi.get(parseInt(id!)),
      reportApi.summary(parseInt(id!)),
      reportApi.audience(parseInt(id!)),
      reportApi.attendance(parseInt(id!)),
    ])
      .then(([showRes, sumRes, audRes, attRes]) => {
        setShow(showRes.data);
        setSummary(sumRes.data);
        setAudience(audRes.data);
        setAttendance(attRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const downloadExcel = (headers: string[], rows: string[][], filename: string) => {
    const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/></head><body>
<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAudienceExcel = (data: AudienceMember[], filename: string) => {
    if (data.length === 0) return;
    const headers = ['İsim', 'Telefon', 'E-posta', 'Kat', 'Bölüm', 'Koltuk', 'Kategori', 'Fiyat', 'Durum', 'Giriş'];
    const rows = data.map((r) => [
      r.holderName || '',
      r.holderPhone || '',
      r.holderEmail || '',
      r.floor,
      r.section,
      `${r.row}-${r.seatNumber}`,
      r.category,
      `${r.price} TL`,
      r.status === 'sold' ? 'Satılmış' : r.status === 'reserved' ? 'Rezerve' : r.status,
      r.checkedIn ? 'Evet' : 'Hayır',
    ]);
    downloadExcel(headers, rows, filename);
  };

  const exportAttendanceExcel = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = ['İsim', 'Telefon', 'Bölüm', 'Koltuk', 'Saat'];
    const rows = data.map((r: any) => [
      r.holderName || '',
      r.holderPhone || '',
      r.section,
      `${r.row}-${r.seatNumber}`,
      r.checkedInAt ? new Date(r.checkedInAt).toLocaleTimeString('tr-TR') : '-',
    ]);
    downloadExcel(headers, rows, filename);
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const audienceColumns = [
    { title: 'İsim', dataIndex: 'holderName', key: 'holderName' },
    { title: 'Telefon', dataIndex: 'holderPhone', key: 'holderPhone' },
    { title: 'E-posta', dataIndex: 'holderEmail', key: 'holderEmail' },
    { title: 'Kat', dataIndex: 'floor', key: 'floor' },
    { title: 'Bölüm', dataIndex: 'section', key: 'section' },
    {
      title: 'Koltuk',
      key: 'seat',
      render: (_: any, r: AudienceMember) => `${r.row}-${r.seatNumber}`,
    },
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Fiyat',
      dataIndex: 'price',
      key: 'price',
      render: (v: number) => `${v} TL`,
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={v === 'sold' ? 'red' : v === 'reserved' ? 'orange' : 'default'}>
          {v === 'sold' ? 'Satılmış' : v === 'reserved' ? 'Rezerve' : v}
        </Tag>
      ),
    },
    {
      title: 'Giriş',
      key: 'checkedIn',
      render: (_: any, r: AudienceMember) => (
        <Tag color={r.checkedIn ? 'green' : 'default'}>
          {r.checkedIn ? 'Evet' : 'Hayır'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/shows/${id}`)} style={{ marginBottom: 16 }}>
        Geri
      </Button>

      <Typography.Title level={3}>{show?.name} - Raporlar</Typography.Title>

      <Tabs
        items={[
          {
            key: 'summary',
            label: 'Özet',
            children: summary ? (
              <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={6}>
                    <Card>
                      <Statistic title="Toplam Koltuk" value={summary.summary.total} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card>
                      <Statistic title="Boş" value={summary.summary.available} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card>
                      <Statistic title="Rezerve" value={summary.summary.reserved} valueStyle={{ color: '#999' }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card>
                      <Statistic title="Satılmış" value={summary.summary.sold} valueStyle={{ color: '#000' }} />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={8}>
                    <Card>
                      <Statistic
                        title="Toplam Gelir"
                        value={summary.summary.revenue}
                        suffix="TL"
                        prefix={<DollarOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Card>
                      <Statistic
                        title="Doluluk Oranı"
                        value={summary.occupancyRate.toFixed(1)}
                        suffix="%"
                      />
                      <Progress percent={Math.round(summary.occupancyRate)} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Card>
                      <Statistic
                        title="Giriş Yapan"
                        value={summary.summary.checkedIn}
                        prefix={<TeamOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card title="Kategori Bazlı Dağılım">
                  <Table
                    dataSource={summary.byCategory}
                    rowKey="category"
                    pagination={false}
                    columns={[
                      {
                        title: 'Kategori',
                        dataIndex: 'category',
                        render: (v: string, r: any) => <Tag color={r.color}>{v}</Tag>,
                      },
                      { title: 'Fiyat', dataIndex: 'price', render: (v: number) => `${v} TL` },
                      { title: 'Toplam', dataIndex: 'total' },
                      { title: 'Boş', dataIndex: 'available' },
                      { title: 'Rezerve', dataIndex: 'reserved' },
                      { title: 'Satılmış', dataIndex: 'sold' },
                      { title: 'Gelir', dataIndex: 'revenue', render: (v: number) => `${v} TL` },
                    ]}
                  />
                </Card>
              </div>
            ) : null,
          },
          {
            key: 'audience',
            label: 'Seyirci Listesi',
            children: (
              <div>
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => exportAudienceExcel(audience, `seyirci-listesi-${id}`)}
                  >
                    Excel İndir
                  </Button>
                </div>
                <Table
                  dataSource={audience}
                  columns={audienceColumns}
                  rowKey="ticketId"
                  pagination={{ pageSize: 50 }}
                  scroll={{ x: 1200 }}
                />
              </div>
            ),
          },
          {
            key: 'attendance',
            label: 'Gerçekleşen Seyirci',
            children: attendance ? (
              <div>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic title="Satılan" value={attendance.totalSold} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="Giriş Yapan" value={attendance.checkedInCount} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="Gelmeyen" value={attendance.notCheckedInCount} valueStyle={{ color: '#999' }} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="Katılım"
                        value={attendance.attendanceRate.toFixed(1)}
                        suffix="%"
                      />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Card
                      title="Giriş Yapanlar"
                      extra={
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => exportAttendanceExcel(attendance.checkedIn, `giris-yapanlar-${id}`)}
                        >
                          CSV
                        </Button>
                      }
                    >
                      <Table
                        dataSource={attendance.checkedIn}
                        rowKey={(r: any) => `${r.row}-${r.seatNumber}`}
                        pagination={{ pageSize: 20 }}
                        size="small"
                        columns={[
                          { title: 'İsim', dataIndex: 'holderName' },
                          { title: 'Koltuk', render: (_: any, r: any) => `${r.section} ${r.row}-${r.seatNumber}` },
                          { title: 'Saat', dataIndex: 'checkedInAt', render: (v: string) => v ? new Date(v).toLocaleTimeString('tr-TR') : '-' },
                        ]}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card
                      title="Gelmeyenler"
                      extra={
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => exportAttendanceExcel(attendance.notCheckedIn, `gelmeyenler-${id}`)}
                        >
                          CSV
                        </Button>
                      }
                    >
                      <Table
                        dataSource={attendance.notCheckedIn}
                        rowKey={(r: any) => `${r.row}-${r.seatNumber}`}
                        pagination={{ pageSize: 20 }}
                        size="small"
                        columns={[
                          { title: 'İsim', dataIndex: 'holderName' },
                          { title: 'Telefon', dataIndex: 'holderPhone' },
                          { title: 'Koltuk', render: (_: any, r: any) => `${r.section} ${r.row}-${r.seatNumber}` },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : null,
          },
        ]}
      />
    </div>
  );
}
