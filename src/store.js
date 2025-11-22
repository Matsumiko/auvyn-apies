// src/store.js
// Simpan transaksi awal supaya route /report bisa lookup meta/orderId dari refID

const pendingByRef = new Map();

// optional: auto prune biar ga numpuk kalau provider ga callback
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 jam
function pruneOld() {
  const now = Date.now();
  for (const [key, val] of pendingByRef.entries()) {
    if (!val || !val.savedAt) continue;
    if (now - val.savedAt > MAX_AGE_MS) {
      pendingByRef.delete(key);
    }
  }
}

/**
 * Simpan data pending berdasarkan refID.
 * data minimal berisi meta.orderId dari Worker.
 */
function savePending(refID, data) {
  if (!refID) return;
  pruneOld();
  pendingByRef.set(String(refID), {
    ...data,
    savedAt: Date.now(),
  });
}

/**
 * Ambil data pending berdasarkan refID.
 */
function getPending(refID) {
  if (!refID) return null;
  pruneOld();
  return pendingByRef.get(String(refID)) || null;
}

/**
 * Hapus data pending kalau sudah final.
 */
function deletePending(refID) {
  if (!refID) return;
  pendingByRef.delete(String(refID));
}

module.exports = {
  savePending,
  getPending,
  deletePending,
};
