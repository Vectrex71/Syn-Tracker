/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  Sparkles, 
  LogIn, 
  Loader2,
  Clock,
  Award,
  Heart,
  ChevronUp
} from 'lucide-react';
import { 
  PublishedTrack, 
  TrackComment, 
  subscribeTrackComments, 
  addTrackComment, 
  deleteTrackComment, 
  MusicianProfile 
} from '../lib/firebase';

interface TrackCommentsDrawerProps {
  track: PublishedTrack;
  currentUserProfile: MusicianProfile | null;
  onOpenAuth?: () => void;
  onSelectAuthor?: (username: string) => void;
  onClose?: () => void;
  onCommentCountChange?: (trackId: string, newCount: number) => void;
}

export const TrackCommentsDrawer: React.FC<TrackCommentsDrawerProps> = ({
  track,
  currentUserProfile,
  onOpenAuth,
  onSelectAuthor,
  onClose,
  onCommentCountChange
}) => {
  const [comments, setComments] = useState<TrackComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeTrackComments(track.id, (loadedComments) => {
      setComments(loadedComments);
      setLoading(false);
      if (onCommentCountChange) {
        onCommentCountChange(track.id, loadedComments.length);
      }
    });

    return () => unsubscribe();
  }, [track.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const text = newCommentText.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await addTrackComment(track.id, currentUserProfile, text, comments.length);
      setNewCommentText('');
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      setError(err.message || 'Failed to submit comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteTrackComment(track.id, commentId, comments.length);
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
    }
  };

  const formatTimestamp = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="mt-3 pt-3 border-t border-slate-800/90 overflow-hidden"
    >
      <div className="bg-[#080d16]/90 rounded-xl p-3.5 sm:p-4 border border-slate-800/80 shadow-inner">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Community Comments
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
              {comments.length}
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 hover:border-slate-600 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-medium group active:scale-95 shadow-sm"
              title="Collapse comments"
            >
              <ChevronUp className="w-3.5 h-3.5 text-sky-400 group-hover:-translate-y-0.5 transition-transform" />
              <span>Collapse</span>
            </button>
          )}
        </div>

        {/* Comment list */}
        <div className="mt-3 max-h-72 overflow-y-auto space-y-2.5 pr-1 text-xs">
          {loading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-slate-400 font-mono text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-6 text-center text-slate-500 font-mono text-xs">
              <p>No comments yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Be the first to leave feedback on this track!</p>
            </div>
          ) : (
            comments.map((c) => {
              const isOwner = currentUserProfile?.uid === c.authorUid;
              return (
                <div
                  key={c.id}
                  className="group relative p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      <button
                        type="button"
                        onClick={() => c.authorUsername && onSelectAuthor?.(c.authorUsername)}
                        className="relative shrink-0 cursor-pointer"
                        title={c.authorName}
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 border border-slate-700">
                          {c.authorAvatarUrl ? (
                            <img src={c.authorAvatarUrl} alt={c.authorName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono font-bold text-[10px] text-sky-300">
                              {c.authorName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {c.authorIsSupporter && (
                          <div 
                            className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#1c1404] border border-amber-400 shadow-md flex items-center justify-center"
                            title="Gold VIP Supporter"
                          >
                            <Award className="w-2 h-2 text-amber-400 fill-amber-400 drop-shadow-sm" />
                          </div>
                        )}
                      </button>

                      {/* Author Name */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => c.authorUsername && onSelectAuthor?.(c.authorUsername)}
                          className="font-bold text-slate-200 hover:text-sky-300 transition-colors cursor-pointer text-xs"
                        >
                          {c.authorName}
                        </button>

                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          • <Clock className="w-2.5 h-2.5" /> {formatTimestamp(c.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Delete button for author */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Comment Text */}
                  <p className="mt-1.5 text-slate-300 whitespace-pre-wrap leading-relaxed pl-8">
                    {c.content}
                  </p>
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input Form or Login Prompt */}
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          {currentUserProfile ? (
            <form onSubmit={handleSubmit} className="space-y-2">
              {error && (
                <div className="text-[11px] text-rose-400 font-mono bg-rose-950/40 p-1.5 rounded-lg border border-rose-800/40">
                  {error}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Write a comment (Press Enter to send)..."
                    rows={2}
                    maxLength={600}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-sky-500 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none resize-none transition-colors"
                  />
                  <div className="absolute right-2.5 bottom-2 text-[10px] font-mono text-slate-600 pointer-events-none">
                    {newCommentText.length}/600
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newCommentText.trim() || isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold font-mono transition-all shadow-md shadow-sky-950/50 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Post</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400 font-mono">
                Want to leave a comment or feedback?
              </p>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 hover:border-sky-400/50 text-sky-300 text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Collapse Bar for fast closing without scrolling back up */}
        {onClose && (
          <div className="mt-3 pt-2.5 flex items-center justify-center border-t border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg hover:bg-slate-800/70 text-slate-400 hover:text-sky-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Collapse comments"
            >
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Collapse comments</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
