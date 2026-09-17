import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/** Standard search box for a client-side-filtered list — icon + input,
 * consistent across every page that offers one (see the pages under
 * `frontend/src/app/(app)/` with a "Search..." field). */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label": string;
  className?: string;
}) {
  return (
    <div className={cn("relative max-w-64", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
      <Input
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}
