import type { Point2D, PageDimensions, FoldGeometry, CornerPosition } from './types';

/**
 * Geometric Core Solver untuk Engine Page Flip.
 * Seluruh kalkulasi matematika murni diisolasi tanpa ketergantungan DOM / React.
 */
export class FoldMathEngine {
  /**
   * Menghitung geometri lipatan lengkap berdasarkan posisi kursor, sudut asal, dan dimensi halaman.
   */
  public static calculateFold(
    pointer: Point2D,
    originCorner: Point2D,
    bounds: PageDimensions,
    cornerType: CornerPosition = 'top-right'
  ): FoldGeometry {
    // 1. Aplikasikan Batasan Inkompresibilitas (Non-Stretchability Constraint)
    const clampedPointer = FoldMathEngine.applyDistanceConstraint(pointer, originCorner, bounds);

    // 2. Hitung Titik Tengah dan Vektor Normal Garis Lipatan
    const midPoint: Point2D = {
      x: (originCorner.x + clampedPointer.x) / 2,
      y: (originCorner.y + clampedPointer.y) / 2,
    };

    const dx = originCorner.x - clampedPointer.x;
    const dy = originCorner.y - clampedPointer.y;
    const foldAngle = Math.atan2(dy, dx);

    // 3. Hitung Titik Potong Garis Lipatan dengan Tepi Halaman
    const intersections = FoldMathEngine.findEdgeIntersections(midPoint, dx, dy, bounds);

    // 4. Konstruksi Polygon Clip Path (Sisi Statis dan Sisi Terlipat)
    const clipPathPolygon = FoldMathEngine.buildStaticClipPolygon(intersections, bounds, originCorner, cornerType);

    // 5. Kalkulasi Progress, Intensitas Bayangan, dan Kedalaman Paper Curl
    const progress = Math.min(Math.max(1 - clampedPointer.x / bounds.width, 0), 1);
    const shadowOpacity = Math.sin(Math.PI * progress);
    const curlDepth = Math.sin(Math.PI * progress) * (bounds.width * 0.2);

    return {
      corner: originCorner,
      dragPoint: clampedPointer,
      midPoint,
      foldAngle,
      clipPathPolygon,
      shadowOpacity,
      curlDepth,
    };
  }

  /**
   * Mencegah kertas terdistorsi atau meregang melebihi lebar fisik halaman W.
   * Jarak dari dasar tulang buku (0, y_c) ke titik kursor tidak boleh > W.
   */
  public static applyDistanceConstraint(
    p: Point2D,
    c: Point2D,
    bounds: PageDimensions
  ): Point2D {
    const spineBase: Point2D = { x: 0, y: c.y };
    const dx = p.x - spineBase.x;
    const dy = p.y - spineBase.y;
    const dist = Math.hypot(dx, dy);
    const maxDist = bounds.width;

    if (dist > maxDist && dist > 0) {
      const factor = maxDist / dist;
      return {
        x: spineBase.x + dx * factor,
        y: spineBase.y + dy * factor,
      };
    }
    return p;
  }

  /**
   * Menghitung titik potong garis bisektor tegak lurus dengan 4 tepi halaman:
   * Persamaan garis: (x - x_m)*dx + (y - y_m)*dy = 0
   */
  public static findEdgeIntersections(
    mid: Point2D,
    dx: number,
    dy: number,
    bounds: PageDimensions
  ): Point2D[] {
    const points: Point2D[] = [];
    const EPSILON = 1e-6;

    // Tepi Atas (y = 0): (x - mid.x)*dx + (-mid.y)*dy = 0 => x = mid.x + (mid.y * dy) / dx
    if (Math.abs(dx) > EPSILON) {
      const xTop = mid.x + (mid.y * dy) / dx;
      if (xTop >= -EPSILON && xTop <= bounds.width + EPSILON) {
        points.push({ x: Math.max(0, Math.min(bounds.width, xTop)), y: 0 });
      }
    }

    // Tepi Bawah (y = H): (x - mid.x)*dx + (H - mid.y)*dy = 0 => x = mid.x - ((H - mid.y) * dy) / dx
    if (Math.abs(dx) > EPSILON) {
      const xBottom = mid.x - ((bounds.height - mid.y) * dy) / dx;
      if (xBottom >= -EPSILON && xBottom <= bounds.width + EPSILON) {
        points.push({ x: Math.max(0, Math.min(bounds.width, xBottom)), y: bounds.height });
      }
    }

    // Tepi Kanan (x = W): (W - mid.x)*dx + (y - mid.y)*dy = 0 => y = mid.y - ((W - mid.x) * dx) / dy
    if (Math.abs(dy) > EPSILON) {
      const yRight = mid.y - ((bounds.width - mid.x) * dx) / dy;
      if (yRight >= -EPSILON && yRight <= bounds.height + EPSILON) {
        points.push({ x: bounds.width, y: Math.max(0, Math.min(bounds.height, yRight)) });
      }
    }

    // Tepi Kiri (x = 0): (-mid.x)*dx + (y - mid.y)*dy = 0 => y = mid.y + (mid.x * dx) / dy
    if (Math.abs(dy) > EPSILON) {
      const yLeft = mid.y + (mid.x * dx) / dy;
      if (yLeft >= -EPSILON && yLeft <= bounds.height + EPSILON) {
        points.push({ x: 0, y: Math.max(0, Math.min(bounds.height, yLeft)) });
      }
    }

    // Hilangkan duplikat jika memotong sudut tepat
    const uniquePoints: Point2D[] = [];
    for (const pt of points) {
      if (!uniquePoints.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 0.5)) {
        uniquePoints.push(pt);
      }
    }

    return uniquePoints;
  }

  /**
   * Membentuk simpul poligon clip-path untuk halaman statis yang tersisa di bawah lipatan.
   */
  public static buildStaticClipPolygon(
    intersections: Point2D[],
    bounds: PageDimensions,
    corner: Point2D,
    _cornerType: CornerPosition
  ): Point2D[] {
    const W = bounds.width;
    const H = bounds.height;

    // Jika titik potong kurang dari 2, halaman utuh
    if (intersections.length < 2) {
      return [
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: H },
        { x: 0, y: H },
      ];
    }

    const p1 = intersections[0];
    const p2 = intersections[1];

    if (!p1 || !p2) {
      return [
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: H },
        { x: 0, y: H },
      ];
    }

    // Poligon halaman statis dibentuk dari sudut-sudut halaman yang TIDAK terlipat
    // ditambah dua titik potong garis lipatan.
    const allCorners: Point2D[] = [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: H },
      { x: 0, y: H },
    ];

    // Sudut yang terpotong adalah sudut yang paling dekat dengan origin corner
    const remainingCorners = allCorners.filter(
      (c) => Math.hypot(c.x - corner.x, c.y - corner.y) > 1
    );

    // Urutkan titik potong dan sudut tersisa secara searah jarum jam relatif terhadap pusat halaman
    const polygonPoints: Point2D[] = [...remainingCorners, p1, p2];
    const center = { x: W / 2, y: H / 2 };

    polygonPoints.sort((a: Point2D, b: Point2D) => {
      const angleA = Math.atan2(a.y - center.y, a.x - center.x);
      const angleB = Math.atan2(b.y - center.y, b.x - center.x);
      return angleA - angleB;
    });

    return polygonPoints;
  }
}
