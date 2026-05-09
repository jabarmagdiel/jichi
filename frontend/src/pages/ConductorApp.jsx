import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Truck, CheckCircle, Navigation, MapPin, ChevronRight, ChevronDown } from 'lucide-react'
import { API_BASE } from '../App'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const nextIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -40], shadowSize: [41, 41]
})
const doneIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
})
const pendingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
})

// Componente para centrar el mapa en el siguiente punto
function MapCenterer({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 1.2 })
  }, [position, map])
  return null
}

export default function ConductorApp() {
  const { camionId } = useParams()
  const [camiones, setCamiones] = useState([])
  const [selectedCamion, setSelectedCamion] = useState(camionId || null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Si no hay camionId en la URL, cargar lista de camiones
  useEffect(() => {
    if (!camionId) {
      axios.get(`${API_BASE}/camiones`).then(r => setCamiones(r.data))
    } else {
      loadRuta(camionId)
    }
  }, [camionId])

  const loadRuta = async (id) => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/camiones/${id}/ruta`)
      setData(res.data)
      // Encontrar el primer punto pendiente
      const firstPending = res.data.puntos?.findIndex(p => p.estado_recoleccion !== 'recogido')
      setCurrentStep(firstPending >= 0 ? firstPending : 0)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSelectCamion = (id) => {
    setSelectedCamion(id)
    loadRuta(id)
  }

  const handleRecolectar = async () => {
    const punto = pendientes[0]
    if (!punto) return
    try {
      await axios.patch(`${API_BASE}/ruta_puntos/${punto.punto_id}/recolectar`)
      loadRuta(selectedCamion || camionId)
    } catch (e) { alert('Error al registrar recolección') }
  }

  // Navegar solo al siguiente punto
  const abrirNavegacionSiguiente = (punto) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${punto.latitud},${punto.longitud}&travelmode=driving`
    window.open(url, '_blank')
  }

  // Abrir Google Maps con TODOS los puntos pendientes como waypoints
  // Google Maps acepta máximo 9 waypoints intermedios (11 paradas total)
  const abrirRutaCompleta = () => {
    if (pendientes.length === 0) return
    const origen = pendientes[0]
    const destino = pendientes[pendientes.length - 1]
    // Los intermedios: todos menos el primero y el último, máximo 9
    const intermedios = pendientes.slice(1, -1).slice(0, 9)
    const waypointsStr = intermedios.map(p => `${p.latitud},${p.longitud}`).join('|')
    let url = `https://www.google.com/maps/dir/?api=1`
    url += `&origin=${origen.latitud},${origen.longitud}`
    url += `&destination=${destino.latitud},${destino.longitud}`
    if (waypointsStr) url += `&waypoints=${waypointsStr}`
    url += `&travelmode=driving`
    window.open(url, '_blank')
  }

  const puntos = data?.puntos || []
  const completados = puntos.filter(p => p.estado_recoleccion === 'recogido')
  const pendientes = puntos.filter(p => p.estado_recoleccion !== 'recogido')
  const proximoPunto = pendientes[0]
  const progreso = puntos.length > 0 ? (completados.length / puntos.length) * 100 : 0

  // Vista de selección de camión
  if (!selectedCamion && !camionId) {
    return (
      <div className="conductor-app">
        <div className="conductor-header">
          <Truck size={28} />
          <h1>App del Conductor</h1>
          <p>El JiCHI · Santa Cruz</p>
        </div>
        <div className="camion-selector">
          <h2>Selecciona tu camión:</h2>
          <div className="camion-list">
            {camiones.filter(c => c.ruta_id).map(c => (
              <button key={c.id} className="camion-select-btn" onClick={() => handleSelectCamion(c.id)}>
                <Truck size={20} />
                <div>
                  <div className="camion-placa">{c.placa}</div>
                  <div className="camion-paradas">{c.total_paradas} paradas hoy</div>
                </div>
                <ChevronRight size={20} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
              </button>
            ))}
            {camiones.filter(c => c.ruta_id).length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No hay rutas asignadas hoy.<br />El administrador debe generarlas primero.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="conductor-app" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="spin-large" />
      <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Cargando tu ruta...</p>
    </div>
  )

  if (!data?.ruta) return (
    <div className="conductor-app" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <Truck size={64} style={{ color: 'var(--text-muted)' }} />
      <h2>Sin ruta asignada</h2>
      <p style={{ color: 'var(--text-muted)' }}>El administrador no ha generado rutas para hoy.</p>
    </div>
  )

  return (
    <div className="conductor-app">
      {/* HEADER */}
      <div className="conductor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Truck size={24} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{data.camion?.placa}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
              {completados.length}/{puntos.length} paradas · {data.ruta?.distancia_total_km} km
            </div>
          </div>
        </div>
        {progreso === 100 && <span className="badge-done">Ruta Completada ✓</span>}
      </div>

      {/* PROGRESO */}
      <div className="conductor-progress">
        <div className="conductor-bar">
          <div className="conductor-bar-fill" style={{ width: `${progreso}%` }} />
        </div>
        <span>{Math.round(progreso)}%</span>
      </div>

      {/* MAPA */}
      <div className="conductor-map">
        <MapContainer
          center={proximoPunto ? [proximoPunto.latitud, proximoPunto.longitud] : [-17.7833, -63.1821]}
          zoom={16}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; CartoDB'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {proximoPunto && <MapCenterer position={[proximoPunto.latitud, proximoPunto.longitud]} />}

          {/* Línea de ruta */}
          {puntos.length > 1 && (
            <Polyline
              positions={puntos.map(p => [p.latitud, p.longitud])}
              color="#10b981"
              weight={3}
              opacity={0.5}
              dashArray="6,6"
            />
          )}

          {/* Markers */}
          {puntos.map((p, i) => (
            <Marker
              key={p.punto_id}
              position={[p.latitud, p.longitud]}
              icon={p.estado_recoleccion === 'recogido' ? doneIcon : i === pendientes.indexOf(pendientes[0]) ? nextIcon : pendingIcon}
            >
              <Popup>
                <b>{p.orden_visita}. {p.codigo_referencia}</b><br />
                {p.barrio}<br />
                {p.estado_recoleccion === 'recogido' ? '✅ Recolectado' : `🗑️ ${p.porcentaje_llenado}% lleno`}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* PRÓXIMO PUNTO */}
      {proximoPunto && (
        <div className="next-stop">
          {/* Cabecera con número de parada y pendientes */}
          <div className="next-stop-label">
            <Navigation size={14} style={{ color: '#10b981' }} />
            PARADA {completados.length + 1} de {puntos.length}
            <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontWeight: 400 }}>
              {pendientes.length - 1} más después
            </span>
          </div>

          <div className="next-stop-name">{proximoPunto.codigo_referencia}</div>
          <div className="next-stop-address">{proximoPunto.barrio} — {proximoPunto.direccion}</div>

          {/* Barra de llenado */}
          <div className="next-stop-fill">
            <div className="mini-bar-bg" style={{ flex: 1 }}>
              <div className="mini-bar-fill" style={{
                width: `${proximoPunto.porcentaje_llenado}%`,
                background: proximoPunto.porcentaje_llenado >= 90 ? '#ef4444' : '#f59e0b'
              }} />
            </div>
            <span>{proximoPunto.porcentaje_llenado}% lleno</span>
          </div>

          {/* SIGUIENTE PARADA PREVIEW */}
          {pendientes[1] && (
            <div className="next-preview">
              <span>Siguiente:</span> {pendientes[1].codigo_referencia} — {pendientes[1].barrio}
            </div>
          )}

          {/* ACCIONES */}
          <div className="next-stop-actions">
            {/* Ir solo al siguiente punto */}
            <button className="btn-waze" onClick={() => abrirNavegacionSiguiente(proximoPunto)}>
              <Navigation size={16} /> Solo este
            </button>
            {/* Abrir ruta completa con todos los waypoints */}
            <button className="btn-waze" style={{ background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' }}
              onClick={abrirRutaCompleta}>
              <Navigation size={16} /> Ruta completa
            </button>
          </div>

          {/* RECOLECTAR */}
          <button className="btn-recolectar" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleRecolectar}>
            <CheckCircle size={18} /> Marcar como Recolectado y Avanzar
          </button>
        </div>
      )}

      {progreso === 100 && (
        <div className="ruta-completada">
          <CheckCircle size={48} style={{ color: '#10b981' }} />
          <h2>¡Ruta Completada!</h2>
          <p>{completados.length} contenedores vaciados</p>
        </div>
      )}

      {/* LISTA DE PARADAS */}
      <div className="stops-list">
        <h3>Todas las Paradas ({puntos.length})</h3>
        {puntos.map(p => (
          <div key={p.punto_id} className={`stop-item ${p.estado_recoleccion === 'recogido' ? 'done' : ''}`}>
            <div className="stop-num">{p.orden_visita}</div>
            <div className="stop-info">
              <div className="stop-code">{p.codigo_referencia}</div>
              <div className="stop-addr">{p.barrio}</div>
            </div>
            <div className="stop-status">
              {p.estado_recoleccion === 'recogido'
                ? <CheckCircle size={18} style={{ color: '#10b981' }} />
                : <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{p.porcentaje_llenado}%</span>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
