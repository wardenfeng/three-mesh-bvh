import { Box3, Vector3, Matrix4, BufferGeometry, Ray, Side, Object3D, Intersection } from 'three';
import { CONTAINED } from './Constants';

import { OrientedBox } from '../math/OrientedBox';
import { ExtendedTriangle } from '../math/ExtendedTriangle';
import { intersectTris, intersectClosestTri } from '../utils/GeometryRayIntersectUtilities';
import { setTriangle } from '../utils/TriangleUtilities';
import { arrayToBox } from '../utils/ArrayBoxUtilities';
import { PrimitivePool } from '../utils/PrimitivePool';
import { COUNT, OFFSET, LEFT_NODE, RIGHT_NODE, IS_LEAF, BOUNDING_DATA_INDEX, SPLIT_AXIS } from './nodeBufferFunctions';

const boundingBox = new Box3();
const boxIntersection = new Vector3();
const xyzFields: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];

export function raycast(nodeIndex32: number, geometry: BufferGeometry, side: Side, ray: Ray, intersects: Intersection<Object3D>[])
{

	let nodeIndex16 = nodeIndex32 * 2, float32Array = _float32Array!, uint16Array = _uint16Array!, uint32Array = _uint32Array!;

	const isLeaf = IS_LEAF(nodeIndex16, uint16Array);
	if (isLeaf)
	{

		const offset = OFFSET(nodeIndex32, uint32Array);
		const count = COUNT(nodeIndex16, uint16Array);

		intersectTris(geometry, side, ray, offset, count, intersects);

	} else
	{

		const leftIndex = LEFT_NODE(nodeIndex32);
		if (intersectRay(leftIndex, float32Array, ray, boxIntersection))
		{

			raycast(leftIndex, geometry, side, ray, intersects);

		}

		const rightIndex = RIGHT_NODE(nodeIndex32, uint32Array);
		if (intersectRay(rightIndex, float32Array, ray, boxIntersection))
		{

			raycast(rightIndex, geometry, side, ray, intersects);

		}

	}

}

export function raycastFirst(nodeIndex32: number, geometry: BufferGeometry, side: Side, ray: Ray)
{

	let nodeIndex16 = nodeIndex32 * 2, float32Array = _float32Array!, uint16Array = _uint16Array!, uint32Array = _uint32Array!;

	const isLeaf = IS_LEAF(nodeIndex16, uint16Array);
	if (isLeaf)
	{

		const offset = OFFSET(nodeIndex32, uint32Array);
		const count = COUNT(nodeIndex16, uint16Array);
		return intersectClosestTri(geometry, side, ray, offset, count);

	} else
	{

		// consider the position of the split plane with respect to the oncoming ray; whichever direction
		// the ray is coming from, look for an intersection among that side of the tree first
		const splitAxis = SPLIT_AXIS(nodeIndex32, uint32Array);
		const xyzAxis = xyzFields[splitAxis];
		const rayDir = ray.direction[xyzAxis];
		const leftToRight = rayDir >= 0;

		// c1 is the child to check first
		let c1, c2;
		if (leftToRight)
		{

			c1 = LEFT_NODE(nodeIndex32);
			c2 = RIGHT_NODE(nodeIndex32, uint32Array);

		} else
		{

			c1 = RIGHT_NODE(nodeIndex32, uint32Array);
			c2 = LEFT_NODE(nodeIndex32);

		}

		const c1Intersection = intersectRay(c1, float32Array, ray, boxIntersection);
		const c1Result: Intersection<Object3D> = c1Intersection ? raycastFirst(c1, geometry, side, ray) : null;

		// if we got an intersection in the first node and it's closer than the second node's bounding
		// box, we don't need to consider the second node because it couldn't possibly be a better result
		if (c1Result)
		{

			// check if the point is within the second bounds
			// "point" is in the local frame of the bvh
			const point = c1Result.point[xyzAxis];
			const isOutside = leftToRight ?
				point <= float32Array[c2 + splitAxis] : // min bounding data
				point >= float32Array[c2 + splitAxis + 3]; // max bounding data

			if (isOutside)
			{

				return c1Result;

			}

		}

		// either there was no intersection in the first node, or there could still be a closer
		// intersection in the second, so check the second node and then take the better of the two
		const c2Intersection = intersectRay(c2, float32Array, ray, boxIntersection);
		const c2Result: Intersection<Object3D> = c2Intersection ? raycastFirst(c2, geometry, side, ray) : null;

		if (c1Result && c2Result)
		{

			return c1Result.distance <= c2Result.distance ? c1Result : c2Result;

		} else
		{

			return c1Result || c2Result || null;

		}

	}

}

