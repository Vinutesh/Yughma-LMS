/**
 * Shared domain types — written once, used by mock fixtures/handlers now
 * and by real API responses later. Keep these in sync with whatever the
 * eventual backend contract turns out to be; nothing here is mock-specific.
 */

export type RoleName = "Learner" | "Instructor" | "Manager" | "Org Admin";

export interface Permission {
  resource: string; // e.g. "courses", "users", "roles"
  action: "view" | "edit" | "manage";
}

export interface Role {
  id: string;
  name: RoleName | string;
  isSystemRole: boolean;
  permissions: Permission[];
}

export type PlanId = "starter" | "growth" | "enterprise";

/** Mirrors what a real payment processor would report — never a raw card
 * number, only the shape a real Stripe-style tokenized method exposes. */
export interface PaymentMethod {
  brand: string;
  last4: string;
}

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface Organization {
  id: string;
  name: string;
  /** True for exactly one org — Yughma Tech itself, the only account that
   * authors courses/videos/quizzes and grants client companies' people
   * access to them. Gates the platform-admin UI; the real enforcement is
   * server-side (`requirePlatformAdmin` in the backend), this is a UI
   * convenience only. */
  isPlatform: boolean;
  industry?: string;
  size?: string;
  logoUrl?: string;
  accentColor?: string;
  /** Hours of inactivity before a session expires. Stored, not yet enforced —
   * there's no real session layer to enforce it against. */
  sessionTimeoutHours?: number;
  /** Inert until an SSO integration is actually connected. */
  requireSso?: boolean;
  /** When the free trial runs out. Absent once a plan is in effect. */
  trialEndsAt?: string;
  /** Recorded intent only — this pass collects no payment. */
  plan?: PlanId;
  planChosenAt?: string;
  seatLimit?: number;
  subscriptionStatus?: SubscriptionStatus;
  cancelAtPeriodEnd?: boolean;
  paymentMethod?: PaymentMethod;
  nextInvoiceAt?: string;
}

export interface Invoice {
  id: string;
  orgId: string;
  amountCents: number;
  issuedAt: string;
  status: "paid" | "open";
}

export interface SeatRequest {
  id: string;
  orgId: string;
  requestedByUserId: string;
  additionalSeats: number;
  requestedAt: string;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  archived: boolean;
}

export interface Team {
  id: string;
  orgId: string;
  departmentId: string;
  name: string;
  archived: boolean;
}

export type UserStatus = "active" | "deactivated";

export interface User {
  id: string;
  name: string;
  email: string;
  orgId: string;
  roleIds: string[];
  status: UserStatus;
  departmentId?: string;
  teamId?: string;
  avatarUrl?: string;
}

export type NotificationCategory =
  | "grading"
  | "deadlines"
  | "course_updates"
  | "team_admin"
  | "community";

export interface NotificationItem {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  targetUrl?: string;
  read: boolean;
  createdAt: string;
}

/** Per-user, per-category. Account security notices have no toggle — they're
 * always on, per the module's open questions. */
export interface NotificationPreferences {
  userId: string;
  categories: Record<NotificationCategory, { inApp: boolean; email: boolean }>;
}

export type AuditActionType =
  | "role_changed"
  | "user_deactivated"
  | "user_reactivated"
  | "course_archived"
  | "course_published"
  | "certificate_revoked"
  | "org_settings_changed"
  | "plan_changed";

export interface AuditLogEntry {
  id: string;
  orgId: string;
  at: string;
  actorUserId: string;
  action: AuditActionType;
  /** Human label for the row — "Changed role", "Course archived", etc. */
  summary: string;
  targetLabel?: string;
  /** Free-form, rendered in the detail drawer — e.g. { from: "Learner", to: "Instructor" }. */
  detail?: Record<string, string>;
}

export type AssetKind = "video" | "document" | "image" | "audio";

export interface AssetFolder {
  id: string;
  orgId: string;
  name: string;
}

export interface Asset {
  id: string;
  orgId: string;
  name: string;
  kind: AssetKind;
  sizeBytes: number;
  /** Only meaningful for video/audio. */
  durationSeconds?: number;
  folderId?: string;
  tags: string[];
  uploadedByUserId: string;
  uploadedAt: string;
}

export type CourseStatus = "draft" | "published" | "archived";

export interface Course {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: CourseStatus;
  prerequisiteIds: string[];
  /** Skills this course builds — surfaced on the learner's My Skills screen. */
  skillIds: string[];
  /** Issued automatically when the course is completed. */
  certificateTemplateId?: string;
  createdByUserId: string;
  createdAt: string;
  publishedAt?: string;
}

/** A named section grouping lessons inside a course. */
export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  order: number;
}

export type LessonContentType = "text" | "video" | "file" | "link" | "scorm";

export type ScormPackageStatus = "processing" | "ready";

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  order: number;
  contentType: LessonContentType;
  /** Set for text lessons. */
  body?: string;
  /** Set for video/file/scorm lessons — points at a Content Library asset. */
  assetId?: string;
  /** Set for link lessons. */
  url?: string;
  estimatedMinutes?: number;
  /** Set for scorm lessons only. Real extraction/validation is backend work;
   * this models the state the upload UI reacts to. */
  scormStatus?: ScormPackageStatus;
}

/** A single (mocked) xAPI statement — who did what, to what, when. Read-only
 * debug/compliance surface; there is no real LRS behind this. */
export interface XapiStatement {
  id: string;
  orgId: string;
  actorUserId: string;
  verb: string;
  object: string;
  at: string;
}

export interface LrsConnection {
  orgId: string;
  endpointUrl: string;
  authKey: string;
  /** Always false in this pass — nothing ever actually connects. */
  connected: boolean;
}

/** "requested" only occurs on approval-mode courses, awaiting instructor action. */
export type EnrollmentStatus = "requested" | "active" | "completed";

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedLessonIds: string[];
  completedAt?: string;
}

export type SubmissionType = "text" | "file" | "both";

export interface Assignment {
  id: string;
  orgId: string;
  courseId: string;
  title: string;
  instructions: string;
  dueAt?: string;
  submissionType: SubmissionType;
  pointsPossible: number;
  createdByUserId: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  submittedAt: string;
  text?: string;
  assetId?: string;
  score?: number;
  feedback?: string;
  gradedByUserId?: string;
  gradedAt?: string;
  /** Instructor bookmark for "come back to this one". */
  flagged: boolean;
}

export type QuizQuestionType = "mcq" | "truefalse";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  order: number;
  type: QuizQuestionType;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  points: number;
}

/**
 * An assessment is the high-stakes variant of a quiz, not a parallel system —
 * same question editor and attempt flow, plus a required passing score, a
 * single attempt, an optional availability window, and certificate issuance on
 * a pass. See LMS/docs/modules/13-assessments/00-open-questions.md.
 */
export type QuizKind = "quiz" | "assessment";

export interface Quiz {
  id: string;
  orgId: string;
  courseId: string;
  title: string;
  kind: QuizKind;
  timeLimitMinutes?: number;
  randomizeOrder: boolean;
  /** 0 means one attempt only, no retakes. Always 0 for assessments. */
  retakesAllowed: number;
  createdByUserId: string;
  createdAt: string;

  // ---- assessment-only ----
  /** Percentage of total points needed to pass. */
  passingScorePercent?: number;
  availableFrom?: string;
  availableTo?: string;
  /**
   * Stored but inert — there is no webcam/AI proctoring behind this in v1.
   * A deliberate placeholder for a Phase 4+ vendor integration; do not mistake
   * it for a working feature.
   */
  proctoringRequired?: boolean;
  /** Issued automatically to anyone who passes. */
  certificateTemplateId?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: string;
  submittedAt?: string;
  /** questionId -> chosen optionId */
  answers: Record<string, string>;
  score?: number;
}

/** A flat tag in this pass — no hierarchy, no proficiency levels. Proficiency
 * is expressed as a count of completed courses that build the skill. */
export interface Skill {
  id: string;
  orgId: string;
  name: string;
  archived: boolean;
}

/**
 * v1 ships one fixed layout, so a "template" is really just a named
 * certificate whose variable fields get filled in at issue time. There is no
 * visual designer — see LMS/docs/modules/15-certificates/00-open-questions.md.
 */
export interface CertificateTemplate {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
}

/** What earning the certificate was tied to. "manual" is an admin override. */
export type CertificateSourceKind = "course" | "assessment" | "path" | "manual";

