import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Search, Trash2, Edit3, ChevronUp, ChevronDown } from 'lucide-react'
import { API_BASE } from '../App'

const BARRIOS = ['Casco Viejo','Equipetrol Norte','Las Palmas','La Madre','El Pari','Los Tusequis',
  'Villa Olímpica','Hamacas','Villa Fátima','Andrés Ibáñez','Bella Vista Oeste','San Luis',
  'Villa 1ro de Mayo','Barrio Lindo','El Remanso','Urbarí','Mutualista','Sirari',
  'San Aurelio','Las Américas','El Bajío','Arco Iris','Vista Hermosa','Palmasola',
  'Plan 3000 A','Plan 3000 B','Plan 3000 C','Nueva Esperanza','La Guardia Centro',
  'Cotoca Centro','Warnes Urbano']

export default function Contenedores() {
  const [contenedores, setContenedores] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingLlenado, setEditingLlenado] = useState({})
  const [form, setForm] = useState({ codigo_referencia: '', direccion: '', barrio: 'Casco Viejo', distrito_municipal: 1, latitud: -17.7836, longitud: -63.1824, porcentaje_llenado: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchContenedores() }, [])

  const fetchContenedores = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/contenedores`)
      setContenedores(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error('Error cargando contenedores:', e)
      setContenedores([])
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_BASE}/contenedores`, { ...form, distrito_municipal: Number(form.distrito_municipal), latitud: Number(form.latitud), longitud: Number(form.longitud) })
      setShowModal(false)
      setForm({ codigo_referencia: '', direccion: '', barrio: 'Casco Viejo', distrito_municipal: 1, latitud: -17.7836, longitud: -63.1824, porcentaje_llenado: 0 })
      fetchContenedores()
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contenedor?')) return
    await axios.delete(`${API_BASE}/contenedores/${id}`)
    fetchContenedores()
  }

  const handleUpdateLlenado = async (id, valor) => {
    await axios.patch(`${API_BASE}/contenedores/${id}/llenado`, { porcentaje_llenado: Number(valor) })
    setEditingId(null)
    fetchContenedores()
  }

  const filtrados = contenedores.filter(c => {
    const matchText = c.codigo_referencia.toLowerCase().includes(busqueda.toLowerCase()) ||
                      c.barrio.toLowerCase().includes(busqueda.toLowerCase()) ||
                      c.direccion.toLowerCase().includes(busqueda.toLowerCase())
    if (filtroEstado === 'critico') return matchText && c.porcentaje_llenado >= 80
    if (filtroEstado === 'medio') return matchText && c.porcentaje_llenado >= 50 && c.porcentaje_llenado < 80
    if (filtroEstado === 'ok') return matchText && c.porcentaje_llenado < 50
    return matchText
  })

  const estadoColor = (pct) => pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981'
  const estadoLabel = (pct) => pct >= 80 ? 'Crítico' : pct >= 50 ? 'Medio' : 'OK'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Gestión de Contenedores</h2>
          <span className="page-sub">{filtrados.length} de {contenedores.length} contenedores</span>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nuevo Contenedor
        </button>
      </div>

      {/* FILTROS */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Buscar por código, barrio o dirección..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="filter-tabs">
          {[['todos','Todos'],['critico','Críticos'],['medio','Medios'],['ok','OK']].map(([v,l]) => (
            <button key={v} className={`filter-tab ${filtroEstado === v ? 'active' : ''}`} onClick={() => setFiltroEstado(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* TABLA */}
      <div className="table-card">
        {loading ? <div className="table-loading">Cargando...</div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Barrio</th>
                <th>DM</th>
                <th>Dirección</th>
                <th>Llenado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, 100).map(c => (
                <tr key={c.id}>
                  <td><code>{c.codigo_referencia}</code></td>
                  <td>{c.barrio}</td>
                  <td className="dm-cell">DM {c.distrito_municipal}</td>
                  <td className="dir-cell">{c.direccion}</td>
                  <td>
                    {editingId === c.id ? (
                      <div className="llenado-edit">
                        <input type="number" min="0" max="100"
                          defaultValue={c.porcentaje_llenado}
                          onChange={e => setEditingLlenado({ ...editingLlenado, [c.id]: e.target.value })}
                          className="llenado-input"
                        />
                        <button className="btn-save" onClick={() => handleUpdateLlenado(c.id, editingLlenado[c.id] ?? c.porcentaje_llenado)}>✓</button>
                        <button className="btn-cancel-sm" onClick={() => setEditingId(null)}>✕</button>
                      </div>
                    ) : (
                      <div className="llenado-bar-cell" onClick={() => setEditingId(c.id)}>
                        <div className="mini-bar-bg">
                          <div className="mini-bar-fill" style={{ width: `${c.porcentaje_llenado}%`, background: estadoColor(c.porcentaje_llenado) }} />
                        </div>
                        <span>{c.porcentaje_llenado}%</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: `${estadoColor(c.porcentaje_llenado)}22`, color: estadoColor(c.porcentaje_llenado), border: `1px solid ${estadoColor(c.porcentaje_llenado)}44` }}>
                      {estadoLabel(c.porcentaje_llenado)}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => setEditingId(c.id)}><Edit3 size={14} /></button>
                    <button className="btn-icon danger" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtrados.length > 100 && <div className="table-more">Mostrando 100 de {filtrados.length}. Usa el filtro para ver más.</div>}
      </div>

      {/* MODAL NUEVO CONTENEDOR */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nuevo Contenedor</h3>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Código de Referencia</label>
                  <input required placeholder="CNT-DM01-0001" value={form.codigo_referencia} onChange={e => setForm({...form, codigo_referencia: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Distrito Municipal (1-15)</label>
                  <input type="number" min="1" max="15" required value={form.distrito_municipal} onChange={e => setForm({...form, distrito_municipal: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Barrio</label>
                <select value={form.barrio} onChange={e => setForm({...form, barrio: e.target.value})}>
                  {BARRIOS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input required placeholder="Av. Principal y Calle 5" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitud</label>
                  <input type="number" step="0.000001" required value={form.latitud} onChange={e => setForm({...form, latitud: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Longitud</label>
                  <input type="number" step="0.000001" required value={form.longitud} onChange={e => setForm({...form, longitud: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>% Llenado inicial: <b>{form.porcentaje_llenado}%</b></label>
                <input type="range" min="0" max="100" value={form.porcentaje_llenado} onChange={e => setForm({...form, porcentaje_llenado: Number(e.target.value)})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
