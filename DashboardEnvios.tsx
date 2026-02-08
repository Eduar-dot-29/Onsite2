import React from 'react';
import { LayoutDashboard, Truck, AlertCircle, CheckCircle, Clock, MapPin, ChevronRight } from 'lucide-react';

const DashboardPrincipal = () => {
  const stats = [
    { label: 'Envíos Activos', value: '12', icon: Truck, color: 'text-blue-500' },
    { label: 'Retrasados', value: '3', icon: AlertCircle, color: 'text-amber-500' },
    { label: 'Entregados', value: '45', icon: CheckCircle, color: 'text-emerald-500' },
  ];

  const envios = [
    { id: '452-QT', conductor: 'Juan Pérez', origen: 'Madrid', destino: 'París', estado: 'RETRASADO', proximoCheckin: '14:30', progreso: 65 },
    { id: '881-ZB', conductor: 'Ana García', origen: 'Barcelona', destino: 'Lyon', estado: 'EN TRÁNSITO', proximoCheckin: '15:15', progreso: 30 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Panel de Operaciones</h1>
        <p className="text-slate-400 text-sm">Seguimiento en tiempo real (On-site-On-Transit)</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-800 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Envíos Activos */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Envíos en Curso</h2>
          <button className="text-blue-500 text-sm hover:underline">Ver todos</button>
        </div>
        
        <div className="space-y-4">
          {envios.map((envio) => (
            <div key={envio.id} className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-mono font-bold">#{envio.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      envio.estado === 'RETRASADO' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {envio.estado}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{envio.conductor}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase">Próximo Check-in</p>
                  <p className="text-sm font-mono text-blue-400 flex items-center justify-end gap-1">
                    <Clock size={12} /> {envio.proximoCheckin}
                  </p>
                </div>
              </div>

              {/* Ruta simple */}
              <div className="flex items-center gap-3 text-xs text-slate-300 mb-4">
                <span className="flex items-center gap-1"><MapPin size={12} /> {envio.origen}</span>
                <ChevronRight size={12} className="text-slate-600" />
                <span className="flex items-center gap-1"><MapPin size={12} /> {envio.destino}</span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${envio.estado === 'RETRASADO' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${envio.progreso}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPrincipal;