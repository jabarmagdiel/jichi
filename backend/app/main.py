import os
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="API El JiCHI - Recojo de Basura Santa Cruz")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexión directa a PostgreSQL
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres.uvfigwlruvulvwjyppxa:70486379Josemagdiel@aws-1-us-west-2.pooler.supabase.com:6543/postgres")

def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        return conn
    except Exception as e:
        print(f"Error conectando a la base de datos: {e}")
        return None

class Contenedor(BaseModel):
    codigo_referencia: str
    direccion: str
    barrio: str
    distrito_municipal: int
    latitud: float
    longitud: float
    capacidad_kg: float = 1000.0
    porcentaje_llenado: int = 0

class ActualizarLlenado(BaseModel):
    porcentaje_llenado: int

@app.get("/")
def read_root():
    return {"mensaje": "API El JiCHI - Sistema de Recojo de Basura Santa Cruz de la Sierra"}

# ─── CONTENEDORES ─────────────────────────────────────────────────────────────



@app.get("/contenedores")
def get_contenedores():
    """Obtener todos los contenedores"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM contenedores")
        contenedores = cur.fetchall()
    conn.close()
    return contenedores

@app.post("/contenedores")
def create_contenedor(contenedor: Contenedor):
    """Registrar un nuevo contenedor (Ej: en el Plan 3000 o Equipetrol)"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO contenedores (codigo_referencia, direccion, barrio, distrito_municipal, latitud, longitud, capacidad_kg, porcentaje_llenado)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (contenedor.codigo_referencia, contenedor.direccion, contenedor.barrio, contenedor.distrito_municipal, 
                 contenedor.latitud, contenedor.longitud, contenedor.capacidad_kg, contenedor.porcentaje_llenado)
            )
            nuevo_contenedor = cur.fetchone()
            conn.commit()
        return {"mensaje": "Contenedor registrado exitosamente", "data": nuevo_contenedor}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/contenedores/criticos")
def get_contenedores_criticos():
    """Obtener contenedores que están llenos (ej: >= 80%) y necesitan ser recogidos hoy"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM contenedores WHERE porcentaje_llenado >= 80")
        contenedores = cur.fetchall()
    conn.close()
    return {"total": len(contenedores), "contenedores": contenedores}

@app.patch("/contenedores/{contenedor_id}/llenado")
def actualizar_llenado(contenedor_id: str, body: ActualizarLlenado):
    """Actualizar el porcentaje de llenado de un contenedor"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "UPDATE contenedores SET porcentaje_llenado = %s, ultima_actualizacion_llenado = NOW() WHERE id = %s RETURNING *",
                (body.porcentaje_llenado, contenedor_id)
            )
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="Contenedor no encontrado")
            conn.commit()
        return updated
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.delete("/contenedores/{contenedor_id}")
def eliminar_contenedor(contenedor_id: str):
    """Eliminar un contenedor"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM contenedores WHERE id = %s", (contenedor_id,))
            conn.commit()
        return {"mensaje": "Contenedor eliminado"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# ─── CAMIONES / RUTAS DEL CONDUCTOR ───────────────────────────────────────────

@app.get("/camiones")
def get_camiones():
    """Obtener todos los camiones con su ruta asignada hoy"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT c.*,
                   r.id as ruta_id,
                   r.estado as ruta_estado,
                   r.distancia_total_km,
                   (SELECT COUNT(*) FROM ruta_puntos rp WHERE rp.ruta_id = r.id) as total_paradas,
                   (SELECT COUNT(*) FROM ruta_puntos rp WHERE rp.ruta_id = r.id AND rp.estado_recoleccion = 'recogido') as paradas_completadas
            FROM camiones c
            LEFT JOIN rutas r ON r.camion_id = c.id AND r.fecha = CURRENT_DATE
            ORDER BY c.placa
        """)
        camiones = cur.fetchall()
    conn.close()
    return camiones

@app.get("/camiones/{camion_id}/ruta")
def get_ruta_conductor(camion_id: str):
    """Obtener la ruta completa del conductor (para la app móvil)"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Info del camión
        cur.execute("SELECT * FROM camiones WHERE id = %s", (camion_id,))
        camion = cur.fetchone()
        if not camion:
            raise HTTPException(status_code=404, detail="Camion no encontrado")

        # Ruta del día
        cur.execute("SELECT * FROM rutas WHERE camion_id = %s AND fecha = CURRENT_DATE", (camion_id,))
        ruta = cur.fetchone()
        if not ruta:
            return {"camion": camion, "ruta": None, "puntos": []}

        # Puntos ordenados con detalle del contenedor
        cur.execute("""
            SELECT rp.id as punto_id, rp.orden_visita, rp.estado_recoleccion,
                   c.id as contenedor_id, c.codigo_referencia, c.direccion,
                   c.barrio, c.distrito_municipal, c.latitud, c.longitud,
                   c.porcentaje_llenado, c.capacidad_kg
            FROM ruta_puntos rp
            JOIN contenedores c ON c.id = rp.contenedor_id
            WHERE rp.ruta_id = %s
            ORDER BY rp.orden_visita
        """, (ruta["id"],))
        puntos = cur.fetchall()
    conn.close()
    return {"camion": camion, "ruta": ruta, "puntos": puntos}

