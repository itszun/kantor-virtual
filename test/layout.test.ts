import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const office = JSON.parse(fs.readFileSync(path.resolve(here, '..', 'config', 'office.json'), 'utf8'));
const zoneById = new Map(office.zones.map((zone: any) => [zone.id, zone]));
const centers: Record<string, [number, number]> = { NW: [-8, -6], N: [0, -6], NE: [8, -6], W: [-8, 0], C: [0, 0], E: [8, 0], SW: [-8, 6], S: [0, 6], SE: [8, 6] };

function bounds(zone: any) {
  const [x, z] = centers[zone.cell];
  return { minX: x - 4, maxX: x + 4, minZ: z - 3, maxZ: z + 3 };
}

function inZone(point: number[], zone: any) {
  const box = bounds(zone);
  return point[0] >= box.minX && point[0] <= box.maxX && point[point.length - 1] >= box.minZ && point[point.length - 1] <= box.maxZ;
}

function segmentIntersectsAabb(a: number[], b: number[], item: any) {
  const [x, , z] = item.pos;
  const [w, , d] = item.size;
  let t0 = 0;
  let t1 = 1;
  for (const [start, delta, min, max] of [[a[0], b[0] - a[0], x - w / 2 - 0.25, x + w / 2 + 0.25], [a[1], b[1] - a[1], z - d / 2 - 0.25, z + d / 2 + 0.25]] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return false;
      continue;
    }
    const lo = (min - start) / delta;
    const hi = (max - start) / delta;
    t0 = Math.max(t0, Math.min(lo, hi));
    t1 = Math.min(t1, Math.max(lo, hi));
  }
  return t0 <= t1;
}

function pointInsideFurniture(point: number[], item: any) {
  const [x, , z] = item.pos;
  const [w, , d] = item.size;
  return point[0] >= x - w / 2 - 0.02 && point[0] <= x + w / 2 + 0.02 && point[1] >= z - d / 2 - 0.02 && point[1] <= z + d / 2 + 0.02;
}

test('layout v6: zona, prop, spot, dan navgraph konsisten', async (t) => {
  await t.test('ada sembilan zona pada sel grid yang unik', () => {
    assert.equal(office.layout, 'v6');
    assert.equal(office.zones.length, 9);
    const cells = new Set(office.zones.map((zone: any) => zone.cell));
    assert.equal(cells.size, 9);
    for (const cell of cells) assert.ok(centers[cell as string], `sel ${cell} ada di grid`);
  });

  await t.test('seluruh spot dan furnitur berada dalam zona yang ditetapkan', () => {
    for (const [name, spot] of Object.entries(office.spots) as Array<[string, any]>) {
      const zone = zoneById.get(spot.zone);
      assert.ok(zone, `zona spot ${name}`);
      assert.ok(inZone(spot.pos, zone), `spot ${name} berada di zona ${spot.zone}`);
    }
    for (const item of office.furniture) {
      const zone = zoneById.get(item.zone);
      assert.ok(zone, `zona furnitur ${item.type}`);
      assert.ok(Array.isArray(item.size) && item.size.length === 3, `${item.type} memiliki size AABB`);
      assert.ok(inZone(item.pos, zone), `${item.type} berada di zona ${item.zone}`);
    }
  });

  await t.test('spot tidak bertumpukan dan seluruhnya adalah node waypoint', () => {
    const entries = Object.entries(office.spots) as Array<[string, any]>;
    for (let i = 0; i < entries.length; i++) {
      assert.ok(office.waypoints.nodes[entries[i][0]], `${entries[i][0]} ada sebagai node`);
      for (let j = i + 1; j < entries.length; j++) {
        const dx = entries[i][1].pos[0] - entries[j][1].pos[0];
        const dz = entries[i][1].pos[1] - entries[j][1].pos[1];
        assert.ok(Math.hypot(dx, dz) >= 0.6, `${entries[i][0]} dan ${entries[j][0]} tidak terlalu dekat`);
      }
    }
  });

  await t.test('edge tidak memotong AABB furnitur solid kecuali di endpoint miliknya', () => {
    for (const [from, to] of office.waypoints.edges) {
      const a = office.waypoints.nodes[from];
      const b = office.waypoints.nodes[to];
      for (const item of office.furniture.filter((entry: any) => entry.solid)) {
        if (pointInsideFurniture(a, item) || pointInsideFurniture(b, item)) continue;
        assert.equal(segmentIntersectsAabb(a, b, item), false, `${from} → ${to} memotong ${item.type}`);
      }
    }
  });

  await t.test('edge yang menyeberangi sel grid melewati pintu pasangan zona', () => {
    const zoneForPoint = (point: number[]) => office.zones.find((zone: any) => inZone(point, zone));
    for (const [from, to] of office.waypoints.edges) {
      const a = office.waypoints.nodes[from];
      const b = office.waypoints.nodes[to];
      const fromZone = zoneForPoint(a);
      const toZone = zoneForPoint(b);
      if (!fromZone || !toZone || fromZone.id === toZone.id) continue;
      const dx = Math.abs(centers[fromZone.cell][0] - centers[toZone.cell][0]);
      const dz = Math.abs(centers[fromZone.cell][1] - centers[toZone.cell][1]);
      assert.ok((dx === 8 && dz === 0) || (dx === 0 && dz === 6), `${from} → ${to} hanya melintasi zona bertetangga`);
      const side = centers[toZone.cell][0] > centers[fromZone.cell][0] ? 'E' : centers[toZone.cell][0] < centers[fromZone.cell][0] ? 'W' : centers[toZone.cell][1] > centers[fromZone.cell][1] ? 'S' : 'N';
      const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' }[side];
      assert.ok(fromZone.doors.some((door: any) => door.side === side && door.width >= 1.4), `${fromZone.id} memiliki pintu ${side}`);
      assert.ok(toZone.doors.some((door: any) => door.side === opposite && door.width >= 1.4), `${toZone.id} memiliki pintu ${opposite}`);
      // Titik potong edge dengan dinding bersama harus berada di dalam celah pintu.
      const horizontal = side === 'N' || side === 'S';
      const fc = centers[fromZone.cell];
      const wall = horizontal ? (fc[1] + centers[toZone.cell][1]) / 2 : (fc[0] + centers[toZone.cell][0]) / 2;
      const t = horizontal ? (wall - a[1]) / (b[1] - a[1]) : (wall - a[0]) / (b[0] - a[0]);
      const along = horizontal ? a[0] + t * (b[0] - a[0]) - fc[0] : a[1] + t * (b[1] - a[1]) - fc[1];
      const door = fromZone.doors.find((d: any) => d.side === side);
      const otherDoor = toZone.doors.find((d: any) => d.side === opposite);
      for (const d of [door, otherDoor]) {
        assert.ok(Math.abs(along - (d.offset || 0)) <= d.width / 2 - 0.2, `${from} → ${to} melewati celah pintu (posisi ${along.toFixed(2)})`);
      }
    }
  });
});
