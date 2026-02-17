import React from 'react';
import { Typography, Tag } from 'antd';

interface SeatData {
  id?: number;
  row: string;
  number: number;
  status?: string;
  categoryColor?: string;
  categoryTextColor?: string;
}

interface SectionData {
  name: string;
  type: string;
  seats: SeatData[];
}

interface TheaterSeatMapProps {
  sections: SectionData[];
  onSeatClick?: (seat: SeatData) => void;
  selectedSeatIds?: Set<number>;
  renderSeat?: (seat: SeatData, defaultEl: React.ReactNode) => React.ReactNode;
}

const sectionTypeLabels: Record<string, string> = {
  orchestra: 'Orkestra',
  balcony: 'Balkon',
  box: 'Loca',
  left_wing: 'Sol Kanat',
  center: 'Orta',
  right_wing: 'Sağ Kanat',
};

const stageFrontRows = ['AA', 'BB', 'CC', 'DD'];

const sortRows = (a: string, b: string) => {
  const aFrontIndex = stageFrontRows.indexOf(a.toUpperCase());
  const bFrontIndex = stageFrontRows.indexOf(b.toUpperCase());
  if (aFrontIndex !== -1 || bFrontIndex !== -1) {
    if (aFrontIndex === -1) return 1;
    if (bFrontIndex === -1) return -1;
    return aFrontIndex - bFrontIndex;
  }

  if (a.length !== b.length) return a.length - b.length;
  return a.localeCompare(b);
};

const groupSeatsByRow = (seats: SeatData[]): Map<string, SeatData[]> => {
  const map = new Map<string, SeatData[]>();
  for (const seat of seats) {
    if (!map.has(seat.row)) map.set(seat.row, []);
    map.get(seat.row)!.push(seat);
  }
  return map;
};

function isTheaterLayout(sections: SectionData[]): boolean {
  const types = new Set(sections.map((s) => s.type));
  return types.has('left_wing') && types.has('center') && types.has('right_wing');
}

