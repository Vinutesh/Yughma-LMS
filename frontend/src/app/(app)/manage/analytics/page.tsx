"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as analyticsApi from "@/lib/api/resources/analytics";
import { TrendLine } from "@/components/analytics/TrendLine";
import { StatusBarChart } from "@/components/analytics/StatusBarChart";

export default function AnalyticsPage() {
  // Analytics is the sit-down destination for trends — Reports' same
  // permission tier, distinct from the daily Dashboard glance.
  const canView = usePermission("reports", "view");
  if (!canView) return <AccessDenied title="Analytics" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-5 text-xl font-semibold text-text-primary">Analytics</h1>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Org Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="learners">Learners</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OrgOverviewTab />
        </TabsContent>
        <TabsContent value="courses">
          <CoursesTab />
        </TabsContent>
        <TabsContent value="learners">
          <LearnersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LowDataState() {
  return (
    <Card className="flex flex-col items-center gap-2 p-10 text-center">
      <p className="text-sm font-semibold text-text-primary">Not enough data yet</p>
      <p className="text-xs text-text-tertiary">
        Trends appear once your org has a few weeks of activity.
      </p>
    </Card>
  );
}

function OrgOverviewTab() {
  const org = useSessionStore((s) => s.session?.org);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "overview", org?.id],
    queryFn: () => analyticsApi.getOrgOverview(),
    enabled: !!org,
  });

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading...</p>;
  if (!data) return null;
  if (!data.hasEnoughData) return <LowDataState />;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums text-text-primary">{data.activeUsers}</p>
          <p className="text-xs text-text-tertiary">Active users</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums text-text-primary">{data.completions30d}</p>
          <p className="text-xs text-text-tertiary">Completions (30d)</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums text-text-primary">
            {data.avgDaysToComplete ?? "—"}
          </p>
          <p className="text-xs text-text-tertiary">Avg. days to complete</p>
        </Card>
      </div>

      <Card className="grid grid-cols-2 gap-6 p-5">
        <TrendLine points={data.activeUsersTrend} label="Active users over time" />
        <TrendLine points={data.completionsTrend} label="Completions over time" />
      </Card>
    </div>
  );
}

function CoursesTab() {
  const org = useSessionStore((s) => s.session?.org);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "courses", org?.id],
    queryFn: () => analyticsApi.getCourseAnalytics(),
    enabled: !!org,
  });

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading...</p>;
  if (!data || data.length === 0) return <LowDataState />;

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHead>
          <TableRow>
            <TableTh>Course</TableTh>
            <TableTh>Completion</TableTh>
            <TableTh>Engagement</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.courseId}>
              <TableTd>{row.courseTitle}</TableTd>
              <TableTd>{row.completionPercent}%</TableTd>
              <TableTd>
                <Badge
                  variant={
                    row.engagement === "High" ? "success" : row.engagement === "Medium" ? "warning" : "danger"
                  }
                >
                  {row.engagement}
                </Badge>
              </TableTd>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function LearnersTab() {
  const org = useSessionStore((s) => s.session?.org);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "learners", org?.id],
    queryFn: () => analyticsApi.getLearnerBands(),
    enabled: !!org,
  });

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading...</p>;
  if (!data) return null;
  const total = data.onTrack + data.atRisk + data.fallingBehind;
  if (total === 0) return <LowDataState />;

  return (
    <Card className="p-5">
      <p className="mb-4 text-xs font-semibold text-text-tertiary">Learners by progress band</p>
      <StatusBarChart
        segments={[
          { label: "On track", value: data.onTrack, tone: "success" },
          { label: "At risk", value: data.atRisk, tone: "warning" },
          { label: "Falling behind", value: data.fallingBehind, tone: "danger" },
        ]}
      />
    </Card>
  );
}
