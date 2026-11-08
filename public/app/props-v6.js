import * as THREE from 'three';

// Greybox prop factories for the v6 floorplan. All materials come from scene.js.
const LARGE_PROP_TYPES = new Set(['sleep_pod', 'storage_shelves', 'altar', 'reception_counter', 'fridge_sink', 'executive_desk', 'meeting_table', 'pantry_counter']);

export function buildV6Prop(item, materials) {
  const [w, h, d] = item.size || [1, 1, 1];
  const group = new THREE.Group();
  const isLarge = LARGE_PROP_TYPES.has(item.type);
  const box = (width, height, depth, material, y = height / 2) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.y = y;
    // Sesuai PLAN-012: castShadow hanya untuk prop besar (≥0.7m) & karakter
    mesh.castShadow = isLarge && height >= 0.7;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const wood = materials.wood;
  const dark = materials.dark;
  const accent = materials.accent;

  switch (item.type) {
    case 'sleep_pod':
      box(w, h, d, wood);
      box(w * 0.82, h * 0.35, d + 0.02, materials.cream, h * 0.46);
      break;
    case 'tv_console':
      box(w, h * 0.36, d, dark, h * 0.18);
      box(w * 0.88, h * 0.5, 0.08, materials.screen, h * 0.68);
      break;
    case 'storage_shelves':
      box(w, h, d, dark);
      for (let level = 0; level < 3; level++) box(w + 0.06, 0.08, d + 0.06, wood, 0.35 + level * 0.65);
      break;
    case 'sunken_tatami':
      box(w, h, d, materials.tatami, -h / 2);
      break;
    case 'meeting_table':
      const table = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, 0.12, 16), wood);
      table.scale.x = w / d;
      table.position.y = h;
      table.castShadow = true;
      group.add(table);
      box(0.3, h, 0.3, dark, h / 2);
      break;
    case 'koi_aquarium':
      box(w, h * 0.22, d, dark, h * 0.11);
      box(w * 0.9, h * 0.55, d * 0.88, materials.water, h * 0.54);
      break;
    case 'altar':
      box(w, h * 0.6, d, wood, h * 0.3);
      const statue = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.22, 12, 8), accent);
      statue.position.y = h * 0.82;
      group.add(statue);
      break;
    case 'planter':
      box(w, h * 0.55, d, materials.terracotta, h * 0.275);
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.34, h, 8), materials.leaf);
      foliage.position.y = h * 0.95;
      group.add(foliage);
      break;
    case 'low_fence':
      box(w, h, d, materials.fence);
      break;
    case 'presentation_screen':
      box(w, h, d, materials.screen, h / 2);
      break;
    case 'lift_door':
      box(w, h, d, dark, h / 2);
      break;
    case 'pantry_counter':
    case 'fridge_sink':
    case 'reception_counter':
    case 'executive_desk':
    case 'low_table':
    case 'desk':
    case 'sofa':
    default:
      box(w, h, d, item.type === 'sofa' ? materials.sofa : wood);
      if (item.type === 'desk' || item.type === 'executive_desk') {
        box(w * 0.64, 0.36, 0.06, materials.screen, h + 0.2);
      }
      break;
  }
  group.rotation.y = Number(item.rot) || 0;
  group.position.set(item.pos[0], item.pos[1] || 0, item.pos[2]);
  return group;
}
