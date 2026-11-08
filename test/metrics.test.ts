import test from 'node:test';
import assert from 'node:assert/strict';
import { getRamMetrics } from '../src/metrics.ts';

test('metrics: getRamMetrics menghitung kapasitas RAM dan jumlah kardus gudang', () => {
  const m = getRamMetrics(20);

  assert.ok(m.total_mb > 0, 'Total RAM harus lebih besar dari 0');
  assert.ok(m.free_mb >= 0, 'Free RAM tidak boleh negatif');
  assert.ok(m.used_mb >= 0, 'Used RAM tidak boleh negatif');
  assert.ok(m.used_percent >= 0 && m.used_percent <= 100, 'Persentase RAM harus 0-100%');
  assert.ok(m.storage_boxes_count >= 1 && m.storage_boxes_count <= 20, 'Jumlah kardus harus dalam rentang 1-20');

  // Uji konsistensi batasan parameter maxBoxes kustom
  const mCustom = getRamMetrics(50);
  assert.ok(mCustom.storage_boxes_count >= 1 && mCustom.storage_boxes_count <= 50);
});
