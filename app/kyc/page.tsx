"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Wallet,
} from "lucide-react";

type Application = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt: string | null;
  rejectionNote: string | null;
} | null;

export default function KycPage() {
  const [cnic, setCnic] = useState("");
  const [application, setApplication] = useState<Application>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function loadKyc() {
    try {
      const response = await fetch("/api/kyc", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok) {
        setApplication(data.application);
      } else {
        setMessage(data.message || "Unable to load KYC status.");
      }
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKyc();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    const cleanCnic = cnic.replace(/-/g, "").trim();

    if (!/^\d{13}$/.test(cleanCnic)) {
      setMessage("Please enter a valid 13-digit demo CNIC.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/kyc", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cnic: cleanCnic }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "KYC submission failed.");
        return;
      }

      setApplication(data.application);
      setCnic("");
      setSuccess(true);
      setMessage(data.message);
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusStyle =
    application?.status === "APPROVED"
      ? "bg-teal-50 text-teal-700"
      : application?.status === "REJECTED"
      ? "bg-red-50 text-red-700"
      : "bg-amber-50 text-amber-700";

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
  href="/"
  title="Go to PayNext Dashboard"
  className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-400 transition duration-300 hover:scale-105 hover:border-teal-400 hover:bg-teal-500/20"
>
  <Wallet size={23} />
</Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <ShieldCheck size={30} />
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            KYC Verification
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Complete the demo identity verification process for your PayNext account.
          </p>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="mx-auto animate-spin" size={28} />
              <p className="mt-3 text-sm">Loading your application...</p>
            </div>
          ) : (
            <>
              {application && (
                <div className="mt-8 rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-bold text-slate-800">
                      Application Status
                    </h2>

                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>
                      {application.status}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    {application.status === "APPROVED" ? (
                      <CheckCircle2 className="text-teal-600" size={25} />
                    ) : application.status === "REJECTED" ? (
                      <XCircle className="text-red-600" size={25} />
                    ) : (
                      <Clock className="text-amber-600" size={25} />
                    )}

                    <p className="text-sm text-slate-600">
                      {application.status === "APPROVED"
                        ? "Your demo identity has been approved."
                        : application.status === "REJECTED"
                        ? application.rejectionNote || "Your application was rejected."
                        : "Your application is waiting for admin review."}
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    Submitted: {new Date(application.submittedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {application?.status !== "APPROVED" && (
                <form onSubmit={handleSubmit} className="mt-8">
                  <div className="mb-5">
                    <h2 className="font-bold text-slate-800">
                      {application ? "Resubmit Application" : "Submit Your Application"}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Use a fictional 13-digit number for this educational demo. Do not enter your real CNIC.
                    </p>
                  </div>

                  <label
                    htmlFor="cnic"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Demo CNIC Number
                  </label>

                  <input
                    id="cnic"
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={cnic}
                    onChange={(event) =>
                      setCnic(event.target.value.replace(/\D/g, "").slice(0, 13))
                    }
                    placeholder="Enter 13 digits"
                    className="w-full rounded-xl border border-slate-200 px-4 py-4 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />

                  {message && (
                    <div className={`mt-4 rounded-xl p-3 text-sm ${success ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"}`}>
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FileCheck size={18} />
                        Submit KYC Application
                      </>
                    )}
                  </button>
                </form>
              )}

              {!message && application?.status === "APPROVED" && (
                <div className="mt-6 rounded-xl bg-teal-50 p-4 text-sm text-teal-700">
                  <CheckCircle2 className="mb-2" size={22} />
                  Your demo KYC process is complete.
                </div>
              )}
            </>
          )}

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            PayNext is an educational prototype. This page does not perform official identity verification.
          </p>
        </div>
      </div>
    </main>
  );
}