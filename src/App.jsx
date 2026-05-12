import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

// ══════════════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════════════
const T = {
  bg: '#0b0d08', card: '#13160f', card2: '#1a1e14',
  border: '#252c1c', borderHi: '#3a4428',
  green: '#6a9e3f', greenHi: '#8ec85a', greenDim: '#3d5c24',
  amber: '#c47c1a', amberHi: '#e09030', amberDim: '#7a4e10',
  red: '#c0392b', redDim: '#7a2418',
  blue: '#3b7dd8', blueDim: '#1e4080',
  cream: '#f0e8d0', creamMid: '#a89870',
  text: '#ddd8c0', textMid: '#8a8060', textDim: '#3a3828',
  font: "'Lora', Georgia, serif",
  sans: "'DM Sans', sans-serif",
}

const TODAY = new Date().toISOString().split('T')[0]
const fmt$ = n => `${Number(n || 0).toFixed(2)} $`
const fmtD = d => d ? new Date(d).toLocaleDateString('fr-CA') : '—'
const fmtT = d => d ? new Date(d).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : '—'
const hoursCalc = (pIn, pOut) => pIn && pOut
  ? Math.round(((new Date(pOut) - new Date(pIn)) / 3600000) * 100) / 100 : 0

// ══════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ══════════════════════════════════════════════════════════════
const BC = {
  nouveau: T.amber, préparation: T.blue, livré: T.green, annulé: T.red,
  payé: T.green, 'en attente': T.amber, actif: T.green, inactif: T.textDim,
  carte: T.blue, comptant: T.amber, haute: T.red, normale: T.amber,
  basse: T.green, 'en cours': T.blue, 'à faire': T.amber, terminé: T.green,
  envoyé: T.green, facture: T.blue, newsletter: T.green,
}
const Badge = ({ label }) => {
  const c = BC[label?.toLowerCase()] || T.creamMid
  return (
    <span style={{ background: c + '22', color: c, border: `1px solid ${c}44`, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: T.sans }}>
      {label}
    </span>
  )
}

const Card = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', ...style }}>
    {children}
  </div>
)

const Stat = ({ emoji, val, label, color, sub }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: '16px 18px' }}>
    <div style={{ fontSize: 20, marginBottom: 6 }}>{emoji}</div>
    <div style={{ color: color || T.greenHi, fontSize: 21, fontWeight: 800, fontFamily: T.font, lineHeight: 1 }}>{val}</div>
    {sub && <div style={{ color: color || T.greenHi, fontSize: 11, fontFamily: T.sans, marginTop: 2 }}>{sub}</div>}
    <div style={{ color: T.textMid, fontSize: 11, marginTop: 4, fontFamily: T.sans }}>{label}</div>
  </div>
)

const Btn = ({ children, onClick, v = 'g', sz = 'md', full, disabled, style: sx }) => {
  const vs = {
    g: { background: `linear-gradient(135deg,${T.green},${T.greenDim})`, color: T.cream, border: 'none' },
    a: { background: `linear-gradient(135deg,${T.amber},${T.amberDim})`, color: T.cream, border: 'none' },
    r: { background: T.redDim + '44', color: T.red, border: `1px solid ${T.redDim}66` },
    gh: { background: 'transparent', color: T.textMid, border: `1px solid ${T.border}` },
    b: { background: `linear-gradient(135deg,${T.blue},${T.blueDim})`, color: T.cream, border: 'none' },
  }
  const szs = { sm: { padding: '5px 11px', fontSize: 11 }, md: { padding: '9px 17px', fontSize: 13 }, lg: { padding: '13px 26px', fontSize: 15 } }
  const s = vs[v] || vs.g
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...s, ...szs[sz], borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.sans, width: full ? '100%' : undefined, justifyContent: full ? 'center' : undefined, transition: 'opacity .15s', ...sx }}>
      {children}
    </button>
  )
}

const Inp = ({ label, type = 'text', value, onChange, opts, rows, ph, note }) => (
  <div style={{ marginBottom: 13 }}>
    {label && <label style={{ display: 'block', color: T.textMid, fontSize: 11, marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, fontFamily: T.sans }}>{label}</label>}
    {opts
      ? <select value={value} onChange={e => onChange(e.target.value)} style={iSt}>{opts.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}</select>
      : rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={ph} style={{ ...iSt, resize: 'vertical' }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={ph} style={iSt} />
    }
    {note && <div style={{ color: T.textMid, fontSize: 11, marginTop: 4, fontFamily: T.sans }}>{note}</div>}
  </div>
)
const iSt = { width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', fontFamily: T.sans, outline: 'none' }

const Modal = ({ title, onClose, children, wide }) => (
  <div onClick={e => e.target === e.currentTarget && onClose()}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 18, width: '100%', maxWidth: wide ? 720 : 520, maxHeight: '94vh', overflowY: 'auto', padding: '24px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: `1px solid ${T.border}`, paddingBottom: 14 }}>
        <h3 style={{ margin: 0, color: T.cream, fontSize: 17, fontFamily: T.font }}>{title}</h3>
        <Btn onClick={onClose} v="gh" sz="sm">✕</Btn>
      </div>
      {children}
    </div>
  </div>
)

const SecTitle = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <h2 style={{ fontFamily: T.font, color: T.cream, fontSize: 18, margin: 0 }}>{children}</h2>
  </div>
)

const Divider = () => <div style={{ borderTop: `1px solid ${T.border}`, margin: '14px 0' }} />

const Toast = ({ msg }) => (
  <div style={{ background: T.greenDim, border: `1px solid ${T.green}`, borderRadius: 10, padding: '11px 18px', color: T.cream, fontFamily: T.sans, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,.5)' }}>
    {msg}
  </div>
)

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
    <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTopColor: T.green, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

const ErrBox = ({ msg }) => (
  <div style={{ background: T.redDim + '33', border: `1px solid ${T.red}55`, borderRadius: 10, padding: '12px 16px', color: T.red, fontFamily: T.sans, fontSize: 13, margin: '12px 0' }}>
    ⚠️ {msg}
  </div>
)

// ══════════════════════════════════════════════════════════════
// HOOKS — Supabase real-time data
// ══════════════════════════════════════════════════════════════
function useTable(tableName, filter = null) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(!!tableName)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!tableName) return
    setLoading(true)
    let q = supabase.from(tableName).select('*').order('created_at', { ascending: false })
    if (filter) q = q.eq(filter.col, filter.val)
    const { data, error } = await q
    if (error) setError(error.message)
    else setRows(data || [])
    setLoading(false)
  }, [tableName, filter?.col, filter?.val])

  useEffect(() => { load() }, [load])

  // Refresh data every 30 seconds in background (non-disruptive)
  useEffect(() => {
    if (!tableName) return
    const interval = setInterval(() => {
      // Only background-refresh rows, never reset UI state
      supabase.from(tableName).select('*').order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setRows(data) })
    }, 30000)
    return () => clearInterval(interval)
  }, [tableName])

  const insert = async (row) => {
    const { error } = await supabase.from(tableName).insert(row)
    if (error) throw error
  }
  const update = async (id, changes) => {
    const { error } = await supabase.from(tableName).update(changes).eq('id', id)
    if (error) throw error
  }
  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) throw error
  }

  return { rows, loading, error, insert, update, remove, reload: load }
}

