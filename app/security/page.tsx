"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Activity,
  LockKeyhole,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  ShieldAlert,
} from "lucide-react";

type FraudAlert = {
  id: string;
  riskScore: number;
  reason: string;
  status: string;
  createdAt: string;
  transaction?: {
    reference: string;
    amount: string;
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
  const [error, setError] = useState("");

  async function loadSecurityData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/security/alerts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load security data.");
      }

      setAlerts(data.alerts || []);
      setLogs(data.securityLogs || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurityData();
  }, []);

  const blockedAlerts = alerts.filter(
    (alert) => alert.status === "BLOCKED"
  ).length;

  const reviewAlerts = alerts.filter(
    (alert) => alert.status === "REVIEW"
  ).length;

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getRiskLabel(score: number) {
    if (score >= 70) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }

  function getRiskColor(score: number) {
    if (score >= 70) return "bg-red-50 text-red-700";
    if (score >= 40) return "bg-yellow-50 text-yellow-700";
    return "bg-green-50 text-green-700";
  }

  function getStatusIcon(status: string) {
    if (status === "BLOCKED") {
      return <XCircle size={17} className="text-red-500" />;
    }

    if (status === "CLEARED") {
      return <CheckCircle2 size={17} className="text-green-600" />;
    }

    return <Clock size={17} className="text-yellow-600" />;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-teal-700"
            >
              <ArrowLeft size={17} />
              Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold text-[#172033]">
              Security Center
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Monitor suspicious activity and your account security.
            </p>
          </div>

          <button
            onClick={loadSecurityData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Security Status */}
        <div className="mb-7 rounded-2xl bg-[#102b35] p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <ShieldCheck size={34} className="text-teal-300" />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                PayNext Security Monitoring
              </h2>
              <p className="mt-1 text-sm text-gray-300">
                Your account activity is monitored by demo security rules.
              </p>
            </div>

            <div className="ml-auto rounded-full bg-teal-400/15 px-4 py-2 text-sm font-semibold text-teal-200">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-teal-300" />
              Monitoring Active
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Fraud Alerts</p>
              <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                <AlertTriangle size={21} />
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-[#172033]">
              {alerts.length}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Recorded alerts
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Blocked Alerts</p>
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <LockKeyhole size={21} />
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-[#172033]">
              {blockedAlerts}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Suspicious activity blocked
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Under Review</p>
              <div className="rounded-xl bg-yellow-50 p-3 text-yellow-600">
                <Clock size={21} />
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-[#172033]">
              {reviewAlerts}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Alerts marked for review
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20">
            <Loader2 size={30} className="mb-3 animate-spin text-teal-600" />
            <p className="text-sm text-gray-500">
              Loading security information...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white px-5 py-16 text-center">
            <AlertTriangle className="mx-auto mb-3 text-red-500" size={32} />
            <p className="font-semibold text-gray-700">{error}</p>
            <button
              onClick={loadSecurityData}
              className="mt-4 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Fraud Alerts */}
            <section className="mb-7 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                    <ShieldAlert size={21} />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#172033]">
                      Fraud Detection Alerts
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                      Suspicious transactions identified by demo risk rules
                    </p>
                  </div>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <ShieldCheck
                    size={38}
                    className="mx-auto mb-3 text-green-500"
                  />
                  <h3 className="font-semibold text-gray-700">
                    No fraud alerts
                  </h3>
                  <p className="mt-2 text-sm text-gray-400">
                    No suspicious transactions have been recorded.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex flex-wrap items-center justify-between gap-4 px-5 py-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getRiskColor(alert.riskScore)}`}
                          >
                            {getRiskLabel(alert.riskScore)} RISK
                          </span>

                          <span className="text-xs text-gray-400">
                            Score: {alert.riskScore}/100
                          </span>
                        </div>

                        <h3 className="font-semibold text-[#172033]">
                          {alert.reason}
                        </h3>

                        <p className="mt-1 text-xs text-gray-400">
                          Reference: {alert.transaction?.reference || "N/A"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(alert.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                        {getStatusIcon(alert.status)}
                        {alert.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Security Logs */}
            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
                    <Activity size={21} />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#172033]">
                      Recent Security Activity
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                      Recent actions recorded for your account
                    </p>
                  </div>
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <Activity
                    size={36}
                    className="mx-auto mb-3 text-gray-300"
                  />
                  <h3 className="font-semibold text-gray-700">
                    No security activity
                  </h3>
                  <p className="mt-2 text-sm text-gray-400">
                    Your security logs will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 px-5 py-5"
                    >
                      <div className="rounded-xl bg-gray-50 p-3 text-gray-600">
                        <LockKeyhole size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#172033]">
                          {log.action.replaceAll("_", " ")}
                        </h3>

                        {log.details && (
                          <p className="mt-1 text-sm text-gray-500">
                            {log.details}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          PayNext · Your Money, Your Security.
        </p>
      </div>
    </main>
  );
}
