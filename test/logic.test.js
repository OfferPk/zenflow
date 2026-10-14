/**
 * ZenFlow - Comprehensive Logic Tests
 * Executed via: npm test (node --test)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { FLOW_COLORS, ZenFlowGame } = require('../src/flow.js');
const { ZENFLOW_PACKS, ZENFLOW_LEVELS } = require('../src/levels.js');

describe('ZenFlow Game Engine & Level Packs', () => {
  it('should have 5 curated packs with 10 levels each (50 total)', () => {
    assert.equal(ZENFLOW_PACKS.length, 5);
    let totalLevels = 0;
    for (const pack of ZENFLOW_PACKS) {
      const levels = ZENFLOW_LEVELS[pack.id];
      assert.ok(levels, `Pack ${pack.id} should have levels`);
      assert.equal(levels.length, 10, `Pack ${pack.id} should have 10 levels`);
      totalLevels += levels.length;
    }
    assert.equal(totalLevels, 50);
  });

  it('every level solution should be 100% valid, non-overlapping, and fill the grid', () => {
    for (const pack of ZENFLOW_PACKS) {
      const levels = ZENFLOW_LEVELS[pack.id];
      for (const level of levels) {
        assert.ok(level.size >= 5 && level.size <= 9);
        assert.ok(level.endpoints.length >= 3);

        const occupied = new Set();
        let totalPathCells = 0;

        for (const ep of level.endpoints) {
          const path = level.solution[ep.colorId];
          assert.ok(path, `Level ${level.name} flow ${ep.colorId} must have solution`);
          assert.ok(path.length >= 2, `Path must have at least 2 cells`);

          // Check adjacency
          for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const dist = Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);
            assert.equal(dist, 1, `Path must be orthogonally adjacent in ${level.name}`);
          }

          // Check endpoints match
          const head = path[0];
          const tail = path[path.length - 1];
          const matchesAtoB =
            (head.r === ep.a.r && head.c === ep.a.c && tail.r === ep.b.r && tail.c === ep.b.c) ||
            (head.r === ep.b.r && head.c === ep.b.c && tail.r === ep.a.r && tail.c === ep.a.c);
          assert.ok(matchesAtoB, `Path ends must match endpoints in ${level.name}`);

          // Check cell bounds and overlap
          for (const pt of path) {
            assert.ok(pt.r >= 0 && pt.r < level.size);
            assert.ok(pt.c >= 0 && pt.c < level.size);
            const key = `${pt.r},${pt.c}`;
            assert.ok(!occupied.has(key), `Cell ${key} overlapped in ${level.name}`);
            occupied.add(key);
            totalPathCells++;
          }
        }

        assert.equal(totalPathCells, level.size * level.size);
        assert.equal(occupied.size, level.size * level.size);
      }
    }
  });

  it('should initialize a game instance and report initial zero state', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);

    assert.equal(game.size, 5);
    assert.equal(game.totalCells, 25);
    assert.equal(game.isLevelComplete(), false);
    assert.equal(game.getCompletedFlowCount(), 0);
    assert.equal(game.getStars(), 0);

    const ep = game.getEndpoint(level.endpoints[0].a.r, level.endpoints[0].a.c);
    assert.ok(ep);
    assert.equal(ep.colorId, level.endpoints[0].colorId);
  });

  it('should start drawing a path from an endpoint', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);
    const firstEp = level.endpoints[0];

    const start = game.startPath(firstEp.a.r, firstEp.a.c);
    assert.ok(start);
    assert.equal(start.colorId, firstEp.colorId);
    assert.equal(start.path.length, 1);
    assert.deepEqual(start.path[0], firstEp.a);
  });

  it('should extend path to adjacent cell and complete flow upon reaching target', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);
    const firstEp = level.endpoints[0];
    const solPath = level.solution[firstEp.colorId];

    game.startPath(solPath[0].r, solPath[0].c);

    for (let i = 1; i < solPath.length; i++) {
      const res = game.extendPath(solPath[i].r, solPath[i].c);
      assert.ok(res);
      if (i === solPath.length - 1) {
        assert.equal(res.completed, true);
        assert.equal(res.status, 'connected');
      }
    }

    assert.equal(game.isFlowComplete(firstEp.colorId), true);
    assert.equal(game.getCompletedFlowCount(), 1);
  });

  it('should prevent path extension into endpoints of different colors', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);
    const ep0 = level.endpoints[0];
    const ep1 = level.endpoints[1];

    // Find if ep0 is adjacent to ep1 or test direct blocked attempt
    game.startPath(ep0.a.r, ep0.a.c);
    const res = game.extendPath(ep1.a.r, ep1.a.c);
    if (game.isAdjacent(ep0.a.r, ep0.a.c, ep1.a.r, ep1.a.c)) {
      assert.equal(res.status, 'blocked');
    } else {
      assert.equal(res, null); // Not adjacent
    }
  });

  it('should unwind/backtrack when dragging back into own path', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);
    const ep = level.endpoints[0];
    const solPath = level.solution[ep.colorId];

    game.startPath(solPath[0].r, solPath[0].c);
    game.extendPath(solPath[1].r, solPath[1].c);
    game.extendPath(solPath[2].r, solPath[2].c);

    assert.equal(game.paths.get(ep.colorId).length, 3);

    // Drag back to solPath[1]
    const backtrack = game.extendPath(solPath[1].r, solPath[1].c);
    assert.equal(backtrack.status, 'backtrack');
    assert.equal(game.paths.get(ep.colorId).length, 2);
  });

  it('should overwrite / truncate intersecting paths of another color', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);

    // Let's create path 0 across a cell, then run path 1 across the same cell
    const ep0 = level.endpoints[0];
    const ep1 = level.endpoints[1];
    const path0 = level.solution[ep0.colorId];

    game.startPath(path0[0].r, path0[0].c);
    for (let i = 1; i < path0.length; i++) {
      game.extendPath(path0[i].r, path0[i].c);
    }
    game.endPath();

    assert.equal(game.isFlowComplete(ep0.colorId), true);

    // Now start path 1 from its start and extend into an interior cell of path 0
    const targetCell = path0[1]; // cell in path 0
    if (game.isAdjacent(ep1.a.r, ep1.a.c, targetCell.r, targetCell.c)) {
      game.startPath(ep1.a.r, ep1.a.c);
      game.extendPath(targetCell.r, targetCell.c);
      // Path 0 should be truncated before targetCell
      assert.ok(game.paths.get(ep0.colorId).length < path0.length);
      assert.equal(game.isFlowComplete(ep0.colorId), false);
    }
  });

  it('should support undo of moves', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);
    const ep = level.endpoints[0];
    const sol = level.solution[ep.colorId];

    assert.equal(game.paths.get(ep.colorId).length, 0);

    game.startPath(sol[0].r, sol[0].c);
    game.extendPath(sol[1].r, sol[1].c);
    game.endPath();

    assert.equal(game.paths.get(ep.colorId).length, 2);

    const undone = game.undo();
    assert.equal(undone, true);
    assert.equal(game.paths.get(ep.colorId).length, 0);
  });

  it('should reset board properly', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);
    const ep = level.endpoints[0];
    const sol = level.solution[ep.colorId];

    game.startPath(sol[0].r, sol[0].c);
    game.extendPath(sol[1].r, sol[1].c);
    game.endPath();

    game.reset();
    assert.equal(game.paths.get(ep.colorId).length, 0);
    assert.equal(game.getCompletedFlowCount(), 0);
  });

  it('should award 3 stars on perfect 100% full-board completion', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);

    // Apply full solution
    for (const ep of level.endpoints) {
      const sol = level.solution[ep.colorId];
      game.startPath(sol[0].r, sol[0].c);
      for (let i = 1; i < sol.length; i++) {
        game.extendPath(sol[i].r, sol[i].c);
      }
      game.endPath();
    }

    assert.equal(game.isLevelComplete(), true);
    assert.equal(game.getCompletedFlowCount(), level.endpoints.length);

    const coverage = game.getCoverage();
    assert.equal(coverage.filledCells, 25);
    assert.equal(coverage.percentage, 100);
    assert.equal(game.getStars(), 3);
  });

  it('hint assistant should solve next incomplete flow', () => {
    const level = ZENFLOW_LEVELS['starter'][0];
    const game = new ZenFlowGame(level);

    const hint = game.getHint();
    assert.ok(hint);
    assert.ok(hint.path.length >= 2);
    assert.equal(game.isFlowComplete(hint.colorId), true);
  });
});
