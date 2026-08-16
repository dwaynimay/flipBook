import { FoldMathEngine } from '../FoldMathEngine';
import { stepSpring, decideFlipDecision, DEFAULT_SPRING_CONFIG } from '../springPhysics';

function testMathEngine() {
  const bounds = { width: 400, height: 600 };
  const originCorner = { x: 400, y: 0 };
  const pointer = { x: 300, y: 100 };

  // 1. Test Fold Calculation
  const geo = FoldMathEngine.calculateFold(pointer, originCorner, bounds, 'top-right');
  if (geo.clipPathPolygon.length < 3) {
    throw new Error('Clip path polygon should have at least 3 vertices!');
  }

  // 2. Test Non-Stretchability Constraint
  const farPointer = { x: 900, y: 900 };
  const clamped = FoldMathEngine.applyDistanceConstraint(farPointer, originCorner, bounds);
  const distFromSpine = Math.hypot(clamped.x - 0, clamped.y - originCorner.y);

  if (distFromSpine > bounds.width + 0.001) {
    throw new Error('Distance constraint violated! Distance exceeds width W.');
  }

  // 3. Test Edge Intersections
  const intersections = FoldMathEngine.findEdgeIntersections(geo.midPoint, 100, 100, bounds);
  if (intersections.length !== 2) {
    throw new Error(`Expected exactly 2 edge intersections, got ${intersections.length}`);
  }
}

function testSpringPhysics() {
  let state = { position: 400, velocity: 0 };
  const target = 0;
  const dt = 0.016;

  for (let i = 0; i < 10; i++) {
    state = stepSpring(state, target, DEFAULT_SPRING_CONFIG, dt);
  }

  if (state.position >= 400) {
    throw new Error('Spring physics failed to move towards target!');
  }

  const flipDecision1 = decideFlipDecision(150, -600, 400);
  const flipDecision2 = decideFlipDecision(350, 600, 400);

  if (!flipDecision1 || flipDecision2) {
    throw new Error('Kinetic decision threshold evaluation failed!');
  }
}

testMathEngine();
testSpringPhysics();
console.log('=== ALL PAGE FLIP ENGINE TESTS PASSED SUCCESSFULLY ===');
