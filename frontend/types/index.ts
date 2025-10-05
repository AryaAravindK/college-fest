export type UserRole = 'public' | 'student' | 'organizer' | 'faculty' | 'admin';

export interface User {
  _id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  email: string;
  phone?: string;
  profilePic?: string;
  bio?: string;
  role: UserRole;
  provider?: 'local' | 'google' | 'facebook' | 'linkedin';
  program?: string;
  department?: string;
  year?: number;
  rollNumber?: string;
  designation?: string;
  clubs?: string[];
  primaryClub?: string;
  clubPosition?: string;
  assignedEvents?: string[];
  registeredEvents?: string[];
  teams?: string[];
  certificates?: string[];
  notifications?: string[];
  likedEvents?: string[];
  interests?: string[];
  isVerified?: boolean;
  isPhoneVerified?: boolean;
  status?: 'active' | 'suspended' | 'deleted';
  lastLogin?: Date;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
  };
  social?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  socialLogin: (provider: 'google' | 'facebook' | 'linkedin') => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

export interface RegisterData {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  department?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export type EventType = 'inter-college' | 'intra-college';
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
export type EventMode = 'offline' | 'online' | 'hybrid';
export type EventLevel = 'UG' | 'PG' | 'Faculty' | 'Alumni' | 'Open';
export type EventCategory = 'technical' | 'cultural' | 'sports' | 'literary' | 'management' | 'workshop' | 'seminar';
export type RegistrationType = 'individual' | 'team';

export interface Event {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  poster?: string;
  brochure?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  sessions?: EventSession[];
  type: EventType;
  mode: EventMode;
  meetingLink?: string;
  venues?: string[];
  program?: string;
  department?: string;
  primaryClub?: Club;
  category?: EventCategory;
  level?: EventLevel;
  capacity?: number;
  registeredCountCache?: number;
  teamSize?: {
    min: number;
    max: number;
  };
  registrationType?: RegistrationType;
  eligibilityCriteria?: string;
  requiredDocuments?: string[];
  registrations?: Registration[];
  teams?: Team[];
  participants?: User[];
  isPaid?: boolean;
  fee?: number;
  paymentMode?: 'online' | 'offline' | 'both';
  refundPolicy?: string;
  sponsors?: Sponsor[];
  organizer?: User;
  coordinators?: User[];
  volunteers?: User[];
  judges?: User[];
  announcements?: Announcement[];
  likedBy?: User[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  tags?: string[];
  resources?: string[];
  budget?: {
    estimated: number;
    expenses: number;
  };
  certificates?: Certificate[];
  feedbacks?: Feedback[];
  results?: Result[];
  winners?: Winner[];
  status: EventStatus;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: User;
  approvalDate?: Date;
  isHighlighted?: boolean;
  createdBy?: User;
  updatedBy?: User;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EventSession {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  venue?: string;
}

export interface Winner {
  position: string;
  prize: string;
  awardedToUser?: User;
  awardedToTeam?: Team;
}

export interface Club {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'active' | 'inactive' | 'archived';
  isPublic?: boolean;
  attachments?: ClubAttachment[];
  members?: ClubMember[];
  likes?: User[];
  likeCount?: number;
  viewCount?: number;
  impressionCount?: number;
  events?: Event[];
  teams?: Team[];
  sponsors?: Sponsor[];
  announcements?: Announcement[];
  feedbacks?: Feedback[];
  slug?: string;
  createdBy?: User;
  updatedBy?: User;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClubAttachment {
  url: string;
  type?: string;
}

export interface ClubMember {
  user: User;
  role: string;
  joinedAt: Date;
}

export interface Registration {
  _id: string;
  event: Event | string;
  user: User | string;
  team?: Team | string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'waitlisted';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  attendanceStatus?: 'present' | 'absent';
  registeredAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Team {
  _id: string;
  name: string;
  event: Event | string;
  leader: User | string;
  members: User[] | string[];
  status: 'active' | 'inactive' | 'dissolved';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  event?: Event | string;
  club?: Club | string;
  targetAudience?: string[];
  priority?: 'low' | 'medium' | 'high';
  publishedAt?: Date;
  expiresAt?: Date;
  createdBy?: User;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Notification {
  _id: string;
  user: User | string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  createdAt?: Date;
}

export interface Certificate {
  _id: string;
  event: Event | string;
  user: User | string;
  certificateUrl?: string;
  issuedAt?: Date;
  createdAt?: Date;
}

export interface Feedback {
  _id: string;
  event?: Event | string;
  club?: Club | string;
  user: User | string;
  rating: number;
  comment?: string;
  createdAt?: Date;
}

export interface Result {
  _id: string;
  event: Event | string;
  user?: User | string;
  team?: Team | string;
  position?: string;
  score?: number;
  remarks?: string;
  createdAt?: Date;
}

export interface Sponsor {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  events?: Event[];
  clubs?: Club[];
  createdAt?: Date;
}

export interface Payment {
  _id: string;
  registration: Registration | string;
  user: User | string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  transactionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  registeredEvents: number;
  totalUsers?: number;
  totalClubs?: number;
  recentActivity?: Activity[];
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: any;
}
