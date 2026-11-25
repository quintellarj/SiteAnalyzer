import React, { useState } from "react";
import { Globe, LogIn, Shield, Lock, Mail, RefreshCw, AlertCircle, Zap } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (email: string, role: "user" | "admin") => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<"user" | "admin">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Por favor, insira o seu e-mail.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Por favor, insira um endereço de e-mail válido.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(email, "user");
    }, 800);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Por favor, insira o e-mail de administrador.");
      return;
    }

    if (!password) {
      setErrorMessage("Por favor, insira a senha de acesso.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      const adminPassword = import.meta.env.process.env.SERVER_ONLY_SECRET_KEY;

      if (
        adminEmail &&
        adminPassword &&
        email.toLowerCase() === adminEmail.toLowerCase() &&
        password === adminPassword
      ) {
        onLoginSuccess(email, "admin");
      } else {
        setErrorMessage("Credenciais incorretas de administrador ou não configuradas.");
      }
    }, 800);
  };

  const handleSimulatedGoogleSSO = () => {
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess("usuario.demonstracao@gmail.com", "user");
    }, 900);
  };

  return (
    <div
      id="login_container"
      className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(#18181B 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Ambient Electric Cyan & Vivid Violet Telemetry Glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-140 h-85 rounded-full bg-cyan-500/20 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 right-[-8%] w-105 h-80 rounded-full bg-fuchsia-600/15 blur-[120px] pointer-events-none" />

      {/* Main Glass Bento Card */}
      <div className="w-full max-w-md bento-card overflow-hidden relative z-10 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/90 to-transparent" />

        {/* Header branding */}
        <div className="p-7 text-center border-b border-slate-800/80 bg-obsidian/50">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-linear-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-[0_0_28px_rgba(6,182,212,0.45)] flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight text-zinc-100">
              SiteAnalyzer
            </h1>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full badge-ai-gemini">
              v2.0
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">
            Telemetria Real de Core Web Vitals, SEO Técnico & IA Gemini
          </p>
        </div>

        {/* Segmented Tab switcher */}
        <div className="p-2 border-b border-zinc-800/80 bg-zinc-950/30">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab("user");
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "user"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Usuário
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "admin"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-7">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === "user" ? (
            <form onSubmit={handleUserLogin} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="voce@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-indigo-glow py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                <span>Acessar Console de Telemetria</span>
              </button>

              <div className="relative my-5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <span className="relative bg-bento px-3 text-[10px] font-mono text-zinc-500 uppercase">
                  ou
                </span>
              </div>

              <button
                type="button"
                onClick={handleSimulatedGoogleSSO}
                disabled={isLoading}
                className="w-full bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 py-2.5 rounded-xl text-xs font-semibold border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Globe className="h-4 w-4 text-indigo-400" />
                <span>Entrar rápido em Modo Demonstração</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  E-mail do Administrador
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="admin@s7vendesign.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-indigo-glow py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                <span>Acessar Painel Administrativo</span>
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="text-center mt-6 text-[11px] text-zinc-500 z-10 font-mono">
        siteanalyzer.s7vendesign.com.br · Dark Telemetry Engine
      </p>
    </div>
  );
}
