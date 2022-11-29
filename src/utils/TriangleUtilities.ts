
import { ExtendedTriangle } from 'src';
import { BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Triangle, Vector2, Vector3 } from 'three';

// sets the vertices of triangle `tri` with the 3 vertices after i
export function setTriangle(tri: ExtendedTriangle, i: number, index: BufferAttribute, pos: BufferAttribute | InterleavedBufferAttribute)
{

	const ta = tri.a;
	const tb = tri.b;
	const tc = tri.c;

	let i0 = i;
	let i1 = i + 1;
	let i2 = i + 2;
	if (index)
	{

		i0 = index.getX(i);
		i1 = index.getX(i + 1);
		i2 = index.getX(i + 2);

	}

	ta.x = pos.getX(i0);
	ta.y = pos.getY(i0);
	ta.z = pos.getZ(i0);

	tb.x = pos.getX(i1);
	tb.y = pos.getY(i1);
	tb.z = pos.getZ(i1);

	tc.x = pos.getX(i2);
	tc.y = pos.getY(i2);
	tc.z = pos.getZ(i2);

}

export function iterateOverTriangles(
	offset: number,
	count: number,
	geometry: BufferGeometry,
	intersectsTriangleFunc: (triangle: ExtendedTriangle, index: number, contained: boolean, depth: number) => boolean,
	contained: boolean,
	depth: number,
	triangle: ExtendedTriangle
)
{

	const index = geometry.index!;
	const pos = geometry.attributes.position;
	for (let i = offset, l = count + offset; i < l; i++)
	{

		setTriangle(triangle, i * 3, index, pos);
		triangle.needsUpdate = true;

		if (intersectsTriangleFunc(triangle, i, contained, depth))
		{

			return true;

		}

	}

	return false;

}

const tempV1 = /* @__PURE__ */ new Vector3();
const tempV2 = /* @__PURE__ */ new Vector3();
const tempV3 = /* @__PURE__ */ new Vector3();
const tempUV1 = /* @__PURE__ */ new Vector2();
const tempUV2 = /* @__PURE__ */ new Vector2();
const tempUV3 = /* @__PURE__ */ new Vector2();

export function getTriangleHitPointInfo(point: Vector3, geometry: BufferGeometry, triangleIndex: number,
	target: { uv: Vector2; face: { a?: number; b?: number; c?: number; materialIndex?: number; normal?: Vector3; }; })
{

	const indices = geometry.getIndex()!.array;
	const positions = geometry.getAttribute('position');
	const uvs = geometry.getAttribute('uv');

	const a = indices[triangleIndex * 3];
	const b = indices[triangleIndex * 3 + 1];
	const c = indices[triangleIndex * 3 + 2];

	tempV1.fromBufferAttribute(positions, a);
	tempV2.fromBufferAttribute(positions, b);
	tempV3.fromBufferAttribute(positions, c);

	// find the associated material index
	let materialIndex = 0;
	const groups = geometry.groups;
	const firstVertexIndex = triangleIndex * 3;
	for (let i = 0, l = groups.length; i < l; i++)
	{

		const group = groups[i];
		const { start, count } = group;
		if (firstVertexIndex >= start && firstVertexIndex < start + count)
		{

			materialIndex = group.materialIndex!;
			break;

		}

	}

	// extract uvs
	let uv: Vector2 | null = null;
	if (uvs)
	{

		tempUV1.fromBufferAttribute(uvs as any, a);
		tempUV2.fromBufferAttribute(uvs as any, b);
		tempUV3.fromBufferAttribute(uvs as any, c);

		if (target && target.uv) uv = target.uv;
		else uv = new Vector2();

		Triangle.getUV(point, tempV1, tempV2, tempV3, tempUV1, tempUV2, tempUV3, uv);

	}

	// adjust the provided target or create a new one
	if (target)
	{

		if (!target.face) target.face = {};
		target.face.a = a;
		target.face.b = b;
		target.face.c = c;
		target.face.materialIndex = materialIndex;
		if (!target.face.normal) target.face.normal = new Vector3();
		Triangle.getNormal(tempV1, tempV2, tempV3, target.face.normal);

		if (!target.uv) target.uv = new Vector2();
		target.uv.copy(uv!);

		return target;

	} else
	{

		return {
			face: {
				a: a,
				b: b,
				c: c,
				materialIndex: materialIndex,
				normal: Triangle.getNormal(tempV1, tempV2, tempV3, new Vector3())
			},
			uv: uv
		};

	}

}