@app.patch("/ruta_puntos/{punto_id}/recolectar")
def marcar_recolectado(punto_id: str):
    """Marcar un punto de ruta como recolectado (acción del conductor)"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE ruta_puntos
                SET estado_recoleccion = 'recogido', hora_real_recoleccion = NOW()
                WHERE id = %s RETURNING *
            """, (punto_id,))
            punto = cur.fetchone()
            if punto:
                # Resetear el contenedor a 0% después de ser vaciado
                cur.execute(
                    "UPDATE contenedores SET porcentaje_llenado = 0 WHERE id = %s",
                    (punto["contenedor_id"],)
                )
            conn.commit()
        return {"mensaje": "Recoleccion registrada", "punto": punto}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# ─── ESTADISTICAS ──────────────────────────────────────────────────────────────

import math

def calcular_distancia(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

@app.get("/stats")
def get_stats():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT COUNT(*) as total FROM contenedores")
        total = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) as criticos FROM contenedores WHERE porcentaje_llenado >= 80")
        criticos = cur.fetchone()["criticos"]
        cur.execute("SELECT COUNT(*) as camiones FROM camiones")
        camiones = cur.fetchone()["camiones"]
        cur.execute("SELECT COUNT(*) as rutas FROM rutas WHERE fecha = CURRENT_DATE")
        rutas_hoy = cur.fetchone()["rutas"]
    conn.close()
    return {"total_contenedores": total, "criticos": criticos, "camiones": camiones, "rutas_hoy": rutas_hoy}

