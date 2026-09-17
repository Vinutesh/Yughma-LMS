import type {
  Assignment,
  Asset,
  AssetFolder,
  CalendarEvent,
  Certificate,
  CertificateTemplate,
  Course,
  CourseModule,
  Enrollment,
  LearningPath,
  LearningPlan,
  Lesson,
  PathEnrollment,
  Post,
  Skill,
  Submission,
  Thread,
} from "@/types/domain";
import { MOCK_ORG } from "@/mock/fixtures";

const ORG = MOCK_ORG.id;

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function daysAhead(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

export const MOCK_FOLDERS: AssetFolder[] = [
  { id: "folder_onboarding", orgId: ORG, name: "Onboarding" },
  { id: "folder_sales", orgId: ORG, name: "Sales" },
  { id: "folder_compliance", orgId: ORG, name: "Compliance" },
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: "asset_onboarding_video",
    orgId: ORG,
    name: "onboarding.mp4",
    kind: "video",
    sizeBytes: 128 * 1024 * 1024,
    durationSeconds: 272,
    folderId: "folder_onboarding",
    tags: ["onboarding", "culture"],
    uploadedByUserId: "user_priya",
    uploadedAt: daysAgo(3),
  },
  {
    id: "asset_sales_deck",
    orgId: ORG,
    name: "sales-deck.pdf",
    kind: "document",
    sizeBytes: 4 * 1024 * 1024,
    folderId: "folder_sales",
    tags: ["sales", "deck"],
    uploadedByUserId: "user_priya",
    uploadedAt: daysAgo(6),
  },
  {
    id: "asset_handbook",
    orgId: ORG,
    name: "handbook.pdf",
    kind: "document",
    sizeBytes: 2 * 1024 * 1024,
    folderId: "folder_onboarding",
    tags: ["onboarding", "policy"],
    uploadedByUserId: "user_admin",
    uploadedAt: daysAgo(12),
  },
  {
    id: "asset_security_video",
    orgId: ORG,
    name: "security-basics.mp4",
    kind: "video",
    sizeBytes: 96 * 1024 * 1024,
    durationSeconds: 613,
    folderId: "folder_compliance",
    tags: ["compliance", "security"],
    uploadedByUserId: "user_admin",
    uploadedAt: daysAgo(20),
  },
];

export const MOCK_COURSES: Course[] = [
  {
    id: "course_onboarding",
    orgId: ORG,
    title: "Onboarding Compliance 2026",
    description: "Everything a new hire needs in their first two weeks.",
    status: "published",
    prerequisiteIds: [],
    skillIds: [],
    certificateTemplateId: "cert_tpl_onboarding",
    createdByUserId: "user_priya",
    createdAt: daysAgo(30),
    publishedAt: daysAgo(25),
  },
  {
    id: "course_sales",
    orgId: ORG,
    title: "Sales Fundamentals",
    description: "Discovery, qualification, and closing for new AEs.",
    status: "published",
    prerequisiteIds: ["course_onboarding"],
    skillIds: ["skill_consultative_selling", "skill_objection_handling"],
    createdByUserId: "user_priya",
    createdAt: daysAgo(18),
    publishedAt: daysAgo(14),
  },
  {
    id: "course_leadership",
    orgId: ORG,
    title: "First-Time Manager Essentials",
    description: "Draft — outline only so far.",
    status: "draft",
    prerequisiteIds: [],
    skillIds: [],
    createdByUserId: "user_priya",
    createdAt: daysAgo(2),
  },
];

export const MOCK_SKILLS: Skill[] = [
  { id: "skill_consultative_selling", orgId: ORG, name: "Consultative Selling", archived: false },
  { id: "skill_objection_handling", orgId: ORG, name: "Objection Handling", archived: false },
  { id: "skill_data_analysis", orgId: ORG, name: "Data Analysis", archived: false },
];

export const MOCK_CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: "cert_tpl_onboarding",
    orgId: ORG,
    name: "Onboarding Compliance 2026",
    createdAt: daysAgo(28),
  },
  { id: "cert_tpl_sales", orgId: ORG, name: "Sales Fundamentals Completion", createdAt: daysAgo(16) },
];

export const MOCK_CERTIFICATES: Certificate[] = [
  {
    id: "cert_raj_onboarding",
    orgId: ORG,
    templateId: "cert_tpl_onboarding",
    userId: "user_raj",
    sourceKind: "course",
    sourceId: "course_onboarding",
    sourceTitle: "Onboarding Compliance 2026",
    issuedAt: daysAgo(15),
    verificationCode: "YU-8F2K-QX91",
    revoked: false,
  },
];

export const MOCK_MODULES: CourseModule[] = [
  { id: "mod_onb_welcome", courseId: "course_onboarding", title: "Welcome", order: 0 },
  { id: "mod_onb_policy", courseId: "course_onboarding", title: "Policies & Security", order: 1 },
  { id: "mod_sales_discovery", courseId: "course_sales", title: "Discovery", order: 0 },
  { id: "mod_sales_closing", courseId: "course_sales", title: "Closing", order: 1 },
  { id: "mod_lead_intro", courseId: "course_leadership", title: "Getting Started", order: 0 },
];

export const MOCK_LESSONS: Lesson[] = [
  {
    id: "lesson_welcome_video",
    courseId: "course_onboarding",
    moduleId: "mod_onb_welcome",
    title: "Welcome to Acme",
    order: 0,
    contentType: "video",
    assetId: "asset_onboarding_video",
    estimatedMinutes: 5,
  },
  {
    id: "lesson_values",
    courseId: "course_onboarding",
    moduleId: "mod_onb_welcome",
    title: "How we work",
    order: 1,
    contentType: "text",
    body:
      "We default to writing things down. Decisions live in docs, not in meetings.\n\n" +
      "Three things we expect from everyone: own the outcome, ask early, and leave the codebase better than you found it.",
    estimatedMinutes: 8,
  },
  {
    id: "lesson_handbook",
    courseId: "course_onboarding",
    moduleId: "mod_onb_policy",
    title: "Employee handbook",
    order: 0,
    contentType: "file",
    assetId: "asset_handbook",
    estimatedMinutes: 20,
  },
  {
    id: "lesson_security",
    courseId: "course_onboarding",
    moduleId: "mod_onb_policy",
    title: "Security basics",
    order: 1,
    contentType: "video",
    assetId: "asset_security_video",
    estimatedMinutes: 10,
  },
  {
    id: "lesson_discovery_calls",
    courseId: "course_sales",
    moduleId: "mod_sales_discovery",
    title: "Running a discovery call",
    order: 0,
    contentType: "text",
    body:
      "A discovery call is not a demo. Your job is to leave with a written problem statement in the buyer's own words.\n\n" +
      "Ask about the current process before you mention a single feature.",
    estimatedMinutes: 12,
  },
  {
    id: "lesson_sales_deck",
    courseId: "course_sales",
    moduleId: "mod_sales_closing",
    title: "Walking the deck",
    order: 0,
    contentType: "file",
    assetId: "asset_sales_deck",
    estimatedMinutes: 15,
  },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "asg_reflection",
    orgId: ORG,
    courseId: "course_sales",
    title: "Week 3 Reflection",
    instructions:
      "Write 200 words on a discovery call you ran this week. What did you learn about the buyer's current process before mentioning a single feature?",
    dueAt: daysAhead(3),
    submissionType: "both",
    pointsPossible: 20,
    createdByUserId: "user_priya",
    createdAt: daysAgo(10),
  },
  {
    id: "asg_culture",
    orgId: ORG,
    courseId: "course_onboarding",
    title: "Culture Reflection",
    instructions: "In a paragraph, describe which of our three expectations you find hardest and why.",
    dueAt: daysAhead(10),
    submissionType: "text",
    pointsPossible: 10,
    createdByUserId: "user_priya",
    createdAt: daysAgo(8),
  },
];

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: "sub_raj_reflection",
    assignmentId: "asg_reflection",
    userId: "user_raj",
    submittedAt: daysAgo(2),
    text:
      "I ran a discovery call with a mid-market ops team. The thing that surprised me was how much of their process still lives in spreadsheets they don't trust.",
    flagged: true,
  },
  {
    id: "sub_jamie_culture",
    assignmentId: "asg_culture",
    userId: "user_jamie",
    submittedAt: daysAgo(4),
    text: "Asking early is hardest for me — I'd rather spend two hours stuck than look unprepared.",
    score: 9,
    feedback: "Honest and specific. Try setting yourself a 20-minute rule before asking.",
    gradedByUserId: "user_priya",
    gradedAt: daysAgo(3),
    flagged: false,
  },
];

