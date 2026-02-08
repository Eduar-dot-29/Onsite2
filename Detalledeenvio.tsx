import React from 'react';
import { 
  Clock, MapPin, AlertTriangle, CheckCircle2, 
  ChevronLeft, MoreVertical, Navigation, Share2 
} from 'lucide-react';

const ShipmentTimeline = () => {
  // Datos simulados que vendrán de GET /tracking/shipments/{id}/events
  const eventos = [
    {
      id: 1,
      tipo: 'SISTEMA',
      titulo: 'Envío Iniciado',
      descripcion: 'El plan de check-ins automáticos ha sido activado (Cada 2h).',
      hora: '09:00',
      fecha: '24 May',
      estado: 'success'
    },
    {
      id: 2,
      tipo: 'CHECK_IN',
      titulo: 'Check-in Automático OK',
      descripcion: 'Conductor respondió "Todo Bien" vía Telegram.',
      hora: '11:00',
      fecha: '24 May',
      estado: 'success',
      ubicacion: 'A-4, Km 120, ES'
    },
    {
      id: 3,
      tipo: 'INCIDENCIA',
      titulo: 'Avería Reportada',
      descripcion: 'El conductor pulsó el botón "Avería". Vehículo detenido por fallo mecánico.',
      hora: '12:15',
      fecha: '24 May',
      estado: 'danger',
      ubicacion: 'Despeñaperros, ES'
    },
    {
      id: 4,
      tipo: 'SISTEMA',
      titulo: 'Recálculo de ETA',
      descripcion: 'ETA actualizado a las 19:30 (+3h de retraso estimado).',
      hora: '12:20',
      fecha: '24 May',
      estado: 'warning'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Header Fijo */}
      <div className="sticky top-0 z-20 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 p-4">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg">Envío #452-QT</h1>
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Incidencia Activa</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><Share2 size={20} /></button>
            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><MoreVertical size={20} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Resumen de Ruta */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ETA Actualizado</p>
              <p className="text-3xl font-mono font-bold text-emerald-400">19:30</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estado</p>
              <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold">Detenido</span>
            </div>
          </div>

          <div className="flex items-center gap-4 py-4 border-t border-slate-800/50">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
              <div className="w-0.5 h-8 bg-gradient-to-b from-blue-500 to-slate-800" />
              <div className="w-3 h-3 rounded-full border-2 border-slate-700" />
            </div>
            <div className="flex-1 space-y-4 text-sm font-medium">
              <div className="flex justify-between">
                <span>Madrid, España</span>
                <span className="text-slate-500 font-normal">08:00 (Salida)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>París, Francia</span>
                <span className="text-slate-500 font-normal">--:-- (Llegada)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pl-4 space-y-8">
          {/* Línea vertical de fondo */}
          <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-slate-800" />

          {eventos.map((evento) => (
            <div key={evento.id} className="relative pl-10">
              {/* Indicador del Evento */}
              <div className={`absolute left-0 top-1 w-5 h-5 rounded-full z-10 border-4 border-[#0f172a] ${
                evento.estado === 'danger' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                evento.estado === 'warning' ? 'bg-amber-500' :
                'bg-emerald-500'
              }`} />

              <div className="bg-slate-900/40 border border-slate-800/50 p-5 rounded-2xl hover:bg-slate-800/40 transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-sm ${
                      evento.estado === 'danger' ? 'text-red-400' : 'text-slate-200'
                    }`}>
                      {evento.titulo}
                    </h3>
                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">
                      {evento.tipo}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{evento.hora}</p>
                    <p className="text-[8px] text-slate-600 uppercase">{evento.fecha}</p>
                  </div>
                </div>
                
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                  {evento.descripcion}
                </p>

                {evento.ubicacion && (
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-400/5 px-2 py-1 rounded-md border border-blue-400/10">
                    <Navigation size={10} />
                    {evento.ubicacion}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones Rápidas Flotantes */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-2xl shadow-xl transition-all active:scale-95 border border-slate-700">
          <MapPin size={24} />
        </button>
        <button className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl shadow-xl shadow-blue-900/40 transition-all active:scale-95">
          <Clock size={24} />
        </button>
      </div>
    </div>
  );
};

export default ShipmentTimeline;