"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ApiKeyRecord,
  Assignment,
  Asset,
  AssetFolder,
  CalendarEvent,
  CareerPath,
  Certificate,
  CertificateTemplate,
  ContentReport,
  Course,
  CourseModule,
  Enrollment,
  Integration,
  Invoice,
  LearningPath,
  LearningPlan,
  Lesson,
  LrsConnection,
  PathEnrollment,
  Post,
  SeatRequest,
  Skill,
  Submission,
  Thread,
  Webhook,
} from "@/types/domain";
import {
  MOCK_LEARNING_PLANS,
  MOCK_ASSETS,
  MOCK_ASSIGNMENTS,
  MOCK_CALENDAR_EVENTS,
  MOCK_CAREER_PATHS,
  MOCK_CERTIFICATES,
  MOCK_CERTIFICATE_TEMPLATES,
  MOCK_COURSES,
  MOCK_ENROLLMENTS,
  MOCK_FOLDERS,
  MOCK_LEARNING_PATHS,
  MOCK_LESSONS,
  MOCK_MODULES,
  MOCK_PATH_ENROLLMENTS,
  MOCK_SKILLS,
  MOCK_SUBMISSIONS,
  MOCK_THREADS,
  MOCK_POSTS,
} from "@/mock/learningFixtures";

/**
 * Learning-content half of the mock database — the counterpart to
 * directoryStore (org/users/roles). Split by boundary rather than kept in one
 * store so a Content Library write doesn't invalidate directory subscribers.
 */
interface LearningState {
  assets: Asset[];
  folders: AssetFolder[];
  courses: Course[];
  modules: CourseModule[];
  lessons: Lesson[];
  enrollments: Enrollment[];

  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addFolder: (folder: AssetFolder) => void;

  addCourse: (course: Course) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;

  addModule: (mod: CourseModule) => void;
  updateModule: (id: string, patch: Partial<CourseModule>) => void;
  deleteModule: (id: string) => void;

  addLesson: (lesson: Lesson) => void;
  updateLesson: (id: string, patch: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  reorderLessons: (moduleId: string, orderedIds: string[]) => void;

  addEnrollment: (enrollment: Enrollment) => void;
  updateEnrollment: (id: string, patch: Partial<Enrollment>) => void;
  deleteEnrollment: (id: string) => void;

  assignments: Assignment[];
  submissions: Submission[];
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (id: string, patch: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  addSubmission: (submission: Submission) => void;
  updateSubmission: (id: string, patch: Partial<Submission>) => void;

  skills: Skill[];
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, patch: Partial<Skill>) => void;

  certificateTemplates: CertificateTemplate[];
  certificates: Certificate[];
  addCertificateTemplate: (template: CertificateTemplate) => void;
  addCertificate: (certificate: Certificate) => void;
  updateCertificate: (id: string, patch: Partial<Certificate>) => void;

  paths: LearningPath[];
  pathEnrollments: PathEnrollment[];
  addPath: (path: LearningPath) => void;
  updatePath: (id: string, patch: Partial<LearningPath>) => void;
  deletePath: (id: string) => void;
  addPathEnrollment: (enrollment: PathEnrollment) => void;
  updatePathEnrollment: (id: string, patch: Partial<PathEnrollment>) => void;

  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: CalendarEvent) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  careerPaths: CareerPath[];
  addCareerPath: (path: CareerPath) => void;
  updateCareerPath: (id: string, patch: Partial<CareerPath>) => void;
  deleteCareerPath: (id: string) => void;

  learningPlans: LearningPlan[];
  addLearningPlan: (plan: LearningPlan) => void;
  updateLearningPlan: (id: string, patch: Partial<LearningPlan>) => void;
  deleteLearningPlan: (id: string) => void;

  lrsConnections: LrsConnection[];
  saveLrsConnection: (connection: LrsConnection) => void;

  integrations: Integration[];
  upsertIntegration: (integration: Integration) => void;

  webhooks: Webhook[];
  addWebhook: (webhook: Webhook) => void;
  deleteWebhook: (id: string) => void;

  apiKeys: ApiKeyRecord[];
  addApiKey: (key: ApiKeyRecord) => void;
  revokeApiKey: (id: string) => void;

  invoices: Invoice[];
  seatRequests: SeatRequest[];
  addSeatRequest: (request: SeatRequest) => void;

  threads: Thread[];
  posts: Post[];
  contentReports: ContentReport[];
  addThread: (thread: Thread) => void;
  updateThread: (id: string, patch: Partial<Thread>) => void;
  deleteThread: (id: string) => void;
  addPost: (post: Post) => void;
  deletePost: (id: string) => void;
  addContentReport: (report: ContentReport) => void;
  resolveContentReport: (id: string) => void;
}

/** The seeded data half of the store, separate from the actions so a version
 * bump can reseed it wholesale (see `migrate` below). */
const SEED = {
  assets: MOCK_ASSETS,
  folders: MOCK_FOLDERS,
  courses: MOCK_COURSES,
  modules: MOCK_MODULES,
  lessons: MOCK_LESSONS,
  enrollments: MOCK_ENROLLMENTS,
  assignments: MOCK_ASSIGNMENTS,
  submissions: MOCK_SUBMISSIONS,
  skills: MOCK_SKILLS,
  certificateTemplates: MOCK_CERTIFICATE_TEMPLATES,
  certificates: MOCK_CERTIFICATES,
  paths: MOCK_LEARNING_PATHS,
  pathEnrollments: MOCK_PATH_ENROLLMENTS,
  calendarEvents: MOCK_CALENDAR_EVENTS,
  careerPaths: MOCK_CAREER_PATHS,
  learningPlans: MOCK_LEARNING_PLANS,
  lrsConnections: [] as LrsConnection[],
  integrations: [] as Integration[],
  webhooks: [] as Webhook[],
  apiKeys: [] as ApiKeyRecord[],
  invoices: [] as Invoice[],
  seatRequests: [] as SeatRequest[],
  threads: MOCK_THREADS,
  posts: MOCK_POSTS,
  contentReports: [] as ContentReport[],
};

