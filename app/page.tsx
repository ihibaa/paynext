"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  ShieldCheck,
  Settings,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  CreditCard,
  LockKeyhole,
  Activity,
  CircleHelp,
  ChevronRight,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Send,
  User,
  AlertTriangle,
} from "lucide-react";

type UserData = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  hasTransactionPin?: boolean;
  wallet: {
    balance: string;
    currency: string;
  } | null;
};

type TransactionData = {
  id: string;
  reference: string;
  senderId: string;
  receiverId: string | null;
  amount: string;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
};

type WalletData = {
  balance: string;
  currency: string;
};

type FraudAlertData = {
  id: string;
  riskScore: number;
  reason: string;
  status: string;
  createdAt: string;
  transaction: {
    reference: string;
    amount: string;
    status: string;
    type: string;
  } | null;
};

type SecurityLogData = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
};

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Transactions", icon: ArrowLeftRight, href: "/transactions" },
  { name: "My Wallet", icon: Wallet, href: "/#wallet" },
  { name: "Security Center", icon: ShieldCheck, href: "/security" },
  { name: "Settings", icon: Settings, href: "/settings" },
  { name: "KYC Verification", icon: ShieldCheck, href: "/kyc" },
];

export default function Home() {
  const [user, setUser] = useState<UserData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [fraudAlerts, setFraudAlerts] = useState<FraudAlertData[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLogData[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState("");

  // Add Money states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Send Money states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [receiverPhone, setReceiverPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [receiverName, setReceiverName] = useState("");

  // Transaction PIN states
  
  const [transactionPin, setTransactionPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSetupLoading, setPinSetupLoading] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [forgotPinOpen, setForgotPinOpen] = useState(false);
  const [forgotPinStep, setForgotPinStep] = useState<"cnic" | "otp">("cnic");
  const [forgotCnic, setForgotCnic] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [forgotPinLoading, setForgotPinLoading] = useState(false);
  const [forgotPinMessage, setForgotPinMessage] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  // Fetch security alerts and activity logs
  async function refreshSecurity() {
    setSecurityLoading(true);

    try {
      const response = await fetch("/api/security/alerts", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok) {
        setFraudAlerts(data.alerts || []);
        setSecurityLogs(data.securityLogs || []);
      }
    } catch (err) {
      console.error("Security refresh error:", err);
    } finally {
      setSecurityLoading(false);
    }
  }

  // Fetch logged-in user and dashboard data
  useEffect(() => {
    async function loadDashboard() {
      try {
        const userResponse = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        const userData = await userResponse.json();

        if (!userResponse.ok) {
          setError(userData.message || "Please login to continue.");
          return;
        }

        setUser(userData.user);
        setWalletLoading(true);

        const walletResponse = await fetch("/api/wallet", {
          credentials: "include",
          cache: "no-store",
        });

        const walletData = await walletResponse.json();

        if (!walletResponse.ok) {
          setError(walletData.message || "Unable to load wallet.");
          return;
        }

        setWallet(walletData.wallet);
        setTransactions(walletData.transactions || []);

        await refreshSecurity();
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
        setWalletLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // Refresh wallet and transactions
  async function refreshWallet() {
    try {
      const response = await fetch("/api/wallet", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok) {
        setWallet(data.wallet);
        setTransactions(data.transactions || []);
        await refreshSecurity();
      }
    } catch (err) {
      console.error("Wallet refresh error:", err);
    }
  }

  // Configure transaction PIN
 
async function handlePinSetup(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setTransferMessage("");
  setShowForgotPin(false);

  if (!/^\d{6}$/.test(newPin)) {
    setTransferMessage("Transaction PIN must contain exactly 6 digits.");
    return;
  }

  if (newPin !== confirmPin) {
    setTransferMessage("PIN and confirmation PIN do not match.");
    return;
  }

  setPinSetupLoading(true);

  try {
    const response = await fetch("/api/auth/pin/setup", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pin: newPin,
        confirmPin,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setTransferMessage(
        data.message || "Unable to set Transaction PIN."
      );
      return;
    }

    setUser((currentUser) =>
      currentUser
        ? { ...currentUser, hasTransactionPin: true }
        : currentUser
    );

    setNewPin("");
    setConfirmPin("");
    setTransactionPin("");
    setShowForgotPin(false);

    setTransferMessage("");
  } catch (error) {
    console.error("PIN setup error:", error);
    setTransferMessage("Unable to connect to the server.");
  } finally {
    setPinSetupLoading(false);
  }
}


  // Send OTP for forgotten transaction PIN
  async function handleSendPinOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotPinMessage("");

    if (!/^\d{13}$/.test(forgotCnic)) {
      setForgotPinMessage(
        "Enter your valid 13-digit CNIC number without dashes."
      );
      return;
    }

    setForgotPinLoading(true);

    try {
      const response = await fetch("/api/auth/pin/forget/send-otp", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cnic: forgotCnic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setForgotPinMessage(data.message || "Unable to send OTP.");
        return;
      }

      setMaskedEmail(data.maskedEmail || "your registered email");
      setForgotPinStep("otp");
      setForgotPinMessage("");
    } catch (error) {
      console.error("Send PIN OTP error:", error);
      setForgotPinMessage("Unable to connect to the server.");
    } finally {
      setForgotPinLoading(false);
    }
  }

  // Verify OTP and reset transaction PIN
  async function handleResetPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotPinMessage("");

    if (!/^\d{6}$/.test(forgotOtp)) {
      setForgotPinMessage("OTP must contain exactly 6 digits.");
      return;
    }

    if (!/^\d{6}$/.test(resetNewPin)) {
      setForgotPinMessage("New PIN must contain exactly 6 digits.");
      return;
    }

    if (resetNewPin !== resetConfirmPin) {
      setForgotPinMessage("New PIN and confirmation PIN do not match.");
      return;
    }

    setForgotPinLoading(true);

    try {
      const response = await fetch("/api/auth/pin/forget/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cnic: forgotCnic,
          otp: forgotOtp,
          newPin: resetNewPin,
          confirmPin: resetConfirmPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setForgotPinMessage(data.message || "Unable to reset PIN.");
        return;
      }

      setForgotPinOpen(false);
      setShowForgotPin(false);
      setForgotPinStep("cnic");
      setForgotCnic("");
      setForgotOtp("");
      setResetNewPin("");
      setResetConfirmPin("");
      setMaskedEmail("");

      setTransactionPin("");
      setTransferMessage(
        data.message ||
          "Transaction PIN reset successfully. Please enter your new PIN."
      );
    } catch (error) {
      console.error("Reset PIN error:", error);
      setForgotPinMessage("Unable to connect to the server.");
    } finally {
      setForgotPinLoading(false);
    }
  }

  // Add demo money
  async function handleAddMoney(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setDepositMessage("");
    setDepositSuccess(false);

    const amount = Number(depositAmount);

    if (
      !depositAmount.trim() ||
      !Number.isFinite(amount) ||
      amount < 100 ||
      amount > 100000 ||
      !/^\d+(\.\d{1,2})?$/.test(depositAmount.trim())
    ) {
      setDepositMessage(
        "Enter an amount between Rs. 100 and Rs. 100,000 (maximum 2 decimal places)."
      );
      return;
    }

    setDepositLoading(true);

    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: depositAmount.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDepositMessage(data.message || "Unable to add money.");
        return;
      }

      setWallet(data.wallet);
      await refreshWallet();

      setDepositSuccess(true);
      setDepositMessage(data.message || "Demo money added successfully!");
      setDepositAmount("");
    } catch (err) {
      console.error("Deposit error:", err);
      setDepositMessage("Unable to connect to the server.");
    } finally {
      setDepositLoading(false);
    }
  }

  // Send money to another PayNext user
 
async function handleSendMoney(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setTransferMessage("");
  setTransferSuccess(false);
  setReceiverName("");
  setShowForgotPin(false);

  const amount = Number(transferAmount);
  const phone = receiverPhone.trim();

  if (!/^\+?[0-9]{10,15}$/.test(phone)) {
    setTransferMessage("Please enter a valid receiver phone number.");
    return;
  }

  if (
    !transferAmount.trim() ||
    !Number.isFinite(amount) ||
    amount < 100 ||
    amount > 100000 ||
    !/^\d+(\.\d{1,2})?$/.test(transferAmount.trim())
  ) {
    setTransferMessage("Enter an amount between Rs. 100 and Rs. 100,000.");
    return;
  }

  if (amount > Number(wallet?.balance ?? 0)) {
    setTransferMessage("Insufficient wallet balance.");
    return;
  }

  if (!/^\d{6}$/.test(transactionPin)) {
    setTransferMessage("Please enter your 6-digit Transaction PIN.");
    return;
  }

  setTransferLoading(true);

  try {
    const response = await fetch("/api/wallet/transfer", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        amount: transferAmount.trim(),
        transactionPin,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.blocked) {
        await refreshWallet();
        setShowForgotPin(false);

        setTransferMessage(
          `${data.message} Risk Score: ${data.riskScore}/100. Your money was not transferred.`
        );
      } else {
        setTransferMessage(data.message || "Transfer failed.");

        if (
          data.code === "INVALID_PIN" ||
          data.code === "PIN_LOCKED"
        ) {
          setShowForgotPin(true);
        } else {
          setShowForgotPin(false);
        }
      }

      return;
    }

    setReceiverName(data.receiver?.name || "PayNext User");

    await refreshWallet();

    setTransferSuccess(true);
    setTransferMessage(data.message || "Money transferred successfully!");
    setTransactionPin("");

    setTransferAmount("");
    setReceiverPhone("");
  } catch (err) {
    console.error("Transfer error:", err);
    setTransferMessage("Unable to connect to the server.");
  } finally {
    setTransferLoading(false);
  }
}


  // Format Pakistani currency
  function formatAmount(amount: number | string) {
    return Number(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Format transaction date
  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // Loading screen
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white">
            <Wallet size={28} />
          </div>
          <p className="font-semibold text-teal-700">
            Loading your PayNext account...
          </p>
        </div>
      </div>
    );
  }

  // Authentication screen
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-white">
            <Wallet size={32} />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-800">
            Pay<span className="text-teal-600">Next</span>
          </h1>

          <h2 className="mt-5 text-xl font-bold text-slate-800">
            Login Required
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {error || "Please sign in to access your PayNext dashboard."}
          </p>

          <div className="mt-7 space-y-3">
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <LockKeyhole size={17} />
              Sign In to PayNext
            </Link>

            <Link
              href="/register"
              className="flex w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Create New Account
            </Link>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-teal-600" />
            Your account is protected by authentication.
          </div>

          <p className="mt-6 text-xs text-slate-400">
            © 2026 PayNext · Educational Project
          </p>
        </div>
      </main>
    );
  }

  const balance = formatAmount(wallet?.balance ?? 0);
  const currency = wallet?.currency ?? "PKR";

  // Calculate transaction statistics
  const completedTransactions = transactions.filter(
    (transaction) => transaction.status === "COMPLETED"
  );

  const moneyReceived = completedTransactions
    .filter((transaction) => transaction.receiverId === user.id)
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const moneySent = completedTransactions
    .filter(
      (transaction) =>
        transaction.senderId === user.id && transaction.type !== "DEPOSIT"
    )
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const activeAlerts = fraudAlerts.filter(
    (alert) => alert.status !== "CLEARED"
  );

  const searchItems = [
    { name: "Dashboard", description: "View your wallet dashboard", href: "/" },
    {
      name: "Transactions",
      description: "Search transaction history",
      href: "/transactions",
    },
    {
      name: "Mobile Top-up",
      description: "Recharge your mobile",
      href: "/topup",
    },
    {
      name: "Bill Payments",
      description: "Pay electricity, gas and water bills",
      href: "/bill-payments",
    },
    {
      name: "Security Center",
      description: "View security alerts and activity",
      href: "/security",
    },
    {
      name: "KYC Verification",
      description: "Manage identity verification",
      href: "/kyc",
    },
    {
      name: "Settings",
      description: "Manage your account settings",
      href: "/settings",
    },
  ];

  const filteredServices = searchItems.filter((item) =>
    `${item.name} ${item.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter((transaction) =>
    `${transaction.reference} ${transaction.type} ${transaction.status} ${
      transaction.description || ""
    }`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const blockedAlerts = fraudAlerts.filter(
    (alert) => alert.status === "BLOCKED"
  );

  const reviewAlerts = fraudAlerts.filter(
    (alert) => alert.status === "REVIEW"
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-7 md:flex">
          <div className="mb-12 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Wallet size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Pay<span className="text-teal-600">Next</span>
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                Digital Wallet
              </p>
            </div>
          </div>

          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
          </p>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.name === "Dashboard";

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon size={19} />
                  {item.name}

                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-teal-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl bg-[#10243b] p-5 text-white">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="text-teal-400" size={20} />
              <span className="text-sm font-semibold">Stay Protected</span>
            </div>

            <p className="text-xs leading-5 text-slate-300">
              Keep your account secure with additional verification.
            </p>

            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-300">
              Security matters <LockKeyhole size={13} />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex-1">
          {/* Topbar */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 md:px-9">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Welcome back, {user.fullName.split(" ")[0]}!
              </h2>
              <p className="text-xs text-slate-400">
                Here's your financial overview.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-teal-500">
                <Search size={17} className="text-slate-400" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowSearchResults(false);
                      setSearchTerm("");
                    }
                  }}
                  placeholder="Search anything..."
                  className="w-full bg-transparent text-xs outline-none"
                />

                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setShowSearchResults(false);
                    }}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {showSearchResults && searchTerm.trim() && (
                <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-full min-w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  {filteredServices.length > 0 && (
                    <>
                      <p className="mb-2 text-xs font-bold uppercase text-slate-400">
                        Services
                      </p>

                      {filteredServices.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            setSearchTerm("");
                            setShowSearchResults(false);
                          }}
                          className="block rounded-lg p-3 hover:bg-teal-50"
                        >
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            {item.description}
                          </p>
                        </Link>
                      ))}
                    </>
                  )}

                  {filteredTransactions.length > 0 && (
                    <>
                      <p className="mb-2 mt-3 border-t pt-3 text-xs font-bold uppercase text-slate-400">
                        Transactions
                      </p>

                      {filteredTransactions.slice(0, 5).map((transaction) => (
                        <Link
                          key={transaction.id}
                          href="/transactions"
                          onClick={() => {
                            setSearchTerm("");
                            setShowSearchResults(false);
                          }}
                          className="block rounded-lg p-3 hover:bg-teal-50"
                        >
                          <p className="text-sm font-semibold">
                            {transaction.type.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs text-slate-400">
                            {transaction.reference} · Rs.{" "}
                            {formatAmount(transaction.amount)}
                          </p>
                        </Link>
                      ))}
                    </>
                  )}

                  {filteredServices.length === 0 &&
                    filteredTransactions.length === 0 && (
                      <p className="py-5 text-center text-xs text-slate-400">
                        No results found.
                      </p>
                    )}
                </div>
              )}
            </div>
          </header>

          {/* Dashboard */}
          <div className="mx-auto max-w-7xl px-5 py-8 md:px-9">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Dashboard Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your finances securely in one place.
                </p>
              </div>

              <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                EDUCATIONAL DEMO
              </span>
            </div>

            {/* Balance and security cards */}
            <div className="grid gap-5 lg:grid-cols-3">
              <div
                id="wallet"
                className="relative overflow-hidden rounded-2xl bg-[#10243b] p-7 text-white shadow-lg lg:col-span-2"
              >
                <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[35px] border-white/5" />
                <div className="absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-300">
                      Total Available Balance
                    </p>
                    <Wallet className="text-teal-400" size={23} />
                  </div>

                  <h3 className="mt-5 text-4xl font-bold tracking-tight">
                    {currency} {balance}
                  </h3>

                  <p className="mt-2 text-xs text-slate-400">
                    Pakistani Rupee (PKR)
                  </p>

                  <div className="mt-9 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setShowDepositModal(true);
                        setDepositMessage("");
                        setDepositSuccess(false);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-400"
                    >
                      <Plus size={17} />
                      Add Demo Money
                    </button>

                    <button
                      onClick={() => {
                        setShowTransferModal(true);
                        setTransferMessage("");
                        setTransferSuccess(false);
                        setReceiverName("");
                        setShowForgotPin(false);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <ArrowUpRight size={17} />
                      Send Money
                    </button>

                    <button
                      disabled
                      className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white opacity-70"
                    >
                      <ArrowDownLeft size={17} />
                      Receive Money
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
                    <ShieldCheck size={23} />
                  </div>

                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    Active
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold">Account Security</h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your account security overview and protection status.
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs font-medium text-slate-500">
                    Security monitoring
                  </span>
                  <Activity size={18} className="text-teal-600" />
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {activeAlerts.length === 0
                    ? "No active fraud alerts."
                    : `${activeAlerts.length} active security alert(s).`}
                </p>
              </div>
            </div>

            {/* Dynamic Stats */}
            <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Total Transactions",
                  value: transactions.length.toString(),
                  icon: ArrowLeftRight,
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  title: "Money Received",
                  value: `Rs. ${formatAmount(moneyReceived)}`,
                  icon: ArrowDownLeft,
                  color: "bg-teal-50 text-teal-600",
                },
                {
                  title: "Money Sent",
                  value: `Rs. ${formatAmount(moneySent)}`,
                  icon: ArrowUpRight,
                  color: "bg-orange-50 text-orange-600",
                },
                {
                  title: "Security Alerts",
                  value: activeAlerts.length.toString(),
                  icon: ShieldCheck,
                  color: "bg-purple-50 text-purple-600",
                },
              ].map((stat) => (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      {stat.title}
                    </p>
                    <div className={`rounded-lg p-2 ${stat.color}`}>
                      <stat.icon size={19} />
                    </div>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold tracking-tight">
                    {stat.value}
                  </h3>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-bold">Quick Services</h3>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  {
                    name: "Mobile Top-up",
                    icon: Smartphone,
                    href: "/topup",
                  },
                  {
                    name: "Bill Payments",
                    icon: CreditCard,
                    href: "/bill-payments",
                  },
                  {
                    name: "Transactions",
                    icon: ArrowLeftRight,
                    href: "/transactions",
                  },
                  {
                    name: "Security Center",
                    icon: ShieldCheck,
                    href: "/security",
                  },
                ].map((service) => {
                  const Icon = service.icon;

                  return (
                    <Link
                      key={service.name}
                      href={service.href}
                      className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-md"
                    >
                      <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
                        <Icon size={23} />
                      </div>

                      <span className="text-xs font-semibold">
                        {service.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Security Monitoring */}
            <div className="mt-8">
              <div className="mb-5">
                <h3 className="text-lg font-bold">Security Monitoring</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Fraud detection and account security activity
                </p>
              </div>

              {/* Security Summary */}
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      Total Fraud Alerts
                    </p>
                    <ShieldCheck size={20} className="text-purple-600" />
                  </div>
                  <h4 className="mt-3 text-2xl font-bold">
                    {fraudAlerts.length}
                  </h4>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      Blocked Transactions
                    </p>
                    <LockKeyhole size={20} className="text-red-600" />
                  </div>
                  <h4 className="mt-3 text-2xl font-bold">
                    {blockedAlerts.length}
                  </h4>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      Review Required
                    </p>
                    <AlertTriangle size={20} className="text-amber-600" />
                  </div>
                  <h4 className="mt-3 text-2xl font-bold">
                    {reviewAlerts.length}
                  </h4>
                </div>
              </div>

              {/* Fraud Alerts */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">Fraud Detection Alerts</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Suspicious transaction activity
                    </p>
                  </div>

                  <ShieldCheck size={22} className="text-teal-600" />
                </div>

                {securityLoading ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Loading security alerts...
                  </p>
                ) : fraudAlerts.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2
                      size={32}
                      className="mx-auto text-teal-600"
                    />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No suspicious activity detected
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Your fraud alerts will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fraudAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-800">
                            {alert.status === "BLOCKED"
                              ? "Transaction Blocked"
                              : alert.status === "REVIEW"
                              ? "Transaction Requires Review"
                              : "Fraud Alert"}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              alert.status === "BLOCKED"
                                ? "bg-red-100 text-red-700"
                                : alert.status === "REVIEW"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-teal-100 text-teal-700"
                            }`}
                          >
                            {alert.status}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-slate-600">
                          {alert.reason}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                          <div>
                            <p className="text-xs text-slate-400">Risk Score</p>
                            <p className="mt-1 text-lg font-bold text-slate-800">
                              {alert.riskScore}/100
                            </p>
                          </div>

                          {alert.transaction && (
                            <div className="text-right">
                              <p className="text-xs text-slate-400">
                                Transaction Amount
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-800">
                                Rs. {formatAmount(alert.transaction.amount)}
                              </p>
                            </div>
                          )}
                        </div>

                        {alert.transaction && (
                          <p className="mt-2 break-all text-[11px] text-slate-400">
                            Reference: {alert.transaction.reference}
                          </p>
                        )}

                        <p className="mt-2 text-[11px] text-slate-400">
                          {formatDate(alert.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Activity Logs */}
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">Security Activity Logs</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Recent account security events
                    </p>
                  </div>
                  <Activity size={22} className="text-teal-600" />
                </div>

                {securityLoading ? (
                  <p className="py-5 text-center text-sm text-slate-400">
                    Loading activity...
                  </p>
                ) : securityLogs.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    No security activity recorded yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {securityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                          <ShieldCheck size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">
                            {log.action.replaceAll("_", " ")}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {log.details || "Security event recorded."}
                          </p>

                          <p className="mt-2 text-[11px] text-slate-400">
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Recent Transactions</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Your latest wallet activity
                  </p>
                </div>

                <Link
                  href="/transactions"
                  className="flex items-center gap-1 text-xs font-semibold text-teal-700 transition hover:text-teal-800"
                >
                  View All <ChevronRight size={15} />
                </Link>
              </div>

              {walletLoading ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Loading transactions...
                </p>
              ) : transactions.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <ArrowLeftRight size={22} />
                  </div>

                  <p className="text-sm font-semibold text-slate-600">
                    No transactions yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Your wallet activity will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {transactions.map((transaction) => {
                    const incoming =
                      transaction.receiverId === user.id ||
                      transaction.type === "DEPOSIT";

                    const title =
                      transaction.description ||
                      (incoming
                        ? "Money Received"
                        : transaction.type.replaceAll("_", " "));

                    const initials = incoming
                      ? transaction.type === "DEPOSIT"
                        ? "DP"
                        : "IN"
                      : "PN";

                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold capitalize">
                              {title.toLowerCase()}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-400">
                              {formatDate(transaction.createdAt)}
                              {" · "}
                              {transaction.status}
                            </p>
                          </div>
                        </div>

                        <p
                          className={`shrink-0 text-sm font-bold ${
                            incoming ? "text-teal-600" : "text-slate-800"
                          }`}
                        >
                          {incoming ? "+" : "-"} Rs.{" "}
                          {formatAmount(transaction.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-6 text-xs text-slate-400">
              <p>© 2026 PayNext. Educational Project.</p>
              <div className="flex items-center gap-2">
                <CircleHelp size={15} />
                <span>Security First · Built for Pakistan</span>
              </div>
            </footer>
          </div>
        </section>
      </div>

      {/* Add Demo Money Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <Wallet size={25} />
                </div>

                <h2 className="text-xl font-bold text-slate-800">
                  Add Demo Money
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add simulated funds to your PayNext wallet.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!depositLoading) {
                    setShowDepositModal(false);
                    setDepositMessage("");
                    setDepositSuccess(false);
                  }
                }}
                disabled={depositLoading}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mb-5 rounded-xl bg-[#10243b] p-4 text-white">
              <p className="text-xs text-slate-300">Current Wallet Balance</p>
              <p className="mt-2 text-2xl font-bold">
                {currency} {balance}
              </p>
            </div>

            <form onSubmit={handleAddMoney}>
              <label
                htmlFor="depositAmount"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Enter Deposit Amount (PKR)
              </label>

              <div className="flex items-center rounded-xl border border-slate-200 px-4 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                <span className="font-semibold text-slate-400">Rs.</span>
                <input
                  id="depositAmount"
                  type="number"
                  min="100"
                  max="100000"
                  step="0.01"
                  value={depositAmount}
                  onChange={(event) => {
                    setDepositAmount(event.target.value);
                    setDepositMessage("");
                    setDepositSuccess(false);
                  }}
                  placeholder="Enter amount"
                  disabled={depositLoading}
                  className="w-full border-0 bg-transparent px-3 py-4 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Minimum Rs. 100 · Maximum Rs. 100,000
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[500, 1000, 5000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={depositLoading}
                    onClick={() => {
                      setDepositAmount(amount.toString());
                      setDepositMessage("");
                      setDepositSuccess(false);
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
                  >
                    Rs. {amount.toLocaleString("en-PK")}
                  </button>
                ))}
              </div>

              {depositMessage && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${
                    depositSuccess
                      ? "bg-teal-50 text-teal-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {depositSuccess && (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  )}
                  <p>{depositMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={depositLoading || depositSuccess}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {depositLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : depositSuccess ? (
                  <>
                    <CheckCircle2 size={18} />
                    Money Added Successfully
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Money to Wallet
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
              This is a simulated educational transaction. No real money will
              be transferred.
            </p>

            {depositSuccess && (
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositMessage("");
                  setDepositSuccess(false);
                }}
                className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Send Money Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <Send size={24} />
                </div>

                <h2 className="text-xl font-bold text-slate-800">Send Money</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Transfer money to another PayNext user.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!transferLoading) {
                    setShowTransferModal(false);
                    setTransferMessage("");
                    setTransferSuccess(false);
                    setShowForgotPin(false);
                  }
                }}
                disabled={transferLoading}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            {/* Current Balance */}
            <div className="mb-5 rounded-xl bg-[#10243b] p-4 text-white">
              <p className="text-xs text-slate-300">Available Wallet Balance</p>

              <p className="mt-2 text-2xl font-bold">
                {currency} {balance}
              </p>
            </div>

            {transferSuccess ? (
              /* Transfer Success Screen */
              <div className="py-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <CheckCircle2 size={38} />
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-800">
                  Transfer Successful!
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Your simulated transfer has been completed successfully.
                </p>

                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs text-slate-500">Sent to</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {receiverName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-xs text-slate-500">
                      Updated balance
                    </span>
                    <span className="text-sm font-bold text-teal-700">
                      {currency} {balance}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferMessage("");
                    setTransferSuccess(false);
                    setReceiverName("");
                  }}
                  className="mt-6 w-full rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Transfer Form */
              <form onSubmit={handleSendMoney}>
                <label
                  htmlFor="receiverPhone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Receiver Phone Number
                </label>

                <div className="flex items-center rounded-xl border border-slate-200 px-4 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                  <User size={18} className="shrink-0 text-slate-400" />

                  <input
                    id="receiverPhone"
                    type="tel"
                    value={receiverPhone}
                    onChange={(event) => {
                      setReceiverPhone(event.target.value);
                      setTransferMessage("");
                    }}
                    placeholder="Enter registered phone number"
                    disabled={transferLoading}
                    className="w-full border-0 bg-transparent px-3 py-4 text-sm text-slate-800 outline-none"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Enter the phone number linked to the receiver's PayNext
                  account.
                </p>

                <label
                  htmlFor="transferAmount"
                  className="mb-2 mt-5 block text-sm font-semibold text-slate-700"
                >
                  Transfer Amount (PKR)
                </label>

                <div className="flex items-center rounded-xl border border-slate-200 px-4 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                  <span className="font-semibold text-slate-400">Rs.</span>

                  <input
                    id="transferAmount"
                    type="number"
                    min="100"
                    max="100000"
                    step="0.01"
                    value={transferAmount}
                    onChange={(event) => {
                      setTransferAmount(event.target.value);
                      setTransferMessage("");
                    }}
                    placeholder="Enter amount"
                    disabled={transferLoading}
                    className="w-full border-0 bg-transparent px-3 py-4 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Minimum Rs. 100 · Maximum Rs. 100,000
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[500, 1000, 5000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={transferLoading}
                      onClick={() => {
                        setTransferAmount(amount.toString());
                        setTransferMessage("");
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
                    >
                      Rs. {amount.toLocaleString("en-PK")}
                    </button>
                  ))}
                </div>

                {/* Transaction PIN */}
                <label
                  htmlFor="transactionPin"
                  className="mb-2 mt-5 block text-sm font-semibold text-slate-700"
                >
                  Transaction PIN
                </label>

                <div className="flex items-center rounded-xl border border-slate-200 px-4 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                  <LockKeyhole size={18} className="shrink-0 text-slate-400" />

                  <input
                    id="transactionPin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={transactionPin}
                    onChange={(event) => {
                      setTransactionPin(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      );
                      setTransferMessage("");
                      setShowForgotPin(false);
                    }}
                    placeholder="Enter your 6-digit PIN"
                    disabled={transferLoading}
                    className="w-full border-0 bg-transparent px-3 py-4 text-sm text-slate-800 outline-none"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Enter your separate 6-digit security PIN to authorize this
                  transfer.
                </p>

                {transferMessage && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                    <p>{transferMessage}</p>
                  </div>
                )}

                {showForgotPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPinOpen(true);
                      setForgotPinStep("cnic");
                      setForgotPinMessage("");
                      setForgotCnic("");
                      setForgotOtp("");
                      setResetNewPin("");
                      setResetConfirmPin("");
                      setMaskedEmail("");
                    }}
                    className="mt-3 text-sm font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-800"
                  >
                    Forgot Transaction PIN?
                  </button>
                )}

                <button
                  type="submit"
                  disabled={transferLoading}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {transferLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing Transfer...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Send Money
                    </>
                  )}
                </button>
              </form>
            )}
            <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
              Educational simulation only. No real money is transferred.
            </p>
          </div>
        </div>
      )}

      {/* Forgot Transaction PIN Modal */}
      {forgotPinOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <LockKeyhole size={25} />
                </div>

                <h2 className="text-xl font-bold text-slate-800">
                  Reset Transaction PIN
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {forgotPinStep === "cnic"
                    ? "Verify your identity to recover your PIN."
                    : "Verify your email OTP and create a new PIN."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!forgotPinLoading) {
                    setForgotPinOpen(false);
                    setForgotPinMessage("");
                  }
                }}
                disabled={forgotPinLoading}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-teal-500" />
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  forgotPinStep === "otp" ? "bg-teal-500" : "bg-slate-200"
                }`}
              />
            </div>

            {forgotPinStep === "cnic" ? (
              <form onSubmit={handleSendPinOtp}>
                <label
                  htmlFor="forgotCnic"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  CNIC Number
                </label>

                <input
                  id="forgotCnic"
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={forgotCnic}
                  onChange={(event) => {
                    setForgotCnic(
                      event.target.value.replace(/\D/g, "").slice(0, 13)
                    );
                    setForgotPinMessage("");
                  }}
                  placeholder="Enter 13-digit CNIC"
                  disabled={forgotPinLoading}
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Enter the CNIC registered with your approved PayNext KYC.
                </p>

                <button
                  type="submit"
                  disabled={forgotPinLoading}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {forgotPinLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send Email OTP"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPin}>
                <div className="mb-5 rounded-xl bg-teal-50 p-4">
                  <p className="text-xs text-teal-700">
                    An OTP has been sent to your registered email:
                  </p>
                  <p className="mt-1 break-all text-sm font-bold text-teal-800">
                    {maskedEmail}
                  </p>
                </div>

                <label
                  htmlFor="forgotOtp"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email OTP
                </label>

                <input
                  id="forgotOtp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={forgotOtp}
                  onChange={(event) => {
                    setForgotOtp(
                      event.target.value.replace(/\D/g, "").slice(0, 6)
                    );
                    setForgotPinMessage("");
                  }}
                  placeholder="Enter 6-digit OTP"
                  disabled={forgotPinLoading}
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />

                <label
                  htmlFor="resetNewPin"
                  className="mb-2 mt-5 block text-sm font-semibold text-slate-700"
                >
                  New Transaction PIN
                </label>

                <input
                  id="resetNewPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetNewPin}
                  onChange={(event) => {
                    setResetNewPin(
                      event.target.value.replace(/\D/g, "").slice(0, 6)
                    );
                    setForgotPinMessage("");
                  }}
                  placeholder="Enter new 6-digit PIN"
                  disabled={forgotPinLoading}
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />

                <label
                  htmlFor="resetConfirmPin"
                  className="mb-2 mt-5 block text-sm font-semibold text-slate-700"
                >
                  Confirm New PIN
                </label>

                <input
                  id="resetConfirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetConfirmPin}
                  onChange={(event) => {
                    setResetConfirmPin(
                      event.target.value.replace(/\D/g, "").slice(0, 6)
                    );
                    setForgotPinMessage("");
                  }}
                  placeholder="Confirm new 6-digit PIN"
                  disabled={forgotPinLoading}
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />

                <button
                  type="submit"
                  disabled={forgotPinLoading}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {forgotPinLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      Verify OTP & Reset PIN
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={forgotPinLoading}
                  onClick={() => {
                    setForgotPinStep("cnic");
                    setForgotPinMessage("");
                    setForgotOtp("");
                    setResetNewPin("");
                    setResetConfirmPin("");
                  }}
                  className="mt-3 w-full text-sm font-semibold text-slate-500 hover:text-teal-700"
                >
                  Back
                </button>
              </form>
            )}

            {forgotPinMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                <p>{forgotPinMessage}</p>
              </div>
            )}

            <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">
              Your identity is verified through your approved KYC details. OTP
              expires after 10 minutes.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}