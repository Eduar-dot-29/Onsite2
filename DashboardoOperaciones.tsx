import React from 'react';
import { Truck, AlertTriangle, CheckCircle, Clock, MapPin, ChevronRight, Search, Plus } from 'lucide-react';

const DashboardOperaciones = () => {
  // Datos de ejemplo que luego conectarás con tu API de FastAPI
  const enviosActivos = [
    {
      id: 'SHIP-2024-001',
      conductor: 'Carlos Rodríguez',
      origen: 'Madrid, ES',
      destino: 'Lisboa, PT',
      estado: 'EN_TRANSITO',
      progreso: 45,
      proximoCheckin: '16:45',
      alerta: false
    },
    {
      id: 'SHIP-2024-002',
      conductor: 'Elena Martínez',
      origen: 'Barcelona, ES',
      destino: 'Lyon, FR',
      estado: 'RETRASADO',
      progreso: 70,
      proximoCheckin: '16:15',
      alerta: true
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            On-site-On-Transit
          </h1>
          <p className="text-slate-400 text-sm italic">Panel de Control de Logística</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-lg transition-all active:scale-95">
          <Plus size={24} />
        </button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Activos', val: '12', icon: Truck, color: 'text-blue-400' },
          { label: 'Retrasos', val: '3', icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Entregas', val: '124', icon: CheckCircle, color: 'text-emerald-400' },
        ].map((item, i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl text-center">
            <item.icon className={`mx-auto mb-2 ${item.color}`} size={20} />
            <p className="text-2xl font-bold">{item.val}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Buscar envío, conductor o ID..." 
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {/* Lista de Envíos */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Envíos en curso</h2>
        {enviosActivos.map((envio) => (
          <div key={envio.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:bg-slate-800/80 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${envio.alerta ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="font-mono font-bold text-blue-400">{envio.id}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                <Clock size={12} /> {envio.proximoCheckin}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-lg font-semibold">{envio.conductor}</p>
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                <span>{envio.origen}</span>
                <ChevronRight size={14} className="text-slate-600" />
                <span>{envio.destino}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Progreso</span>
                <span>{envio.progreso}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ${envio.alerta ? 'bg-amber-500' : 'bg-blue-500'}`} 
                  style={{ width: `${envio.progreso}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardOperaciones;