import React, { useState } from 'react';
import { Bot, Sparkles, Loader2, AlertTriangle, ArrowRight, UserPlus, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { initializeMentorChat, generateMentorResponse } from '../services/geminiService';

const BOTTLENECK_SYSTEM_PROMPT = (currentTime) => `
You are the **Fact-Based Workflow Auditor (AI Edition)**. Your mission is to provide high-stakes, **100% accurate** project management insights. 
CURRENT REFERENCE TIME: ${currentTime}

### CRITICAL CORE RULE:
- **FACTS OVER GUESSES**: Do NOT hallucinate workload imbalances. If the "WORKLOAD SUMMARY" shows tasks are evenly distributed, you MUST state that workload balance is OPTIMAL.
- **STATUS CLARITY**: Distinguish between "In Progress" and "Completed". If a task has no completion timestamp and is marked "In Progress", it is UNFINISHED.
- **STALENESS**: A task is only "Stale" if it was created more than 3 days ago and has seen zero status movement.

STRUCTURE YOUR RESPONSE:
1. **Critical Bottlenecks**: Identify real delays. If none exist, praise the team's velocity.
2. **Fact-Check: Team Workload**: State the exact distribution based on the provided data.
3. **Advanced Efficiency Strategy**: Suggest specific moves (reassignment, splitting tasks) ONLY if supported by data.
4. **Projected Delays**: Predict finish time based on current task count and velocity.

Use Markdown and Bold for emphasis. BE FACTUAL.
`;

const BottleneckAnalyzer = ({ tasks, members, teamName }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const currentTime = now.toLocaleString();
      
      // Fact-based workload calculation
      const workloadMap = {};
      members.forEach(m => workloadMap[m.name] = 0);
      tasks.forEach(t => {
        if (t.status !== 'completed' && workloadMap[t.assignedToName] !== undefined) {
          workloadMap[t.assignedToName]++;
        }
      });

      const workloadSummary = Object.entries(workloadMap)
        .map(([name, count]) => `- ${name}: ${count} active tasks`)
        .join('\n');

      // Prepare detailed task log with human-readable age
      const taskContext = tasks.map(t => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : null;
        let ageStr = 'Just now';
        if (createdAt) {
          const diffMs = now - createdAt;
          const mins = Math.floor(diffMs / 60000);
          const hours = Math.floor(mins / 60);
          const days = Math.floor(hours / 24);
          
          if (days > 0) ageStr = `${days}d ${hours % 24}h ago`;
          else if (hours > 0) ageStr = `${hours}h ${mins % 60}m ago`;
          else ageStr = `${mins}m ago`;
        }

        return {
          title: t.title,
          status: t.status,
          assignedTo: t.assignedToName,
          age: ageStr,
          rawAgeMs: createdAt ? now - createdAt : 0
        };
      });

      const prompt = `
Project: ${teamName}
Total Tasks: ${tasks.length}
Team Members: ${members.map(m => m.name).join(', ')}

FACTUAL WORKLOAD SUMMARY (Use this for accuracy!):
${workloadSummary}

DETAILED TASK LOG:
${JSON.stringify(taskContext, null, 2)}

Provide a factual "Advanced Workflow Audit" for the Team Creator.
`;

      const session = initializeMentorChat([], BOTTLENECK_SYSTEM_PROMPT(currentTime));
      const response = await generateMentorResponse(session, prompt);
      setAnalysis(response);
    } catch (err) {
      console.error("Bottleneck Analysis Error:", err);
      setError("Failed to generate AI analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-700 p-2 rounded-xl border border-slate-600">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">AI Workflow Analyst</h3>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Creator Exclusive</p>
          </div>
        </div>
        {!analysis && !loading && (
          <button 
            onClick={runAnalysis}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
          >
            <Sparkles className="w-4 h-4" /> Run Analytics
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="p-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            <p className="font-medium animate-pulse">Scanning task patterns & identifying bottlenecks...</p>
          </div>
        ) : error ? (
          <div className="py-8 flex flex-col items-center justify-center text-red-500 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="font-bold">{error}</p>
          </div>
        ) : analysis ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="prose prose-slate max-w-none prose-sm prose-headings:text-slate-900 prose-strong:text-indigo-600">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
              <button 
                onClick={runAnalysis}
                className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
              >
                Refresh Analysis
              </button>
              <button 
                onClick={() => setAnalysis('')}
                className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest ml-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-slate-500 text-sm italic">
              Use AI to identify project bottlenecks, stale tasks, and uneven workload distribution among your team members.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottleneckAnalyzer;
