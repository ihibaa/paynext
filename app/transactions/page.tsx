"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

type Transaction = {
  id: string;
  reference: string;
  amount: string;
  type: string;
  status: string;
  description?: string | null;
  createdAt: string;
  sender?: string;
  receiver?: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/wallet");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load transactions.");
      }

      setTransactions(data.transactions || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.reference
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        transaction.type
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        transaction.description
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        filter === "ALL" || transaction.type === filter;

      return matchesSearch && matchesFilter;
    });
  }, [transactions, search, filter]);

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatAmount(amount: string) {
    return Number(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getIcon(type: string) {
    if (type === "DEPOSIT" || type === "TRANSFER_IN") {
      return <ArrowDownLeft size={20} />;
    }

    return <ArrowUpRight size={20} />;
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 size={15} className="text-green-600" />;
      case "FAILED":
        return <XCircle size={15} className="text-red-500" />;
      case "BLOCKED":
        return <AlertTriangle size={15} className="text-orange-500" />;
      default:
        return <Clock size={15} className="text-yellow-600" />;
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
  href="/"
  title="Go to PayNext Dashboard"
  className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-400 transition duration-300 hover:scale-105 hover:border-teal-400 hover:bg-teal-500/20"
>
  <Wallet size={23} />
</Link>

            <h1 className="text-3xl font-bold text-[#172033]">
              Transactions
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              View and manage your payment activity.
            </p>
          </div>

          <button
            onClick={loadTransactions}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="mb-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Transactions</p>
              <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
                <Wallet size={21} />
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-[#172033]">
              {transactions.length}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Transactions available in your history
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Completed</p>
              <div className="rounded-xl bg-green-50 p-3 text-green-600">
                <CheckCircle2 size={21} />
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-[#172033]">
              {transactions.filter((t) => t.status === "COMPLETED").length}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Successfully processed transactions
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by reference, type or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-teal-500 focus:bg-white"
              />
            </div>

            <div className="relative md:w-56">
              <Filter
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-500"
              >
                <option value="ALL">All Transactions</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="TRANSFER">Transfers</option>
                <option value="BILL_PAYMENT">Bill Payments</option>
                <option value="MOBILE_TOPUP">Mobile Top-ups</option>
                <option value="WITHDRAWAL">Withdrawals</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-5">
            <h2 className="font-bold text-[#172033]">
              Transaction History
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              {filteredTransactions.length} transactions found
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-3 animate-spin text-teal-600" size={30} />
              <p className="text-sm text-gray-500">
                Loading transactions...
              </p>
            </div>
          ) : error ? (
            <div className="px-5 py-16 text-center">
              <AlertTriangle className="mx-auto mb-3 text-red-500" size={32} />
              <p className="font-semibold text-gray-700">{error}</p>
              <button
                onClick={loadTransactions}
                className="mt-4 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Try Again
              </button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Wallet className="mx-auto mb-3 text-gray-300" size={38} />
              <h3 className="font-semibold text-gray-700">
                No transactions found
              </h3>
              <p className="mt-2 text-sm text-gray-400">
                Try another search or filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTransactions.map((transaction) => {
                const incoming =
                  transaction.type === "DEPOSIT" ||
                  transaction.type === "TRANSFER_IN";

                return (
                  <div
                    key={transaction.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 transition hover:bg-gray-50"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          incoming
                            ? "bg-green-50 text-green-600"
                            : "bg-teal-50 text-teal-700"
                        }`}
                      >
                        {getIcon(transaction.type)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-[#172033]">
                          {transaction.type.replaceAll("_", " ")}
                        </h3>

                        <p className="mt-1 truncate text-xs text-gray-400">
                          Ref: {transaction.reference}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="ml-auto text-right">
                      <p
                        className={`font-bold ${
                          incoming ? "text-green-600" : "text-[#172033]"
                        }`}
                      >
                        {incoming ? "+" : "-"} Rs.{" "}
                        {formatAmount(transaction.amount)}
                      </p>

                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        {getStatusIcon(transaction.status)}
                        <span className="text-xs font-medium text-gray-500">
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          PayNext · Your Money, Your Security.
        </p>
      </div>
    </main>
  );
}