// ══════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const go = async () => {
    setLoading(true); setErr('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd })
    if (error) { setErr(error.message); setLoading(false); return }
    // Fetch user profile
    const { data: profile } = await supabase.from('users').select('*').eq('auth_id', data.user.id).single()
    if (profile) onLogin(profile)
    else setErr('Profil introuvable. Contactez l\'administrateur.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>🌿</div>
          <div style={{ fontFamily: T.font, color: T.cream, fontSize: 30, fontWeight: 700 }}>Refuto</div>
          <div style={{ fontFamily: T.sans, color: T.greenHi, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginTop: 3 }}>La Ferme Urbaine</div>
        </div>
        <Card>
          <Inp label="Courriel" type="email" value={email} onChange={setEmail} ph="vous@refuto.ca" />
          <Inp label="Mot de passe" type="password" value={pwd} onChange={setPwd} ph="••••••••" />
          {err && <ErrBox msg={err} />}
          <Btn onClick={go} sz="lg" full disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</Btn>
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════
const AdminDash = ({ orders, punches, subs, inventory, tasks, users, setTab }) => {
  const clients = users.filter(u => u.role === 'client')
  const employees = users.filter(u => u.role === 'employee')
  const rev = orders.filter(o => o.pay_status === 'payé').reduce((s, o) => s + Number(o.total), 0)
  const pending = orders.filter(o => o.pay_status === 'en attente').reduce((s, o) => s + Number(o.total), 0)
  const newOrders = orders.filter(o => o.status === 'nouveau')
  const totalHrs = punches.filter(p => p.punch_out).reduce((s, p) => s + Number(p.hours), 0)
  const lowStock = inventory.filter(i => i.available && i.stock <= 10)
  const activeSubs = subs.filter(s => s.status === 'actif')
  const openTasks = tasks.filter(t => t.status !== 'terminé')

  const alerts = [
    ...newOrders.map(o => ({ msg: `Nouvelle commande de ${o.client_name} — ${fmt$(o.total)}`, color: T.amber })),
    ...lowStock.map(i => ({ msg: `Stock faible: ${i.emoji} ${i.name} (${i.stock} restants)`, color: T.red })),
    ...openTasks.filter(t => t.priority === 'haute').map(t => ({ msg: `Tâche urgente: ${t.title}`, color: T.red })),
  ]

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${T.card2},#0e1209)`, border: `1px solid ${T.borderHi}`, borderRadius: 16, padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>🌿</div>
        <div style={{ fontFamily: T.font, color: T.cream, fontSize: 24, fontWeight: 700 }}>Refuto La Ferme Urbaine</div>
        <div style={{ color: T.textMid, fontSize: 12, fontFamily: T.sans, marginTop: 5 }}>Tableau de bord propriétaire · {fmtD(TODAY)}</div>
      </div>

      {alerts.slice(0, 4).map((a, i) => (
        <div key={i} style={{ background: a.color + '18', border: `1px solid ${a.color}40`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, color: a.color, fontSize: 12, fontFamily: T.sans, fontWeight: 600 }}>
          ⚠️ {a.msg}
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 20, marginTop: 16 }}>
        <Stat emoji="📬" val={newOrders.length} label="Nouvelles commandes" color={T.amber} />
        <Stat emoji="💰" val={fmt$(rev)} label="Recettes perçues" />
        <Stat emoji="⏳" val={fmt$(pending)} label="En attente paiement" color={T.amber} />
        <Stat emoji="🔄" val={activeSubs.length} label="Abonnements actifs" color={T.amberHi} />
        <Stat emoji="👥" val={clients.length} label="Clients" color={T.cream} />
        <Stat emoji="⏱" val={totalHrs.toFixed(1) + 'h'} label="Heures équipe" color={T.creamMid} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <div style={{ fontFamily: T.font, color: T.cream, fontSize: 14, marginBottom: 12 }}>📦 Commandes récentes</div>
          {orders.slice(0, 5).map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.border}`, fontFamily: T.sans, fontSize: 12 }}>
              <span style={{ color: T.text }}>{o.client_name}</span>
              <div style={{ display: 'flex', gap: 6 }}><Badge label={o.status} /><span style={{ color: T.greenHi, fontWeight: 700 }}>{fmt$(o.total)}</span></div>
            </div>
          ))}
          <Btn onClick={() => setTab('orders')} v="gh" sz="sm" style={{ marginTop: 10 }}>Voir toutes →</Btn>
        </Card>
        <Card>
          <div style={{ fontFamily: T.font, color: T.cream, fontSize: 14, marginBottom: 12 }}>✅ Tâches ouvertes</div>
          {openTasks.slice(0, 4).map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.border}`, fontFamily: T.sans, fontSize: 12 }}>
              <div><div style={{ color: T.text }}>{t.title}</div><div style={{ color: T.textMid, fontSize: 10 }}>{t.assignee_name}</div></div>
              <Badge label={t.priority} />
            </div>
          ))}
          <Btn onClick={() => setTab('tasks')} v="gh" sz="sm" style={{ marginTop: 10 }}>Gérer →</Btn>
        </Card>
        <Card>
          <div style={{ fontFamily: T.font, color: T.cream, fontSize: 14, marginBottom: 12 }}>👩‍🌾 Heures aujourd'hui</div>
          {employees.map(e => {
            const todayP = punches.filter(p => p.user_id === e.id && p.punch_in?.startsWith(TODAY))
            const hrs = todayP.reduce((s, p) => s + (p.punch_out ? Number(p.hours) : 0), 0)
            const active = todayP.find(p => !p.punch_out)
            return (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.border}`, fontFamily: T.sans, fontSize: 12 }}>
                <span style={{ color: T.text }}>{e.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>{active && <Badge label="En service" />}<span style={{ color: T.amberHi, fontWeight: 700 }}>{hrs.toFixed(1)}h</span></div>
              </div>
            )
          })}
          <Btn onClick={() => setTab('timesheets')} v="gh" sz="sm" style={{ marginTop: 10 }}>Feuilles de temps →</Btn>
        </Card>
        <Card>
          <div style={{ fontFamily: T.font, color: T.cream, fontSize: 14, marginBottom: 12 }}>🧺 Stock faible</div>
          {lowStock.length === 0 && <div style={{ color: T.textMid, fontSize: 12, fontFamily: T.sans }}>Tous les stocks sont bons ✓</div>}
          {lowStock.map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}`, fontFamily: T.sans, fontSize: 12 }}>
              <span style={{ color: T.text }}>{i.emoji} {i.name}</span>
              <span style={{ color: T.red, fontWeight: 700 }}>{i.stock}</span>
            </div>
          ))}
          <Btn onClick={() => setTab('inventory')} v="gh" sz="sm" style={{ marginTop: 10 }}>Gérer l'inventaire →</Btn>
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// INVENTORY
// ══════════════════════════════════════════════════════════════
const Inventory = ({ user }) => {
  const { rows, loading, error, insert, update, remove } = useTable('inventory')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const isAdmin = user.role === 'admin'
  const cats = ['Légumes', 'Fruits', 'Viande', 'Produits laitiers', 'Épicerie', 'Autre']

  const showToast = msg => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { name: form.name, category: form.category, price: Number(form.price), unit: form.unit, stock: Number(form.stock), available: form.available ?? true, emoji: form.emoji || '🌱', description: form.description || '' }
      if (modal === 'add') await insert(payload)
      else await update(form.id, payload)
      setModal(null); showToast(modal === 'add' ? 'Produit ajouté ✓' : 'Produit mis à jour ✓')
    } catch (e) { showToast('Erreur: ' + e.message) }
    setSaving(false)
  }

  const toggle = async (item) => {
    await update(item.id, { available: !item.available })
    showToast(item.available ? 'Produit retiré de la boutique' : 'Produit activé ✓')
  }

  const del = async (id) => { await remove(id); showToast('Produit supprimé') }

  if (loading) return <Spinner />
  if (error) return <ErrBox msg={error} />

  return (
    <div>
      {toastMsg && <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}><Toast msg={toastMsg} /></div>}
      <SecTitle icon="🧺">Inventaire & Disponibilités</SecTitle>
      <div style={{ background: `${T.green}14`, border: `1px solid ${T.green}35`, borderRadius: 10, padding: '11px 14px', marginBottom: 16, color: T.greenHi, fontSize: 12, fontFamily: T.sans }}>
        ✅ Les produits activés apparaissent dans la boutique des clients. Tout changement est sauvegardé instantanément.
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <Btn onClick={() => { setForm({ name: '', category: 'Légumes', price: '', unit: '', stock: '', available: true, emoji: '🌱', description: '' }); setModal('add') }}>+ Nouveau produit</Btn>
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map(i => (
          <div key={i.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px', opacity: i.available ? 1 : .5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <span style={{ fontSize: 30 }}>{i.emoji}</span>
                <div>
                  <div style={{ color: T.cream, fontWeight: 700, fontFamily: T.sans, fontSize: 14 }}>{i.name} <span style={{ color: T.textMid, fontSize: 11, fontWeight: 400 }}>— {i.category}</span></div>
                  <div style={{ color: T.amber, fontSize: 13, fontFamily: T.sans }}>{fmt$(i.price)} / {i.unit} · Stock: <span style={{ color: i.stock <= 10 ? T.red : T.greenHi }}>{i.stock}</span></div>
                  {i.description && <div style={{ color: T.textMid, fontSize: 11 }}>{i.description}</div>}
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge label={i.available ? 'Disponible' : 'Indisponible'} />
                  <Btn onClick={() => toggle(i)} v="gh" sz="sm">{i.available ? 'Retirer' : 'Activer'}</Btn>
                  <Btn onClick={() => { setForm({ ...i }); setModal('edit') }} v="gh" sz="sm">✏️</Btn>
                  <Btn onClick={() => del(i.id)} v="r" sz="sm">✕</Btn>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Nouveau produit' : 'Modifier produit'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Inp label="Emoji" value={form.emoji} onChange={v => setForm(f => ({ ...f, emoji: v }))} />
            <Inp label="Catégorie" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} opts={cats} />
          </div>
          <Inp label="Nom du produit" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
          <Inp label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Inp label="Prix ($)" type="number" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} />
            <Inp label="Unité" value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} ph="kg, tête…" />
            <Inp label="Stock" type="number" value={form.stock} onChange={v => setForm(f => ({ ...f, stock: v }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setModal(null)} v="gh">Annuler</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Sauvegarde…' : 'Enregistrer'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════════
const Orders = ({ user }) => {
  const filter = user.role === 'client' ? { col: 'client_id', val: user.id } : null
  const { rows, loading, error, update, remove, insert: insertEmail } = useTable('orders', filter)
  const emailTable = useTable('emails_log')
  const [toast, setToast] = useState('')
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const isAdmin = user.role === 'admin'

  const upd = async (id, k, v) => { await update(id, { [k]: v }) }
  const del = async id => { await remove(id); showToast('Commande supprimée') }

  const sendInvoice = async (order) => {
    await emailTable.insert({ type: 'facture', subject: `Votre facture Refuto #${order.id.slice(0,8)}`, recipient: order.client_email, body: `Commande de ${fmt$(order.total)}`, status: 'envoyé' })
    await update(order.id, { invoice_sent: true })
    showToast(`Facture envoyée à ${order.client_email} ✓`)
  }

  const rev = rows.filter(o => o.pay_status === 'payé').reduce((s, o) => s + Number(o.total), 0)
  const statuses = ['nouveau', 'préparation', 'livré', 'annulé']

  if (loading) return <Spinner />
  if (error) return <ErrBox msg={error} />

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}><Toast msg={toast} /></div>}
      <SecTitle icon="📦">{isAdmin ? 'Gestion des commandes' : 'Mes commandes'}</SecTitle>
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 18 }}>
          <Stat emoji="📬" val={rows.filter(o => o.status === 'nouveau').length} label="Nouvelles" color={T.amber} />
          <Stat emoji="⚙️" val={rows.filter(o => o.status === 'préparation').length} label="En préparation" color={T.blue} />
          <Stat emoji="✅" val={rows.filter(o => o.status === 'livré').length} label="Livrées" />
          <Stat emoji="💰" val={fmt$(rev)} label="Recettes" />
        </div>
      )}
      <div style={{ display: 'grid', gap: 14 }}>
        {rows.map(o => (
          <Card key={o.id} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
                  <span style={{ color: T.cream, fontWeight: 700, fontFamily: T.sans }}>{isAdmin ? o.client_name : `Commande #${o.id.slice(0, 8)}`}</span>
                  <Badge label={o.pay_method === 'carte' ? '💳 Carte' : '💵 Comptant'} />
                  <Badge label={o.pay_status} />
                  {o.invoice_sent && <Badge label="Facture ✓" />}
                </div>
                <div style={{ color: T.textMid, fontSize: 12, fontFamily: T.sans, marginBottom: 5 }}>
                  {(o.items || []).map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(' · ')}
                </div>
                {o.delivery_note && <div style={{ color: T.textDim, fontSize: 11 }}>📝 {o.delivery_note}</div>}
                <div style={{ color: T.textMid, fontSize: 10, marginTop: 4 }}>{fmtD(o.date)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ color: T.greenHi, fontWeight: 800, fontFamily: T.font, fontSize: 17 }}>{fmt$(o.total)}</div>
                {isAdmin && (
                  <>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <select value={o.status} onChange={e => upd(o.id, 'status', e.target.value)} style={{ ...iSt, padding: '5px 9px', fontSize: 11, width: 'auto' }}>
                        {statuses.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <select value={o.pay_status} onChange={e => upd(o.id, 'pay_status', e.target.value)} style={{ ...iSt, padding: '5px 9px', fontSize: 11, width: 'auto' }}>
                        {['payé', 'en attente', 'remboursé'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      {!o.invoice_sent && <Btn onClick={() => sendInvoice(o)} v="b" sz="sm">📧 Facture</Btn>}
                      <Btn onClick={() => del(o.id)} v="r" sz="sm">✕</Btn>
                    </div>
                  </>
                )}
                {!isAdmin && <Badge label={o.status} />}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <div style={{ color: T.textMid, fontFamily: T.sans, fontSize: 13 }}>Aucune commande.</div>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SHOP (Client)
// ══════════════════════════════════════════════════════════════
const Shop = ({ user }) => {
  const { rows: inventory } = useTable('inventory')
  const { insert } = useTable('orders')
  const avail = inventory.filter(i => i.available)
  const [cart, setCart] = useState({})
  const [pay, setPay] = useState('carte')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const q = id => cart[id] || 0
  const add = item => setCart(c => ({ ...c, [item.id]: (c[item.id] || 0) + 1 }))
  const sub = id => setCart(c => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n })
  const cartItems = avail.filter(i => cart[i.id] > 0)
  const total = cartItems.reduce((s, i) => s + i.price * cart[i.id], 0)

  const place = async () => {
    await insert({
      client_id: user.id,
      client_name: user.name,
      client_email: user.email,
      items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: cart[i.id], emoji: i.emoji })),
      total,
      status: 'nouveau',
      pay_method: pay,
      pay_status: pay === 'carte' ? 'payé' : 'en attente',
      delivery_note: note,
      date: TODAY,
      invoice_sent: false,
    })
    setCart({}); setNote('')
    showToast('Commande confirmée ✓ Merci!')
  }

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}><Toast msg={toast} /></div>}
      <SecTitle icon="🛒">Commander — Disponibilités de la semaine</SecTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 22 }}>
        {avail.map(item => (
          <div key={item.id} style={{ background: T.card, border: `1px solid ${q(item.id) > 0 ? T.green : T.border}`, borderRadius: 14, padding: '16px 12px', textAlign: 'center', transition: 'border-color .2s' }}>
            <div style={{ fontSize: 36, marginBottom: 7 }}>{item.emoji}</div>
            <div style={{ color: T.cream, fontWeight: 700, fontFamily: T.sans, fontSize: 13, marginBottom: 2 }}>{item.name}</div>
            <div style={{ color: T.textMid, fontSize: 11, fontFamily: T.sans, marginBottom: 3 }}>{item.description}</div>
            <div style={{ color: T.amberHi, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{fmt$(item.price)} / {item.unit}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Btn onClick={() => sub(item.id)} v="gh" sz="sm" style={{ padding: '4px 10px' }}>−</Btn>
              <span style={{ color: q(item.id) > 0 ? T.greenHi : T.textDim, fontWeight: 800, fontSize: 16, minWidth: 22, textAlign: 'center', fontFamily: T.font }}>{q(item.id)}</span>
              <Btn onClick={() => add(item)} sz="sm" style={{ padding: '4px 10px' }}>+</Btn>
            </div>
          </div>
        ))}
        {avail.length === 0 && <div style={{ color: T.textMid, fontFamily: T.sans }}>Aucun produit disponible cette semaine. Revenez bientôt! 🌱</div>}
      </div>

      {cartItems.length > 0 && (
        <Card style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: T.font, color: T.cream, fontSize: 16, marginBottom: 14 }}>Mon panier</div>
          {cartItems.map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.border}`, fontFamily: T.sans, fontSize: 13 }}>
              <span style={{ color: T.text }}>{i.emoji} {i.name} × {cart[i.id]}</span>
              <span style={{ color: T.amberHi, fontWeight: 700 }}>{fmt$(i.price * cart[i.id])}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: T.font, fontSize: 18, color: T.cream, fontWeight: 700 }}>
            <span>Total</span><span style={{ color: T.greenHi }}>{fmt$(total)}</span>
          </div>
          <Divider />
          <Inp label="Paiement" value={pay} onChange={setPay} opts={[{ v: 'carte', l: '💳 Paiement en ligne (carte)' }, { v: 'comptant', l: '💵 Paiement à la livraison (comptant)' }]} />
          <Inp label="Notes de livraison" value={note} onChange={setNote} rows={2} ph="Instructions, heure préférée…" />
          <Btn onClick={place} sz="lg" full>Confirmer la commande →</Btn>
        </Card>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TIMESHEETS
// ══════════════════════════════════════════════════════════════
const Timesheets = ({ user }) => {
  const filter = user.role === 'employee' ? { col: 'user_id', val: user.id } : null
  const { rows, loading, error, insert, update, remove } = useTable('punch_records', filter)
  const { rows: allUsers } = useTable('users')
  const employees = allUsers.filter(u => u.role === 'employee')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ userId: '', date: TODAY, pIn: '08:00', pOut: '16:00', note: '' })
  const [toast, setToast] = useState('')
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const isAdmin = user.role === 'admin'

  const active = rows.find(p => p.user_id === user.id && !p.punch_out)

  const punchIn = async () => {
    await insert({ user_id: user.id, user_name: user.name, punch_in: new Date().toISOString(), manual_entry: false })
    showToast('Pointage d\'entrée enregistré ✓')
  }

  const punchOut = async () => {
    const pOut = new Date().toISOString()
    await update(active.id, { punch_out: pOut, hours: hoursCalc(active.punch_in, pOut) })
    showToast('Pointage de sortie enregistré ✓')
  }

  const addManual = async () => {
    const u = employees.find(e => e.id === form.userId)
    const pIn = `${form.date}T${form.pIn}:00`, pOut = `${form.date}T${form.pOut}:00`
    await insert({ user_id: form.userId, user_name: u?.name || '', punch_in: pIn, punch_out: pOut, hours: hoursCalc(pIn, pOut), note: form.note, manual_entry: true })
    setModal(false); showToast('Entrée manuelle ajoutée ✓')
  }

  const totalHrs = rows.filter(p => p.punch_out).reduce((s, p) => s + Number(p.hours), 0)

  if (loading) return <Spinner />
  if (error) return <ErrBox msg={error} />

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}><Toast msg={toast} /></div>}
      <SecTitle icon="⏱">Feuilles de temps</SecTitle>

      {!isAdmin && (
        <Card style={{ textAlign: 'center', marginBottom: 22, padding: '30px 24px' }}>
          {active ? (
            <>
              <div style={{ color: T.greenHi, fontSize: 12, fontFamily: T.sans, fontWeight: 700, letterSpacing: 3, marginBottom: 10 }}>▶ EN SERVICE</div>
              <div style={{ fontFamily: T.font, color: T.greenHi, fontSize: 36, fontWeight: 700, marginBottom: 14 }}>
                {fmtT(active.punch_in)} →
              </div>
              <Btn onClick={punchOut} v="r" sz="lg">⏹ Pointer la sortie</Btn>
            </>
          ) : (
            <>
              <div style={{ color: T.textMid, fontSize: 13, fontFamily: T.sans, marginBottom: 14 }}>Vous n'êtes pas pointé(e) en service.</div>
              <Btn onClick={punchIn} sz="lg">▶ Pointer l'entrée</Btn>
            </>
          )}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 18 }}>
        <Stat emoji="⏱" val={totalHrs.toFixed(1) + 'h'} label={isAdmin ? 'Heures totales' : 'Mes heures'} />
        {!isAdmin && <Stat emoji="💰" val={fmt$(totalHrs * (user.hourly_rate || 0))} label="Gains estimés" color={T.amber} />}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <Btn onClick={() => { setForm({ userId: employees[0]?.id || '', date: TODAY, pIn: '08:00', pOut: '16:00', note: '' }); setModal(true) }} v="a">+ Entrée manuelle</Btn>
        </div>
      )}

      <div style={{ display: 'grid', gap: 9 }}>
        {rows.map(p => (
          <div key={p.id} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              {isAdmin && <div style={{ color: T.greenHi, fontSize: 12, fontFamily: T.sans, fontWeight: 700, marginBottom: 3 }}>{p.user_name}</div>}
              <div style={{ color: T.cream, fontWeight: 600, fontFamily: T.sans, fontSize: 13 }}>{fmtD(p.punch_in)}</div>
              <div style={{ color: T.textMid, fontSize: 11, fontFamily: T.sans }}>{fmtT(p.punch_in)} → {p.punch_out ? fmtT(p.punch_out) : 'En cours…'}{p.note ? ` · ${p.note}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {p.manual_entry && <Badge label="Manuel" />}
              {p.punch_out
                ? <span style={{ color: T.amberHi, fontWeight: 800, fontFamily: T.font }}>{Number(p.hours).toFixed(2)}h</span>
                : <Badge label="Actif" />}
              {isAdmin && <Btn onClick={() => remove(p.id)} v="r" sz="sm">✕</Btn>}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title="Entrée manuelle" onClose={() => setModal(false)}>
          <Inp label="Employé(e)" value={form.userId} onChange={v => setForm(f => ({ ...f, userId: v }))} opts={employees.map(e => ({ v: e.id, l: e.name }))} />
          <Inp label="Date" type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Inp label="Entrée" type="time" value={form.pIn} onChange={v => setForm(f => ({ ...f, pIn: v }))} />
            <Inp label="Sortie" type="time" value={form.pOut} onChange={v => setForm(f => ({ ...f, pOut: v }))} />
          </div>
          <Inp label="Note" value={form.note} onChange={v => setForm(f => ({ ...f, note: v }))} ph="Congé, formation…" />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setModal(false)} v="gh">Annuler</Btn>
            <Btn onClick={addManual} v="a">Enregistrer</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════
const TasksView = ({ user }) => {
  const isAdmin = user.role === 'admin'
  const filter = user.role === 'employee' ? { col: 'assignee_id', val: user.id } : null
  const { rows, loading, error, insert, update, remove } = useTable('tasks', filter)
  const { rows: allUsers } = useTable('users')
  const employees = allUsers.filter(u => u.role !== 'client')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', assignee_id: '', priority: 'normale', due_date: TODAY, note: '' })
  const [toast, setToast] = useState('')
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const save = async () => {
    const u = employees.find(e => e.id === form.assignee_id)
    await insert({ title: form.title, assignee_id: form.assignee_id || null, assignee_name: u?.name || 'Non assigné', priority: form.priority, due_date: form.due_date, note: form.note, status: 'à faire' })
    setModal(false); showToast('Tâche créée ✓')
  }

  const byStatus = ['à faire', 'en cours', 'terminé'].map(s => ({ s, items: rows.filter(t => t.status === s) }))

  if (loading) return <Spinner />
  if (error) return <ErrBox msg={error} />

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}><Toast msg={toast} /></div>}
      <SecTitle icon="✅">Tâches</SecTitle>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <Btn onClick={() => { setForm({ title: '', assignee_id: employees[0]?.id || '', priority: 'normale', due_date: TODAY, note: '' }); setModal(true) }}>+ Nouvelle tâche</Btn>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        {byStatus.map(({ s, items }) => (
          <div key={s}>
            <div style={{ color: T.textMid, fontSize: 11, fontFamily: T.sans, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{s} ({items.length})</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {items.map(t => (
                <div key={t.id} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 11, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Badge label={t.priority} />
                    {isAdmin && <Btn onClick={() => remove(t.id)} v="r" sz="sm">✕</Btn>}
                  </div>
                  <div style={{ color: T.cream, fontFamily: T.sans, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ color: T.textMid, fontSize: 11, fontFamily: T.sans }}>{t.assignee_name} · {fmtD(t.due_date)}</div>
                  {t.note && <div style={{ color: T.textMid, fontSize: 11, marginTop: 5, fontStyle: 'italic' }}>{t.note}</div>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {['à faire', 'en cours', 'terminé'].filter(st => st !== t.status).map(st => (
                      <Btn key={st} onClick={() => update(t.id, { status: st })} v="gh" sz="sm">{st}</Btn>
                    ))}
                  </div>
                </div>
              ))}
              {items.length === 0 && <div style={{ color: T.textDim, fontSize: 12, fontFamily: T.sans, padding: '8px 12px', background: T.card, borderRadius: 8 }}>Aucune</div>}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title="Nouvelle tâche" onClose={() => setModal(false)}>
          <Inp label="Titre" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Inp label="Assigné à" value={form.assignee_id} onChange={v => setForm(f => ({ ...f, assignee_id: v }))} opts={[{ v: '', l: 'Non assigné' }, ...employees.map(e => ({ v: e.id, l: e.name }))]} />
            <Inp label="Priorité" value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} opts={['haute', 'normale', 'basse']} />
          </div>
          <Inp label="Échéance" type="date" value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} />
          <Inp label="Note" value={form.note} onChange={v => setForm(f => ({ ...f, note: v }))} rows={2} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setModal(false)} v="gh">Annuler</Btn>
            <Btn onClick={save}>Créer</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════
const SubsView = ({ user }) => {
  const isAdmin = user.role === 'admin'
  const filter = !isAdmin ? { col: 'client_id', val: user.id } : null
  const { rows, loading, error, insert, update, remove } = useTable('subscriptions', filter)
  const { rows: allUsers } = useTable('users')
  const clients = allUsers.filter(u => u.role === 'client')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ client_id: '', plan: 'Panier Hebdomadaire', price: '', frequency: 'hebdomadaire', pay_method: 'carte', notes: '' })
  const [toast, setToast] = useState('')
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const PLANS = ['Panier Hebdomadaire', 'Panier Bimensuel', 'Panier Mensuel', 'Abonnement Légumes+', 'Abonnement Complet (prix à définir)']

  const add = async () => {
    const c = clients.find(c => c.id === form.client_id)
    await insert({ client_id: form.client_id, client_name: c?.name || '', client_email: c?.email || '', plan: form.plan, price: form.price ? Number(form.price) : null, frequency: form.frequency, pay_method: form.pay_method, status: 'actif', start_date: TODAY, notes: form.notes })
    setModal(false); showToast('Abonnement créé ✓')
  }

  if (loading) return <Spinner />
  if (error) return <ErrBox msg={error} />

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}><Toast msg={toast} /></div>}
      <SecTitle icon="🔄">Abonnements</SecTitle>
      <div style={{ background: `${T.amber}14`, border: `1px solid ${T.amber}30`, borderRadius: 10, padding: '11px 14px', marginBottom: 16, color: T.amberHi, fontSize: 12, fontFamily: T.sans }}>
        💳 Paiement automatique (carte) ou comptant à la livraison · Prix libres ou à définir ultérieurement.
      </div>
      {isAdmin && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Btn onClick={() => { setForm({ client_id: clients[0]?.id || '', plan: PLANS[0], price: '', frequency: 'hebdomadaire', pay_method: 'carte', notes: '' }); setModal(true) }} v="a">+ Nouvel abonnement</Btn>
      </div>}
      {rows.length === 0 && <Card><div style={{ color: T.textMid, fontFamily: T.sans, fontSize: 13 }}>Aucun abonnement actif. Contactez-nous pour vous abonner! 🌿</div></Card>}
      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map(s => (
          <Card key={s.id} style={{ opacity: s.status === 'actif' ? 1 : .6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ color: T.cream, fontWeight: 700, fontFamily: T.sans, fontSize: 15 }}>{s.plan}</div>
                {isAdmin && <div style={{ color: T.textMid, fontSize: 12, fontFamily: T.sans, marginTop: 2 }}>👤 {s.client_name} · {s.client_email}</div>}
                <div style={{ marginTop: 8, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <Badge label={s.status} /><Badge label={s.frequency} />
                  <Badge label={s.pay_method === 'carte' ? '💳 Carte' : '💵 Comptant'} />
                  {s.price ? <span style={{ color: T.greenHi, fontWeight: 800, fontFamily: T.font, fontSize: 14 }}>{fmt$(s.price)}</span> : <Badge label="Prix à définir" />}
                </div>
                {s.notes && <div style={{ color: T.textMid, fontSize: 11, marginTop: 6 }}>📝 {s.notes}</div>}
                <div style={{ color: T.textDim, fontSize: 10, fontFamily: T.sans, marginTop: 5 }}>Depuis {fmtD(s.start_date)}</div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 7 }}>
                  <Btn onClick={() => update(s.id, { status: s.status === 'actif' ? 'inactif' : 'actif' })} v="gh" sz="sm">{s.status === 'actif' ? 'Suspendre' : 'Réactiver'}</Btn>
                  <Btn onClick={() => remove(s.id)} v="r" sz="sm">✕</Btn>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
      {modal && (
        <Modal title="Nouvel abonnement" onClose={() => setModal(false)}>
          <Inp label="Client" value={form.client_id} onChange={v => setForm(f => ({ ...f, client_id: v }))} opts={clients.map(c => ({ v: c.id, l: c.name }))} />
          <Inp label="Formule" value={form.plan} onChange={v => setForm(f => ({ ...f, plan: v }))} opts={PLANS} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Inp label="Fréquence" value={form.frequency} onChange={v => setForm(f => ({ ...f, frequency: v }))} opts={['hebdomadaire', 'bimensuel', 'mensuel']} />
            <Inp label="Prix (vide = à définir)" type="number" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} ph="35" />
          </div>
          <Inp label="Paiement" value={form.pay_method} onChange={v => setForm(f => ({ ...f, pay_method: v }))} opts={[{ v: 'carte', l: '💳 Carte' }, { v: 'comptant', l: '💵 Comptant' }]} />
          <Inp label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setModal(false)} v="gh">Annuler</Btn>
            <Btn onClick={add} v="a">Créer</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// EMAIL CENTER
// ══════════════════════════════════════════════════════════════
const EmailCenter = ({ user }) => {
  const { rows: emails, loading, insert } = useTable('emails_log')
  const { rows: inventory } = useTable('inventory')
  const { rows: allUsers } = useTable('users')

  const clients = allUsers.filter(u => u.role === 'client' && u.email)

  const [compose, setCompose] = useState(false)
  const [subj, setSubj] = useState('')
  const [body, setBody] = useState('')
  const [mode, setMode] = useState('newsletter')

  const [recipientMode, setRecipientMode] = useState('manual')
  const [selectedClientIds, setSelectedClientIds] = useState([])
  const [manualEmail, setManualEmail] = useState('')
  const [manualName, setManualName] = useState('Test')

  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const emailMode = 'edge'

  const htmlEscape = value =>
    String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')

  const textToHtml = text =>
    htmlEscape(text).replaceAll('\n', '<br />')

  const personalize = (template, client) => {
    const firstName = (client.name || '').split(' ')[0] || client.name || ''
    return String(template || '')
      .replaceAll('{prénom}', firstName)
      .replaceAll('{prenom}', firstName)
      .replaceAll('{nom}', client.name || '')
      .replaceAll('{email}', client.email || '')
  }

  const isValidEmail = email => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
  }

  const getTargetClients = () => {
    if (recipientMode === 'all') return clients

    if (recipientMode === 'selected') {
      return clients.filter(c => selectedClientIds.includes(c.id))
    }

    if (recipientMode === 'manual') {
      const cleanEmail = manualEmail.trim()

      if (!cleanEmail) return []

      return [{
        id: 'manual-test-recipient',
        name: manualName.trim() || 'Test',
        email: cleanEmail,
        role: 'manual',
      }]
    }

    return []
  }

  const toggleClient = id => {
    setSelectedClientIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  const resetCompose = ({
    nextMode = 'annonce',
    nextSubject = '',
    nextBody = '',
    nextRecipientMode = 'manual',
  } = {}) => {
    setMode(nextMode)
    setSubj(nextSubject)
    setBody(nextBody)
    setRecipientMode(nextRecipientMode)
    setSelectedClientIds([])
    setManualEmail('')
    setManualName('Test')
    setCompose(true)
  }

  const autoGen = () => {
    const avail = inventory.filter(i => i.available)

    setSubj('🌿 Nouveautés de la semaine — Refuto La Ferme Urbaine')
    setBody(
      `Bonjour {prénom},\n\n` +
      `Voici les disponibilités de cette semaine :\n\n` +
      `${avail.map(i => `${i.emoji} ${i.name} — ${fmt$(i.price)}/${i.unit}\n   ${i.description || ''}`).join('\n\n')}\n\n` +
      `Connectez-vous pour passer votre commande.\n\n` +
      `À bientôt!\nRefuto 🌿`
    )

    setMode('newsletter')
    setRecipientMode(clients.length > 0 ? 'all' : 'manual')
    setSelectedClientIds([])
    setManualEmail('')
    setManualName('Test')
    setCompose(true)
  }

  const sendViaEdgeFunction = async ({ recipients, subject, message, type }) => {
    const payload = {
      type,
      subject,
      fromName: 'Refuto La Ferme Urbaine',
      recipients: recipients.map(client => ({
        email: client.email,
        name: client.name || client.email,
        text: personalize(message, client),
        html: textToHtml(personalize(message, client)),
      })),
    }

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: payload,
    })

    if (error) throw error
    if (data?.error) throw new Error(data.error)

    return data
  }

  const send = async () => {
    if (sending) return

    const cleanSubject = subj.trim()
    const cleanBody = body.trim()
    const targetClients = getTargetClients()

    if (!cleanSubject) {
      showToast('Ajoutez un objet avant d’envoyer.')
      return
    }

    if (!cleanBody) {
      showToast('Ajoutez un message avant d’envoyer.')
      return
    }

    if (targetClients.length === 0) {
      showToast('Choisissez au moins un destinataire.')
      return
    }

    const invalidClients = targetClients.filter(c => !isValidEmail(c.email))
    if (invalidClients.length > 0) {
      showToast('Un ou plusieurs courriels ne sont pas valides.')
      return
    }

    setSending(true)

    try {
      const recipientLabel =
        recipientMode === 'all'
          ? `Tous les clients (${targetClients.length})`
          : targetClients.map(c => c.email).join(', ')

      if (emailMode === 'edge') {
        await sendViaEdgeFunction({
          recipients: targetClients,
          subject: cleanSubject,
          message: cleanBody,
          type: mode,
        })
      } else {
        console.warn('VITE_EMAIL_MODE is not set to edge. Email was logged only.')
      }

      await insert({
        type: mode,
        subject: cleanSubject,
        recipient: recipientLabel,
        body: cleanBody,
        status: emailMode === 'edge' ? 'envoyé' : 'log seulement',
      })

      setCompose(false)
      setSubj('')
      setBody('')
      setSelectedClientIds([])
      setManualEmail('')
      setManualName('Test')

      showToast(
        emailMode === 'edge'
          ? `Courriel réellement envoyé à ${targetClients.length} destinataire(s) ✓`
          : `Courriel enregistré seulement. Activez VITE_EMAIL_MODE=edge pour l’envoi réel.`
      )
    } catch (e) {
      console.error(e)

      try {
        await insert({
          type: mode,
          subject: cleanSubject,
          recipient: targetClients.map(c => c.email).join(', '),
          body: cleanBody,
          status: 'erreur',
        })
      } catch (logError) {
        console.error('Impossible de logger l’erreur email:', logError)
      }

      showToast(`Erreur d’envoi: ${e.message || 'Erreur inconnue'}`)
    }

    setSending(false)
  }

  if (loading) return <Spinner />

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
          <Toast msg={toast} />
        </div>
      )}

      <SecTitle icon="📧">Centre de communication</SecTitle>

      {emailMode !== 'edge' && (
        <div style={{ background: `${T.amber}14`, border: `1px solid ${T.amber}35`, borderRadius: 10, padding: '11px 14px', marginBottom: 16, color: T.amberHi, fontSize: 12, fontFamily: T.sans }}>
          ⚠️ Mode courriel actuel: <strong>log seulement</strong>. Les messages seront enregistrés dans l’app, mais pas envoyés réellement tant que <strong>VITE_EMAIL_MODE=edge</strong> et la Edge Function <strong>send-email</strong> ne sont pas configurés.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Btn onClick={autoGen}>📰 Générer newsletter semaine</Btn>
        <Btn
          onClick={() => resetCompose({ nextMode: 'annonce', nextSubject: '', nextBody: '', nextRecipientMode: 'manual' })}
          v="a"
        >
          ✉️ Nouveau courriel
        </Btn>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {emails.map(e => (
          <div key={e.id} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 11, padding: '13px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                  <Badge label={e.type} />
                  <span style={{ color: T.cream, fontWeight: 700, fontFamily: T.sans, fontSize: 13 }}>{e.subject}</span>
                </div>
                <div style={{ color: T.textMid, fontSize: 11, fontFamily: T.sans }}>
                  À: {e.recipient} · {fmtD(e.sent_at || e.created_at)}
                </div>
              </div>
              <Badge label={e.status} />
            </div>
          </div>
        ))}

        {emails.length === 0 && (
          <div style={{ color: T.textMid, fontFamily: T.sans, fontSize: 13 }}>
            Aucun courriel envoyé.
          </div>
        )}
      </div>

      {compose && (
        <Modal title="Composer un courriel" wide onClose={() => !sending && setCompose(false)}>
          <Inp
            label="Type"
            value={mode}
            onChange={setMode}
            opts={[
              { v: 'newsletter', l: '📰 Newsletter' },
              { v: 'facture', l: '📄 Facture' },
              { v: 'annonce', l: '📣 Annonce' },
            ]}
          />

          <Inp
            label="Destinataires"
            value={recipientMode}
            onChange={v => {
              setRecipientMode(v)
              if (v === 'all') setSelectedClientIds([])
              if (v !== 'manual') {
                setManualEmail('')
                setManualName('Test')
              }
            }}
            opts={[
              { v: 'manual', l: 'Entrer un courriel manuellement' },
              { v: 'all', l: `Tous les clients (${clients.length})` },
              { v: 'selected', l: 'Choisir des clients précis' },
            ]}
          />

          {recipientMode === 'manual' && (
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 13 }}>
              <div style={{ color: T.textMid, fontSize: 11, fontFamily: T.sans, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>
                Destinataire de test
              </div>

              <Inp
                label="Nom"
                value={manualName}
                onChange={setManualName}
                ph="Ex: Camille"
                note="Optionnel. Utilisé pour personnaliser {prénom}."
              />

              <Inp
                label="Courriel"
                type="email"
                value={manualEmail}
                onChange={setManualEmail}
                ph="exemple@email.com"
                note="Ce courriel ne sera pas ajouté à la base de données. Il sert seulement à tester l’envoi."
              />
            </div>
          )}

          {recipientMode === 'selected' && (
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 13, maxHeight: 220, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ color: T.textMid, fontSize: 11, fontFamily: T.sans, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8 }}>
                  Clients sélectionnés: {selectedClientIds.length}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn
                    onClick={() => setSelectedClientIds(clients.map(c => c.id))}
                    v="gh"
                    sz="sm"
                  >
                    Tout cocher
                  </Btn>
                  <Btn
                    onClick={() => setSelectedClientIds([])}
                    v="gh"
                    sz="sm"
                  >
                    Tout décocher
                  </Btn>
                </div>
              </div>

              {clients.length === 0 && (
                <div style={{ color: T.textMid, fontSize: 12, fontFamily: T.sans }}>
                  Aucun client avec courriel dans la base de données.
                </div>
              )}

              {clients.map(c => (
                <label
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 6px',
                    borderBottom: `1px solid ${T.border}`,
                    cursor: 'pointer',
                    fontFamily: T.sans,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedClientIds.includes(c.id)}
                    onChange={() => toggleClient(c.id)}
                  />
                  <div>
                    <div style={{ color: T.cream, fontSize: 13, fontWeight: 700 }}>
                      {c.name || 'Client sans nom'}
                    </div>
                    <div style={{ color: T.textMid, fontSize: 11 }}>
                      {c.email}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div style={{ background: `${T.green}14`, border: `1px solid ${T.green}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 13, color: T.greenHi, fontSize: 12, fontFamily: T.sans }}>
            📬 Envoi prévu à:{' '}
            {recipientMode === 'manual'
              ? manualEmail || 'courriel manuel non défini'
              : recipientMode === 'all'
                ? `tous les clients (${clients.length})`
                : `${selectedClientIds.length} client(s) sélectionné(s)`}
            <br />
            💡 Variables disponibles: {'{prénom}'}, {'{prenom}'}, {'{nom}'}, {'{email}'}.
          </div>

          <Inp label="Objet" value={subj} onChange={setSubj} />
          <Inp label="Message" value={body} onChange={setBody} rows={10} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Btn onClick={() => setCompose(false)} v="gh" disabled={sending}>
              Annuler
            </Btn>
            <Btn onClick={send} disabled={sending}>
              {sending ? 'Envoi…' : '📤 Envoyer'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CLIENTS ADMIN
// ══════════════════════════════════════════════════════════════
const ClientsView = ({ user }) => {
  const { rows: allUsers, loading, error, remove } = useTable('users')
  const { rows: subs } = useTable('subscriptions')
  const clients = allUsers.filter(u => u.role === 'client')
  const [toast, setToast] = useState('')
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  if (loading) return <Spinner />
  if (error) return <ErrBox msg={error} />

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}><Toast msg={toast} /></div>}
      <SecTitle icon="👥">Base de clients</SecTitle>
      <div style={{ background: `${T.blue}14`, border: `1px solid ${T.blue}30`, borderRadius: 10, padding: '11px 14px', marginBottom: 16, color: T.blue, fontSize: 12, fontFamily: T.sans }}>
        ℹ️ Pour ajouter un client, créez d'abord son compte dans Supabase → Authentication → Add user, puis ajoutez son profil dans la table <strong>users</strong> avec son <strong>auth_id</strong>.
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {clients.map(c => {
          const sub = subs.find(s => s.client_id === c.id && s.status === 'actif')
          return (
            <Card key={c.id} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ color: T.cream, fontWeight: 700, fontFamily: T.sans, fontSize: 14 }}>{c.name}</div>
                  <div style={{ color: T.textMid, fontSize: 12, fontFamily: T.sans }}>📧 {c.email} · 📞 {c.phone || '—'}</div>
                  {c.address && <div style={{ color: T.textMid, fontSize: 11 }}>📍 {c.address}</div>}
                  <div style={{ marginTop: 7 }}>{sub ? <Badge label={`🔄 ${sub.plan}`} /> : <span style={{ color: T.textDim, fontSize: 11, fontFamily: T.sans }}>Sans abonnement</span>}</div>
                </div>
              </div>
            </Card>
          )
        })}
        {clients.length === 0 && <div style={{ color: T.textMid, fontFamily: T.sans, fontSize: 13 }}>Aucun client dans la base.</div>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// NAV
// ══════════════════════════════════════════════════════════════
const NAV = {
  admin: [
    { id: 'dash', label: 'Aperçu', icon: '🏡' },
    { id: 'orders', label: 'Commandes', icon: '📦' },
    { id: 'inventory', label: 'Inventaire', icon: '🧺' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'timesheets', label: 'Heures', icon: '⏱' },
    { id: 'tasks', label: 'Tâches', icon: '✅' },
    { id: 'subs', label: 'Abonnements', icon: '🔄' },
    { id: 'emails', label: 'Courriels', icon: '📧' },
  ],
  employee: [
    { id: 'timesheets', label: 'Pointeuse', icon: '🕐' },
    { id: 'tasks', label: 'Mes tâches', icon: '✅' },
    { id: 'inventory', label: 'Inventaire', icon: '🧺' },
  ],
  client: [
    { id: 'shop', label: 'Commander', icon: '🛒' },
    { id: 'orders', label: 'Mes commandes', icon: '📦' },
    { id: 'subs', label: 'Mon abonnement', icon: '🔄' },
  ],
}

// ══════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Supabase data for admin dashboard (only loaded when admin)
  const { rows: orders } = useTable(user?.role === 'admin' ? 'orders' : null)
  const { rows: punches } = useTable(user?.role === 'admin' ? 'punch_records' : null)
  const { rows: subs } = useTable(user?.role === 'admin' ? 'subscriptions' : null)
  const { rows: inventory } = useTable(user?.role === 'admin' ? 'inventory' : null)
  const { rows: tasks } = useTable(user?.role === 'admin' ? 'tasks' : null)
  const { rows: allUsers } = useTable(user?.role === 'admin' ? 'users' : null)

  // Restore session on load
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single()
        if (profile) {
          setUser(profile)
          setTab(NAV[profile.role]?.[0]?.id || 'dash')
        }
      }
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setUser(null); setTab(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = (profile) => {
    setUser(profile)
    setTab(NAV[profile.role]?.[0]?.id || 'dash')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null); setTab(null)
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
        <Spinner />
      </div>
    </div>
  )

  if (!user) return <Login onLogin={login} />

  const navKey = user.role
  const nav = NAV[navKey] || NAV.client

  const renderTab = () => {
    switch (tab) {
      case 'dash': return <AdminDash orders={orders} punches={punches} subs={subs} inventory={inventory} tasks={tasks} users={allUsers} setTab={setTab} />
      case 'orders': return <Orders user={user} />
      case 'inventory': return <Inventory user={user} />
      case 'clients': return <ClientsView user={user} />
      case 'timesheets': return <Timesheets user={user} />
      case 'tasks': return <TasksView user={user} />
      case 'subs': return <SubsView user={user} />
      case 'emails': return <EmailCenter user={user} />
      case 'shop': return <Shop user={user} />
      default: return null
    }
  }

  const roleLabel = { admin: '👑 Propriétaire', employee: '👩‍🌾 Employé(e)', client: '🛒 Client(e)' }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ fontSize: 24 }}>🌿</span>
          <div>
            <div style={{ fontFamily: T.font, color: T.cream, fontSize: 14, fontWeight: 700 }}>Refuto</div>
            <div style={{ fontFamily: T.sans, color: T.greenHi, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' }}>La Ferme Urbaine</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: T.text, fontSize: 12, fontFamily: T.sans, fontWeight: 700 }}>{user.avatar} {user.name}</div>
            <div style={{ color: T.textMid, fontSize: 10, fontFamily: T.sans }}>{roleLabel[user.role]}</div>
          </div>
          <Btn onClick={logout} v="gh" sz="sm">Déconnexion</Btn>
        </div>
      </div>

      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '0 14px', display: 'flex', gap: 2, overflowX: 'auto' }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: tab === n.id ? T.greenHi : T.textMid, fontWeight: tab === n.id ? 700 : 500, fontSize: 12, borderBottom: `2px solid ${tab === n.id ? T.green : 'transparent'}`, whiteSpace: 'nowrap', fontFamily: T.sans, transition: 'all .2s' }}>
            {n.icon} {n.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px 60px' }}>
        {renderTab()}
      </div>
    </div>
  )
}
