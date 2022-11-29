import { Vector3, Vector2, Triangle, DoubleSide, BackSide, Ray, Side, BufferAttribute, InterleavedBufferAttribute, BufferGeometry } from 'three';

// Ripped and modified From THREE.js Mesh raycast
// https://github.com/mrdoob/three.js/blob/0aa87c999fe61e216c1133fba7a95772b503eddf/src/objects/Mesh.js#L115
const vA = /* @__PURE__ */ new Vector3();
const vB = /* @__PURE__ */ new Vector3();
const vC = /* @__PURE__ */ new Vector3();

const uvA = /* @__PURE__ */ new Vector2();
const uvB = /* @__PURE__ */ new Vector2();
const uvC = /* @__PURE__ */ new Vector2();

const intersectionPoint = /* @__PURE__ */ new Vector3();
function checkIntersection(ray: Ray, pA: Vector3, pB: Vector3, pC: Vector3, point: Vector3, side: Side)
{

	let intersect;
	if (side === BackSide)
	{

		intersect = ray.intersectTriangle(pC, pB, pA, true, point);

	} else
	{

		intersect = ray.intersectTriangle(pA, pB, pC, side !== DoubleSide, point);

	}

	if (intersect === null) return null;

	const distance = ray.origin.distanceTo(point);

	return {

		distance: distance,
		point: point.clone(),

	};

}

interface IntersectionType
{
	faceIndex?: number;
	face?: { a: number; b: number; c: number; normal: Vector3; materialIndex: number; };
	uv?: Vector2;
	distance: number;
	point: Vector3;
}

function checkBufferGeometryIntersection(ray: Ray, position: BufferAttribute | InterleavedBufferAttribute, uv: BufferAttribute, a: number, b: number, c: number, side: Side)
{

	vA.fromBufferAttribute(position, a);
	vB.fromBufferAttribute(position, b);
	vC.fromBufferAttribute(position, c);

	const intersection: IntersectionType | null = checkIntersection(ray, vA, vB, vC, intersectionPoint, side);

	if (intersection)
	{

		if (uv)
		{

			uvA.fromBufferAttribute(uv, a);
			uvB.fromBufferAttribute(uv, b);
			uvC.fromBufferAttribute(uv, c);

			intersection.uv = Triangle.getUV(intersectionPoint, vA, vB, vC, uvA, uvB, uvC, new Vector2());

		}

		const face = {
			a: a,
			b: b,
			c: c,
			normal: new Vector3(),
			materialIndex: 0
		};

		Triangle.getNormal(vA, vB, vC, face.normal);

		intersection.face = face;
		intersection.faceIndex = a;

	}

	return intersection;

}

// https://github.com/mrdoob/three.js/blob/0aa87c999fe61e216c1133fba7a95772b503eddf/src/objects/Mesh.js#L258
function intersectTri(geo: BufferGeometry, side: Side, ray: Ray, tri: number, intersections: IntersectionType[])
{

	const triOffset = tri * 3;
	const a = geo.index!.getX(triOffset);
	const b = geo.index!.getX(triOffset + 1);
	const c = geo.index!.getX(triOffset + 2);

	const intersection = checkBufferGeometryIntersection(ray, geo.attributes.position, geo.attributes.uv as any, a, b, c, side);

	if (intersection)
	{

		intersection.faceIndex = tri;
		if (intersections) intersections.push(intersection);
		return intersection;

	}

	return null;

}

export { intersectTri };
