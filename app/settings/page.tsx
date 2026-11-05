
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet, ArrowLeft, User, ShieldCheck, LockKeyhole,
  Bell, Palette, Globe, Eye, EyeOff, FileText,
  HelpCircle, LogOut, Save, Moon, Sun, Monitor,
  ChevronRight, CheckCircle2, AlertTriangle, Mail,
  Smartphone, KeyRound, X, Menu, RefreshCw
} from "lucide-react";

type Theme = "light" | "dark" | "system";

type Preferences = {
  theme: Theme;
  transactionAlerts: boolean;
  securityAlerts: boolean;
  promotionalAlerts: boolean;
  hideBalance: boolean;
  language: string;
  currency: string;
};

const defaultPreferences: Preferences = {
  theme: "light",
  transactionAlerts: true,
  securityAlerts: true,
  promotionalAlerts: false,
  hideBalance: false,
  language: "English",
  currency: "PKR",
};

const sections = [
  { id: "account", label: "Account Information", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy & Security", icon: LockKeyhole },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: Globe },
  { id: "policy", label: "Privacy Policy", icon: FileText },
  { id: "terms", label: "Terms & Conditions", icon: ShieldCheck },
  { id: "support", label: "Help & Support", icon: HelpCircle },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("account");
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);

  const [user, setUser] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  });

  // Transaction PIN states
  const [hasTransactionPin, setHasTransactionPin] = useState(false);

  const [pinForm, setPinForm] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
  });

  const [showPin, setShowPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState("");
  const [pinError, setPinError] = useState("");

  // Forgot PIN states
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [forgotPinStep, setForgotPinStep] =
    useState<"cnic" | "otp">("cnic");

  const [forgotCnic, setForgotCnic] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [forgotPinLoading, setForgotPinLoading] = useState(false);
  const [forgotPinMessage, setForgotPinMessage] = useState("");
  const [forgotPinError, setForgotPinError] = useState("");
  const [showResetPin, setShowResetPin] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("paynext_preferences");

    if (saved) {
      try {
        setPreferences({
          ...defaultPreferences,
          ...JSON.parse(saved),
        });
      } catch {
        setPreferences(defaultPreferences);
      }
    }

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok && data.user) {
          setUser({
            fullName: data.user.fullName || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
          });

          setHasTransactionPin(
            Boolean(data.user.hasTransactionPin)
          );
        }
      } catch (error) {
        console.error("Settings user loading error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    const dark =
      preferences.theme === "dark" ||
      (preferences.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", dark);
  }, [preferences.theme]);

  function updatePreference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) {
    setPreferences((previous) => {
      const updated = { ...previous, [key]: value };
      localStorage.setItem("paynext_preferences", JSON.stringify(updated));
      return updated;
    });

    setMessage("Preference updated successfully.");
  }

  function selectSection(id: string) {
    setActiveSection(id);
    setMessage("");
    setPinMessage("");
    setPinError("");
    setForgotPinError("");
    setShowMobileMenu(false);
  }

  function savePreferences() {
    setSaving(true);

    localStorage.setItem(
      "paynext_preferences",
      JSON.stringify(preferences)
    );

    setTimeout(() => {
      setSaving(false);
      setMessage("Your settings have been saved successfully.");
    }, 400);
  }

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        window.location.href = "/login";
      } else {
        setMessage("Unable to logout. Please try again.");
      }
    } catch {
      setMessage("Unable to connect to the server.");
    }
  }

  async function handlePasswordChange(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!passwords.current || !passwords.newPassword || !passwords.confirm) {
      setMessage("Please fill in all password fields.");
      return;
    }

    if (passwords.newPassword.length < 8) {
      setMessage("New password must contain at least 8 characters.");
      return;
    }

    if (passwords.newPassword !== passwords.confirm) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    setMessage(
      "Password change API is not connected yet. This feature needs a secure backend endpoint."
    );
  }

  // Set or change Transaction PIN
  async function handlePinSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPinMessage("");
    setPinError("");

    if (!/^\d{6}$/.test(pinForm.newPin)) {
      setPinError("New Transaction PIN must contain exactly 6 digits.");
      return;
    }

    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinError("New PIN and confirmation PIN do not match.");
      return;
    }

    if (hasTransactionPin) {
      if (!/^\d{6}$/.test(pinForm.currentPin)) {
        setPinError("Current PIN must contain exactly 6 digits.");
        return;
      }

      if (pinForm.currentPin === pinForm.newPin) {
        setPinError("New PIN must be different from your current PIN.");
        return;
      }
    }

    setPinLoading(true);

    try {
      const endpoint = hasTransactionPin
        ? "/api/auth/pin/change"
        : "/api/auth/pin/setup";

      const body = hasTransactionPin
        ? {
            currentPin: pinForm.currentPin,
            newPin: pinForm.newPin,
            confirmPin: pinForm.confirmPin,
          }
        : {
            pin: pinForm.newPin,
            confirmPin: pinForm.confirmPin,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setPinError(data.message || "Unable to update Transaction PIN.");
        return;
      }

      setHasTransactionPin(true);
      setPinMessage(data.message || "Transaction PIN saved successfully.");

      setPinForm({
        currentPin: "",
        newPin: "",
        confirmPin: "",
      });
    } catch (error) {
      console.error("Transaction PIN error:", error);
      setPinError("Unable to connect to the server. Please try again.");
    } finally {
      setPinLoading(false);
    }
  }

  // Send OTP for forgotten PIN
  async function handleSendPinOtp(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setForgotPinMessage("");
    setForgotPinError("");

    const cnic = forgotCnic.replace(/\D/g, "");

    if (!/^\d{13}$/.test(cnic)) {
      setForgotPinError("Please enter a valid 13-digit CNIC number.");
      return;
    }

    setForgotPinLoading(true);

    try {
      const response = await fetch("/api/auth/pin/forget/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ cnic }),
      });

      const data = await response.json();

      if (!response.ok) {
        setForgotPinError(data.message || "Unable to send OTP.");
        return;
      }

      setMaskedEmail(data.maskedEmail || "your registered email");
      setForgotPinStep("otp");
      setForgotPinMessage(
        data.message || "OTP sent to your registered email."
      );
    } catch (error) {
      console.error("PIN OTP sending error:", error);
      setForgotPinError("Unable to connect to the server.");
    } finally {
      setForgotPinLoading(false);
    }
  }

  // Verify OTP and reset PIN
  async function handleResetPin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setForgotPinMessage("");
    setForgotPinError("");

    const cnic = forgotCnic.replace(/\D/g, "");

    if (!/^\d{6}$/.test(forgotOtp)) {
      setForgotPinError("Please enter the 6-digit OTP.");
      return;
    }

    if (!/^\d{6}$/.test(resetNewPin)) {
      setForgotPinError("New PIN must contain exactly 6 digits.");
      return;
    }

    if (resetNewPin !== resetConfirmPin) {
      setForgotPinError("New PIN and confirmation PIN do not match.");
      return;
    }

    setForgotPinLoading(true);

    try {
      const response = await fetch("/api/auth/pin/forget/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cnic,
          otp: forgotOtp,
          newPin: resetNewPin,
          confirmPin: resetConfirmPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setForgotPinError(data.message || "Unable to reset PIN.");
        return;
      }

      setHasTransactionPin(true);

      setForgotPinMessage(
        data.message || "Transaction PIN reset successfully."
      );

      setPinMessage(
        "Your Transaction PIN has been reset successfully."
      );

      setShowForgotPin(false);
      setForgotPinStep("cnic");
      setForgotCnic("");
      setForgotOtp("");
      setResetNewPin("");
      setResetConfirmPin("");
      setMaskedEmail("");

      setPinForm({
        currentPin: "",
        newPin: "",
        confirmPin: "",
      });
    } catch (error) {
      console.error("PIN reset error:", error);
      setForgotPinError("Unable to connect to the server.");
    } finally {
      setForgotPinLoading(false);
    }
  }

  function closeForgotPin() {
    setShowForgotPin(false);
    setForgotPinStep("cnic");
    setForgotCnic("");
    setForgotOtp("");
    setResetNewPin("");
    setResetConfirmPin("");
    setMaskedEmail("");
    setForgotPinMessage("");
    setForgotPinError("");
  }

  const dark =
    preferences.theme === "dark" ||
    (preferences.theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const panel = dark
    ? "border-slate-700 bg-[#152b40]"
    : "border-slate-200 bg-white";

  const text = dark ? "text-white" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const field = dark
    ? "border-slate-600 bg-[#10243b] text-white"
    : "border-slate-200 bg-white text-slate-800";

  function Toggle({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (value: boolean) => void;
  }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-teal-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    );
  }

  function SettingRow({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 py-5 last:border-0">
        <div>
          <p className={`text-sm font-semibold ${text}`}>{title}</p>
          <p className={`mt-1 text-xs ${muted}`}>{description}</p>
        </div>
        {children}
      </div>
    );
  }

  function SectionHeading({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) {
    return (
      <div className="mb-6">
        <h2 className={`text-xl font-bold ${text}`}>{title}</h2>
        <p className={`mt-1 text-sm ${muted}`}>{description}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="text-center">
          <Wallet size={35} className="mx-auto mb-3 text-teal-600" />
          <p className="text-sm font-semibold text-teal-700">
            Loading PayNext Settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen ${dark ? "bg-[#0b1928]" : "bg-[#f5f7fb]"}`}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={`rounded-xl border p-2.5 ${panel} ${text}`}
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <h1 className={`text-2xl font-bold ${text}`}>
                Settings
              </h1>
              <p className={`mt-1 text-xs ${muted}`}>
                Customize your PayNext account and preferences.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700">
            <ShieldCheck size={16} />
            Account Settings
          </div>
        </header>

        {/* Mobile Menu */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className={`mb-4 flex w-full items-center justify-between rounded-xl border p-4 md:hidden ${panel} ${text}`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Menu size={18} /> Settings Menu
          </span>
          <ChevronRight size={18} />
        </button>

        <div className="grid gap-6 md:grid-cols-[250px_1fr]">

          {/* Sidebar */}
          <aside
            className={`${panel} h-fit rounded-2xl border p-3 shadow-sm ${
              showMobileMenu ? "block" : "hidden"
            } md:block`}
          >
            <div className="mb-4 rounded-xl bg-[#10243b] p-4 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-500 text-lg font-bold">
                {user.fullName
                  ? user.fullName.slice(0, 1).toUpperCase()
                  : "U"}
              </div>
              <p className="mt-3 text-sm font-bold">
                {user.fullName || "PayNext User"}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {user.email}
              </p>
            </div>

            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => selectSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${
                      active
                        ? "bg-teal-50 text-teal-700"
                        : `${muted} hover:bg-slate-100`
                    }`}
                  >
                    <Icon size={17} />
                    {section.label}
                    {active && (
                      <ChevronRight size={15} className="ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-slate-200 pt-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </aside>

          {/* Main Settings */}
          <section className={`${panel} min-w-0 rounded-2xl border p-5 shadow-sm sm:p-7`}>

            {message && (
              <div className="mb-5 flex items-start justify-between gap-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                  {message}
                </div>
                <button onClick={() => setMessage("")}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* ACCOUNT */}
            {activeSection === "account" && (
              <>
                <SectionHeading
                  title="Account Information"
                  description="View your personal PayNext account information."
                />

                <div className="mb-6 flex items-center gap-4 rounded-xl bg-teal-50 p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-xl font-bold text-white">
                    {user.fullName.slice(0, 1).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">
                      {user.fullName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      PayNext Account
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {[
                    { label: "Full Name", value: user.fullName, icon: User },
                    { label: "Email Address", value: user.email, icon: Mail },
                    { label: "Phone Number", value: user.phone, icon: Smartphone },
                  ].map((item) => (
                    <div key={item.label}>
                      <label className={`mb-2 block text-xs font-semibold ${muted}`}>
                        {item.label}
                      </label>
                      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${field}`}>
                        <item.icon size={17} className="text-teal-600" />
                        <span className="text-sm">
                          {item.value || "Not available"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className={`mt-5 text-xs ${muted}`}>
                  Profile editing is not connected yet. Your account details are displayed from your registered account.
                </p>
              </>
            )}

            {/* APPEARANCE */}
            {activeSection === "appearance" && (
              <>
                <SectionHeading
                  title="Appearance"
                  description="Choose how PayNext looks on your device."
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { value: "light", label: "Light Mode", icon: Sun, bg: "bg-white" },
                    { value: "dark", label: "Dark Mode", icon: Moon, bg: "bg-[#10243b]" },
                    { value: "system", label: "System Default", icon: Monitor, bg: "bg-slate-200" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const selected = preferences.theme === item.value;

                    return (
                      <button
                        key={item.value}
                        onClick={() => updatePreference("theme", item.value as Theme)}
                        className={`rounded-xl border-2 p-4 text-left transition ${
                          selected
                            ? "border-teal-500 bg-teal-50"
                            : "border-slate-200 hover:border-teal-300"
                        }`}
                      >
                        <div className={`mb-4 flex h-24 items-center justify-center rounded-lg ${item.bg}`}>
                          <Icon
                            size={32}
                            className={item.value === "dark" ? "text-white" : "text-slate-700"}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">
                            {item.label}
                          </span>
                          {selected && (
                            <CheckCircle2 size={17} className="text-teal-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-xl bg-teal-50 p-4 text-xs leading-6 text-teal-800">
                  Your selected theme is saved in this browser and will be remembered when you return.
                </div>
              </>
            )}

            {/* PRIVACY & SECURITY */}
            {activeSection === "privacy" && (
              <>
                <SectionHeading
                  title="Privacy & Security"
                  description="Manage your account protection, transaction PIN and privacy preferences."
                />

                <SettingRow
                  title="Hide Wallet Balance"
                  description="Hide your wallet balance when viewing your dashboard."
                >
                  <Toggle
                    checked={preferences.hideBalance}
                    onChange={(value) => updatePreference("hideBalance", value)}
                  />
                </SettingRow>

                <SettingRow
                  title="Two-Factor Authentication"
                  description="Additional verification through an OTP."
                >
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Not Connected
                  </span>
                </SettingRow>

                {/* TRANSACTION PIN */}
                <div className="mt-7 rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                        <LockKeyhole size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Transaction PIN
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">
                          Protect your wallet transfers with a 6-digit PIN.
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        hasTransactionPin
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {hasTransactionPin ? "PIN Active" : "Not Set"}
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl bg-white p-4">
                    <h4 className="text-sm font-bold text-slate-800">
                      {hasTransactionPin
                        ? "Change Transaction PIN"
                        : "Set Up Transaction PIN"}
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {hasTransactionPin
                        ? "Enter your current PIN and choose a new 6-digit PIN."
                        : "Create a separate 6-digit PIN to authorize your wallet transfers."}
                    </p>

                    {pinMessage && (
                      <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-700">
                        <CheckCircle2 size={16} className="shrink-0" />
                        {pinMessage}
                      </div>
                    )}

                    {pinError && (
                      <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                        <AlertTriangle size={16} className="shrink-0" />
                        {pinError}
                      </div>
                    )}

                    <form onSubmit={handlePinSubmit} className="mt-5 space-y-4">
                      {hasTransactionPin && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-600">
                            Current Transaction PIN
                          </label>
                          <input
                            type={showPin ? "text" : "password"}
                            inputMode="numeric"
                            maxLength={6}
                            autoComplete="off"
                            value={pinForm.currentPin}
                            onChange={(e) =>
                              setPinForm((previous) => ({
                                ...previous,
                                currentPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                              }))
                            }
                            placeholder="Enter current 6-digit PIN"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm tracking-[0.3em] text-slate-800 outline-none focus:border-teal-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-600">
                          New Transaction PIN
                        </label>
                        <input
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="new-password"
                          value={pinForm.newPin}
                          onChange={(e) =>
                            setPinForm((previous) => ({
                              ...previous,
                              newPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                            }))
                          }
                          placeholder="Enter new 6-digit PIN"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm tracking-[0.3em] text-slate-800 outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-600">
                          Confirm New PIN
                        </label>
                        <input
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="new-password"
                          value={pinForm.confirmPin}
                          onChange={(e) =>
                            setPinForm((previous) => ({
                              ...previous,
                              confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                            }))
                          }
                          placeholder="Re-enter new 6-digit PIN"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm tracking-[0.3em] text-slate-800 outline-none focus:border-teal-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-teal-700"
                      >
                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showPin ? "Hide PIN" : "Show PIN"}
                      </button>

                      <button
                        type="submit"
                        disabled={pinLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {pinLoading ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={17} />
                            {hasTransactionPin ? "Change PIN" : "Set Transaction PIN"}
                          </>
                        )}
                      </button>
                    </form>

                    {hasTransactionPin && (
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotPin(!showForgotPin);
                            setForgotPinError("");
                            setForgotPinMessage("");
                          }}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                        >
                          Forgot Transaction PIN?
                        </button>
                      </div>
                    )}

                    {/* FORGOT PIN / OTP RESET */}
                    {showForgotPin && hasTransactionPin && (
                      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">
                              Reset Transaction PIN
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                              Verify your identity using your registered email.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={closeForgotPin}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {forgotPinMessage && (
                          <div className="mb-4 rounded-lg bg-green-50 p-3 text-xs text-green-700">
                            {forgotPinMessage}
                          </div>
                        )}

                        {forgotPinError && (
                          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                            {forgotPinError}
                          </div>
                        )}

                        {forgotPinStep === "cnic" ? (
                          <form
                            onSubmit={handleSendPinOtp}
                            className="space-y-4"
                          >
                            <div>
                              <label className="mb-2 block text-xs font-semibold text-slate-600">
                                Registered CNIC Number
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={13}
                                value={forgotCnic}
                                onChange={(e) =>
                                  setForgotCnic(
                                    e.target.value.replace(/\D/g, "").slice(0, 13)
                                  )
                                }
                                placeholder="Enter 13-digit CNIC without dashes"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-teal-500"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={forgotPinLoading}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                            >
                              {forgotPinLoading ? "Sending OTP..." : "Send Email OTP"}
                              <Mail size={16} />
                            </button>
                          </form>
                        ) : (
                          <form
                            onSubmit={handleResetPin}
                            className="space-y-4"
                          >
                            <p className="rounded-lg bg-teal-50 p-3 text-xs text-teal-800">
                              Enter the OTP sent to {maskedEmail}.
                            </p>

                            <div>
                              <label className="mb-2 block text-xs font-semibold text-slate-600">
                                Email OTP
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={forgotOtp}
                                onChange={(e) =>
                                  setForgotOtp(
                                    e.target.value.replace(/\D/g, "").slice(0, 6)
                                  )
                                }
                                placeholder="Enter 6-digit OTP"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm tracking-[0.3em] text-slate-800 outline-none focus:border-teal-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-semibold text-slate-600">
                                New Transaction PIN
                              </label>
                              <input
                                type={showResetPin ? "text" : "password"}
                                inputMode="numeric"
                                maxLength={6}
                                value={resetNewPin}
                                onChange={(e) =>
                                  setResetNewPin(
                                    e.target.value.replace(/\D/g, "").slice(0, 6)
                                  )
                                }
                                placeholder="Enter new 6-digit PIN"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm tracking-[0.3em] text-slate-800 outline-none focus:border-teal-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-semibold text-slate-600">
                                Confirm New PIN
                              </label>
                              <input
                                type={showResetPin ? "text" : "password"}
                                inputMode="numeric"
                                maxLength={6}
                                value={resetConfirmPin}
                                onChange={(e) =>
                                  setResetConfirmPin(
                                    e.target.value.replace(/\D/g, "").slice(0, 6)
                                  )
                                }
                                placeholder="Confirm new 6-digit PIN"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm tracking-[0.3em] text-slate-800 outline-none focus:border-teal-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowResetPin(!showResetPin)}
                              className="flex items-center gap-2 text-xs font-semibold text-slate-500"
                            >
                              {showResetPin ? <EyeOff size={15} /> : <Eye size={15} />}
                              {showResetPin ? "Hide PIN" : "Show PIN"}
                            </button>

                            <button
                              type="submit"
                              disabled={forgotPinLoading}
                              className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                            >
                              {forgotPinLoading ? "Verifying..." : "Verify OTP & Reset PIN"}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setForgotPinStep("cnic");
                                setForgotOtp("");
                                setResetNewPin("");
                                setResetConfirmPin("");
                                setForgotPinMessage("");
                                setForgotPinError("");
                              }}
                              className="w-full text-xs font-semibold text-teal-700 hover:text-teal-900"
                            >
                              Back to CNIC verification
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Your Transaction PIN is stored as a secure hash and is different from your login password. Never share your PIN or email OTP with anyone.
                  </p>
                </div>

                {/* PASSWORD */}
                <div className="mt-8 border-t border-slate-200 pt-6">
                  <SettingRow
                    title="Change Password"
                    description="Update your account password."
                  >
                    <KeyRound size={20} className="text-teal-600" />
                  </SettingRow>

                  <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
                    <h3 className={`text-sm font-bold ${text}`}>
                      Password Change Request
                    </h3>

                    {[
                      { key: "current", label: "Current Password" },
                      { key: "newPassword", label: "New Password" },
                      { key: "confirm", label: "Confirm New Password" },
                    ].map((item) => (
                      <div key={item.key}>
                        <label className={`mb-2 block text-xs font-semibold ${muted}`}>
                          {item.label}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={passwords[item.key as keyof typeof passwords]}
                            onChange={(e) =>
                              setPasswords((previous) => ({
                                ...previous,
                                [item.key]: e.target.value,
                              }))
                            }
                            className={`w-full rounded-xl border px-4 py-3 pr-12 text-sm outline-none focus:border-teal-500 ${field}`}
                            placeholder={`Enter ${item.label.toLowerCase()}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-3 text-slate-400"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    ))}

                    <button className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700">
                      Submit Password Change Request
                    </button>
                  </form>

                  <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                    <AlertTriangle size={17} className="mb-2" />
                    Password changes and two-factor authentication require backend implementation. These controls are not active yet.
                  </div>
                </div>
              </>
            )}

            {/* NOTIFICATIONS */}
            {activeSection === "notifications" && (
              <>
                <SectionHeading
                  title="Notification Settings"
                  description="Choose which notifications you want to receive."
                />

                <SettingRow
                  title="Transaction Notifications"
                  description="Receive alerts about transfers and payments."
                >
                  <Toggle
                    checked={preferences.transactionAlerts}
                    onChange={(value) => updatePreference("transactionAlerts", value)}
                  />
                </SettingRow>

                <SettingRow
                  title="Security Notifications"
                  description="Receive alerts about suspicious account activity."
                >
                  <Toggle
                    checked={preferences.securityAlerts}
                    onChange={(value) => updatePreference("securityAlerts", value)}
                  />
                </SettingRow>

                <SettingRow
                  title="Promotional Notifications"
                  description="Receive updates about offers and announcements."
                >
                  <Toggle
                    checked={preferences.promotionalAlerts}
                    onChange={(value) => updatePreference("promotionalAlerts", value)}
                  />
                </SettingRow>

                <p className={`mt-5 text-xs ${muted}`}>
                  These preferences are saved locally. Actual email, SMS and push delivery is not connected.
                </p>
              </>
            )}

            {/* PREFERENCES */}
            {activeSection === "preferences" && (
              <>
                <SectionHeading
                  title="Regional Preferences"
                  description="Customize your language and currency display."
                />

                <div className="space-y-5">
                  <div>
                    <label className={`mb-2 block text-xs font-semibold ${muted}`}>
                      Language
                    </label>
                    <select
                      value={preferences.language}
                      onChange={(e) => updatePreference("language", e.target.value)}
                      className={`w-full rounded-xl border px-4 py-3 text-sm ${field}`}
                    >
                      <option>English</option>
                      <option>Urdu</option>
                    </select>
                  </div>

                  <div>
                    <label className={`mb-2 block text-xs font-semibold ${muted}`}>
                      Currency
                    </label>
                    <select
                      value={preferences.currency}
                      onChange={(e) => updatePreference("currency", e.target.value)}
                      className={`w-full rounded-xl border px-4 py-3 text-sm ${field}`}
                    >
                      <option value="PKR">PKR - Pakistani Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                    </select>
                  </div>
                </div>

                <p className={`mt-5 text-xs ${muted}`}>
                  Currency selection currently changes the saved preference only. Wallet calculations remain in PKR.
                </p>
              </>
            )}

            {/* PRIVACY POLICY */}
            {activeSection === "policy" && (
              <>
                <SectionHeading
                  title="Privacy Policy"
                  description="How the PayNext educational prototype handles information."
                />

                <div className={`space-y-5 text-sm leading-7 ${muted}`}>
                  <div>
                    <h3 className={`font-bold ${text}`}>1. Introduction</h3>
                    PayNext is a fictional digital wallet prototype developed for educational and cybersecurity demonstration purposes.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>2. Information Collection</h3>
                    The prototype may process demonstration account details, transaction records and security activity to demonstrate wallet functionality.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>3. Sensitive Information</h3>
                    Users should never submit real CNIC details, bank credentials, card numbers, OTPs or other sensitive financial information.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>4. Data Protection</h3>
                    The project demonstrates authentication, password hashing, access controls and security logging. These demonstrations do not guarantee production-level security.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>5. Data Usage</h3>
                    Demonstration data is used to display wallet activity, transaction history and security monitoring features.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>6. Third-Party Services</h3>
                    The prototype may use hosting, database or development services. Their own privacy policies may also apply.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>7. User Responsibility</h3>
                    Users should use fictional information and avoid entering actual financial or identity credentials.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>8. Policy Updates</h3>
                    This policy may be updated as the educational project develops.
                  </div>

                  <div className="rounded-xl bg-teal-50 p-4 text-xs text-teal-800">
                    Last updated: November 2026. This is a sample project privacy policy, not a legal document.
                  </div>
                </div>
              </>
            )}

            {/* TERMS */}
            {activeSection === "terms" && (
              <>
                <SectionHeading
                  title="Terms & Conditions"
                  description="Rules for using the PayNext educational prototype."
                />

                <div className={`space-y-5 text-sm leading-7 ${muted}`}>
                  <div>
                    <h3 className={`font-bold ${text}`}>1. Educational Purpose</h3>
                    PayNext is a student project and does not provide actual banking or payment services.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>2. No Real Transactions</h3>
                    All wallet deposits, transfers, mobile top-ups and bill payments are simulated. No real funds are transferred.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>3. Account Usage</h3>
                    Users must use fictional demonstration information and must not attempt unauthorized access.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>4. Security Demonstrations</h3>
                    Authentication, fraud scoring and security monitoring are educational demonstrations and are not guarantees against real-world attacks.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>5. Availability</h3>
                    Features may change, become unavailable or be reset during development.
                  </div>

                  <div>
                    <h3 className={`font-bold ${text}`}>6. Limitation</h3>
                    PayNext must not be used to store real money or conduct real financial transactions.
                  </div>

                  <div className="rounded-xl bg-teal-50 p-4 text-xs text-teal-800">
                    By using this demonstration, you acknowledge that PayNext is an educational prototype only.
                  </div>
                </div>
              </>
            )}

            {/* SUPPORT */}
            {activeSection === "support" && (
              <>
                <SectionHeading
                  title="Help & Support"
                  description="Information about using the PayNext platform."
                />

                <div className="space-y-4">
                  {[
                    {
                      q: "Is PayNext a real banking application?",
                      a: "No. PayNext is an educational prototype. No real money is transferred.",
                    },
                    {
                      q: "Why was my transaction blocked?",
                      a: "The demonstration fraud detection system may block transactions when its simulated risk score reaches the blocking threshold.",
                    },
                    {
                      q: "Can I use my real CNIC?",
                      a: "No. Always use fictional information in this educational project.",
                    },
                    {
                      q: "Are my settings saved?",
                      a: "Theme and preferences are stored in your current browser using local storage.",
                    },
                    {
                      q: "Does PayNext support real mobile recharges?",
                      a: "No. Mobile top-ups and bill payments are simulated demonstrations.",
                    },
                  ].map((item) => (
                    <div key={item.q} className="rounded-xl border border-slate-200 p-4">
                      <p className={`text-sm font-bold ${text}`}>{item.q}</p>
                      <p className={`mt-2 text-xs leading-6 ${muted}`}>{item.a}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-xl bg-teal-50 p-4">
                  <h3 className="font-bold text-teal-800">
                    Need Assistance?
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-teal-700">
                    For project-related support, contact your project administrator or development team.
                  </p>
                </div>
              </>
            )}

            {/* Save Button */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <p className={`text-xs ${muted}`}>
                PayNext · Your Money, Your Security.
              </p>

              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </section>
        </div>

        <footer className={`mt-8 border-t py-5 text-center text-xs ${muted}`}>
          © 2026 PayNext · Educational Project · Security First
        </footer>
      </div>
    </main>
  );
}
