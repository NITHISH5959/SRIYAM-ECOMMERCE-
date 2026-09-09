'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { getAddresses, saveAddress, deleteAddress, setDefaultAddress } from '@/lib/data';
import { Address } from '@/types';
import { INDIAN_STATES, validateAddress } from '@/lib/shipping';
import { MapPin, Plus, Trash2, Star, StarOff, Edit3, X, Loader2, Check, AlertTriangle } from 'lucide-react';

function AddressForm({ initial, onSave, onCancel }: { initial?: Partial<Address>; onSave: (a: Partial<Address>) => void; onCancel: () => void; }) {
  const [form, setForm] = useState<Partial<Address>>(initial || { name: '', phone: '', line1: '', line2: '', city: '', state: 'Tamil Nadu', pincode: '', is_default: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateAddress(form);
    if (!val.valid) {
      setErrors(val.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="border border-amber-200 bg-amber-50/30 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Full Name *</label>
          <input
            type="text"
            value={form.name || ''}
            placeholder="Sriram R."
            onChange={e => handleChange('name', e.target.value)}
            className={`w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:outline-none ${
              errors.name ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
            }`}
          />
          {errors.name && <p className="text-[11px] text-red-600 font-medium">{errors.name}</p>}
        </div>

        {/* Phone Number */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Phone Number (10 digits) *</label>
          <input
            type="tel"
            maxLength={10}
            value={form.phone || ''}
            placeholder="9876543210"
            onChange={e => handleChange('phone', e.target.value.replace(/\D/g, ''))}
            className={`w-full border rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:outline-none ${
              errors.phone ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
            }`}
          />
          {errors.phone && <p className="text-[11px] text-red-600 font-medium">{errors.phone}</p>}
        </div>
      </div>

      {/* Address Line 1 */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Address Line 1 *</label>
        <input
          type="text"
          value={form.line1 || ''}
          placeholder="House/Flat No., Building, Street, Area"
          onChange={e => handleChange('line1', e.target.value)}
          className={`w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:outline-none ${
            errors.line1 ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
          }`}
        />
        {errors.line1 && <p className="text-[11px] text-red-600 font-medium">{errors.line1}</p>}
      </div>

      {/* Address Line 2 */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Address Line 2 (Optional)</label>
        <input
          type="text"
          value={form.line2 || ''}
          placeholder="Landmark, Suite, etc."
          onChange={e => handleChange('line2', e.target.value)}
          className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-700 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* City */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">City *</label>
          <input
            type="text"
            value={form.city || ''}
            placeholder="Chennai"
            onChange={e => handleChange('city', e.target.value)}
            className={`w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:outline-none ${
              errors.city ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
            }`}
          />
          {errors.city && <p className="text-[11px] text-red-600 font-medium">{errors.city}</p>}
        </div>

        {/* State */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">State *</label>
          <select
            value={form.state || 'Tamil Nadu'}
            onChange={e => handleChange('state', e.target.value)}
            className={`w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:outline-none bg-white ${
              errors.state ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
            }`}
          >
            {INDIAN_STATES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.state && <p className="text-[11px] text-red-600 font-medium">{errors.state}</p>}
        </div>

        {/* Pincode */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Pincode (6 digits) *</label>
          <input
            type="text"
            maxLength={6}
            value={form.pincode || ''}
            placeholder="600001"
            onChange={e => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
            className={`w-full border rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:outline-none ${
              errors.pincode ? 'border-red-500 bg-red-50/40 focus:ring-red-500' : 'border-zinc-300 focus:ring-amber-700'
            }`}
          />
          {errors.pincode && <p className="text-[11px] text-red-600 font-medium">{errors.pincode}</p>}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={!!form.is_default}
          onChange={e => handleChange('is_default', e.target.checked)}
          className="text-amber-800 rounded focus:ring-amber-700"
        />
        <span className="text-xs font-semibold text-zinc-700">Set as default address</span>
      </label>

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-zinc-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-zinc-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-amber-800 text-white font-bold text-xs uppercase rounded-lg flex items-center gap-1.5 hover:bg-amber-900 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </form>
  );
}

export default function AccountAddressesPage() {
  const { user, cartLoaded } = useCart();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!cartLoaded) return;
    if (!user) { router.push('/login?redirect=/account/addresses'); return; }
    getAddresses(user.id).then(data => { setAddresses(data); setLoading(false); });
  }, [user, cartLoaded, router]);

  const showMsg = (type: 'success' | 'error', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); };

  const handleSave = async (form: Partial<Address>) => {
    if (!user) return;
    const saved = await saveAddress({ ...form, user_id: user.id });
    if (editId) setAddresses(prev => prev.map(a => a.id === editId ? saved : a));
    else setAddresses(prev => [...prev, saved]);
    setIsAdding(false); setEditId(null);
    showMsg('success', 'Address saved successfully.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    setDeletingId(id);
    await deleteAddress(id);
    setAddresses(prev => prev.filter(a => a.id !== id));
    setDeletingId(null);
    showMsg('success', 'Address deleted.');
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await setDefaultAddress(id, user.id);
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
    showMsg('success', 'Default address updated.');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-zinc-200 pb-6 flex justify-between items-end">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Account</p>
          <h1 className="text-3xl font-serif font-bold text-zinc-900">Saved Addresses</h1>
        </div>
        {!isAdding && (
          <button onClick={() => { setIsAdding(true); setEditId(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 text-white font-bold text-xs uppercase rounded-lg shadow">
            <Plus className="w-3.5 h-3.5" />New Address
          </button>
        )}
      </div>

      {/* Toast */}
      {msg && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-800 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {isAdding && <AddressForm onSave={handleSave} onCancel={() => setIsAdding(false)} />}

          {addresses.length === 0 && !isAdding && (
            <div className="text-center py-16 space-y-3">
              <MapPin className="w-10 h-10 text-zinc-300 mx-auto" />
              <p className="text-sm font-semibold text-zinc-500">No saved addresses</p>
              <p className="text-xs text-zinc-400">Add your first address to checkout faster.</p>
            </div>
          )}

          {addresses.map(addr => (
            <div key={addr.id}>
              {editId === addr.id ? (
                <AddressForm initial={addr} onSave={handleSave} onCancel={() => setEditId(null)} />
              ) : (
                <div className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${addr.is_default ? 'border-amber-300 ring-1 ring-amber-100' : 'border-zinc-200'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-amber-800" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-zinc-900 text-sm">{addr.name}</p>
                        <p className="text-zinc-500">{addr.phone}</p>
                        <p className="text-zinc-600 mt-1 leading-relaxed">
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                          {addr.city}, {addr.state} – <span className="font-mono font-bold text-zinc-900">{addr.pincode}</span>
                        </p>
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Star className="w-2.5 h-2.5 fill-amber-700 stroke-none" />Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {!addr.is_default && (
                        <button onClick={() => handleSetDefault(addr.id)} title="Set as default"
                          className="p-2 rounded-lg hover:bg-amber-50 text-zinc-400 hover:text-amber-800 transition-colors">
                          <StarOff className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditId(addr.id); setIsAdding(false); }} title="Edit"
                        className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(addr.id)} disabled={deletingId === addr.id} title="Delete"
                        className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors">
                        {deletingId === addr.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
