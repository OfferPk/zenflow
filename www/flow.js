/**
 * ZenFlow - Core Game Engine
 * Pure logic for Flow / Color Connect puzzle.
 * Zero DOM dependencies for 100% automated testability.
 */

const FLOW_COLORS = [
  { id: 0, name: 'Coral Red', hex: '#FF3B30', glow: 'rgba(255, 59, 48, 0.45)', label: 'R' },
  { id: 1, name: 'Cerulean Blue', hex: '#007AFF', glow: 'rgba(0, 122, 255, 0.45)', label: 'B' },
  { id: 2, name: 'Emerald Green', hex: '#34C759', glow: 'rgba(52, 199, 89, 0.45)', label: 'G' },
  { id: 3, name: 'Golden Amber', hex: '#FFCC00', glow: 'rgba(255, 204, 0, 0.45)', label: 'Y' },
  { id: 4, name: 'Electric Orange', hex: '#FF9500', glow: 'rgba(255, 149, 0, 0.45)', label: 'O' },
  { id: 5, name: 'Orchid Purple', hex: '#AF52DE', glow: 'rgba(175, 82, 222, 0.45)', label: 'P' },
  { id: 6, name: 'Vibrant Cyan', hex: '#00C7BE', glow: 'rgba(0, 199, 190, 0.45)', label: 'C' },
  { id: 7, name: 'Hot Pink', hex: '#FF2D55', glow: 'rgba(255, 45, 85, 0.45)', label: 'M' },
  { id: 8, name: 'Mint Lime', hex: '#8BC34A', glow: 'rgba(139, 195, 74, 0.45)', label: 'L' },
  { id: 9, name: 'Pure White', hex: '#F2F2F7', glow: 'rgba(242, 242, 247, 0.45)', label: 'W' }
];

class ZenFlowGame {
  constructor(levelData) {
    if (!levelData || !levelData.size || !levelData.endpoints) {
      throw new Error('Invalid level data provided to ZenFlowGame');
    }
    this.size = levelData.size;
    this.totalCells = this.size * this.size;
    this.levelId = levelData.id || 1;
    this.levelName = levelData.name || `Level ${this.levelId}`;
    this.solution = levelData.solution || null; // Map or Object of colorId -> [{r, c}]

    // Endpoints: array of { colorId, a: {r, c}, b: {r, c} }
    this.endpoints = JSON.parse(JSON.stringify(levelData.endpoints));
    this.colorMap = new Map();
    this.endpointLookup = new Map(); // key "r,c" -> { colorId, endpointType: 'a'|'b' }

    this.endpoints.forEach((ep) => {
      this.colorMap.set(ep.colorId, ep);
      this.endpointLookup.set(`${ep.a.r},${ep.a.c}`, { colorId: ep.colorId, isEndpoint: true, type: 'a' });
      this.endpointLookup.set(`${ep.b.r},${ep.b.c}`, { colorId: ep.colorId, isEndpoint: true, type: 'b' });
    });

    // Paths: Map of colorId -> Array<{r, c}>
    this.paths = new Map();
    this.endpoints.forEach((ep) => {
      this.paths.set(ep.colorId, []);
    });

    this.activeColorId = null;
    this.activePath = null;
    this.moves = 0;
    this.undoStack = [];
    this.maxUndoSteps = 50;
  }

  /**
   * Determine if a cell is an endpoint
   */
  getEndpoint(r, c) {
    return this.endpointLookup.get(`${r},${c}`) || null;
  }

  /**
   * Get which color occupies a cell currently (from paths or endpoints)
   */
  getCellColor(r, c) {
    const ep = this.getEndpoint(r, c);
    if (ep) return ep.colorId;

    for (const [colorId, path] of this.paths.entries()) {
      if (path.some((pt) => pt.r === r && pt.c === c)) {
        return colorId;
      }
    }
    return null;
  }

