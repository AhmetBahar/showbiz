export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'usher';
  createdAt?: string;
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  description?: string;
  floors: Floor[];
  totalSeats?: number;
  createdAt?: string;
}

export interface Floor {
  id: number;
  venueId: number;
  name: string;
  level: number;
  sections: Section[];
}

export interface Section {
  id: number;
  floorId: number;
  name: string;
  type: 'orchestra' | 'balcony' | 'box' | 'left_wing' | 'center' | 'right_wing';
  seats: Seat[];
}

export interface Seat {
  id: number;
  sectionId: number;
  row: string;
  number: number;
  isActive: boolean;
}

export interface Show {
  id: number;
  venueId: number;
  name: string;
  description?: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  venue: { id: number; name: string };
  categories: TicketCategory[];
  _count?: { tickets: number };
  createdAt?: string;
}

export interface TicketCategory {
  id: number;
  showId: number;
  name: string;
  price: number;
  color?: string;
  textColor?: string;
  description?: string;
}

export interface Ticket {
  id: number;
  showId: number;
  seatId: number;
  categoryId: number;
  status: 'available' | 'reserved' | 'sold' | 'cancelled';
  holderName?: string;
  holderPhone?: string;
  holderEmail?: string;
  barcode?: string;
  reservedById?: number;
  soldById?: number;
  reservedAt?: string;
  soldAt?: string;
  checkedInAt?: string;
  seat: Seat & { section: Section & { floor: Floor } };
  category: TicketCategory;
  reservedBy?: { id: number; name: string };
  soldBy?: { id: number; name: string };
}

export interface ReportSummary {
  show: { id: number; name: string; date: string; status: string };
  venue: string;
  summary: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    cancelled: number;
    checkedIn: number;
    revenue: number;
  };
  byCategory: {
    category: string;
    color?: string;
    price: number;
    total: number;
    available: number;
    reserved: number;
    sold: number;
    cancelled: number;
    revenue: number;
  }[];
  occupancyRate: number;
}

export interface AudienceMember {
  ticketId: number;
  holderName?: string;
  holderPhone?: string;
  holderEmail?: string;
  status: string;
  barcode?: string;
  floor: string;
  section: string;
  row: string;
  seatNumber: number;
  category: string;
  price: number;
  reservedBy?: string;
  soldBy?: string;
  reservedAt?: string;
  soldAt?: string;
  checkedIn: boolean;
  checkedInAt?: string;
}