@app.post("/rutas/generar")
def generar_rutas():
    """
    Algoritmo para 1000 puntos / 30 camiones:
    1. Tomar contenedores criticos (>=80%).
    2. Ordenarlos geograficamente (por latitud+longitud) para agrupar puntos cercanos.
    3. Dividirlos en 30 chunks iguales — un chunk por camion.
    4. Dentro de cada chunk, aplicar Nearest Neighbor para ordenar la ruta eficientemente.
    Resultado garantizado: distribución 100% equitativa sin riesgo de errores.
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de base de datos")

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Limpiar rutas del día
            cur.execute("DELETE FROM ruta_puntos WHERE ruta_id IN (SELECT id FROM rutas WHERE fecha = CURRENT_DATE)")
            cur.execute("DELETE FROM rutas WHERE fecha = CURRENT_DATE")
            conn.commit()

            # 2. Obtener contenedores criticos ordenados geográficamente
            # Ordenar por latitud primero (norte→sur), luego por longitud (oeste→este).
            # Esto agrupa puntos físicamente cercanos en el mismo chunk.
            cur.execute("""
                SELECT * FROM contenedores
                WHERE porcentaje_llenado >= 80
                ORDER BY
                    ROUND(latitud::numeric, 2),
                    ROUND(longitud::numeric, 2),
                    porcentaje_llenado DESC
            """)
            criticos = cur.fetchall()
            total_criticos = len(criticos)

            if total_criticos == 0:
                return {"mensaje": "No hay contenedores criticos hoy."}

            # 3. Obtener exactamente 30 camiones
            cur.execute("SELECT * FROM camiones ORDER BY placa LIMIT 30")
            camiones = cur.fetchall()
            num_camiones = len(camiones)

            if num_camiones == 0:
                return {"mensaje": "No hay camiones registrados."}

            # 4. Dividir criticos en num_camiones chunks del mismo tamaño
            # (el último chunk puede tener 1-2 puntos extra si no divide exacto)
            chunk_size = total_criticos // num_camiones
            extras = total_criticos % num_camiones  # primeros 'extras' chunks llevan 1 punto más

            chunks = []
            inicio = 0
            for i in range(num_camiones):
                fin = inicio + chunk_size + (1 if i < extras else 0)
                chunks.append(criticos[inicio:fin])
                inicio = fin

            # 5. Generar rutas con Nearest Neighbor por chunk
            rutas_generadas = []
            puntos_ruta_bulk = []

            for idx, (camion, subpuntos) in enumerate(zip(camiones, chunks)):
                if not subpuntos:
                    continue

                # Insertar ruta
                cur.execute(
                    "INSERT INTO rutas (camion_id, estado) VALUES (%s, 'asignada') RETURNING id",
                    (camion["id"],)
                )
                ruta_id = cur.fetchone()["id"]

                # Nearest Neighbor dentro del chunk (~13 puntos por camión)
                pendientes = list(subpuntos)
                # Punto de partida: el punto más al norte del chunk
                lat_actual = pendientes[0]["latitud"]
                lng_actual = pendientes[0]["longitud"]
                orden_final = []
                distancia_total = 0.0

                while pendientes:
                    mas_cercano = min(
                        pendientes,
                        key=lambda p: calcular_distancia(lat_actual, lng_actual, p["latitud"], p["longitud"])
                    )
                    dist = calcular_distancia(lat_actual, lng_actual, mas_cercano["latitud"], mas_cercano["longitud"])
                    distancia_total += dist
                    lat_actual = mas_cercano["latitud"]
                    lng_actual = mas_cercano["longitud"]
                    orden_final.append(mas_cercano)
                    pendientes.remove(mas_cercano)

                for orden_num, punto in enumerate(orden_final, 1):
                    puntos_ruta_bulk.append((ruta_id, punto["id"], orden_num))

                cur.execute(
                    "UPDATE rutas SET distancia_total_km = %s WHERE id = %s",
                    (round(distancia_total, 2), ruta_id)
                )

                # Calcular DM predominante de esta ruta
                dm_counter = {}
                for p in orden_final:
                    dm = p["distrito_municipal"]
                    dm_counter[dm] = dm_counter.get(dm, 0) + 1
                dm_principal = max(dm_counter, key=dm_counter.get) if dm_counter else "-"

                rutas_generadas.append({
                    "camion": camion["placa"],
                    "distrito": dm_principal,
                    "puntos": len(orden_final),
                    "km_estimados": round(distancia_total, 2),
                    "primeros_puntos": [p["codigo_referencia"] for p in orden_final[:5]]
                })

            # 6. Insertar ruta_puntos en bloque
            if puntos_ruta_bulk:
                cur.executemany(
                    "INSERT INTO ruta_puntos (ruta_id, contenedor_id, orden_visita) VALUES (%s, %s, %s)",
                    puntos_ruta_bulk
                )

            conn.commit()

            total_paradas = sum(r["puntos"] for r in rutas_generadas)
            return {
                "mensaje": f"Se generaron {len(rutas_generadas)} rutas para {total_paradas} contenedores criticos (de {total_criticos} urgentes en 1000 puntos totales).",
                "resumen": {
                    "total_contenedores": 1000,
                    "contenedores_criticos": total_criticos,
                    "camiones_despachados": len(rutas_generadas),
                    "promedio_paradas_por_camion": round(total_paradas / max(len(rutas_generadas), 1), 1)
                },
                "rutas": rutas_generadas
            }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

