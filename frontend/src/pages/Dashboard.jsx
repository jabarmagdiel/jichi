import { useState, useEffect } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, AlertTriangle, CheckCircle, Truck } from 'lucide-react'
import { API_BASE } from '../App'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
})
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
})
const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
})

function getIcon(pct) {
  if (pct >= 80) return redIcon
  if (pct >= 50) return yellowIcon
  return greenIcon
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [contenedores, setContenedores] = useState([])
  const [loading, setLoading] = useState(true)

  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/stats`).catch(() => ({ data: null })),
      axios.get(`${API_BASE}/contenedores`).catch(() => ({ data: [] }))
    ]).then(([s, c]) => {
      if (!s.data && (!c.data || c.data.length === 0)) setApiError(true)
      setStats(s.data)
      setContenedores(Array.isArray(c.data) ? c.data : [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dashboard General</h2>
        <span className="page-sub">Santa Cruz de la Sierra — {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {/* BANNER ERROR DE CONEXION */}
      {apiError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1rem', marginBottom: '1.25rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '0.75rem', fontSize: '0.875rem', color: '#fca5a5'
        }}>
          <AlertTriangle size={16} />
          No se puede conectar al backend (<code style={{background:'rgba(255,255,255,0.08)', padding:'0.1rem 0.4rem', borderRadius:'0.3rem'}}>{API_BASE}</code>).
          Verifica que la variable <b>VITE_API_BASE</b> esté configurada en Vercel.
        </div>
      )}

      {/* STATS */}
      <div className="stats-grid">
        {[
          { label: 'Total Contenedores', value: stats?.total_contenedores ?? '—', icon: MapPin, color: 'green' },
          { label: 'Críticos (≥80%)', value: stats?.criticos ?? '—', icon: AlertTriangle, color: 'red' },
          { label: 'En Buen Estado', value: stats ? (stats.total_contenedores - stats.criticos) : '—', icon: CheckCircle, color: 'green' },
          { label: 'Rutas Hoy', value: stats?.rutas_hoy ?? '—', icon: Truck, color: 'blue' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${color}`}><Icon size={22} /></div>
            <div>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAPA */}
      <div className="map-card">
        <div className="map-legend">
          <span className="legend-dot red" /> Crítico ≥80%
          <span className="legend-dot yellow" /> Medio 50–79%
          <span className="legend-dot green" /> Buen estado
        </div>
        {!loading && (
          <MapContainer center={[-17.7833, -63.1821]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; CartoDB'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {contenedores.map(c => (
              <Marker key={c.id} position={[c.latitud, c.longitud]} icon={getIcon(c.porcentaje_llenado)}>
                <Popup>
                  <b>{c.codigo_referencia}</b><br />
                  {c.barrio} — DM {c.distrito_municipal}<br />
                  Llenado: <b>{c.porcentaje_llenado}%</b>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  )
}
