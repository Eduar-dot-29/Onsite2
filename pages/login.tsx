import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isBootstrap, setIsBootstrap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login fields
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Bootstrap fields
  const [tenantName, setTenantName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.login(tenantId, email, password);
      router.push("/envios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const tenant = await api.bootstrap(tenantName, email, password) as { id: string };
      // Auto-login after bootstrap
      await api.login(tenant.id, email, password);
      router.push("/envios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear organización");
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
            {isBootstrap ? "Crear Organización" : "Iniciar Sesión"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isBootstrap
              ? "Configura tu primera organización y usuario administrador"
              : "Accede a tu panel de seguimiento de envíos"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isBootstrap ? (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nombre de Organización
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Mi Empresa Logística"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email del Administrador
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="admin@empresa.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Organización"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  ID de Organización (Tenant)
                </label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="uuid-de-tu-organizacion"
                  required
                />
              </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Iniciar Sesión"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsBootstrap(!isBootstrap);
                setError("");
              }}
              className="text-sm text-primary hover:underline"
            >
              {isBootstrap
                ? "¿Ya tienes cuenta? Inicia sesión"
                : "¿Primera vez? Crear organización"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
