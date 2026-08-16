import type { SpringConfig, PhysicsState } from './types';

/** Configuration default untuk damped spring physics (k = 180 N/m, c = 22 Ns/m, m = 1.0 kg) */
export const DEFAULT_SPRING_CONFIG: SpringConfig = {
  stiffness: 180.0,
  damping: 22.0,
  mass: 1.0,
};

/**
 * Step fungsi fisika pegas terkondisikan (Damped Harmonic Oscillator)
 * Menggunakan integrasi numerik Euler.
 */
export function stepSpring(
  current: PhysicsState,
  target: number,
  config: SpringConfig,
  deltaTime: number
): PhysicsState {
  const forceSpring = -config.stiffness * (current.position - target);
  const forceDamping = -config.damping * current.velocity;
  const acceleration = (forceSpring + forceDamping) / config.mass;

  const newVelocity = current.velocity + acceleration * deltaTime;
  const newPosition = current.position + newVelocity * deltaTime;

  return { position: newPosition, velocity: newVelocity };
}

/**
 * Menghitung keputusan kinetik (snap-forward atau snap-back) saat gesture release
 * memperhitungkan posisi spasial dan kecepatan flick kursor (vx).
 */
export function decideFlipDecision(
  currentX: number,
  velocityX: number,
  pageWidth: number,
  flickWeight = 0.15
): boolean {
  const virtualPosition = currentX + flickWeight * velocityX;

  // Jika flick cepat ke kiri (vx < -500 px/s) atau virtual position melewati separuh halaman, lakukan flip
  if (velocityX < -500) {
    return true;
  }
  // Jika flick cepat ke kanan (vx > 500 px/s), batalkan flip
  if (velocityX > 500) {
    return false;
  }

  return virtualPosition < pageWidth / 2;
}
