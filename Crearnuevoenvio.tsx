import React, { useState } from 'react';
import { MapPin, Clock, User, Globe, ArrowRight, Save, X } from 'lucide-react';

const NuevoEnvioForm = () => {
  const [tipoCheckin, setTipoCheckin] = useState<'INTERVAL' | 'MILESTONE'>('INTERVAL');

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
          <h1 className="text-2xl font-bold">Nuevo Envío</h1>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20">
          <Save size={18} />
          <span>Guardar Envío</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Información Logística */}
        <div className="space-y-6">
          <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} /> Ruta y Carga
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 font-bold mb-1.5 uppercase">Referencia / ID Envío</label>
                <input type="text" placeholder="Ej: SHIP-2024-XYZ" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 font-bold mb-1.5 uppercase">Origen</label>
                  <input type="text" placeholder="Ciudad, País" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-bold mb-1.5 uppercase">Destino</label>
                  <input type="text" placeholder="Ciudad, País" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <User size={16} /> Asignación
            </h2>
            <div>
              <label className="block text-xs text-slate-500 font-bold mb-1.5 uppercase">Conductor (Contacto)</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer">
                <option>Seleccionar conductor...</option>
                <option>Carlos Rodríguez (+34 600...)</option>
                <option>Elena Martínez (+34 611...)</option>
              </select>
            </div>
          </section>
        </div>

        {/* Columna Derecha: Automatización */}
        <div className="space-y-6">
          <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} /> Reglas de Automatización
            </h2>

            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button 
                onClick={() => setTipoCheckin('INTERVAL')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipoCheckin === 'INTERVAL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Intervalo
              </button>
              <button 
                onClick={() => setTipoCheckin('MILESTONE')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipoCheckin === 'MILESTONE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Hitos (Geofencing)
              </button>
            </div>

            {tipoCheckin === 'INTERVAL' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  El sistema enviará automáticamente un mensaje por Telegram al conductor cada cierto tiempo.
                </p>
                <div>
                  <label className="block text-xs text-slate-500 font-bold mb-1.5 uppercase">Frecuencia de Check-in</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none">
                    <option>Cada 1 hora</option>
                    <option>Cada 2 horas</option>
                    <option>Cada 4 horas</option>
                    <option>Cada 8 horas</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  Los mensajes se dispararán cuando el conductor entre en radios geográficos específicos.
                </p>
                <button className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-all text-sm font-medium">
                  + Añadir punto de control en mapa
                </button>
              </div>
            )}
          </section>

          <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Globe size={16} /> Horarios y Zona
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 font-bold mb-1.5 uppercase">Salida Local</label>
                <input type="datetime-local" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-bold mb-1.5 uppercase">Zona Horaria (IANA)</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm">
                  <option>Europe/Madrid</option>
                  <option>UTC</option>
                  <option>America/New_York</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default NuevoEnvioForm;