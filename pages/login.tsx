import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Demo mode: login with just email
      await api.login("demo", email, "demo");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-3 w-3 rounded-full bg-primary shadow-glow-primary" />
            <span className="text-xl font-semibold text-white">On-site Transit</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Iniciar Sesión
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Accede a tu panel de seguimiento de envíos
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          {/* Demo mode banner */}
          <div className="mb-6 rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-primary">
            <span className="font-medium">Modo Demo:</span> Ingresa cualquier email para acceder
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="tu@email.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar al Dashboard"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Los datos son de demostración y se guardan en tu navegador
          </p>
        </div>
      </div>
    </main>
  );
}
