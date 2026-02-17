import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Input,
  message,
  Result,
  Descriptions,
  Tag,
  Space,
  Alert,
  Statistic,
  Row,
  Col,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  ScanOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { ticketApi, reportApi, showApi } from '../services/api';
import { Show } from '../types';

export default function CheckinPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show | null>(null);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    showApi.get(parseInt(id!)).then((res) => setShow(res.data));
    loadStats();
  }, [id]);

  const loadStats = () => {
    reportApi.attendance(parseInt(id!)).then((res) => setStats(res.data));
  };

  const handleCheckin = async (code?: string) => {
    const barcodeValue = code || barcode;
    if (!barcodeValue.trim()) return;

    setScanning(true);
    setResult(null);
    setError(null);

    try {
      const res = await ticketApi.checkin(barcodeValue.trim());
      setResult(res.data);
      setBarcode('');
      loadStats();
      message.success('Giriş başarılı!');
    } catch (err: any) {
      const errData = err.response?.data;
      setError(errData?.error || 'Giriş başarısız');
      if (errData?.ticket) {
        setResult({ ticket: errData.ticket, error: true });
      }
    } finally {
      setScanning(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const startCamera = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setCameraActive(true);

      setTimeout(async () => {
        const scanner = new Html5Qrcode('camera-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            scanner.stop();
            setCameraActive(false);
            handleCheckin(decodedText);
          },
          () => {}
        );
      }, 100);
    } catch (err) {
      message.error('Kamera başlatılamadı');
      setCameraActive(false);
    }
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/shows/${id}`)} style={{ marginBottom: 16 }}>
        Geri
      </Button>

      <Typography.Title level={3}>
        {show?.name} - Giriş Kontrol
      </Typography.Title>

      {/* İstatistikler */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="Satılan Bilet" value={stats.totalSold} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Giriş Yapan"
                value={stats.checkedInCount}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Gelmemiş"
                value={stats.notCheckedInCount}
                valueStyle={{ color: '#999' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Katılım Oranı"
                value={stats.attendanceRate?.toFixed(1)}
                suffix="%"
                valueStyle={{ color: stats.attendanceRate > 80 ? '#52c41a' : '#999' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Barkod Giriş */}
      <Card style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            ref={inputRef}
            size="large"
            placeholder="Barkodu okutun veya yazın..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onPressEnter={() => handleCheckin()}
            prefix={<ScanOutlined />}
            autoFocus
          />
          <Button size="large" type="primary" onClick={() => handleCheckin()} loading={scanning}>
            Giriş Yap
          </Button>
        </Space.Compact>

        <div style={{ marginTop: 12 }}>
          <Button icon={<CameraOutlined />} onClick={startCamera} disabled={cameraActive}>
            Kamera ile Tara
          </Button>
        </div>

        {cameraActive && (
          <div style={{ marginTop: 16 }}>
            <div id="camera-reader" style={{ width: '100%', maxWidth: 400 }} />
            <Button onClick={() => setCameraActive(false)} style={{ marginTop: 8 }}>
              Kamerayı Kapat
            </Button>
          </div>
        )}
      </Card>

      {/* Sonuç */}
      {error && !result && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      {result && (
        <Card>
          {result.error ? (
            <Result
              status="warning"
              title={error}
              subTitle={result.checkedInAt ? `Daha önce giriş yapılmış: ${new Date(result.checkedInAt).toLocaleString('tr-TR')}` : ''}
            />
          ) : (
            <Result
              status="success"
              title="Giriş Başarılı!"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          )}

          {result.ticket && (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="İsim">{result.ticket.holderName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Barkod">{result.ticket.barcode}</Descriptions.Item>
              <Descriptions.Item label="Kat">{result.ticket.seat?.section?.floor?.name}</Descriptions.Item>
              <Descriptions.Item label="Bölüm">{result.ticket.seat?.section?.name}</Descriptions.Item>
              <Descriptions.Item label="Sıra">{result.ticket.seat?.row}</Descriptions.Item>
              <Descriptions.Item label="Koltuk">{result.ticket.seat?.number}</Descriptions.Item>
              <Descriptions.Item label="Kategori">
                <Tag>{result.ticket.category?.name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Durum">
                <Tag color={result.error ? 'red' : 'green'}>
                  {result.error ? 'Hata' : 'Giriş Yapıldı'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      )}
    </div>
  );
}