  /**
   * Save a snapshot for undo
   */
  pushUndoSnapshot() {
    const snapshot = {};
    for (const [colorId, path] of this.paths.entries()) {
      snapshot[colorId] = path.map((pt) => ({ r: pt.r, c: pt.c }));
    }
    this.undoStack.push({
      paths: snapshot,
      moves: this.moves
    });
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo last pipe modification
   */
  undo() {
    if (this.undoStack.length === 0) return false;
    const last = this.undoStack.pop();
    for (const colorId of this.paths.keys()) {
      const restored = last.paths[colorId] || [];
      this.paths.set(colorId, restored.map((pt) => ({ r: pt.r, c: pt.c })));
    }
    this.moves = last.moves;
    this.activeColorId = null;
    this.activePath = null;
    return true;
  }

  /**
   * Check if coordinates are within bounds
   */
  isValidCoord(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  /**
   * Check if two cells are orthogonally adjacent
   */
  isAdjacent(r1, c1, r2, c2) {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  /**
   * Start drawing a path at cell (r, c)
   */
  startPath(r, c) {
    if (!this.isValidCoord(r, c)) return null;

    const ep = this.getEndpoint(r, c);
    let targetColorId = null;

    if (ep) {
      targetColorId = ep.colorId;
      this.pushUndoSnapshot();
      this.moves++;

      // If starting at an endpoint, check if we restart or unwind
      const currentPath = this.paths.get(targetColorId) || [];
      if (currentPath.length > 0) {
        const head = currentPath[currentPath.length - 1];
        const tail = currentPath[0];
        // If clicking on head or tail, we can resume from head or clear
        if (tail.r === r && tail.c === c) {
          // Restarting from base endpoint
          this.paths.set(targetColorId, [{ r, c }]);
        } else if (head.r === r && head.c === c) {
          // Clicking on the other endpoint while connected -> keep it
        } else {
          this.paths.set(targetColorId, [{ r, c }]);
        }
      } else {
        this.paths.set(targetColorId, [{ r, c }]);
      }
    } else {
      // Starting from a body cell of an existing path
      for (const [colorId, path] of this.paths.entries()) {
        const idx = path.findIndex((pt) => pt.r === r && pt.c === c);
        if (idx !== -1) {
          targetColorId = colorId;
          this.pushUndoSnapshot();
          this.moves++;
          // Truncate path up to this cell so player can redirect from here
          this.paths.set(colorId, path.slice(0, idx + 1));
          break;
        }
      }
    }

    if (targetColorId === null) return null;

    this.activeColorId = targetColorId;
    this.activePath = this.paths.get(targetColorId);
    return {
      colorId: this.activeColorId,
      path: [...this.activePath],
      completed: this.isFlowComplete(this.activeColorId)
    };
  }

  /**
   * Extend active path to adjacent cell (r, c)
   */
  extendPath(r, c) {
    if (this.activeColorId === null || !this.isValidCoord(r, c)) {
      return null;
    }

    const path = this.paths.get(this.activeColorId);
    if (!path || path.length === 0) return null;

    const head = path[path.length - 1];
    if (head.r === r && head.c === c) {
      return { colorId: this.activeColorId, path: [...path], status: 'same' };
    }

    // Must be adjacent
    if (!this.isAdjacent(head.r, head.c, r, c)) {
      return null;
    }

    // Check if cell is an endpoint of another color
    const ep = this.getEndpoint(r, c);
    if (ep && ep.colorId !== this.activeColorId) {
      // Blocked by foreign endpoint
      return { colorId: this.activeColorId, path: [...path], status: 'blocked' };
    }

    // If already connected to target endpoint, don't extend further
    if (path.length >= 2 && this.isFlowComplete(this.activeColorId)) {
      // Check if player is backtracking
      const prevIdx = path.findIndex((pt) => pt.r === r && pt.c === c);
      if (prevIdx !== -1 && prevIdx === path.length - 2) {
        // Backtrack one step
        path.pop();
        return { colorId: this.activeColorId, path: [...path], status: 'backtrack' };
      }
      return { colorId: this.activeColorId, path: [...path], status: 'already_complete' };
    }

    // Check if backtracking inside active path
    const existingIndex = path.findIndex((pt) => pt.r === r && pt.c === c);
    if (existingIndex !== -1) {
      // Unwind/truncate active path back to existingIndex
      this.paths.set(this.activeColorId, path.slice(0, existingIndex + 1));
      return {
        colorId: this.activeColorId,
        path: [...this.paths.get(this.activeColorId)],
        status: 'backtrack'
      };
    }

    // If cell intersects another color's path, truncate that other path
    for (const [otherColorId, otherPath] of this.paths.entries()) {
      if (otherColorId === this.activeColorId) continue;
      const otherIdx = otherPath.findIndex((pt) => pt.r === r && pt.c === c);
      if (otherIdx !== -1) {
        // Truncate other path before the intersection point
        this.paths.set(otherColorId, otherPath.slice(0, otherIdx));
      }
    }

    // Add cell to path
    path.push({ r, c });
    const isNowComplete = this.isFlowComplete(this.activeColorId);

    return {
      colorId: this.activeColorId,
      path: [...path],
      status: isNowComplete ? 'connected' : 'extended',
      completed: isNowComplete
    };
  }

  /**
   * Release active dragging
   */
  endPath() {
    const finishedColor = this.activeColorId;
    this.activeColorId = null;
    this.activePath = null;
    return finishedColor;
  }

  /**
   * Clear a specific color flow path
   */
  clearFlow(colorId) {
    if (!this.paths.has(colorId)) return false;
    this.pushUndoSnapshot();
    this.moves++;
    this.paths.set(colorId, []);
    return true;
  }

  /**
   * Reset the whole board
   */
  reset() {
    this.pushUndoSnapshot();
    this.moves++;
    this.endpoints.forEach((ep) => {
      this.paths.set(ep.colorId, []);
    });
    this.activeColorId = null;
    this.activePath = null;
  }

  /**
   * Check if a specific flow is completed (connects endpoint a to b)
   */
  isFlowComplete(colorId) {
    const path = this.paths.get(colorId);
    if (!path || path.length < 2) return false;

    const ep = this.colorMap.get(colorId);
    if (!ep) return false;

    const head = path[0];
    const tail = path[path.length - 1];

    const isAtoB =
      (head.r === ep.a.r && head.c === ep.a.c && tail.r === ep.b.r && tail.c === ep.b.c) ||
      (head.r === ep.b.r && head.c === ep.b.c && tail.r === ep.a.r && tail.c === ep.a.c);

    return isAtoB;
  }

  /**
   * Get completed flow count
   */
  getCompletedFlowCount() {
    let count = 0;
    for (const ep of this.endpoints) {
      if (this.isFlowComplete(ep.colorId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get grid coverage metrics
   */
  getCoverage() {
    const occupied = new Set();
    for (const [colorId, path] of this.paths.entries()) {
      for (const pt of path) {
        occupied.add(`${pt.r},${pt.c}`);
      }
    }
    // Also include any endpoints even if not connected yet
    for (const ep of this.endpoints) {
      occupied.add(`${ep.a.r},${ep.a.c}`);
      occupied.add(`${ep.b.r},${ep.b.c}`);
    }

    const filledCells = occupied.size;
    const percentage = Math.round((filledCells / this.totalCells) * 100);

    return {
      filledCells,
      totalCells: this.totalCells,
      percentage
    };
  }

  /**
   * Check if level is complete
   */
  isLevelComplete() {
    for (const ep of this.endpoints) {
      if (!this.isFlowComplete(ep.colorId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate stars (0, 2, or 3 stars)
   */
  getStars() {
    if (!this.isLevelComplete()) return 0;
    const coverage = this.getCoverage();
    return coverage.filledCells === this.totalCells ? 3 : 2;
  }

  /**
   * Provide a hint: returns the solution path for an unsolved flow
   */
  getHint() {
    if (!this.solution) return null;

    for (const ep of this.endpoints) {
      if (!this.isFlowComplete(ep.colorId)) {
        const solPath = this.solution[ep.colorId];
        if (solPath && solPath.length >= 2) {
          this.pushUndoSnapshot();
          this.paths.set(ep.colorId, JSON.parse(JSON.stringify(solPath)));
          return {
            colorId: ep.colorId,
            path: this.paths.get(ep.colorId)
          };
        }
      }
    }
    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FLOW_COLORS,
    ZenFlowGame
  };
}
if (typeof window !== 'undefined') {
  window.ZenFlow = {
    FLOW_COLORS,
    ZenFlowGame
  };
}
