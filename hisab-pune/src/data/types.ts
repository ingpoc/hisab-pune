export type OfficialRole =
  | 'sanitation'
  | 'ward_officer'
  | 'corporator'
  | 'mla'
  | 'mayor'
  | 'deputy_mayor'
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
  email?: string;
  note?: string;
  source?: string;
}

export interface CorporatorSeat {
  seat: string;
  name: string;
  party: string;
}

export interface ElectoralWard {
  id: number;
  name: string;
  corporators: CorporatorSeat[];
}

export interface WardOffice {
  id: string;
  name: string;
  /** Electoral wards attached under the Jan 2026 ward-committee order */
  electoralWardIds: number[];
  zone: number;
  phone?: string;
  email?: string;
  note?: string;
}

export interface Locality {
  id: string;
  name: string;
  electoralWardId: number;
  wardOfficeId: string;
  zone: string;
  lat: number;
  lng: number;
  assemblyId: string;
  mpId: string;
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
