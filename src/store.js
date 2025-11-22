// src/store.js
// Simpan transaksi awal supaya route /report bisa lookup meta/orderId dari refID

const pendingByRef = new Map();

/**
 * Simpan data pending berdasarkan refID.
 * data bebas bentuknya, minimal berisi meta.orderId dari Worker.
 */
function savePending(refID, data) {
  if (!refID) return;
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
