"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import { usePermission } from "@/hooks/usePermission";
import * as calendarApi from "@/lib/api/resources/calendar";
import type { CalendarItem } from "@/lib/api/resources/calendar";
import { ApiError } from "@/lib/api/errors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const session = useSessionStore((s) => s.session);
  const canCreateEvents = usePermission("courses", "edit");
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["calendar", session?.org.id, session?.user.id, canCreateEvents],
    queryFn: () => calendarApi.listMyCalendar(),
    enabled: !!session,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["calendar"] });

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = new Date(item.at).toDateString();
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  const days = useMemo(() => daysInGrid(cursor), [cursor]);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Calendar</h1>
        {canCreateEvents && <Button onClick={() => setAddOpen(true)}>+ Add event</Button>}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous month"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="rounded-md p-1.5 text-text-secondary hover:bg-surface-alt"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded-md p-1.5 text-text-secondary hover:bg-surface-alt"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <span className="text-sm font-semibold text-text-primary">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setCursor(startOfMonth(new Date()))}>
          Today
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading calendar...</p>
      ) : (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-surface-alt px-2 py-1.5 text-center text-[11px] font-semibold text-text-tertiary">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = day.date.toDateString();
            const dayItems = byDay.get(key) ?? [];
            const inMonth = day.date.getMonth() === cursor.getMonth();
            const isToday = key === new Date().toDateString();
            return (
              <div
                key={key}
                className={
                  "flex min-h-24 flex-col gap-1 bg-surface p-1.5 " + (inMonth ? "" : "bg-canvas")
                }
              >
                <span
                  className={
                    "self-start rounded px-1 text-[11px] font-semibold tabular-nums " +
                    (isToday
                      ? "bg-accent text-accent-fg"
                      : inMonth
                        ? "text-text-secondary"
                        : "text-text-tertiary/50")
                  }
                >
                  {day.date.getDate()}
                </span>
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={
                      "truncate rounded px-1 py-0.5 text-left text-[11px] font-medium " +
                      (item.kind === "manual"
                        ? "bg-accent-soft text-accent-soft-fg"
                        : "bg-warning-bg text-warning")
                    }
                  >
                    ● {item.title}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[10px] text-text-tertiary">+{dayItems.length - 3} more</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EventDetailDialog
        item={selected}
        canManage={canCreateEvents}
        onClose={() => setSelected(null)}
        onChanged={invalidate}
      />
      <AddEventDialog open={addOpen} onOpenChange={setAddOpen} onAdded={invalidate} />
    </div>
  );
}

function EventDetailDialog({
  item,
  canManage,
  onClose,
  onChanged,
}: {
  item: CalendarItem | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();

  const remove = useMutation({
    mutationFn: (eventId: string) => calendarApi.deleteEvent(eventId),
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  if (!item) return null;
  const isManual = item.kind === "manual";

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          <p>
            {item.courseTitle ? `${item.courseTitle} · ` : ""}
            {new Date(item.at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: isManual ? "numeric" : undefined,
              minute: isManual ? "2-digit" : undefined,
            })}
          </p>
          {item.description && <p className="text-text-secondary">{item.description}</p>}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-accent hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {item.link}
            </a>
          )}
        </div>
        <DialogFooter>
          {isManual && canManage ? (
            <Button
              variant="destructive"
              loading={remove.isPending}
              onClick={() => item.eventId && remove.mutate(item.eventId)}
            >
              Delete
            </Button>
          ) : (
            item.targetUrl && (
              <Button
                onClick={() => {
                  onClose();
                  router.push(item.targetUrl!);
                }}
              >
                {item.kind === "deadline" ? "Go to assignment →" : "Go to assessment →"}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEventDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      calendarApi.createEvent({
        title,
        startsAt: new Date(when).toISOString(),
        link: link || undefined,
        description: description || undefined,
      }),
    onSuccess: () => {
      setError(null);
      setTitle("");
      setWhen("");
      setLink("");
      setDescription("");
      onAdded();
      onOpenChange(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add event</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-when">Date/time</Label>
              <Input id="ev-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-link">Link (optional)</Label>
              <Input
                id="ev-link"
                placeholder="meet.google.com/..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-desc">Description</Label>
            <textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || !when}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Add event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Full 6-row grid so week rows never shift height month to month; leading/
 * trailing days from adjacent months fill the gaps, dimmed. */
function daysInGrid(monthStart: Date) {
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return { date };
  });
}