export const useLearningStore = create<LearningState>()(
  persist(
    (set) => ({
      ...SEED,

      addAsset: (asset) => set((s) => ({ assets: [asset, ...s.assets] })),
      updateAsset: (id, patch) =>
        set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
      addFolder: (folder) => set((s) => ({ folders: [...s.folders, folder] })),

      addCourse: (course) => set((s) => ({ courses: [course, ...s.courses] })),
      updateCourse: (id, patch) =>
        set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCourse: (id) =>
        set((s) => ({
          courses: s.courses.filter((c) => c.id !== id),
          modules: s.modules.filter((m) => m.courseId !== id),
          lessons: s.lessons.filter((l) => l.courseId !== id),
          enrollments: s.enrollments.filter((e) => e.courseId !== id),
        })),

      addModule: (mod) => set((s) => ({ modules: [...s.modules, mod] })),
      updateModule: (id, patch) =>
        set((s) => ({ modules: s.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      deleteModule: (id) =>
        set((s) => ({
          modules: s.modules.filter((m) => m.id !== id),
          lessons: s.lessons.filter((l) => l.moduleId !== id),
        })),

      addLesson: (lesson) => set((s) => ({ lessons: [...s.lessons, lesson] })),
      updateLesson: (id, patch) =>
        set((s) => ({ lessons: s.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      deleteLesson: (id) => set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) })),
      reorderLessons: (moduleId, orderedIds) =>
        set((s) => ({
          lessons: s.lessons.map((l) =>
            l.moduleId === moduleId && orderedIds.includes(l.id)
              ? { ...l, order: orderedIds.indexOf(l.id) }
              : l,
          ),
        })),

      addEnrollment: (enrollment) => set((s) => ({ enrollments: [...s.enrollments, enrollment] })),
      updateEnrollment: (id, patch) =>
        set((s) => ({
          enrollments: s.enrollments.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEnrollment: (id) =>
        set((s) => ({ enrollments: s.enrollments.filter((e) => e.id !== id) })),

      addAssignment: (assignment) => set((s) => ({ assignments: [assignment, ...s.assignments] })),
      updateAssignment: (id, patch) =>
        set((s) => ({
          assignments: s.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      deleteAssignment: (id) =>
        set((s) => ({
          assignments: s.assignments.filter((a) => a.id !== id),
          submissions: s.submissions.filter((sub) => sub.assignmentId !== id),
        })),
      addSubmission: (submission) => set((s) => ({ submissions: [...s.submissions, submission] })),
      updateSubmission: (id, patch) =>
        set((s) => ({
          submissions: s.submissions.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)),
        })),

      addSkill: (skill) => set((s) => ({ skills: [...s.skills, skill] })),
      updateSkill: (id, patch) =>
        set((s) => ({ skills: s.skills.map((sk) => (sk.id === id ? { ...sk, ...patch } : sk)) })),

      addCertificateTemplate: (template) =>
        set((s) => ({ certificateTemplates: [...s.certificateTemplates, template] })),
      addCertificate: (certificate) =>
        set((s) => ({ certificates: [certificate, ...s.certificates] })),
      updateCertificate: (id, patch) =>
        set((s) => ({
          certificates: s.certificates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      addPath: (path) => set((s) => ({ paths: [path, ...s.paths] })),
      updatePath: (id, patch) =>
        set((s) => ({ paths: s.paths.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePath: (id) =>
        set((s) => ({
          paths: s.paths.filter((p) => p.id !== id),
          pathEnrollments: s.pathEnrollments.filter((e) => e.pathId !== id),
        })),
      addPathEnrollment: (enrollment) =>
        set((s) => ({ pathEnrollments: [...s.pathEnrollments, enrollment] })),
      updatePathEnrollment: (id, patch) =>
        set((s) => ({
          pathEnrollments: s.pathEnrollments.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      addCalendarEvent: (event) => set((s) => ({ calendarEvents: [...s.calendarEvents, event] })),
      updateCalendarEvent: (id, patch) =>
        set((s) => ({
          calendarEvents: s.calendarEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteCalendarEvent: (id) =>
        set((s) => ({ calendarEvents: s.calendarEvents.filter((e) => e.id !== id) })),

      addCareerPath: (path) => set((s) => ({ careerPaths: [path, ...s.careerPaths] })),
      updateCareerPath: (id, patch) =>
        set((s) => ({
          careerPaths: s.careerPaths.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteCareerPath: (id) =>
        set((s) => ({ careerPaths: s.careerPaths.filter((p) => p.id !== id) })),

      addLearningPlan: (plan) => set((s) => ({ learningPlans: [plan, ...s.learningPlans] })),
      updateLearningPlan: (id, patch) =>
        set((s) => ({ learningPlans: s.learningPlans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteLearningPlan: (id) => set((s) => ({ learningPlans: s.learningPlans.filter((p) => p.id !== id) })),

      saveLrsConnection: (connection) =>
        set((s) => ({
          lrsConnections: [
            connection,
            ...s.lrsConnections.filter((c) => c.orgId !== connection.orgId),
          ],
        })),

      upsertIntegration: (integration) =>
        set((s) => ({
          integrations: [
            integration,
            ...s.integrations.filter((i) => !(i.orgId === integration.orgId && i.kind === integration.kind)),
          ],
        })),

      addWebhook: (webhook) => set((s) => ({ webhooks: [webhook, ...s.webhooks] })),
      deleteWebhook: (id) => set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),

      addApiKey: (key) => set((s) => ({ apiKeys: [key, ...s.apiKeys] })),
      revokeApiKey: (id) =>
        set((s) => ({ apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, revoked: true } : k)) })),

      addSeatRequest: (request) => set((s) => ({ seatRequests: [request, ...s.seatRequests] })),

      addThread: (thread) => set((s) => ({ threads: [thread, ...s.threads] })),
      updateThread: (id, patch) =>
        set((s) => ({ threads: s.threads.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteThread: (id) =>
        set((s) => ({
          threads: s.threads.filter((t) => t.id !== id),
          posts: s.posts.filter((p) => p.threadId !== id),
        })),
      addPost: (post) => set((s) => ({ posts: [...s.posts, post] })),
      deletePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
      addContentReport: (report) => set((s) => ({ contentReports: [report, ...s.contentReports] })),
      resolveContentReport: (id) =>
        set((s) => ({
          contentReports: s.contentReports.map((r) => (r.id === id ? { ...r, resolved: true } : r)),
        })),
    }),
    {
      name: "yughma-learning",
      version: 4,
      /**
       * Each phase adds new required top-level arrays and fields (v2: skills/
       * certificates/paths; v3: calendar events/career paths/academies; v4:
       * billing/SCORM/integrations/communities), so an older payload would
       * hydrate missing them. This store is a development stand-in for a
       * backend rather than real user data, so reseeding from fixtures beats
       * hand-migrating it.
       */
      migrate: () => SEED,
    },
  ),
);
