import { useState, useEffect } from 'react'
import axios from 'axios'
import { Zap, Truck, RefreshCw, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { API_BASE } from '../App'

const COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16']

export default function Rutas() {
  const [camiones, setCamiones] = useState([])
  const [rutas, setRutas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCamiones() }, [])

  const fetchCamiones = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/camiones`)
      setCamiones(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error('Error cargando camiones:', e)
      setCamiones([])
    }
    setLoading(false)
  }

  const generarRutas = async () => {
    setGenerando(true)
    setMensaje(null)
    try {
      const res = await axios.post(`${API_BASE}/rutas/generar`)
      setRutas(res.data.rutas || [])
      setResumen(res.data.resumen || null)
      setMensaje({ tipo: 'exito', texto: res.data.mensaje })
      fetchCamiones()
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.response?.data?.detail || 'Error al generar rutas.' })
    }
    setGenerando(false)
  }

  const camionesConRuta = camiones.filter(c => c.ruta_id)
  const camionSinRuta = camiones.filter(c => !c.ruta_id)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Gestión de Rutas</h2>
          <span className="page-sub">30 camiones · 1,000 puntos de recolección</span>
        </div>
        <button className="btn-primary" onClick={generarRutas} disabled={generando}>
          {generando ? <><RefreshCw size={16} className="spin" /> Calculando...</> : <><Zap size={16} /> Generar Rutas Óptimas</>}
        </button>
      </div>

      {/* MENSAJE */}
      {mensaje && (
        <div className={`alert-bar ${mensaje.tipo}`}>
          {mensaje.tipo === 'exito' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {mensaje.texto}
        </div>
      )}

      {/* RESUMEN */}
      {resumen && (
        <div className="resumen-grid">
          {[
            ['Puntos Totales', '1,000'],
            ['Críticos Atendidos', resumen.contenedores_critcos || resumen.contenedores_criticos],
            ['Camiones Despachados', resumen.camiones_despachados],
            ['Paradas / Camión', `~${resumen.promedio_paradas_por_camion}`],
          ].map(([k, v]) => (
            <div key={k} className="resumen-card">
              <div className="resumen-val">{v}</div>
              <div className="resumen-key">{k}</div>
            </div>
          ))}
        </div>
      )}

      {/* CAMIONES CON RUTA */}
      {camionesConRuta.length > 0 && (
        <div className="section">
          <h3 className="section-title">Camiones Despachados Hoy ({camionesConRuta.length})</h3>
          <div className="camiones-grid">
            {camionesConRuta.map((cam, i) => (
              <div key={cam.id} className="camion-card" style={{ borderTop: `3px solid ${COLORS[i % COLORS.length]}` }}>
                <div className="camion-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Truck size={18} style={{ color: COLORS[i % COLORS.length] }} />
                    <b>{cam.placa}</b>
                  </div>
                  <a href={`/conductor/${cam.id}`} target="_blank" rel="noopener noreferrer" className="btn-nav-link">
                    <ExternalLink size={14} /> Ver ruta
                  </a>
                </div>
                <div className="camion-stats">
                  <span>{cam.paradas_completadas}/{cam.total_paradas} paradas</span>
                  <span>{cam.distancia_total_km} km</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{
                    width: cam.total_paradas > 0 ? `${(cam.paradas_completadas / cam.total_paradas) * 100}%` : '0%',
                    background: COLORS[i % COLORS.length]
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERROR DE CONEXION / SIN RUTA */}
      {camiones.length === 0 && !loading && (
        <div className="empty-state-large">
          <AlertTriangle size={56} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
          <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Backend no conectado</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            La API no responde en:<br />
            <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.8rem' }}>
              {API_BASE}
            </code>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Verifica en Vercel → proyecto backend → <b>Environment Variables</b> → <b>DATABASE_URL</b>
          </p>
        </div>
      )}
    </div>
  )
}