export const MOCK_LEARNING_PATHS: LearningPath[] = [
  {
    id: "path_sales_ramp",
    orgId: ORG,
    title: "New Sales Rep Ramp-up",
    description: "The first six weeks for a new account executive, in order.",
    status: "published",
    courseIds: ["course_onboarding", "course_sales"],
    certificateTemplateId: "cert_tpl_sales",
    createdByUserId: "user_priya",
    createdAt: daysAgo(20),
    publishedAt: daysAgo(17),
  },
  {
    id: "path_manager",
    orgId: ORG,
    title: "Manager Essentials",
    description: "Draft — still deciding the order.",
    status: "draft",
    courseIds: ["course_leadership"],
    createdByUserId: "user_priya",
    createdAt: daysAgo(4),
  },
];

export const MOCK_PATH_ENROLLMENTS: PathEnrollment[] = [
  {
    id: "penr_raj_ramp",
    pathId: "path_sales_ramp",
    userId: "user_raj",
    enrolledAt: daysAgo(16),
  },
];

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "event_qa",
    orgId: ORG,
    courseId: "course_sales",
    title: "Live Q&A call",
    description: "Open Q&A on objection handling.",
    startsAt: daysAhead(4),
    link: "https://meet.google.com/xyz",
    createdByUserId: "user_priya",
  },
];

export const MOCK_THREADS: Thread[] = [
  {
    id: "thread_welcome",
    orgId: ORG,
    scope: "course",
    courseId: "course_sales",
    title: "Welcome — introduce yourself here",
    createdByUserId: "user_priya",
    createdAt: daysAgo(12),
    pinned: true,
    locked: false,
  },
  {
    id: "thread_objections",
    orgId: ORG,
    scope: "course",
    courseId: "course_sales",
    title: "Best objection-handling tactics you've used",
    createdByUserId: "user_priya",
    createdAt: daysAgo(4),
    pinned: false,
    locked: false,
  },
  {
    id: "thread_org_tips",
    orgId: ORG,
    scope: "org",
    title: "Tips for balancing coursework with the day job",
    createdByUserId: "user_raj",
    createdAt: daysAgo(6),
    pinned: false,
    locked: false,
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: "post_objections_1",
    threadId: "thread_objections",
    authorUserId: "user_priya",
    body: 'Curious what\'s worked for the team when a buyer says "it\'s too expensive."',
    createdAt: daysAgo(4),
  },
  {
    id: "post_objections_2",
    threadId: "thread_objections",
    authorUserId: "user_raj",
    body: "Asking what they're comparing the price against usually surfaces the real objection.",
    createdAt: daysAgo(3),
  },
];

export const MOCK_LEARNING_PLANS: LearningPlan[] = [
  {
    id: "plan_sales",
    orgId: ORG,
    title: "Sales Learning Plan",
    description: "Everything for the sales team.",
    status: "published",
    pathIds: ["path_sales_ramp"],
    createdByUserId: "user_priya",
    createdAt: daysAgo(9),
    publishedAt: daysAgo(8),
  },
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: "enr_jamie_onboarding",
    courseId: "course_onboarding",
    userId: "user_jamie",
    status: "active",
    enrolledAt: daysAgo(10),
    completedLessonIds: ["lesson_welcome_video", "lesson_values"],
  },
  {
    id: "enr_jamie_sales",
    courseId: "course_sales",
    userId: "user_jamie",
    status: "requested",
    enrolledAt: daysAgo(5),
    completedLessonIds: [],
  },
  {
    id: "enr_raj_onboarding",
    courseId: "course_onboarding",
    userId: "user_raj",
    status: "completed",
    enrolledAt: daysAgo(21),
    completedLessonIds: [
      "lesson_welcome_video",
      "lesson_values",
      "lesson_handbook",
      "lesson_security",
    ],
    completedAt: daysAgo(15),
  },
  {
    id: "enr_raj_sales",
    courseId: "course_sales",
    userId: "user_raj",
    status: "active",
    enrolledAt: daysAgo(12),
    completedLessonIds: ["lesson_discovery_calls"],
  },
];