export const shapecast = (function ()
{

	let _box1: Box3, _box2: Box3;
	const boxStack: Box3[] = [];
	const boxPool = new PrimitivePool(() => new Box3());

	return function shapecast(...args: any[])
	{

		_box1 = boxPool.getPrimitive();
		_box2 = boxPool.getPrimitive();
		boxStack.push(_box1, _box2);

		// @ts-ignore
		const result = shapecastTraverse(...args);

		boxPool.releasePrimitive(_box1);
		boxPool.releasePrimitive(_box2);
		boxStack.pop();
		boxStack.pop();

		const length = boxStack.length;
		if (length > 0)
		{

			_box2 = boxStack[length - 1];
			_box1 = boxStack[length - 2];

		}

		return result;

	};

	function shapecastTraverse(
		nodeIndex32: number,
		geometry: BufferGeometry,
		intersectsBoundsFunc: ((box: Box3, isLeaf: boolean, arg2: number, depth: number, offset: number) => number),
		intersectsRangeFunc: ((offset: number, count: number, arg2: boolean, depth: number, arg4: number, arg5: Box3) => any),
		nodeScoreFunc: ((box: Box3) => number) | null = null,
		nodeIndexByteOffset = 0, // offset for unique node identifier
		depth = 0
	)
	{

		// Define these inside the function so it has access to the local variables needed
		// when converting to the buffer equivalents
		function getLeftOffset(nodeIndex32: number)
		{

			let nodeIndex16 = nodeIndex32 * 2, uint16Array = _uint16Array!, uint32Array = _uint32Array!;

			// traverse until we find a leaf
			while (!IS_LEAF(nodeIndex16, uint16Array))
			{

				nodeIndex32 = LEFT_NODE(nodeIndex32);
				nodeIndex16 = nodeIndex32 * 2;

			}

			return OFFSET(nodeIndex32, uint32Array);

		}

		function getRightEndOffset(nodeIndex32: number)
		{

			let nodeIndex16 = nodeIndex32 * 2, uint16Array = _uint16Array!, uint32Array = _uint32Array!;

			// traverse until we find a leaf
			while (!IS_LEAF(nodeIndex16, uint16Array))
			{

				// adjust offset to point to the right node
				nodeIndex32 = RIGHT_NODE(nodeIndex32, uint32Array);
				nodeIndex16 = nodeIndex32 * 2;

			}

			// return the end offset of the triangle range
			return OFFSET(nodeIndex32, uint32Array) + COUNT(nodeIndex16, uint16Array);

		}

		let nodeIndex16 = nodeIndex32 * 2, float32Array = _float32Array!, uint16Array = _uint16Array!, uint32Array = _uint32Array!;

		const isLeaf = IS_LEAF(nodeIndex16, uint16Array);
		if (isLeaf)
		{

			const offset = OFFSET(nodeIndex32, uint32Array);
			const count = COUNT(nodeIndex16, uint16Array);
			arrayToBox(BOUNDING_DATA_INDEX(nodeIndex32), float32Array, _box1);
			return intersectsRangeFunc(offset, count, false, depth, nodeIndexByteOffset + nodeIndex32, _box1);

		} else
		{

			const left = LEFT_NODE(nodeIndex32);
			const right = RIGHT_NODE(nodeIndex32, uint32Array);
			let c1 = left;
			let c2 = right;

			let score1: number, score2: number;
			let box1: Box3, box2: Box3;
			if (nodeScoreFunc)
			{

				box1 = _box1;
				box2 = _box2;

				// bounding data is not offset
				arrayToBox(BOUNDING_DATA_INDEX(c1), float32Array, box1);
				arrayToBox(BOUNDING_DATA_INDEX(c2), float32Array, box2);

				score1 = nodeScoreFunc(box1);
				score2 = nodeScoreFunc(box2);

				if (score2 < score1)
				{

					c1 = right;
					c2 = left;

					const temp = score1;
					score1 = score2;
					score2 = temp;

					box1 = box2;
					// box2 is always set before use below

				}

			}

			// Check box 1 intersection
			if (!box1!)
			{

				box1 = _box1;
				arrayToBox(BOUNDING_DATA_INDEX(c1), float32Array, box1);

			}

			const isC1Leaf = IS_LEAF(c1 * 2, uint16Array);
			const c1Intersection = intersectsBoundsFunc(box1, isC1Leaf, score1!, depth + 1, nodeIndexByteOffset + c1);

			let c1StopTraversal;
			if (c1Intersection === CONTAINED)
			{

				const offset = getLeftOffset(c1);
				const end = getRightEndOffset(c1);
				const count = end - offset;

				c1StopTraversal = intersectsRangeFunc(offset, count, true, depth + 1, nodeIndexByteOffset + c1, box1);

			} else
			{

				c1StopTraversal =
					c1Intersection &&
					shapecastTraverse(
						c1,
						geometry,
						intersectsBoundsFunc,
						intersectsRangeFunc,
						nodeScoreFunc,
						nodeIndexByteOffset,
						depth + 1
					);

			}

			if (c1StopTraversal) return true;

			// Check box 2 intersection
			// cached box2 will have been overwritten by previous traversal
			box2 = _box2;
			arrayToBox(BOUNDING_DATA_INDEX(c2), float32Array, box2);

			const isC2Leaf = IS_LEAF(c2 * 2, uint16Array);
			const c2Intersection = intersectsBoundsFunc(box2, isC2Leaf, score2!, depth + 1, nodeIndexByteOffset + c2);

			let c2StopTraversal;
			if (c2Intersection === CONTAINED)
			{

				const offset = getLeftOffset(c2);
				const end = getRightEndOffset(c2);
				const count = end - offset;

				c2StopTraversal = intersectsRangeFunc(offset, count, true, depth + 1, nodeIndexByteOffset + c2, box2);

			} else
			{

				c2StopTraversal =
					c2Intersection &&
					shapecastTraverse(
						c2,
						geometry,
						intersectsBoundsFunc,
						intersectsRangeFunc,
						nodeScoreFunc,
						nodeIndexByteOffset,
						depth + 1
					);

			}

			if (c2StopTraversal) return true;

			return false;

		}

	}

})();

