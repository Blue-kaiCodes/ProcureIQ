import React from "react";
import { TimelineEvent } from "../types";
import { 
  FileText, 
  Send, 
  Eye, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  FileSpreadsheet, 
  Upload, 
  MessageSquare,
  ArrowRight
} from "lucide-react";

interface ActivityTimelineProps {
  timeline?: TimelineEvent[];
}

export default function ActivityTimeline({ timeline = [] }: ActivityTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 border-dashed rounded text-center text-xs text-gray-400 font-sans">
        No activities or lifecycle events registered yet for this requisition.
      </div>
    );
  }

  // Sort chronologically (oldest first)
  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const getEventIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("create")) return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    if (act.includes("submit")) return <Send className="w-3.5 h-3.5 text-indigo-500" />;
    if (act.includes("review") || act.includes("verify")) return <Eye className="w-3.5 h-3.5 text-blue-500" />;
    if (act.includes("revision") || act.includes("update") || act.includes("change")) return <RefreshCw className="w-3.5 h-3.5 text-amber-500" />;
    if (act.includes("approve")) return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (act.includes("reject")) return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
    if (act.includes("order") || act.includes("po")) return <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />;
    if (act.includes("upload") || act.includes("attach")) return <Upload className="w-3.5 h-3.5 text-teal-500" />;
    if (act.includes("comment") || act.includes("replied") || act.includes("discuss")) return <MessageSquare className="w-3.5 h-3.5 text-sky-500" />;
    if (act.includes("savings") || act.includes("swap") || act.includes("simulat") || act.includes("optimiz")) return <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />;
    return <ArrowRight className="w-3.5 h-3.5 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Chronological Requisition Timeline</h4>
        <span className="text-[10px] font-mono text-gray-400">{timeline.length} Recorded Steps</span>
      </div>

      <div className="relative border-l border-gray-200 ml-3 space-y-5 py-1">
        {sortedTimeline.map((event) => (
          <div key={event.id} className="relative pl-6 group">
            {/* Dot connector */}
            <span className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-3xs flex items-center justify-center transition-all group-hover:scale-105 group-hover:border-gray-400">
              {getEventIcon(event.action)}
            </span>

            {/* Content card */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-800">{event.user}</span>
                  <span className="text-gray-400 font-medium">({event.action})</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {new Date(event.date).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              
              {event.details && (
                <p className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 p-2 rounded-xs leading-relaxed">
                  {event.details}
                </p>
              )}

              {event.status && (
                <div className="flex items-center gap-1 text-[9px] text-gray-400 font-mono uppercase tracking-wider">
                  <span>New State:</span>
                  <span className="font-semibold text-[#714B67]">{event.status.replace("_", " ")}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
