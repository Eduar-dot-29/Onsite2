import React from 'react';
import { 
  AlertOctagon, Phone, MapPin, Wrench, 
  User, Truck, Navigation, MessageSquare, X 
} from 'lucide-react';

const AlertaEmergencia = () => {
  return (
    <div className="min-h-screen bg-red-950/20 text-slate-100 flex flex-col">
      {/* Banner de Alerta Crítica */}
      <div className="bg-red-600 p-4 flex justify-between items-center shadow-[0_0_30px_rgba(220,38,38,0.3)] animate-pulse">
        <div className="flex items-center gap-3">
          <AlertOctagon size={24} className="text-white fill-white/20" />
          <h1 className="font-black uppercase tracking-tighter text-lg">Incidencia Crítica: Avería Reportada</h1>
        </div>
        <button className="p-1 hover:bg-white/10 rounded">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Mapa e Info de Ubicación */}
        <div className="bg-slate-900 border-2 border-red-500/30 rounded-3xl overflow-hidden shadow-2xl">
          <div className="h-48 bg-slate-800 relative">
            {/* Aquí iría el componente de Mapa interactivo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                <MapPin size={40} className="text-red-500 relative z-10 fill-red-500/20" />
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Ubicación del reporte</p>
              <p className="text-sm font-mono text-slate-200">A-4, Km 231, Santa Cruz de Mudela, ES</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Conductor</p>
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-400" />
                <p className="font-bold">Ricardo Sola</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Vehículo / Envío</p>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-blue-400" />
                <p className="font-bold">#452-QT (Volvo FH)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Impacto Logístico */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Navigation size={16} /> Impacto Estimado
          </h2>
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <p className="text-xs text-slate-500">Nuevo ETA Estimado</p>
              <p className="text-2xl font-mono font-bold text-red-400">22:45</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Retraso Total</p>
              <p className="text-2xl font-mono font-bold text-amber-500">+4h 15m</p>
            </div>
          </div>
        </div>

        {/* Acciones de Emergencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-3xl flex items-center justify-between shadow-xl transition-all active:scale-95 group">
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Contacto Directo</p>
              <p className="text-lg font-bold">Llamar Conductor</p>
            </div>
            <Phone size={32} className="group-hover:rotate-12 transition-transform" />
          </button>
          
          <button className="bg-slate-800 hover:bg-slate-700 text-white p-6 rounded-3xl flex items-center justify-between border border-slate-700 transition-all active:scale-95 group">
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Telegram Chat</p>
              <p className="text-lg font-bold">Abrir Conversación</p>
            </div>
            <MessageSquare size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <button className="w-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white p-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2">
          <Wrench size={18} />
          <span>Marcar como Resolución en Curso</span>
        </button>
      </div>
    </div>
  );
};

export default AlertaEmergencia;