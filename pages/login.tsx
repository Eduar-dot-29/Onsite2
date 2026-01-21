import { useState } from "react";
import { useRouter } from "next/router";
import { api, extractErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      await api.devLogin("admin@pruebas.com");
      router.push("/dashboard");
    } catch (err) {
      setError(extractErrorMessage(err));
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
          <h1 className="text-2xl font-semibold text-white">Bienvenido</h1>
          <p className="mt-2 text-sm text-slate-400">
            Panel de seguimiento de envíos
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Iniciar Sesión"}
          </button>

          <p className="mt-6 text-center text-xs text-slate-500">
            Entorno de pruebas
          </p>
        </div>
      </div>
    </main>
  );
}
