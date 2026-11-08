/**
 * nav.js - Modul pathfinding graf waypoint untuk kantor 3D.
 * ESM biasa tanpa import three.js agar dapat diuji di Node.js.
 */

/**
 * Menghitung jarak Euclidean antara dua titik [x, z]
 * @param {[number, number]} a
 * @param {[number, number]} b
 * @returns {number}
 */
export function distance(a, b) {
  const dx = a[0] - b[0];
  const dz = a[1] - b[1];
  return Math.hypot(dx, dz);
}

/**
 * Mencari id node di graph.nodes yang paling dekat dengan koordinat [x, z]
 * @param {{ nodes: Record<string, [number, number]> }} graph
 * @param {[number, number]} pos
 * @returns {string | null}
 */
export function nearestNode(graph, pos) {
  if (!graph || !graph.nodes) return null;
  let closestId = null;
  let minDist = Infinity;

  for (const [id, nodePos] of Object.entries(graph.nodes)) {
    const d = distance(pos, nodePos);
    if (d < minDist) {
      minDist = d;
      closestId = id;
    }
  }

  return closestId;
}

/**
 * Membangun representasi adjacency list berbobot dari graph
 * @param {{ nodes: Record<string, [number, number]>, edges: [string, string][] }} graph
 * @returns {Map<string, Array<{ to: string, weight: number }>>}
 */
export function buildAdjacencyList(graph) {
  const adj = new Map();
  const nodes = graph.nodes || {};

  for (const id of Object.keys(nodes)) {
    adj.set(id, []);
  }

  const edges = graph.edges || [];
  for (const [u, v] of edges) {
    if (!nodes[u] || !nodes[v]) continue;
    const w = distance(nodes[u], nodes[v]);
    adj.get(u)?.push({ to: v, weight: w });
    adj.get(v)?.push({ to: u, weight: w });
  }

  return adj;
}

/**
 * Menghitung jalur terpendek dari fromSpot ke toSpot menggunakan Dijkstra.
 * fromSpot dan toSpot bisa berupa nama node, atau [x, z].
 *
 * @param {{ nodes: Record<string, [number, number]>, edges: [string, string][] }} graph
 * @param {string | [number, number]} fromSpot
 * @param {string | [number, number]} toSpot
 * @returns {string[]} array id node yang harus dilewati
 */
export function shortestPath(graph, fromSpot, toSpot) {
  if (!graph || !graph.nodes) return [];

  const startId = typeof fromSpot === 'string' ? fromSpot : nearestNode(graph, fromSpot);
  const targetId = typeof toSpot === 'string' ? toSpot : nearestNode(graph, toSpot);

  if (!startId || !targetId) return [];
  if (!graph.nodes[startId] || !graph.nodes[targetId]) return [];
  if (startId === targetId) return [startId];

  const adj = buildAdjacencyList(graph);

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set(Object.keys(graph.nodes));

  for (const id of unvisited) {
    distances.set(id, Infinity);
  }
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current = null;
    let currentMin = Infinity;

    for (const node of unvisited) {
      const d = distances.get(node);
      if (d < currentMin) {
        currentMin = d;
        current = node;
      }
    }

    if (current === null || currentMin === Infinity) {
      break; // Sisa node tidak terjangkau
    }

    if (current === targetId) {
      // Sampai di tujuan
      break;
    }

    unvisited.delete(current);

    const neighbors = adj.get(current) || [];
    for (const { to, weight } of neighbors) {
      if (!unvisited.has(to)) continue;
      const alt = currentMin + weight;
      if (alt < distances.get(to)) {
        distances.set(to, alt);
        previous.set(to, current);
      }
    }
  }

  // Rekonstruksi jalur
  if (!previous.has(targetId) && startId !== targetId) {
    return []; // Tidak ada jalur
  }

  const path = [];
  let curr = targetId;
  while (curr) {
    path.unshift(curr);
    if (curr === startId) break;
    curr = previous.get(curr);
  }

  return path;
}

/**
 * Mengubah array node ID menjadi array koordinat [x, z]
 * @param {{ nodes: Record<string, [number, number]> }} graph
 * @param {string[]} path
 * @returns {[number, number][]}
 */
export function getPathCoordinates(graph, path) {
  if (!graph || !graph.nodes || !Array.isArray(path)) return [];
  return path.map((id) => graph.nodes[id]).filter(Boolean);
}
