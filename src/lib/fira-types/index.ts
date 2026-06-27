// ============================
// FIRA Platform - Core Types (ported from astennue/fira)
// Used by the fira-app dashboard components.
// ============================

export type UserRole = 'applicant' | 'employer' | 'admin' | 'super_admin' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
}

export interface ApplicantProfileData {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  birthdate?: string;
  gender?: string;
  nationality: string;
  civilStatus?: string;
  placeOfBirth?: string;
  email?: string;
  phone?: string;
  altPhone?: string;
  address?: string;
  city?: string;
  province?: string;
  region?: string;
  zipCode?: string;
  country: string;
  summary?: string;
  completeness: number;
  status: string;
  avatar?: string;
  educations?: Education[];
  experiences?: WorkExperience[];
  skills?: ApplicantSkill[];
  languages?: ApplicantLanguage[];
  certifications?: Certification[];
  documents?: Document[];
  governmentIds?: GovernmentId[];
  passportInfo?: PassportInfo;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  isCompleted: boolean;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  country?: string;
  monthlySalary?: number;
}

export interface ApplicantSkill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience?: number;
}

export interface ApplicantLanguage {
  id: string;
  name: string;
  proficiency: 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';
}

export interface Certification {
  id: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  fileUrl?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  fileUrl?: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface GovernmentId {
  id: string;
  type: string;
  number: string;
  fileUrl?: string;
  verified: boolean;
}

export interface PassportInfo {
  passportNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingCountry?: string;
  fileUrl?: string;
}

export interface MedicalRecord {
  id: string;
  examDate?: string;
  status?: string;
  fileUrl?: string;
}

export interface JobData {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements?: string;
  benefits?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  salaryPeriod?: string;
  employmentType: string;
  workSetup?: string;
  country: string;
  city?: string;
  category?: string;
  industry?: string;
  skills?: string[];
  status: string;
  isFeatured: boolean;
  isUrgent: boolean;
  applicationDeadline?: string;
  maxApplicants?: number;
  currentApplicants: number;
  viewsCount: number;
  bookmarksCount: number;
  employer?: {
    companyName: string;
    companyLogo?: string;
    industry?: string;
    country?: string;
  };
  createdAt: string;
}

export const ATS_STAGES = [
  { key: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { key: 'screening', label: 'Screening', color: 'bg-cyan-500' },
  { key: 'document_verification', label: 'Doc Verification', color: 'bg-teal-500' },
  { key: 'ai_matching', label: 'AI Matching', color: 'bg-emerald-500' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'bg-green-500' },
  { key: 'interview_scheduled', label: 'Interview', color: 'bg-lime-500' },
  { key: 'interview_completed', label: 'Interview Done', color: 'bg-yellow-500' },
  { key: 'employer_review', label: 'Employer Review', color: 'bg-amber-500' },
  { key: 'employer_approved', label: 'Approved', color: 'bg-orange-500' },
  { key: 'medical', label: 'Medical', color: 'bg-red-400' },
  { key: 'training', label: 'Training', color: 'bg-rose-500' },
  { key: 'visa_processing', label: 'Visa', color: 'bg-pink-500' },
  { key: 'government_processing', label: 'Government', color: 'bg-purple-500' },
  { key: 'pre_departure', label: 'Pre-Departure', color: 'bg-violet-500' },
  { key: 'ready_for_deployment', label: 'Deployment', color: 'bg-fuchsia-500' },
  { key: 'deployed', label: 'Deployed', color: 'bg-emerald-600' },
  { key: 'arrival_confirmed', label: 'Arrival', color: 'bg-teal-600' },
  { key: 'active_worker', label: 'Active', color: 'bg-sky-600' },
  { key: 'contract_completed', label: 'Completed', color: 'bg-indigo-600' },
  { key: 'talent_pool', label: 'Talent Pool', color: 'bg-slate-500' },
  { key: 'rehire_candidate', label: 'Rehire', color: 'bg-green-600' },
] as const;

export interface ApplicationData {
  id: string;
  jobId: string;
  job?: JobData;
  applicantId: string;
  applicant?: { firstName: string; lastName: string; avatar?: string };
  status: string;
  matchScore?: number;
  matchReport?: string;
  rejectionReason?: string;
  employerNotes?: string;
  interviewDate?: string;
  interviewResult?: string;
  deploymentDate?: string;
  contractStart?: string;
  contractEnd?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}