function DefaultSeat({
  seat,
  isSelected,
  onClick,
}: {
  seat: SeatData;
  isSelected: boolean;
  onClick?: () => void;
}) {
  const status = seat.status || 'available';
  return (
    <div
      className={`seat ${status} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={status === 'available' ? { backgroundColor: seat.categoryColor, color: seat.categoryTextColor } : undefined}
    >
      {seat.number}
    </div>
  );
}

export default function TheaterSeatMap({
  sections,
  onSeatClick,
  selectedSeatIds,
  renderSeat,
}: TheaterSeatMapProps) {
  const theaterMode = isTheaterLayout(sections);

  if (!theaterMode) {
    // Standard layout - render each section separately
    return (
      <div>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: 16 }}>
            <Typography.Text strong>
              {section.name}{' '}
              <Tag>{sectionTypeLabels[section.type] || section.type}</Tag>
              <Tag color="green">{section.seats.length} koltuk</Tag>
            </Typography.Text>
            <div className="seat-map" style={{ marginTop: 8 }}>
              <div className="stage">SAHNE</div>
              {renderStandardRows(section.seats, onSeatClick, selectedSeatIds, renderSeat)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Theater mode
  const leftWing = sections.find((s) => s.type === 'left_wing');
  const center = sections.find((s) => s.type === 'center');
  const rightWing = sections.find((s) => s.type === 'right_wing');
  const otherSections = sections.filter(
    (s) => s.type !== 'left_wing' && s.type !== 'center' && s.type !== 'right_wing'
  );

  const leftRows = leftWing ? groupSeatsByRow(leftWing.seats) : new Map<string, SeatData[]>();
  const centerRows = center ? groupSeatsByRow(center.seats) : new Map<string, SeatData[]>();
  const rightRows = rightWing ? groupSeatsByRow(rightWing.seats) : new Map<string, SeatData[]>();

  // Collect all row labels
  const allRowLabels = new Set<string>();
  for (const key of leftRows.keys()) allRowLabels.add(key);
  for (const key of centerRows.keys()) allRowLabels.add(key);
  for (const key of rightRows.keys()) allRowLabels.add(key);
  const sortedRowLabels = Array.from(allRowLabels).sort(sortRows);

  const renderSeatEl = (seat: SeatData) => {
    const isSelected = selectedSeatIds?.has(seat.id || 0) || false;
    const defaultEl = (
      <DefaultSeat
        key={seat.id || `${seat.row}-${seat.number}`}
        seat={seat}
        isSelected={isSelected}
        onClick={onSeatClick ? () => onSeatClick(seat) : undefined}
      />
    );
    if (renderSeat) {
      return <React.Fragment key={seat.id || `${seat.row}-${seat.number}`}>{renderSeat(seat, defaultEl)}</React.Fragment>;
    }
    return defaultEl;
  };

  return (
    <div>
      {/* Theater header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        {leftWing && <Tag color="blue">{leftWing.name} (Sol Kanat)</Tag>}
        {center && <Tag color="green">{center.name} (Orta)</Tag>}
        {rightWing && <Tag color="orange">{rightWing.name} (Sağ Kanat)</Tag>}
      </div>

      <div className="theater-layout">
        <div className="stage">SAHNE</div>
        {sortedRowLabels.map((rowLabel) => {
          const leftSeats = leftRows.get(rowLabel) || [];
          const centerSeats = centerRows.get(rowLabel) || [];
          const rightSeats = rightRows.get(rowLabel) || [];

          // Left wing: descending, Right wing: ascending
          const leftSorted = [...leftSeats].sort((a, b) => b.number - a.number);
          const rightSorted = [...rightSeats].sort((a, b) => a.number - b.number);

          // Center: evens descending (left), odds ascending (right)
          const centerEvens = centerSeats.filter((s) => s.number % 2 === 0).sort((a, b) => b.number - a.number);
          const centerOdds = centerSeats.filter((s) => s.number % 2 === 1).sort((a, b) => a.number - b.number);

          return (
            <div key={rowLabel} className="theater-row">
              <div className="wing-seats">
                {leftSorted.map((seat) => renderSeatEl(seat))}
              </div>
              <span className="seat-row-label">{rowLabel}</span>
              <div className="center-seats">
                {centerEvens.map((seat) => renderSeatEl(seat))}
                <div className="center-aisle" />
                {centerOdds.map((seat) => renderSeatEl(seat))}
              </div>
              <span className="seat-row-label">{rowLabel}</span>
              <div className="wing-seats">
                {rightSorted.map((seat) => renderSeatEl(seat))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Render non-theater sections normally */}
      {otherSections.map((section, si) => (
        <div key={si} style={{ marginTop: 24, marginBottom: 16 }}>
          <Typography.Text strong>
            {section.name}{' '}
            <Tag>{sectionTypeLabels[section.type] || section.type}</Tag>
            <Tag color="green">{section.seats.length} koltuk</Tag>
          </Typography.Text>
          <div className="seat-map" style={{ marginTop: 8 }}>
            {renderStandardRows(section.seats, onSeatClick, selectedSeatIds, renderSeat)}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderStandardRows(
  seats: SeatData[],
  onSeatClick?: (seat: SeatData) => void,
  selectedSeatIds?: Set<number>,
  renderSeat?: (seat: SeatData, defaultEl: React.ReactNode) => React.ReactNode,
) {
  const rowMap = groupSeatsByRow(seats);
  const sortedLabels = Array.from(rowMap.keys()).sort(sortRows);

  return sortedLabels.map((rowLabel) => {
    const rowSeats = rowMap.get(rowLabel)!.sort((a, b) => a.number - b.number);
    return (
      <div key={rowLabel} className="seat-row">
        <span className="seat-row-label">{rowLabel}</span>
        {rowSeats.map((seat) => {
          const isSelected = selectedSeatIds?.has(seat.id || 0) || false;
          const defaultEl = (
            <DefaultSeat
              key={seat.id || `${seat.row}-${seat.number}`}
              seat={seat}
              isSelected={isSelected}
              onClick={onSeatClick ? () => onSeatClick(seat) : undefined}
            />
          );
          if (renderSeat) {
            return <React.Fragment key={seat.id || `${seat.row}-${seat.number}`}>{renderSeat(seat, defaultEl)}</React.Fragment>;
          }
          return defaultEl;
        })}
      </div>
    );
  });
}
