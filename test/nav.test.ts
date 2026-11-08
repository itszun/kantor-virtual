import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shortestPath, nearestNode } from '../public/app/nav.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const officeConfigPath = path.resolve(__dirname, '..', 'config', 'office.json');

test('Graf waypoint dan pathfinding navigasi', async (t) => {
  const content = fs.readFileSync(officeConfigPath, 'utf8');
  const officeConfig = JSON.parse(content);
  const { waypoints, spots } = officeConfig;

  await t.test('tidak ada edge ke node tak dikenal di graph', () => {
    assert.ok(waypoints.nodes, 'waypoints.nodes harus didefinisikan');
    assert.ok(Array.isArray(waypoints.edges), 'waypoints.edges harus berupa array');

    const knownNodes = new Set(Object.keys(waypoints.nodes));

    for (const [u, v] of waypoints.edges) {
      assert.ok(
        knownNodes.has(u),
        `Node "${u}" dalam edge [${u}, ${v}] tidak terdaftar di waypoints.nodes`
      );
      assert.ok(
        knownNodes.has(v),
        `Node "${v}" dalam edge [${u}, ${v}] tidak terdaftar di waypoints.nodes`
      );
    }
  });

  await t.test('semua spot bernama ada di graph node', () => {
    const knownNodes = new Set(Object.keys(waypoints.nodes));
    const spotNames = Object.keys(spots);

    for (const spot of spotNames) {
      assert.ok(
        knownNodes.has(spot),
        `Spot "${spot}" harus terdaftar sebagai node di waypoints.nodes`
      );
    }
  });

  await t.test('jalur antar semua pasangan spot ada dan valid', () => {
    const spotNames = Object.keys(spots);
    assert.ok(spotNames.length >= 10, 'Harus ada setidaknya 10 spot');

    let testedPairs = 0;
    for (const fromSpot of spotNames) {
      for (const toSpot of spotNames) {
        const pathResult = shortestPath(waypoints, fromSpot, toSpot);
        assert.ok(
          pathResult.length > 0,
          `Harus ada jalur dari ${fromSpot} ke ${toSpot}`
        );
        assert.equal(pathResult[0], fromSpot);
        assert.equal(pathResult[pathResult.length - 1], toSpot);
        testedPairs++;
      }
    }
    assert.ok(testedPairs > 100, `Menguji ${testedPairs} pasangan spot`);
  });

  await t.test('nearestNode mencari node paling dekat dengan koordinat', () => {
    const found = nearestNode(waypoints, [-8.05, -7.02]);
    assert.equal(found, 'desk_greg');

    const foundCoffee = nearestNode(waypoints, [-9.35, 4.85]);
    assert.equal(foundCoffee, 'coffee');
  });
});
