import React, { useState } from "react";
import { Comment } from "../types";
import { MessageSquare, CornerDownRight, Reply, Send, User } from "lucide-react";
import { customFetch as fetch } from "../lib/api";

interface CollaborationCommentsProps {
  requestId: string;
  comments?: Comment[];
  activeUser: string;
  activeRole: string;
  onCommentAdded: () => Promise<void>;
}

export default function CollaborationComments({
  requestId,
  comments = [],
  activeUser,
  activeRole,
  onCommentAdded,
}: CollaborationCommentsProps) {
  const [newCommentText, setNewCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group comments into root comments and their replies
  const rootComments = comments.filter((c) => !c.parentId);
  const getRepliesForId = (parentId: string) => {
    return comments.filter((c) => c.parentId === parentId);
  };

  const handlePostComment = async (text: string, parentId?: string) => {
    if (!text.trim()) return;
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/requests/${requestId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: activeUser,
          role: activeRole,
          text: text,
          parentId: parentId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (parentId) {
          setReplyText("");
          setReplyingToId(null);
        } else {
          setNewCommentText("");
        }
        await onCommentAdded();
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarBgClass = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes("director") || r.includes("head") || r.includes("manager")) {
      return "bg-purple-600 text-white";
    }
    if (r.includes("officer") || r.includes("auditor")) {
      return "bg-teal-600 text-white";
    }
    if (r.includes("system") || r.includes("engine")) {
      return "bg-emerald-600 text-white font-bold";
    }
    return "bg-gray-500 text-white";
  };

  const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`p-3 rounded border text-xs leading-relaxed transition-colors duration-150 bg-white ${
      isReply ? "border-indigo-100 bg-indigo-50/10 ml-6" : "border-gray-200 hover:border-gray-300"
    }`}>
      <div className="flex items-start gap-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold tracking-tight shrink-0 shadow-3xs ${getAvatarBgClass(comment.role)}`}>
          {getUserInitials(comment.author)}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-bold text-gray-900">{comment.author}</span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase font-mono px-1.5 py-0.2 bg-gray-100 border border-gray-200/50 rounded-xs">
                {comment.role}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono shrink-0">
              {new Date(comment.timestamp).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>

          <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>

          {!isReply && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setReplyingToId(replyingToId === comment.id ? null : comment.id);
                  setReplyText("");
                }}
                className="inline-flex items-center gap-1 text-[10px] text-[#714B67] hover:text-[#5f3f56] font-bold"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            </div>
          )}

          {/* Reply input field inside card */}
          {replyingToId === comment.id && (
            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2.5">
              <CornerDownRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder={`Reply to ${comment.author}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePostComment(replyText, comment.id);
                }}
                className="flex-1 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:bg-white text-xs"
                disabled={isSubmitting}
              />
              <button
                onClick={() => handlePostComment(replyText, comment.id)}
                disabled={isSubmitting || !replyText.trim()}
                className="p-1.5 bg-[#714B67] hover:bg-[#5f3f56] disabled:opacity-40 text-white rounded cursor-pointer"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          Internal Discussion & Collaboration Feed
        </h4>
        <span className="text-[10px] font-mono text-gray-400">{comments.length} Comments</span>
      </div>

      {/* Discussion List */}
      <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
        {rootComments.length === 0 ? (
          <div className="py-6 bg-gray-50/50 border border-gray-200 border-dashed rounded text-center text-xs text-gray-400">
            No discussion notes posted yet. Start the thread below.
          </div>
        ) : (
          rootComments.map((rootComment) => (
            <div key={rootComment.id} className="space-y-2">
              <CommentCard comment={rootComment} />
              {getRepliesForId(rootComment.id).map((reply) => (
                <div key={reply.id}>
                  <CommentCard comment={reply} isReply={true} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Main Comment Box */}
      <div className="pt-2">
        <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded p-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarBgClass(activeRole)}`}>
            {getUserInitials(activeUser)}
          </div>
          <div className="flex-1 min-w-0 space-y-2.5">
            <textarea
              rows={2}
              placeholder="Post a new internal comment, request details or log verification notes..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:outline-none focus:border-[#714B67]"
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center text-[10px] text-gray-400">
              <span>Posting as <span className="font-bold text-gray-600">{activeUser}</span> ({activeRole})</span>
              <button
                onClick={() => handlePostComment(newCommentText)}
                disabled={isSubmitting || !newCommentText.trim()}
                className="inline-flex items-center gap-1 bg-[#714B67] hover:bg-[#5f3f56] disabled:opacity-50 text-white font-bold px-3 py-1 rounded cursor-pointer"
              >
                <Send className="w-3 h-3" />
                Add Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
