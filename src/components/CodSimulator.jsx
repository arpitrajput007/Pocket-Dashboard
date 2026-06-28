import React, { useState } from 'react';

const fmt = n => '₹' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN');
const pctAbs = n => Math.abs(Number(n)).toFixed(1) + '%';

const COD_RTO_RATE   = 0.26;
const PREPAID_RTO_RATE = 0.02;

export default function CodSimulator({ pl, costConfig }) {
  const [conversionPct, setConversionPct] = useState(10);

  const cfg           = costConfig || {};
  const rtoCostPer    = parseFloat(cfg.rto_cost_per_order || 135);
  const shipPer       = parseFloat(cfg.shipping_cost || 60);

  const totalOrders = pl?.totalOrders || 0;
  const codOrders   = pl?.codCount    || 0;
  const codRate     = totalOrders > 0 ? (codOrders / totalOrders) * 100 : 0;

  if (totalOrders === 0 || codOrders === 0) return null;

  const ordersToConvert   = Math.round(codOrders * (conversionPct / 100));
  const rtoReduction      = Math.round(ordersToConvert * (COD_RTO_RATE - PREPAID_RTO_RATE));
  const rtoCostSaved      = rtoReduction * (rtoCostPer + shipPer);
  const discountCost      = ordersToConvert * 50;
  const netGain           = rtoCostSaved - discountCost;

  return (
    <div className="card glass" style={{ marginBottom: 20, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>⚖️</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>COD Impact Simulator</h3>
      </div>
      <p style={{ margin: '0 0 20px', fontSize: 12.5, color: 'var(--text-muted)' }}>
        What if you converted more COD orders to prepaid this month?
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.8)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Current COD rate</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24', marginLeft: 'auto' }}>{pctAbs(codRate)}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({codOrders} of {totalOrders} orders)</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>If I convert <strong style={{ color: 'white' }}>{conversionPct}%</strong> of COD orders to prepaid…</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(167,139,250,1)' }}>{ordersToConvert} orders</span>
        </div>
        <input
          type="range" min={5} max={30} step={5} value={conversionPct}
          onChange={e => setConversionPct(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {[5, 10, 15, 20, 25, 30].map(v => (
            <span key={v} style={{ fontSize: 10, color: conversionPct === v ? 'rgba(167,139,250,1)' : 'var(--text-dim)', fontWeight: conversionPct === v ? 700 : 400 }}>{v}%</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>RTO Reduction</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--profit-color)' }}>~{rtoReduction} orders</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{pctAbs(COD_RTO_RATE * 100)} → {pctAbs(PREPAID_RTO_RATE * 100)} RTO rate</div>
        </div>
        <div style={{ padding: '14px 16px', background: netGain > 0 ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)', border: `1px solid ${netGain > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Profit Gain</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: netGain > 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>{netGain >= 0 ? '+' : '−'}{fmt(Math.abs(netGain))}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>net of ₹50 prepaid discount</div>
        </div>
      </div>

      {netGain > 0 && (
        <div style={{ padding: '12px 14px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.65 }}>
          <strong style={{ color: 'rgba(167,139,250,0.9)' }}>How:</strong>{' '}
          Offer ₹50 prepaid discount at checkout (costs {fmt(discountCost)} in discounts, saves {fmt(rtoCostSaved)} in RTOs — net <strong style={{ color: 'var(--profit-color)' }}>+{fmt(netGain)}</strong>)
        </div>
      )}
    </div>
  );
}
