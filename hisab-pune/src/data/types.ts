export type OfficialRole =
  | 'sanitation'
  | 'ward_officer'
  | 'corporator'
  | 'mla'
  | 'mayor'
  | 'commissioner'
  | 'mp';

export interface Official {
  id: string;
  name: string;
  role: OfficialRole;
  title: string;
  party?: string;
  xHandle?: string;
  phone?: string;
  note?: string;
}

export interface Locality {
  id: string;
  name: string;
  nameMr: string;
  wardNo: number;
  zone: string;
  lat: number;
  lng: number;
  assembly: string;
  mlaId: string;
  mpId: string;
  corporatorIds: string[];
  wardOfficerId: string;
  sanitationId: string;
}

export type ReportStatus = 'open' | 'escalated' | 'resolved';

export interface Report {
  id: string;
  localityId: string;
  lat: number;
  lng: number;
  note: string;
  status: ReportStatus;
  createdAt: string;
  photoDataUrl?: string;
  source: 'seed' | 'user';
}
