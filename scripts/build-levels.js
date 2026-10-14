/**
 * Levels Generator & Validator for ZenFlow
 * Generates verified, guaranteed 100%-fillable levels with solution paths.
 */

const fs = require('fs');
const path = require('path');

// Helper to validate and convert a path matrix or path array into a level definition
function createLevel(id, packId, name, size, rawPaths) {
  // rawPaths: array of arrays of [r, c]
  const endpoints = [];
  const solution = {};
  const grid = Array(size).fill(null).map(() => Array(size).fill(-1));
  let totalPathCells = 0;

  rawPaths.forEach((pathArr, colorId) => {
    if (pathArr.length < 2) {
      throw new Error(`Level ${name}: Path ${colorId} has less than 2 cells`);
    }

    // Verify adjacency
    for (let i = 0; i < pathArr.length - 1; i++) {
      const [r1, c1] = pathArr[i];
      const [r2, c2] = pathArr[i + 1];
      const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
      if (dist !== 1) {
        throw new Error(`Level ${name}: Non-adjacent step in path ${colorId} from (${r1},${c1}) to (${r2},${c2})`);
      }
    }

    // Verify no self-overlap and mark grid
    const visited = new Set();
    const formattedPath = [];
    pathArr.forEach(([r, c]) => {
      if (r < 0 || r >= size || c < 0 || c >= size) {
        throw new Error(`Level ${name}: Out of bounds coordinate (${r},${c})`);
      }
      const key = `${r},${c}`;
      if (visited.has(key)) {
        throw new Error(`Level ${name}: Self-intersecting path ${colorId} at (${r},${c})`);
      }
      visited.add(key);
      if (grid[r][c] !== -1) {
        throw new Error(`Level ${name}: Overlapping paths at (${r},${c})`);
      }
      grid[r][c] = colorId;
      formattedPath.push({ r, c });
      totalPathCells++;
    });

    const head = formattedPath[0];
    const tail = formattedPath[formattedPath.length - 1];
    endpoints.push({
      colorId,
      a: { r: head.r, c: head.c },
      b: { r: tail.r, c: tail.c }
    });
    solution[colorId] = formattedPath;
  });

  if (totalPathCells !== size * size) {
    throw new Error(`Level ${name}: Total path cells (${totalPathCells}) does not match grid size (${size * size})`);
  }

  return {
    id,
    packId,
    name,
    size,
    endpoints,
    solution
  };
}

// Builder for serpentine and box-fold paths
// We will generate 10 levels for each pack:
// 5x5 (Starter, Pack 1)
// 6x6 (Classic, Pack 2)
// 7x7 (Challenger, Pack 3)
// 8x8 (Expert, Pack 4)
// 9x9 (Master, Pack 5)

const PACKS = [
  { id: 'starter', name: 'Starter 5x5', size: 5, color: '#34C759' },
  { id: 'classic', name: 'Classic 6x6', size: 6, color: '#007AFF' },
  { id: 'challenger', name: 'Challenger 7x7', size: 7, color: '#FF9500' },
  { id: 'expert', name: 'Expert 8x8', size: 8, color: '#AF52DE' },
  { id: 'master', name: 'Master 9x9', size: 9, color: '#FF2D55' }
];

const RAW_5X5 = [
  // Level 1: 5 flows
  [
    [[0,0],[0,1],[0,2],[1,2],[2,2]],
    [[0,3],[0,4],[1,4],[1,3],[2,3]],
    [[1,0],[2,0],[3,0],[4,0],[4,1]],
    [[2,4],[3,4],[4,4],[4,3],[4,2]],
    [[1,1],[2,1],[3,1],[3,2],[3,3]]
  ],
  // Level 2: 4 flows
  [
    [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4]],
    [[1,0],[2,0],[3,0],[4,0],[4,1],[4,2]],
    [[1,1],[1,2],[1,3],[2,3],[3,3],[4,3],[4,4]],
    [[2,1],[2,2],[3,2],[3,1]]
  ],
  // Level 3: 5 flows
  [
    [[0,0],[1,0],[2,0],[3,0],[4,0]],
    [[0,1],[0,2],[0,3],[0,4],[1,4]],
    [[1,1],[1,2],[1,3],[2,3],[2,4]],
    [[2,1],[2,2],[3,2],[3,3],[3,4]],
    [[3,1],[4,1],[4,2],[4,3],[4,4]]
  ],
  // Level 4: 5 flows
  [
    [[0,0],[0,1],[0,2],[0,3],[0,4]],
    [[1,0],[2,0],[3,0],[4,0],[4,1]],
    [[1,1],[1,2],[2,2],[2,1]],
    [[1,3],[1,4],[2,4],[2,3]],
    [[3,1],[3,2],[3,3],[3,4],[4,4],[4,3],[4,2]]
  ],
  // Level 5: 5 flows
  [
    [[0,0],[0,1],[1,1],[1,0],[2,0]],
    [[0,2],[0,3],[0,4],[1,4],[2,4]],
    [[1,2],[1,3],[2,3],[2,2],[3,2]],
    [[2,1],[3,1],[3,0],[4,0],[4,1]],
    [[3,3],[3,4],[4,4],[4,3],[4,2]]
  ],
  // Level 6: 4 flows
  [
    [[0,0],[1,0],[2,0],[3,0],[3,1],[2,1],[1,1],[0,1],[0,2]],
    [[0,3],[0,4],[1,4],[2,4],[3,4]],
    [[1,2],[2,2],[3,2],[3,3],[2,3],[1,3]],
    [[4,0],[4,1],[4,2],[4,3],[4,4]]
  ],
  // Level 7: 5 flows
  [
    [[0,0],[1,0],[2,0],[3,0],[4,0]],
    [[0,1],[1,1],[2,1],[2,2],[1,2],[0,2]],
    [[0,3],[0,4],[1,4],[2,4],[3,4],[4,4]],
    [[1,3],[2,3],[3,3],[3,2],[3,1],[4,1]],
    [[4,2],[4,3]]
  ],
  // Level 8: 5 flows
  [
    [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4]],
    [[1,0],[1,1],[1,2],[1,3],[2,3]],
    [[2,0],[3,0],[4,0],[4,1],[3,1]],
    [[2,1],[2,2],[3,2],[3,3],[2,4],[3,4]],
    [[4,2],[4,3],[4,4]]
  ],
  // Level 9: 6 flows
  [
    [[0,0],[0,1],[0,2],[1,2],[1,1]],
    [[0,3],[0,4],[1,4],[2,4]],
    [[1,0],[2,0],[3,0]],
    [[2,1],[2,2],[2,3]],
    [[3,1],[3,2],[4,2],[4,1],[4,0]],
    [[3,3],[3,4],[4,4],[4,3]]
  ],
  // Level 10: 6 flows
  [
    [[0,0],[0,1],[1,1],[1,0]],
    [[0,2],[0,3],[0,4]],
    [[1,2],[1,3],[1,4],[2,4]],
    [[2,0],[3,0],[4,0],[4,1],[3,1]],
    [[2,1],[2,2],[2,3],[3,3],[3,4],[4,4]],
    [[3,2],[4,2],[4,3]]
  ]
];

