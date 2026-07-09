import React, { useState } from "react";
import { Globe, LogIn, Shield, Lock, Mail, RefreshCw, AlertCircle } from "lucide-react";

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

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Por favor, insira um endereço de e-mail válido.");
      return;
    }

    // Google email warning check (optional feedback)
    const isGoogleEmail = email.endsWith("@gmail.com") || email.endsWith("@google.com");
    if (!isGoogleEmail) {
      // We still allow it but show a friendly simulation warning, or accept as a Google account.
      // Let's accept all valid emails but treat them as Google Accounts.
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(email, "user");
    }, 1200);
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
      // Validate credentials using Environment Variables
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

      if (adminEmail && adminPassword && email.toLowerCase() === adminEmail.toLowerCase() && password === adminPassword) {
        onLoginSuccess(email, "admin");
      } else {
        setErrorMessage("Credenciais incorretas de administrador ou não configuradas.");
      }
    }, 1000);
  };

  const handleSimulatedGoogleSSO = () => {
    setErrorMessage(null);
    setIsLoading(true);
    
    // Simulate beautiful Google single sign-on popup interaction
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess("usuario.demonstracao@gmail.com", "user");
    }, 1500);
  };

  return (
    <div id="login_container" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10 transition-all duration-300">
        
        {/* Header branding */}
        <div className="p-8 text-center border-b border-slate-800 bg-slate-950/40">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-300">
            <Globe className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            SiteAnalyzer <span className="text-xs bg-slate-800 text-blue-400 px-2 py-0.5 rounded-md font-mono border border-slate-700">v1.2</span>
          </h1>
          <p className="text-xs text-slate-400 mt-2">Plataforma de Auditoria Inteligente de SEO & Core Web Vitals</p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 p-1 bg-slate-950/20">
          <button
            type="button"
            onClick={() => {
              setActiveTab("user");
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "user"
                ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Acesso Usuário (Google)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "admin"
                ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Manutenção (Admin)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {errorMessage && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === "user" ? (
            <form onSubmit={handleUserLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  E-mail da Conta Google
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  Utilize sua conta pessoal ou corporativa hospedada no Google.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                <span>Acessar Painel de Auditoria</span>
              </button>

              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <span className="relative bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider font-bold">ou</span>
              </div>

              {/* Single Sign-On Button */}
              <button
                type="button"
                onClick={handleSimulatedGoogleSSO}
                disabled={isLoading}
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 py-3 rounded-xl text-xs font-bold border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {/* Simulated Google Logo Icon */}
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.336 2.69 1.345 6.618l3.92 3.147z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.491 12.273c0-.818-.073-1.609-.209-2.373H12v4.509h6.445a5.518 5.518 0 0 1-2.391 3.627l3.736 2.891c2.182-2.018 3.7-4.991 3.7-8.654z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.266 14.235a7.123 7.123 0 0 1-.373-2.235c0-.782.136-1.536.373-2.235L1.345 6.618A11.948 11.948 0 0 0 0 12c0 1.927.455 3.755 1.255 5.382l4.01-3.147z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.245 0 5.973-1.073 7.964-2.91l-3.736-2.891c-1.036.691-2.364 1.109-4.228 1.109-3.255 0-6.018-2.2-7.01-5.164L.98 17.273C2.982 21.236 6.99 24 12 24z"
                  />
                </svg>
                <span>Entrar rápido com Google SSO</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  E-mail do Administrador
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="admin@analisadorde-sites.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Senha de Acesso / Chave Admin
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[10px] text-slate-400 leading-relaxed">
                <span className="font-bold text-blue-400">Dica de Acesso:</span> Use o e-mail <code className="text-slate-200">admin@analisadorde-sites.com.br</code> e a senha <code className="text-slate-200">admin</code> para testar a manutenção.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                <span>Acessar Painel de Manutenção</span>
              </button>
            </form>
          )}
        </div>

      </div>

      <div className="text-center mt-6 text-[10px] text-slate-500 z-10 font-mono">
        Analisador de Sites & SEO S.A. | Todos os direitos reservados.
      </div>
    </div>
  );
}