export const intersectsGeometry = (function ()
{

	const triangle = new ExtendedTriangle();
	const triangle2 = new ExtendedTriangle();
	const invertedMat = new Matrix4();

	const obb = new OrientedBox();
	const obb2 = new OrientedBox();

	return function intersectsGeometry(nodeIndex32: number, geometry: BufferGeometry,
		otherGeometry: { boundingBox: { min: Vector3; max: Vector3; }; computeBoundingBox: () => void; index: any; attributes: { position: any; }; boundsTree: { shapecast: (arg0: { intersectsBounds: (box: any) => boolean; intersectsTriangle: (tri: any) => boolean; }) => any; }; },
		geometryToBvh: Matrix4, cachedObb: OrientedBox | null = null)
	{

		let nodeIndex16 = nodeIndex32 * 2, float32Array = _float32Array!, uint16Array = _uint16Array!, uint32Array = _uint32Array!;

		if (cachedObb === null)
		{

			if (!otherGeometry.boundingBox)
			{

				otherGeometry.computeBoundingBox();

			}

			obb.set(otherGeometry.boundingBox.min, otherGeometry.boundingBox.max, geometryToBvh);
			cachedObb = obb;

		}

		const isLeaf = IS_LEAF(nodeIndex16, uint16Array);
		if (isLeaf)
		{

			const thisGeometry = geometry;
			const thisIndex = thisGeometry.index!;
			const thisPos = thisGeometry.attributes.position;

			const index = otherGeometry.index;
			const pos = otherGeometry.attributes.position;

			const offset = OFFSET(nodeIndex32, uint32Array);
			const count = COUNT(nodeIndex16, uint16Array);

			// get the inverse of the geometry matrix so we can transform our triangles into the
			// geometry space we're trying to test. We assume there are fewer triangles being checked
			// here.
			invertedMat.copy(geometryToBvh).invert();

			if (otherGeometry.boundsTree)
			{

				arrayToBox(BOUNDING_DATA_INDEX(nodeIndex32), float32Array, obb2);
				obb2.matrix.copy(invertedMat);
				obb2.needsUpdate = true;

				const res = otherGeometry.boundsTree.shapecast({

					intersectsBounds: box => obb2.intersectsBox(box),

					intersectsTriangle: tri =>
					{

						tri.a.applyMatrix4(geometryToBvh);
						tri.b.applyMatrix4(geometryToBvh);
						tri.c.applyMatrix4(geometryToBvh);
						tri.needsUpdate = true;

						for (let i = offset * 3, l = (count + offset) * 3; i < l; i += 3)
						{

							// this triangle needs to be transformed into the current BVH coordinate frame
							setTriangle(triangle2, i, thisIndex, thisPos);
							triangle2.needsUpdate = true;
							if (tri.intersectsTriangle(triangle2))
							{

								return true;

							}

						}

						return false;

					}

				});

				return res;

			} else
			{

				for (let i = offset * 3, l = (count + offset * 3); i < l; i += 3)
				{

					// this triangle needs to be transformed into the current BVH coordinate frame
					setTriangle(triangle, i, thisIndex, thisPos);
					triangle.a.applyMatrix4(invertedMat);
					triangle.b.applyMatrix4(invertedMat);
					triangle.c.applyMatrix4(invertedMat);
					triangle.needsUpdate = true;

					for (let i2 = 0, l2 = index.count; i2 < l2; i2 += 3)
					{

						setTriangle(triangle2, i2, index, pos);
						triangle2.needsUpdate = true;

						if (triangle.intersectsTriangle(triangle2))
						{

							return true;

						}

					}

				}

			}

		} else
		{

			const left = nodeIndex32 + 8;
			const right = uint32Array[nodeIndex32 + 6];

			arrayToBox(BOUNDING_DATA_INDEX(left), float32Array, boundingBox);
			const leftIntersection =
				cachedObb.intersectsBox(boundingBox) &&
				intersectsGeometry(left, geometry, otherGeometry, geometryToBvh, cachedObb);

			if (leftIntersection) return true;

			arrayToBox(BOUNDING_DATA_INDEX(right), float32Array, boundingBox);
			const rightIntersection =
				cachedObb.intersectsBox(boundingBox) &&
				intersectsGeometry(right, geometry, otherGeometry, geometryToBvh, cachedObb);

			if (rightIntersection) return true;

			return false;

		}

	};

})();

function intersectRay(nodeIndex32: number, array: Float32Array, ray: Ray, target: Vector3)
{

	arrayToBox(nodeIndex32, array, boundingBox);
	return ray.intersectBox(boundingBox, target);

}

const bufferStack: any[] = [];
let _prevBuffer: null;
let _float32Array: Float32Array | null;
let _uint16Array: Uint16Array | null;
let _uint32Array: Uint32Array | null;
export function setBuffer(buffer: any)
{

	if (_prevBuffer)
	{

		bufferStack.push(_prevBuffer);

	}

	_prevBuffer = buffer;
	_float32Array = new Float32Array(buffer);
	_uint16Array = new Uint16Array(buffer);
	_uint32Array = new Uint32Array(buffer);

}

export function clearBuffer()
{

	_prevBuffer = null;
	_float32Array = null;
	_uint16Array = null;
	_uint32Array = null;

	if (bufferStack.length)
	{

		setBuffer(bufferStack.pop());

	}

}
