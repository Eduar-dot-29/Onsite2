import React from 'react';
import { 
  Settings, Clock, ShieldAlert, Zap, 
  RefreshCw, Save, Bell, Radio, Info 
} from 'lucide-react';

const ConfiguracionReglas = () => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-100">
              <Settings className="text-blue-500" size={28} />
              Reglas de Automatización
            </h1>
            <p className="text-slate-400 text-sm mt-1">Configuración del motor de seguimiento (On-Transit)</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95">
            <Save size={18} /> 
            <span>Guardar Reglas</span>
          </button>
        </div>

        <div className="space-y-6">
          {/* Sección: Escalado por Silencio */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <ShieldAlert size={20} />
              </div>
              <h2 className="font-bold text-sm uppercase tracking-widest text-slate-200">Protocolo de Escalado (Silencio)</h2>
            </div>
            <div className="p-6 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1 flex items-center gap-2">
                    Tiempo de espera sin respuesta <Info size={14} className="text-slate-500" />
                  </p>
                  <p className="text-xs text-slate-500 italic leading-relaxed">
                    Minutos máximos tras un check-in fallido antes de activar la alarma de "SILENCIO" y notificar al administrador.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="number" defaultValue="30" className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-center font-mono font-bold text-blue-400 focus:ring-2 focus:ring-blue-500/40 outline-none" />
                  <span className="text-sm text-slate-400 font-medium">minutos</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-semibold mb-1">Alertas Críticas Activas</p>
                  <p className="text-xs text-slate-500">Enviar notificación automática a los administradores por Telegram si el escalado se activa.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Sección: Recálculo de Tránsito */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <RefreshCw size={20} />
              </div>
              <h2 className="font-bold text-sm uppercase tracking-widest text-slate-200">Automatización de Tránsito</h2>
            </div>
            <div className="p-6 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-semibold mb-1">Recálculo de ETA tras Incidencia</p>
                  <p className="text-xs text-slate-500">Actualizar automáticamente el tiempo de llegada cuando el conductor reporta Tráfico o Avería con su GPS.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="pt-6 border-t border-slate-800/50">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-semibold">Velocidad Media de Cálculo</p>
                  <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">85 km/h</span>
                </div>
                <input type="range" min="60" max="100" defaultValue="85" className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                  <span>Modo Seguro (60)</span>
                  <span>Eficiente (100)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Sección: Protocolo Telegram */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-400">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="font-bold text-slate-200">Botones de un solo uso (One-Shot)</h2>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">El bot de Telegram eliminará el teclado de opciones inmediatamente después de que el conductor responda.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionReglas;