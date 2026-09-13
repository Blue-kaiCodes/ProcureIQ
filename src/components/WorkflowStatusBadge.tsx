import React from "react";
import { RequestStatus } from "../types";

interface WorkflowStatusBadgeProps {
  status: RequestStatus | string;
  className?: string;
}

export default function WorkflowStatusBadge({ status, className = "" }: WorkflowStatusBadgeProps) {
  const normalizedStatus = typeof status === "string" ? status.toLowerCase() : "";

  let bgClass = "bg-gray-100 text-gray-700 border-gray-200";
  let label = "Draft";

  switch (normalizedStatus) {
    case "draft":
      bgClass = "bg-slate-100 text-slate-700 border-slate-200/80";
      label = "Draft";
      break;
    case "submitted":
      bgClass = "bg-indigo-50 text-indigo-700 border-indigo-100";
      label = "Submitted";
      break;
    case "under_review":
      bgClass = "bg-blue-50 text-blue-700 border-blue-100 animate-pulse";
      label = "Under Review";
      break;
    case "needs_revision":
      bgClass = "bg-amber-50 text-amber-800 border-amber-200";
      label = "Needs Revision";
      break;
    case "approved":
      bgClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
      label = "Approved";
      break;
    case "rejected":
      bgClass = "bg-rose-50 text-rose-700 border-rose-100";
      label = "Rejected";
      break;
    case "po_created":
      bgClass = "bg-purple-50 text-purple-700 border-purple-100";
      label = "PO Created";
      break;
    case "completed":
      bgClass = "bg-teal-50 text-teal-700 border-teal-100";
      label = "Completed";
      break;
    default:
      bgClass = "bg-gray-50 text-gray-600 border-gray-200";
      label = status;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border rounded-sm tracking-wide capitalize ${bgClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
      {label}
    </span>
  );
}