const RAW_6X6 = [
  // Level 1: 5 flows
  [
    [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5]],
    [[1,0],[2,0],[3,0],[4,0],[5,0],[5,1],[5,2]],
    [[1,1],[1,2],[1,3],[1,4],[1,5],[2,5],[3,5]],
    [[2,1],[3,1],[4,1],[4,2],[4,3],[5,3],[5,4],[5,5],[4,5]],
    [[2,2],[2,3],[2,4],[3,4],[3,3],[3,2]]
  ],
  // Level 2: 6 flows
  [
    [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0]],
    [[0,1],[0,2],[0,3],[1,3],[1,2],[1,1]],
    [[0,4],[0,5],[1,5],[2,5],[3,5],[4,5],[5,5]],
    [[2,1],[3,1],[4,1],[5,1],[5,2]],
    [[2,2],[2,3],[2,4],[3,4],[4,4],[5,4],[5,3]],
    [[3,2],[3,3],[4,3],[4,2]]
  ],
  // Level 3: 6 flows
  [
    [[0,0],[0,1],[0,2],[1,2],[1,1],[1,0]],
    [[0,3],[0,4],[0,5],[1,5],[1,4],[1,3]],
    [[2,0],[3,0],[4,0],[5,0],[5,1],[4,1]],
    [[2,1],[2,2],[3,2],[3,1]],
    [[2,3],[2,4],[2,5],[3,5],[4,5],[5,5]],
    [[3,3],[3,4],[4,4],[4,3],[4,2],[5,2],[5,3],[5,4]]
  ],
  // Level 4: 6 flows
  [
    [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,5]],
    [[1,0],[2,0],[3,0],[4,0],[5,0]],
    [[1,1],[1,2],[1,3],[1,4],[2,4],[3,4]],
    [[2,1],[3,1],[3,2],[2,2],[2,3],[3,3]],
    [[4,1],[5,1],[5,2],[4,2],[4,3],[5,3]],
    [[2,5],[3,5],[4,5],[5,5],[5,4],[4,4]]
  ],
  // Level 5: 6 flows
  [
    [[0,0],[0,1],[1,1],[2,1],[2,0],[1,0]],
    [[0,2],[0,3],[0,4],[0,5],[1,5]],
    [[1,2],[1,3],[1,4],[2,4],[3,4],[3,5],[2,5]],
    [[3,0],[4,0],[5,0],[5,1],[4,1],[3,1]],
    [[2,2],[2,3],[3,3],[3,2],[4,2],[5,2]],
    [[4,3],[4,4],[4,5],[5,5],[5,4],[5,3]]
  ],
  // Level 6: 7 flows
  [
    [[0,0],[0,1],[0,2],[0,3]],
    [[0,4],[0,5],[1,5],[2,5],[3,5]],
    [[1,0],[2,0],[3,0],[4,0]],
    [[1,1],[1,2],[1,3],[1,4],[2,4]],
    [[2,1],[3,1],[4,1],[5,1],[5,0]],
    [[2,2],[2,3],[3,3],[3,2]],
    [[4,2],[4,3],[3,4],[4,4],[4,5],[5,5],[5,4],[5,3],[5,2]]
  ],
  // Level 7: 6 flows
  [
    [[0,0],[0,1],[0,2],[1,2],[2,2],[2,1],[2,0],[1,0]],
    [[0,3],[0,4],[0,5],[1,5],[2,5],[3,5]],
    [[1,1]], // invalid, will fix
    [[3,0],[4,0],[5,0],[5,1],[4,1],[3,1]],
    [[1,3],[1,4],[2,4],[2,3]],
    [[3,2],[3,3],[3,4],[4,4],[5,4],[5,5],[4,5]],
    [[4,2],[4,3],[5,3],[5,2]]
  ]
];

// Let's refine and programmatically generate clean, elegant serpentine & partition levels for all packs!
console.log('Validating baseline levels...');
