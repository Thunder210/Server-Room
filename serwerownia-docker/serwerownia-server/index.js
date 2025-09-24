import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import { WebSocketServer } from 'ws'
import { Pool } from 'pg'
import { z } from 'zod'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.set('trust proxy', true)
app.use(cors())
app.use(express.json())

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
})

const deviceSchema = z.object({
  rack_id: z.string().uuid(),
  kind: z.enum(['SERVER','SWITCH','CUSTOM']),
  label: z.string().min(1),
  ips: z.array(z.object({ address: z.string().regex(/^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){2}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/) })).max(256),
  macs: z.array(z.object({ address: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/) })).max(256)
})

let wss = null
function wsBroadcast(obj) {
  if (!wss) return
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(JSON.stringify(obj))
  }
}

function ok(data) { return { ok: true, data } }
function err(code, message, details) { return { ok: false, error: { code, message, details } } }

app.get('/api/health', (req,res) => { res.json(ok('ok')) })

app.get('/api/racks', async (req,res) => {
  try {
    const q = await pool.query('select id,name,position from dcim.racks order by position asc')
    res.json(ok(q.rows))
  } catch {
    res.status(500).json(err('X102','DB write failed'))
  }
})

app.get('/api/devices', async (req,res) => {
  try {
    const rackId = req.query.rack_id
    if (!rackId) return res.json(ok([]))
    const q = await pool.query(
      `select d.id,d.rack_id,d.kind,d.label,
              coalesce(json_agg(distinct jsonb_build_object('id',i.id,'device_id',i.device_id,'address',i.address)) filter (where i.id is not null), '[]') as ips,
              coalesce(json_agg(distinct jsonb_build_object('id',m.id,'device_id',m.device_id,'address',m.address)) filter (where m.id is not null), '[]') as macs
       from dcim.devices d
       left join dcim.ip_addresses i on i.device_id=d.id
       left join dcim.mac_addresses m on m.device_id=d.id
       where d.rack_id=$1
       group by d.id
       order by d.created_at asc`,
      [rackId]
    )
    res.json(ok(q.rows))
  } catch {
    res.status(500).json(err('X102','DB write failed'))
  }
})

app.post('/api/devices', async (req,res) => {
  const parsed = deviceSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(err('X104','Validation failed on server', parsed.error.flatten()))
  const t0 = process.hrtime.bigint()
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').replace('::ffff:','')
  const c = await pool.connect()
  try {
    await c.query('begin')
    const d = await c.query('insert into dcim.devices(rack_id,kind,label) values($1,$2,$3) returning id,rack_id,kind,label',
      [parsed.data.rack_id, parsed.data.kind, parsed.data.label])
    const id = d.rows[0].id
    for (const v of parsed.data.ips) await c.query('insert into dcim.ip_addresses(device_id,address) values($1,$2) on conflict do nothing', [id, v.address])
    for (const v of parsed.data.macs) await c.query('insert into dcim.mac_addresses(device_id,address) values($1,$2) on conflict do nothing', [id, v.address])
    const t1 = process.hrtime.bigint()
    const ms = Number(t1 - t0) / 1e6
    await c.query('insert into dcim.operation_log(device_id,rack_id,event_type,success,duration_ms,client_ip) values($1,$2,$3,$4,$5,$6)',
      [id, parsed.data.rack_id, 'device_create', true, ms, ip || null])
    await c.query('commit')
    const out = { id, rack_id: parsed.data.rack_id, kind: parsed.data.kind, label: parsed.data.label }
    wsBroadcast({ type: 'device_saved', payload: out })
    res.json(ok({ id, ack: true }))
  } catch (e) {
    try { await c.query('rollback') } catch {}
    await pool.query('insert into dcim.operation_log(event_type,success,error_code,message,client_ip) values($1,$2,$3,$4,$5)',
      ['device_create', false, 'X102', String(e.message || e), ip || null])
    res.status(500).json(err('X102','DB write failed'))
  } finally {
    c.release()
  }
})

app.delete('/api/devices/:id', async (req,res) => {
  const id = req.params.id
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').replace('::ffff:','')
  const t0 = process.hrtime.bigint()
  const c = await pool.connect()
  try {
    await c.query('begin')
    const del = await c.query('delete from dcim.devices where id=$1 returning id,rack_id', [id])
    if (del.rowCount === 0) { await c.query('rollback'); return res.status(404).json(err('X104','Not found')) }
    const t1 = process.hrtime.bigint()
    const ms = Number(t1 - t0) / 1e6
    await c.query('insert into dcim.operation_log(device_id,rack_id,event_type,success,duration_ms,client_ip) values($1,$2,$3,$4,$5,$6)',
      [id, del.rows[0].rack_id, 'device_delete', true, ms, ip || null])
    await c.query('commit')
    wsBroadcast({ type: 'device_deleted', payload: { id } })
    res.json(ok({ id }))
  } catch (e) {
    try { await c.query('rollback') } catch {}
    await pool.query('insert into dcim.operation_log(event_type,success,error_code,message,client_ip) values($1,$2,$3,$4,$5)',
      ['device_delete', false, 'X102', String(e.message || e), ip || null])
    res.status(500).json(err('X102','DB write failed'))
  } finally {
    c.release()
  }
})

app.get('/api/ping', async (req,res) => {
  try {
    const t0 = process.hrtime.bigint()
    const db0 = process.hrtime.bigint()
    const r = await pool.query('select now() as db_time')
    const db1 = process.hrtime.bigint()
    const t1 = process.hrtime.bigint()
    const apiMs = Number(t1 - t0) / 1e6
    const dbMs = Number(db1 - db0) / 1e6
    res.json(ok({ apiMs, dbMs, db_time: r.rows[0].db_time }))
  } catch {
    res.status(500).json(err('X102','DB write failed'))
  }
})

app.get('/api/logs', async (req,res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500)
    const offset = Math.max(Number(req.query.offset || 0), 0)
    const q = await pool.query(
      `select id,device_id,rack_id,event_type,success,error_code,message,duration_ms,client_ip,created_at
       from dcim.operation_log
       order by created_at desc
       limit $1 offset $2`, [limit, offset]
    )
    res.json(ok(q.rows))
  } catch {
    res.status(500).json(err('X102','DB write failed'))
  }
})

app.use(express.static(path.join(__dirname, 'public')))
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

async function runMigrations(pool) {
  const sql = await fs.readFile(new URL('./migrations.sql', import.meta.url), 'utf-8')
  const c = await pool.connect()
  try { await c.query(sql) } finally { c.release() }
}

async function start() {
  await runMigrations(pool)
  const server = http.createServer(app)
  wss = new WebSocketServer({ server, path: '/ws' })
  server.listen(process.env.PORT || 8080, '0.0.0.0', () => console.log('ok:8080'))
}

start().catch(e => { console.error(e); process.exit(1) })
