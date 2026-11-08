import os from 'node:os';

export interface RamMetrics {
  total_mb: number;
  free_mb: number;
  used_mb: number;
  used_percent: number;
  storage_boxes_count: number;
}

/**
 * Menghitung metrik penggunaan memori server dan mengonversinya
 * menjadi estimasi jumlah tumpukan kardus di Storage Room 3D.
 *
 * @param maxBoxes Batas maksimal kapasitas visual kardus di rak gudang (default: 20)
 */
export function getRamMetrics(maxBoxes: number = 20): RamMetrics {
  const total = os.totalmem();
  const free = os.freemem();
  const used = Math.max(0, total - free);
  const used_percent = total > 0 ? Number(((used / total) * 100).toFixed(1)) : 0;

  // Formula kardus: persentase RAM terpakai dikalikan kapasitas rak
  const storage_boxes_count = Math.min(
    maxBoxes,
    Math.max(1, Math.round((used_percent / 100) * maxBoxes))
  );

  return {
    total_mb: Math.round(total / 1048576),
    free_mb: Math.round(free / 1048576),
    used_mb: Math.round(used / 1048576),
    used_percent,
    storage_boxes_count,
  };
}
