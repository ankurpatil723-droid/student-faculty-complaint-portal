'use client';

import React, { useState } from 'react';
import type { AIIntelligenceData, CategoryType, Priority } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Copy,
  CheckCircle2,
  Layers,
  Building,
  TrendingUp,
  Brain,
  Info,
  ArrowRight,
  Clock,
  UserCheck
} from 'lucide-react';

interface AIIntelligencePanelProps {
  complaintId?: string;
  aiData?: AIIntelligenceData;
  currentCategory: CategoryType;
  currentPriority: Priority;
  currentDepartment: string;
  onApplySuggestions?: (newCategory: CategoryType, newPriority: Priority, newDept: string) => void;
  onAdoptResponse?: (responseDraft: string) => void;
  onExecuteAction?: (actionPlan: string) => void;
  onMergeDuplicate?: (targetComplaintId: string) => void;
}

export const AIIntelligencePanel: React.FC<AIIntelligencePanelProps> = ({
  complaintId,
  aiData,
  currentCategory,
  currentPriority,
  currentDepartment,
  onApplySuggestions,
  onAdoptResponse,
  onExecuteAction,
  onMergeDuplicate,
}) => {
  const [appliedBadge, setAppliedBadge] = useState(false);
  const [adoptedBadge, setAdoptedBadge] = useState(false);
  const [actionModal, setActionModal] = useState(false);
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [mergedIds, setMergedIds] = useState<string[]>([]);
  const [mergeMsg, setMergeMsg] = useState<string | null>(null);

  if (!aiData) {
    return (
      <Card className="border-slate-800 bg-slate-950/80">
        <CardContent className="p-4 flex items-center gap-3 text-slate-400 text-xs">
          <Brain className="h-5 w-5 text-blue-400 animate-pulse" />
          <span>Generating AI Intelligence Insights…</span>
        </CardContent>
      </Card>
    );
  }

  const {
    suggestedCategory,
    suggestedPriority,
    suggestedDepartment,
    summary,
    duplicateMatches,
    sentimentSignal,
    suggestedResponse,
    suggestedResolutionAction,
    confidence,
    metadata,
  } = aiData;

  const urgencyColor =
    sentimentSignal.urgencyLevel === 'CRITICAL'
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
      : sentimentSignal.urgencyLevel === 'HIGH'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-blue-400 bg-blue-500/10 border-blue-500/30';

  const handleApply = () => {
    if (onApplySuggestions) {
      onApplySuggestions(suggestedCategory, suggestedPriority, suggestedDepartment);
    }
    setAppliedBadge(true);
    setTimeout(() => setAppliedBadge(false), 3500);
  };

  const handleAdopt = () => {
    if (onAdoptResponse) {
      onAdoptResponse(suggestedResponse);
    }
    setAdoptedBadge(true);
    setTimeout(() => setAdoptedBadge(false), 3500);
  };

  return (
    <Card className="border-blue-500/30 bg-slate-950/90 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

      {/* Header */}
      <CardHeader className="border-b border-slate-900 pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 shadow-md">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              AI Complaint Intelligence
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 font-semibold">
                {metadata.model}
              </span>
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Analyzed {new Date(metadata.timestamp).toLocaleTimeString()}</span>
              <span>·</span>
              <span className="text-emerald-400 font-medium">{Math.round(confidence.overallConfidence * 100)}% Confidence</span>
            </p>
          </div>
        </div>

        {/* Human-in-the-Loop Guard Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4" />
          <span>Human Approval Required</span>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* 1. Executive Summary */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-blue-400">
              <FileText className="h-4 w-4" /> AI Executive Summary
            </span>
            <span className="text-[10px] font-mono text-slate-500">Processed in {metadata.processingTimeMs}ms</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-200">{summary}</p>
        </div>

        {/* 2. Urgency & Sentiment Signals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl border text-xs space-y-1 ${urgencyColor}`}>
            <span className="font-semibold text-slate-300 block mb-1">Sentiment & Urgency Signal</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm uppercase tracking-wider">{sentimentSignal.urgencyLevel} URGENCY</span>
              <span className="font-mono text-[11px]">Score: {sentimentSignal.sentimentScore}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-800/60">
              {sentimentSignal.riskFlags.map((flag, idx) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-medium">
                  ⚠️ {flag}
                </span>
              ))}
            </div>
          </div>

          {/* Duplicate Complaint Detection */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Duplicate Grievance Detection</span>
              <span className="text-[10px] text-slate-500">{duplicateMatches.length} Matches</span>
            </div>
            {mergeMsg && (
              <p className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                ✓ {mergeMsg}
              </p>
            )}
            {duplicateMatches.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-1">✓ No active duplicate complaints detected.</p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {duplicateMatches.map((dup) => {
                  const isMerged = mergedIds.includes(dup.complaintId);
                  return (
                    <div
                      key={dup.complaintId}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] gap-2"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-blue-400 font-semibold shrink-0">{dup.complaintId}</span>
                        <span className="text-slate-300 truncate max-w-[130px]">{dup.title}</span>
                        <span className="text-amber-400 font-bold shrink-0">{dup.similarityScore}% Match</span>
                      </div>
                      {isMerged ? (
                        <span className="text-[10px] text-emerald-400 font-semibold shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Merged
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mergingId === dup.complaintId}
                          onClick={async () => {
                            if (onMergeDuplicate) {
                              onMergeDuplicate(dup.complaintId);
                              setMergedIds((prev) => [...prev, dup.complaintId]);
                              return;
                            }
                            if (!complaintId) return;
                            setMergingId(dup.complaintId);
                            try {
                              const res = await fetch(`/api/complaints/${complaintId}/merge`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ targetId: dup.complaintId }),
                              });
                              if (res.ok) {
                                setMergedIds((prev) => [...prev, dup.complaintId]);
                                setMergeMsg(`Merged into ${dup.complaintId}`);
                              }
                            } catch (e) {
                              console.error('Failed to merge', e);
                            } finally {
                              setMergingId(null);
                            }
                          }}
                          className="h-6 px-2 text-[10px] border-slate-700 hover:bg-slate-800 hover:text-white shrink-0"
                        >
                          {mergingId === dup.complaintId ? 'Merging...' : 'Merge Duplicate'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. AI Category, Priority & Department Suggestions */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" /> AI Classification Suggestions
            </span>
            {appliedBadge ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approved & Applied!
              </span>
            ) : (
              <Button size="sm" onClick={handleApply} className="bg-blue-600 hover:bg-blue-500 text-xs gap-1.5 h-7 px-3">
                <UserCheck className="h-3.5 w-3.5" /> Approve & Apply AI Suggestions
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 block mb-0.5">Category</span>
              <div className="font-semibold text-white truncate">{suggestedCategory}</div>
              <span className="text-[10px] text-slate-500">Current: {currentCategory}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 block mb-0.5">Priority</span>
              <div className="font-semibold text-amber-400">{suggestedPriority}</div>
              <span className="text-[10px] text-slate-500">Current: {currentPriority}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 block mb-0.5">Routing Department</span>
              <div className="font-semibold text-blue-400 truncate">{suggestedDepartment}</div>
              <span className="text-[10px] text-slate-500">Current: {currentDepartment}</span>
            </div>
          </div>
        </div>

        {/* 4. AI Suggested Response & Resolution Action */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Suggested Draft Reply */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">AI Suggested Draft Response</span>
              {adoptedBadge ? (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Copied to Comment!
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleAdopt}
                  className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Adopt AI Response
                </button>
              )}
            </div>
            <p className="text-xs text-slate-300 italic p-2.5 rounded bg-slate-950 border border-slate-800/80 leading-relaxed">
              "{suggestedResponse}"
            </p>
            <p className="text-[10px] text-slate-500">Review & edit draft in comment box before posting.</p>
          </div>

          {/* Suggested Resolution Action Plan */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">AI Suggested Resolution Action</span>
              <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{suggestedResolutionAction.estimatedResolutionDays} Days SLA
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-xs text-slate-300 space-y-1">
              <span className="font-mono text-purple-400 font-bold block">{suggestedResolutionAction.actionType}</span>
              <p className="text-[11px] leading-normal">{suggestedResolutionAction.description}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActionModal(true)}
              className="w-full text-xs gap-1.5 border-slate-800 hover:bg-slate-800 text-slate-300 h-7"
            >
              <UserCheck className="h-3.5 w-3.5 text-blue-400" /> Human Review & Proceed
            </Button>
          </div>
        </div>

        {/* Security Disclaimer */}
        <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[10px] text-slate-400 flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-400 shrink-0" />
          <span>
            <strong>Safety Protocol</strong>: AI recommendations assist authorized human decision makers. AI outputs never automatically close complaints, alter user permissions, or reveal complainant identity without explicit human approval.
          </span>
        </div>
      </CardContent>

      {/* Action Plan Human Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold">Human Confirmation Required</h3>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1.5">
              <p className="font-bold text-white">Recommended Resolution Action:</p>
              <p>{suggestedResolutionAction.description}</p>
              <p className="text-[10px] text-slate-400 pt-1">
                Estimated Resolution Target: {suggestedResolutionAction.estimatedResolutionDays} working days.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => {
                  setActionModal(false);
                  if (onExecuteAction) onExecuteAction(suggestedResolutionAction.description);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm & Proceed Action
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActionModal(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
