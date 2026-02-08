import React from 'react';
import { 
  UserPlus, Search, Phone, Send, CheckCircle2, 
  XCircle, MoreHorizontal, User, Filter 
} from 'lucide-react';

const ContactosManager = () => {
  // Datos simulados para GET /contacts
  const contactos = [
    {
      id: 1,
      nombre: 'Carlos Rodríguez',
      telefono: '+34 600 000 001',
      canal: 'TELEGRAM',
      chatId: '55829102',
      estado: 'VINCULADO',
      ultimaActividad: 'Hace 10 min'
    },
    {
      id: 2,
      nombre: 'Elena Martínez',
      telefono: '+34 611 111 222',
      canal: 'TELEGRAM',
      chatId: null,
      estado: 'PENDIENTE',
      ultimaActividad: 'Nunca'
    },
    {
      id: 3,
      nombre: 'Roberto Gómez',
      telefono: '+34 622 333 444',
      canal: 'SMS',
      chatId: null,
      estado: 'DESCONECTADO',
      ultimaActividad: 'Hace 2 días'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Conductores</h1>
          <p className="text-slate-400 text-sm">Vincular y gestionar canales de comunicación</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95">
          <UserPlus size={18} />
          <span>Añadir Conductor</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o teléfono..." 
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <button className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
          <Filter size={20} />
        </button>
      </div>

      {/* Lista de Contactos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contactos.map((contacto) => (
          <div key={contacto.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group relative overflow-hidden">
            {/* Indicador de Canal (Badge) */}
            <div className="absolute top-0 right-0 p-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                contacto.canal === 'TELEGRAM' ? 'bg-blue-500/10 text-blue-400 border-blue-400/20' : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                {contacto.canal}
              </span>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">{contacto.nombre}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone size={10} /> {contacto.telefono}
                </p>
              </div>
            </div>

            {/* Estado de Vinculación */}
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800 mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Estado Telegram</span>
                <span className="text-[10px] text-slate-600 font-mono">{contacto.chatId || 'N/D'}</span>
              </div>
              <div className="flex items-center gap-2">
                {contacto.estado === 'VINCULADO' ? (
                  <CheckCircle2 size={14} className="text-emerald-500" />
                ) : (
                  <XCircle size={14} className="text-amber-500" />
                )}
                <span className={`text-xs font-bold ${
                  contacto.estado === 'VINCULADO' ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  {contacto.estado}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[10px] text-slate-500 italic">Actividad: {contacto.ultimaActividad}</span>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                  <Send size={16} />
                </button>
                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactosManager;