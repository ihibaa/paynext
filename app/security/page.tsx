
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  LockKeyhole,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  TrendingUp,
  Wallet,
  CalendarClock,
  Radar,
  CircleHelp,
} from "lucide-react";

type FraudAlert = {
  id: string;
  riskScore: number;
  reason: string;
  status: string;
  createdAt: string;
  transaction?: {
    reference: string;
    amount: string | number;
    status: string;
    type?: string;
  } | null;
};

type SecurityLog = {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
};

export default function SecurityPage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSecurityData = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);

      setSyncing(true);
      setError("");

      const response = await fetch("/api/security/alerts", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to sync security data.");
      }

      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setLogs(Array.isArray(data.securityLogs) ? data.securityLogs : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData(true);

    const interval = setInterval(() => {
      loadSecurityData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadSecurityData]);

  const blockedAlerts = alerts.filter(
    (item) => item.status === "BLOCKED"
  ).length;

  const reviewAlerts = alerts.filter(
    (item) => item.status === "REVIEW"
  ).length;

  const clearedAlerts = alerts.filter(
    (item) => item.status === "CLEARED"
  ).length;

  const highRiskAlerts = alerts.filter(
    (item) => item.riskScore >= 70
  ).length;

  const failedLogins = logs.filter(
    (item) => item.action === "FAILED_LOGIN"
  ).length;

  // Security posture calculated from recorded events.
  const securityScore = useMemo(() => {
    const alertPenalty = alerts.reduce((total, alert) => {
      if (alert.status === "BLOCKED") return total + 5;
      if (alert.status === "REVIEW") return total + 10;
      if (alert.status === "CLEARED") return total + 2;
      return total;
    }, 0);

    const loginPenalty = failedLogins * 5;

    return Math.max(0, Math.min(100, 100 - alertPenalty - loginPenalty));
  }, [alerts, failedLogins]);

  // Oldest to newest for the graph.
  const chartAlerts = useMemo(() => {
    return [...alerts].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    );
  }, [alerts]);

  const chartPoints = useMemo(() => {
    if (chartAlerts.length === 0) return "";

    return chartAlerts
      .map((alert, index) => {
        const x =
          chartAlerts.length === 1
            ? 50
            : 12 + (index / (chartAlerts.length - 1)) * 376;

        const y = 115 - (alert.riskScore / 100) * 95;

        return `${x},${y}`;
      })
      .join(" ");
  }, [chartAlerts]);

  function formatDate(date: string) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Date unavailable";
    }

    return parsed.toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatAmount(amount: string | number) {
    const value = Number(amount);

    if (Number.isNaN(value)) return String(amount);

    return `Rs. ${value.toLocaleString("en-PK")}`;
  }

  function getRiskLabel(score: number) {
    if (score >= 70) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }

  function getRiskColor(score: number) {
    if (score >= 70) return "bg-red-500/10 text-red-400 border-red-500/20";
    if (score >= 40) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    return "bg-teal-500/10 text-teal-400 border-teal-500/20";
  }

  function getStatusIcon(status: string) {
    if (status === "BLOCKED") {
      return <XCircle size={15} className="text-red-400" />;
    }

    if (status === "CLEARED") {
      return <CheckCircle2 size={15} className="text-teal-400" />;
    }

    return <Clock size={15} className="text-yellow-400" />;
  }

  function getStatusColor(status: string) {
    if (status === "BLOCKED") return "text-red-400 bg-red-500/10";
    if (status === "CLEARED") return "text-teal-400 bg-teal-500/10";
    return "text-yellow-400 bg-yellow-500/10";
  }

  const ringOffset = 314 - (securityScore / 100) * 314;

  return (
    <main className="min-h-screen bg-[#090e15] px-4 py-5 text-white md:px-7">

      <div className="mx-auto max-w-[1500px]">

        {/* TOP NAVIGATION */}
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/15 p-2.5">
              <ShieldCheck size={25} className="text-teal-400" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-wide">
                PayNext<span className="text-teal-400">.</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[3px] text-gray-500">
                Security Command Center
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
  href="/"
  title="Go to PayNext Dashboard"
  className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-400 transition duration-300 hover:scale-105 hover:border-teal-400 hover:bg-teal-500/20"
>
  <Wallet size={23} />
</Link>

            <button
              onClick={() => loadSecurityData()}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-xs font-bold text-[#071411] transition hover:bg-teal-400 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={syncing ? "animate-spin" : ""}
              />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </header>

        {/* COMMAND STATUS */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-500/20 bg-[#10201f] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-teal-400" />
            </span>

            <div>
              <p className="text-xs font-semibold text-teal-300">
                Security Data Connection
              </p>
              <p className="text-[10px] text-gray-500">
                {syncing ? "Synchronizing account records..." : "Connected to PayNext security records"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-gray-500">
              LAST SYNCHRONIZED
            </p>
            <p className="text-xs text-gray-300">
              {lastUpdated
                ? lastUpdated.toLocaleTimeString("en-PK")
                : "Waiting..."}
            </p>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={() => loadSecurityData()}
              className="rounded-lg bg-red-500/20 px-4 py-2 text-xs text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* TOP STATISTICS */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {[
            {
              label: "Total Fraud Alerts",
              value: alerts.length,
              note: "Recorded events",
              icon: AlertTriangle,
              color: "text-yellow-400",
            },
            {
              label: "Blocked Incidents",
              value: blockedAlerts,
              note: "Blocked activity",
              icon: LockKeyhole,
              color: "text-red-400",
            },
            {
              label: "Under Review",
              value: reviewAlerts,
              note: "Require attention",
              icon: Clock,
              color: "text-orange-400",
            },
            {
              label: "Security Events",
              value: logs.length,
              note: "Recorded activities",
              icon: Activity,
              color: "text-teal-400",
            },
          ].map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="animate-[fadeIn_0.5s_ease-out] rounded-xl border border-white/[0.08] bg-[#111923] p-5 transition duration-300 hover:-translate-y-1 hover:border-teal-500/30"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <Icon size={19} className={item.color} />
                </div>

                <h2 className="mt-4 text-3xl font-bold tracking-tight">
                  {loading ? "--" : item.value}
                </h2>

                <p className="mt-1 text-[10px] text-gray-500">
                  {item.note}
                </p>
              </div>
            );
          })}
        </section>

        {/* MAIN ANALYTICS */}
        <section className="mb-6 grid gap-5 xl:grid-cols-12">

          {/* SECURITY SCORE */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111923] p-5 xl:col-span-4">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">
                  Account Security Score
                </h2>
                <p className="mt-1 text-[10px] text-gray-500">
                  Based on recorded security events
                </p>
              </div>

              <ShieldCheck className="text-teal-400" size={20} />
            </div>

            <div className="relative mx-auto flex h-64 max-w-[270px] items-center justify-center">
              <div className="absolute h-48 w-48 rounded-full bg-teal-500/[0.06] blur-3xl" />

              <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r="50"
                  fill="none"
                  stroke="#263442"
                  strokeWidth="11"
                />

                <circle
                  cx="70"
                  cy="70"
                  r="50"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray="314"
                  strokeDashoffset={loading ? 314 : ringOffset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute text-center">
                <p className="text-5xl font-bold tracking-tight">
                  {loading ? "--" : securityScore}
                  <span className="text-2xl text-teal-400">%</span>
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[2px] text-gray-500">
                  Security Score
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-[#0c131c] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Risk indicators</span>
                <span className="font-semibold text-teal-400">
                  {loading ? "--" : highRiskAlerts}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">Failed login events</span>
                <span className="font-semibold text-red-400">
                  {loading ? "--" : failedLogins}
                </span>
              </div>
            </div>

            <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-gray-500">
              <CircleHelp size={13} className="mt-0.5 shrink-0" />
              This is an educational risk indicator, not a certified security audit.
            </p>
          </div>

          {/* THREAT GRAPH */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111923] p-5 xl:col-span-8">

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">
                  Fraud Risk Analytics
                </h2>
                <p className="mt-1 text-[10px] text-gray-500">
                  Risk scores from recorded fraud alerts
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-gray-400">
                <Activity size={13} className="text-teal-400" />
                Alert History
              </div>
            </div>

            <div className="relative h-[220px] w-full">
              <svg
                viewBox="0 0 400 145"
                preserveAspectRatio="none"
                className="h-full w-full overflow-visible"
              >
                <defs>
                  <linearGradient id="riskFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[20, 45, 70, 95, 120].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="400"
                    y2={y}
                    stroke="#293544"
                    strokeDasharray="4 5"
                  />
                ))}

                {chartAlerts.length > 0 && (
                  <>
                    <polygon
                      points={`12,135 ${chartPoints} 388,135`}
                      fill="url(#riskFill)"
                    />

                    <polyline
                      points={chartPoints}
                      fill="none"
                      stroke="#2dd4bf"
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                    {chartAlerts.map((alert, index) => {
                      const x =
                        chartAlerts.length === 1
                          ? 50
                          : 12 + (index / (chartAlerts.length - 1)) * 376;

                      const y = 115 - (alert.riskScore / 100) * 95;

                      return (
                        <circle
                          key={alert.id}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#2dd4bf"
                          stroke="#111923"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </>
                )}
              </svg>

              {chartAlerts.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="mx-auto mb-2 text-gray-600" size={27} />
                    <p className="text-xs text-gray-400">
                      No risk history available
                    </p>
                    <p className="mt-1 text-[10px] text-gray-600">
                      Graph will populate when alerts are recorded.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span className="h-2 w-2 rounded-full bg-teal-400" />
                Risk score
              </div>

              <p className="text-[10px] text-gray-500">
                {chartAlerts.length} recorded data points
              </p>
            </div>
          </div>
        </section>

        {/* SECONDARY ANALYTICS */}
        <section className="mb-6 grid gap-5 lg:grid-cols-2">

          {/* THREAT OVERVIEW */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111923] p-5">

            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-3 text-purple-400">
                <Radar size={20} />
              </div>

              <div>
                <h2 className="text-sm font-bold">
                  Threat Overview
                </h2>
                <p className="text-[10px] text-gray-500">
                  Current alert distribution
                </p>
              </div>
            </div>

            {[
              {
                label: "Blocked",
                value: blockedAlerts,
                color: "bg-red-400",
              },
              {
                label: "Under Review",
                value: reviewAlerts,
                color: "bg-yellow-400",
              },
              {
                label: "Cleared",
                value: clearedAlerts,
                color: "bg-teal-400",
              },
            ].map((item) => {
              const percentage =
                alerts.length > 0
                  ? (item.value / alerts.length) * 100
                  : 0;

              return (
                <div key={item.label} className="mb-5 last:mb-0">
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-gray-200">{item.value}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#263442]">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* SYSTEM STATUS */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111923] p-5">

            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-teal-500/10 p-3 text-teal-400">
                <Activity size={20} />
              </div>

              <div>
                <h2 className="text-sm font-bold">
                  Security System Status
                </h2>
                <p className="text-[10px] text-gray-500">
                  PayNext application checks
                </p>
              </div>
            </div>

            {[
              {
                label: "Security Records API",
                status: error ? "Error" : loading ? "Checking" : "Connected",
                ok: !error && !loading,
              },
              {
                label: "Fraud Alert Records",
                status: loading ? "Checking" : `${alerts.length} loaded`,
                ok: !loading && !error,
              },
              {
                label: "Security Activity Logs",
                status: loading ? "Checking" : `${logs.length} loaded`,
                ok: !loading && !error,
              },
              {
                label: "Automatic Synchronization",
                status: "30-second interval",
                ok: true,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-3 last:border-0"
              >
                <span className="text-xs text-gray-400">
                  {item.label}
                </span>

                <span className="flex items-center gap-2 text-[10px]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      item.ok ? "bg-teal-400" : "bg-red-400"
                    }`}
                  />
                  <span className={item.ok ? "text-teal-400" : "text-red-400"}>
                    {item.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT FRAUD ALERTS */}
        <section className="mb-6 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111923]">

          <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-orange-400" size={20} />
              <div>
                <h2 className="text-sm font-bold">
                  Recent Fraud Alerts
                </h2>
                <p className="mt-1 text-[10px] text-gray-500">
                  Latest recorded suspicious transactions
                </p>
              </div>
            </div>

            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-gray-400">
              {alerts.length} alerts
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-teal-400" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="mx-auto mb-3 text-teal-400" size={32} />
              <p className="text-sm font-semibold text-gray-300">
                No fraud alerts recorded
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Your recorded alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-5 transition hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getRiskColor(alert.riskScore)}`}>
                        {getRiskLabel(alert.riskScore)} RISK
                      </span>

                      <span className="text-[10px] text-gray-500">
                        Score: {alert.riskScore}/100
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-gray-200">
                      {alert.reason}
                    </p>

                    <p className="mt-1 text-[10px] text-gray-500">
                      Reference: {alert.transaction?.reference || "N/A"}
                    </p>

                    {alert.transaction && (
                      <p className="mt-1 text-[10px] text-gray-500">
                        {formatAmount(alert.transaction.amount)}
                        {alert.transaction.type
                          ? ` · ${alert.transaction.type.replaceAll("_", " ")}`
                          : ""}
                      </p>
                    )}

                    <p className="mt-2 text-[10px] text-gray-600">
                      {formatDate(alert.createdAt)}
                    </p>
                  </div>

                  <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold ${getStatusColor(alert.status)}`}>
                    {getStatusIcon(alert.status)}
                    {alert.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECENT ACTIVITY */}
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111923]">

          <div className="border-b border-white/[0.08] p-5">
            <div className="flex items-center gap-3">
              <Activity className="text-teal-400" size={20} />
              <div>
                <h2 className="text-sm font-bold">
                  Security Activity Timeline
                </h2>
                <p className="mt-1 text-[10px] text-gray-500">
                  Recent account security events
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-teal-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="mx-auto mb-3 text-gray-600" size={30} />
              <p className="text-sm text-gray-400">
                No security activity recorded yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-5 transition hover:bg-white/[0.02]"
                >
                  <div className="rounded-lg bg-teal-500/10 p-2.5 text-teal-400">
                    <LockKeyhole size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-semibold text-gray-200">
                      {log.action.replaceAll("_", " ")}
                    </h3>

                    {log.details && (
                      <p className="mt-1 text-xs text-gray-500">
                        {log.details}
                      </p>
                    )}

                    <p className="mt-2 flex items-center gap-1 text-[10px] text-gray-600">
                      <CalendarClock size={12} />
                      {formatDate(log.createdAt)}
                    </p>
                  </div>

                  <CheckCircle2 size={16} className="text-teal-500" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="py-7 text-center">
          <p className="text-[10px] tracking-wider text-gray-600">
            PAYNEXT SECURITY COMMAND CENTER · EDUCATIONAL PROJECT
          </p>
          <p className="mt-2 text-[10px] text-gray-700">
            Your Money, Your Security.
          </p>
        </footer>

      </div>
    </main>
  );
}