export interface Certificate {
  id: string;
  orgId: string;
  templateId: string;
  userId: string;
  sourceKind: CertificateSourceKind;
  /** Course/assessment/path id. Absent for manual issues. */
  sourceId?: string;
  /** Denormalized so a revoked-source certificate still reads correctly. */
  sourceTitle: string;
  issuedAt: string;
  /** Shown on the certificate and used by the public verification page. */
  verificationCode: string;
  revoked: boolean;
  revokedAt?: string;
  revokedByUserId?: string;
}

export type PathStatus = "draft" | "published";

/** An ordered sequence of existing courses — a path authors no content of its
 * own. Sequential by default: course N+1 unlocks when course N completes. */
export interface LearningPath {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: PathStatus;
  /** Order is the array order. */
  courseIds: string[];
  certificateTemplateId?: string;
  createdByUserId: string;
  createdAt: string;
  publishedAt?: string;
}

export interface PathEnrollment {
  id: string;
  pathId: string;
  userId: string;
  enrolledAt: string;
  completedAt?: string;
}

/** A manual calendar entry — live sessions, office hours, anything that isn't
 * already a due date derived from Assignments/Assessments. */
export interface CalendarEvent {
  id: string;
  orgId: string;
  courseId?: string;
  title: string;
  description?: string;
  startsAt: string;
  link?: string;
  createdByUserId: string;
}

/** A target role plus the ordered skills it requires, each resolved to
 * whichever content already builds it — no content authoring of its own. */
export interface CareerPath {
  id: string;
  orgId: string;
  title: string;
  status: PathStatus;
  skillIds: string[];
  createdByUserId: string;
  createdAt: string;
  publishedAt?: string;
}

/** A curated, named shelf of existing courses/paths — surfaces as a Catalog
 * filter, not a nav item (see the module's open questions). */
export interface Academy {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: PathStatus;
  heroImageAssetId?: string;
  courseIds: string[];
  pathIds: string[];
  createdByUserId: string;
  createdAt: string;
  publishedAt?: string;
}

export type IntegrationKind = "slack" | "teams" | "zoom" | "google_calendar" | "hris" | "sso";

/** One generic shape for every integration — the marginal cost of the 10th
 * integration is a data row, not a new page. */
export interface Integration {
  id: string;
  orgId: string;
  kind: IntegrationKind;
  connected: boolean;
  connectedAt?: string;
  /** Free-form key-value config, rendered by one generic panel. */
  config: Record<string, string>;
}

export type WebhookEvent = "course.published" | "certificate.issued" | "enrollment.completed";

export interface WebhookDelivery {
  id: string;
  event: WebhookEvent;
  at: string;
  statusCode: number;
}

export interface Webhook {
  id: string;
  orgId: string;
  url: string;
  events: WebhookEvent[];
  /** Shown once at creation, masked everywhere after. */
  secret: string;
  createdAt: string;
  deliveries: WebhookDelivery[];
}

export interface ApiKeyRecord {
  id: string;
  orgId: string;
  name: string;
  /** Only the masked form is ever persisted for display — the real value is
   * returned once, at creation, and never stored back. */
  maskedKey: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

/** One thread/post model for both per-course and org-wide discussion — a
 * course is the group, per the module's open questions. */
export type ThreadScope = "course" | "org";

export interface Thread {
  id: string;
  orgId: string;
  scope: ThreadScope;
  /** Set when scope is "course". */
  courseId?: string;
  title: string;
  createdByUserId: string;
  createdAt: string;
  pinned: boolean;
  locked: boolean;
}

export interface Post {
  id: string;
  threadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

export type ReportReason = "spam" | "harassment" | "off_topic" | "other";

export interface ContentReport {
  id: string;
  orgId: string;
  postId: string;
  reportedByUserId: string;
  reason: ReportReason;
  createdAt: string;
  resolved: boolean;
}

export interface Session {
  /** `mustChangePassword` is only ever present on the logged-in caller's own
   * record (see `auth.login`/`auth.me` on the backend) — never fetched for
   * anyone else, so it lives here rather than on the general `User` type
   * every user-list screen also uses. */
  user: User & { mustChangePassword: boolean };
  org: Organization;
  roles: Role[];
  permissions: Permission[];
}
