import { Briefcase, DollarSign, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface JobMetaChipsProps {
  type: string;
  location: string;
  compensation: string;
  className?: string;
}

export function JobMetaChips({ type, location, compensation, className }: JobMetaChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Badge variant="secondary">
        <Briefcase className="h-3.5 w-3.5" />
        {type}
      </Badge>
      <Badge variant="secondary">
        <MapPin className="h-3.5 w-3.5" />
        {location}
      </Badge>
      <Badge variant="accent">
        <DollarSign className="h-3.5 w-3.5" />
        {compensation}
      </Badge>
    </div>
  );
}
