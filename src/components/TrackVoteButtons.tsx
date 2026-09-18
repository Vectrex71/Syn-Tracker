/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Flame } from 'lucide-react';
import { voteOnTrack } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface TrackVoteButtonsProps {
  trackId: string;
  initialScore?: number;
  initialUpvotes?: number;
  initialDownvotes?: number;
  compact?: boolean;
}

const VOTES_STORAGE_KEY = 'syn_tracker_votes_v1';

export const TrackVoteButtons: React.FC<TrackVoteButtonsProps> = ({
  trackId,
  initialScore = 0,
  initialUpvotes = 0,
  initialDownvotes = 0,
  compact = false,
}) => {
  const { currentUser } = useAuth();
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [score, setScore] = useState<number>(initialScore);
  const [upvotes, setUpvotes] = useState<number>(initialUpvotes);
  const [downvotes, setDownvotes] = useState<number>(initialDownvotes);
  const [isVoting, setIsVoting] = useState(false);

  // Sync with initial props
  useEffect(() => {
    setScore(initialScore);
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
  }, [initialScore, initialUpvotes, initialDownvotes]);

  // Load vote state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VOTES_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored && stored[trackId]) {
          setUserVote(stored[trackId]);
        }
      }
    } catch {
      // Ignore
    }
  }, [trackId]);

  const handleVote = async (type: 'up' | 'down') => {
    if (isVoting) return;

    const previousVote = userVote || 'none';
    const targetVote = userVote === type ? 'none' : type;

    // Optimistic calculation
    let upDelta = 0;
    let downDelta = 0;

    if (previousVote === 'up') upDelta -= 1;
    if (previousVote === 'down') downDelta -= 1;

    if (targetVote === 'up') upDelta += 1;
    if (targetVote === 'down') downDelta += 1;

    const newUp = Math.max(0, upvotes + upDelta);
    const newDown = Math.max(0, downvotes + downDelta);
    const newScore = newUp - newDown;

    setUserVote(targetVote === 'none' ? null : targetVote);
    setUpvotes(newUp);
    setDownvotes(newDown);
    setScore(newScore);

    // Save to localStorage
    try {
      const raw = localStorage.getItem(VOTES_STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      if (targetVote === 'none') {
        delete stored[trackId];
      } else {
        stored[trackId] = targetVote;
      }
      localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Ignore
    }

    setIsVoting(true);
    try {
      await voteOnTrack(trackId, targetVote, previousVote, currentUser?.uid);
    } catch (err) {
      console.error('Failed to vote on track:', err);
    } finally {
      setIsVoting(false);
    }
  };

  const isUpvoted = userVote === 'up';
  const isDownvoted = userVote === 'down';

  const scoreColor =
    score > 0
      ? 'text-emerald-400 font-bold'
      : score < 0
      ? 'text-rose-400 font-bold'
      : 'text-slate-400 font-medium';

  if (compact) {
    return (
      <div className="inline-flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => handleVote('up')}
          className={`p-1 rounded transition-all cursor-pointer ${
            isUpvoted
              ? 'bg-emerald-500/30 text-emerald-300'
              : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
          }`}
          title={isUpvoted ? 'Remove upvote' : 'Upvote track'}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        <span className={`px-1 text-xs font-mono select-none ${scoreColor}`}>
          {score > 0 ? `+${score}` : score}
        </span>

        <button
          type="button"
          onClick={() => handleVote('down')}
          className={`p-1 rounded transition-all cursor-pointer ${
            isDownvoted
              ? 'bg-rose-500/30 text-rose-300'
              : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
          }`}
          title={isDownvoted ? 'Remove downvote' : 'Downvote track'}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-slate-900/70 backdrop-blur-sm border border-slate-700/70 rounded-xl p-1 shadow-sm select-none shrink-0 min-w-[38px]">
      <button
        type="button"
        onClick={() => handleVote('up')}
        className={`p-1 rounded-lg transition-all cursor-pointer active:scale-90 ${
          isUpvoted
            ? 'bg-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-500/20'
            : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80'
        }`}
        title={isUpvoted ? 'Remove upvote' : 'Upvote track'}
      >
        <ChevronUp className="w-4 h-4 stroke-[2.5]" />
      </button>

      <span className={`text-xs font-mono my-0.5 tracking-tight ${scoreColor}`}>
        {score > 0 ? `+${score}` : score}
      </span>

      <button
        type="button"
        onClick={() => handleVote('down')}
        className={`p-1 rounded-lg transition-all cursor-pointer active:scale-90 ${
          isDownvoted
            ? 'bg-rose-500/30 text-rose-300 shadow-sm shadow-rose-500/20'
            : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/80'
        }`}
        title={isDownvoted ? 'Remove downvote' : 'Downvote track'}
      >
        <ChevronDown className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
