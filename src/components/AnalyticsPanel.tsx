import React from 'react';
import { QueueAnalytics, Patient } from '../types';
import { 
  Users, 
  UserCheck, 
  ShieldAlert, 
  Clock, 
  Stethoscope, 
  Activity,
  CheckCircle2,
  ListRestart
} from 'lucide-react';

interface AnalyticsPanelProps {
  analytics: QueueAnalytics | null;
  patients: Patient[];
  onReset: () => void;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ analytics, patients, onReset }) => {
  // Compute auxiliary quick metrics
  const totalInQueue = patients.length;
  const waitingCount = patients.filter(p => p.status === 'waiting').length;
  const completedCount = patients.filter(p => p.status === 'completed').length;
  const calledCount = patients.filter(p => p.status === 'called').length;
  const emergencyCount = patients.filter(p => p.isEmergency && p.status === 'waiting').length;

  const completionRate = totalInQueue > 0 
    ? Math.round((completedCount / totalInQueue) * 100) 
    : 0;

  // Render recent live timeline details based on patients' modified status
  const recentActivityLogs = [...patients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div id="analytics_panel_container" className="space-y-6 text-slate-800 text-left">
      {/* Visual Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-600" />
          <h2 className="text-base font-extrabold text-slate-850">Queue Intelligence & Analytics</h2>
        </div>
        <button 
          id="btn_reset_queue"
          onClick={() => {
            if (window.confirm("Are you sure you want to reset the current queue? This will permanently wipe all patient records for today.")) {
              onReset();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-650 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-250 rounded-xl transition-all cursor-pointer font-bold"
        >
          <ListRestart className="w-3.5 h-3.5 shrink-0" />
          Reset Operations
        </button>
      </div>

      {/* Bento Breakdown */}
      <div id="analytics_bento_grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Priority Case Monitor */}
        <div className="bg-white border border-slate-205 p-4 rounded-xl space-y-2 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Emergency Cases</span>
            <span className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-rose-600">{emergencyCount}</div>
            <p className="text-[10px] text-slate-450 mt-1">Pending prioritized urgent admissions</p>
          </div>
        </div>

        {/* Throughput */}
        <div className="bg-white border border-slate-205 p-4 rounded-xl space-y-2 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Discharge Rate</span>
            <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-emerald-600">{completionRate}%</div>
            <p className="text-[10px] text-slate-450 mt-1">Completed / Total ratio for today</p>
          </div>
        </div>
      </div>

      {/* Multi Doctor Workload Allocation */}
      <div className="bg-white border border-slate-205 p-5 rounded-2xl space-y-4 shadow-sm text-left">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
          Doctor Workload Allocations
        </h3>

        {analytics && analytics.doctorBreakdown && analytics.doctorBreakdown.length > 0 ? (
          <div id="doctor_load_list" className="space-y-3.5">
            {analytics.doctorBreakdown.map((dr, idx) => {
              const activeWait = dr.waiting;
              const totalForDr = dr.total;
              const loadPercentage = totalInQueue > 0 ? (totalForDr / totalInQueue) * 100 : 0;
              
              return (
                <div key={idx} className="space-y-1.5 text-left">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 font-bold truncate max-w-[200px]">{dr.doctor}</span>
                    <span className="font-mono text-slate-500 text-[11px] block">
                      {activeWait} wait / <span className="text-sky-655 font-bold">{dr.completed} completed</span>
                    </span>
                  </div>
                  {/* Custom Styled Load Indicator Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full rounded-full ${
                        activeWait > 3 
                          ? 'bg-rose-500' 
                          : activeWait >= 2 
                          ? 'bg-amber-500' 
                          : 'bg-[#0f766e]'
                      }`} 
                      style={{ width: `${Math.max(5, loadPercentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-400 italic">
            No active doctor assignments captured yet today.
          </div>
        )}
      </div>

      {/* Live System Activity Log */}
      <div className="bg-white border border-slate-205 p-5 rounded-2xl space-y-3 shadow-sm text-left">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          Live Clinic Activity Feed
        </h3>
        <div id="live_logs" className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
          {recentActivityLogs.length > 0 ? (
            recentActivityLogs.map((p, idx) => {
              const timeString = new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={p._id} className="flex hover:bg-slate-50 p-2 rounded-xl transition-colors items-start justify-between gap-2 border-b border-slate-100 last:border-0 text-xs">
                  <div className="flex items-start gap-2.5 text-left">
                    <span className={`w-2.5 h-2.5 mt-1 rounded-full shrink-0 ${
                      p.status === 'called' ? 'bg-sky-600' : p.status === 'completed' ? 'bg-emerald-600' : 'bg-slate-300'
                    }`} />
                    <div>
                      <span className="text-slate-800 font-bold block leading-none">{p.name}</span>
                      <span className="text-slate-500 text-[11px] block mt-1">
                        {p.status === 'called' 
                          ? 'called inside consultation' 
                          : p.status === 'completed' 
                          ? 'finished treatment and checked out' 
                          : 'scheduled to the waiting lobby'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.doctorName}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-450 font-mono shrink-0 whitespace-nowrap">{timeString}</span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-slate-400 italic text-xs">
              Awaiting queue updates and logs...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
