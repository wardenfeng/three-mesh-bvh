import { MeshBVH } from 'src/core/MeshBVH';
import { Box3, Vector3 } from 'three';
import { TRAVERSAL_COST, TRIANGLE_INTERSECT_COST } from '../core/Constants';
import { arrayToBox } from '../utils/ArrayBoxUtilities';

const _box1 = /* @__PURE__ */ new Box3();
const _box2 = /* @__PURE__ */ new Box3();
const _vec = /* @__PURE__ */ new Vector3();

// https://stackoverflow.com/questions/1248302/how-to-get-the-size-of-a-javascript-object
function getPrimitiveSize(el: string | number | boolean)
{

	switch (typeof el)
	{

		case 'number':
			return 8;
		case 'string':
			return el.length * 2;
		case 'boolean':
			return 4;
		default:
			return 0;

	}

}

function isTypedArray(arr: any)
{

	const regex = /(Uint|Int|Float)(8|16|32)Array/;
	return regex.test(arr.constructor.name);

}

function getRootExtremes(bvh: MeshBVH, group: number)
{

	const result = {
		nodeCount: 0,
		leafNodeCount: 0,

		depth: {
			min: Infinity, max: - Infinity
		},
		tris: {
			min: Infinity, max: - Infinity
		},
		splits: [0, 0, 0],
		surfaceAreaScore: 0,
	};

	bvh.traverse((depth: number, isLeaf: boolean, boundingData, offsetOrSplit: number, count: number) =>
	{

		const l0 = boundingData[0 + 3] - boundingData[0];
		const l1 = boundingData[1 + 3] - boundingData[1];
		const l2 = boundingData[2 + 3] - boundingData[2];

		const surfaceArea = 2 * (l0 * l1 + l1 * l2 + l2 * l0);

		result.nodeCount++;
		if (isLeaf)
		{

			result.leafNodeCount++;

			result.depth.min = Math.min(depth, result.depth.min);
			result.depth.max = Math.max(depth, result.depth.max);

			result.tris.min = Math.min(count, result.tris.min);
			result.tris.max = Math.max(count, result.tris.max);

			result.surfaceAreaScore += surfaceArea * TRIANGLE_INTERSECT_COST * count;

		} else
		{

			result.splits[offsetOrSplit]++;

			result.surfaceAreaScore += surfaceArea * TRAVERSAL_COST;

		}

	}, group);

	// If there are no leaf nodes because the tree hasn't finished generating yet.
	if (result.tris.min === Infinity)
	{

		result.tris.min = 0;
		result.tris.max = 0;

	}

	if (result.depth.min === Infinity)
	{

		result.depth.min = 0;
		result.depth.max = 0;

	}

	return result;

}

function getBVHExtremes(bvh: MeshBVH)
{

	return bvh._roots.map((_root, i) => getRootExtremes(bvh, i));

}

function estimateMemoryInBytes(obj: any)
{

	const traversed = new Set();
	const stack = [obj];
	let bytes = 0;

	while (stack.length)
	{

		const curr = stack.pop();
		if (traversed.has(curr))
		{

			continue;

		}

		traversed.add(curr);

		for (let key in curr)
		{

			if (!curr.hasOwnProperty(key))
			{

				continue;

			}

			bytes += getPrimitiveSize(key);

			const value = curr[key];
			if (value && (typeof value === 'object' || typeof value === 'function'))
			{

				if (isTypedArray(value))
				{

					bytes += value.byteLength;

				} else if (value instanceof ArrayBuffer)
				{

					bytes += value.byteLength;

				} else
				{

					stack.push(value);

				}

			} else
			{

				bytes += getPrimitiveSize(value);

			}


		}

	}

	return bytes;

}

function validateBounds(bvh: MeshBVH)
{

	const geometry = bvh.geometry;
	const depthStack: {
		depth: number;
		isLeaf: boolean;
		boundingData: Float32Array;
		offset: number;
		count: number;
	}[] = [];
	const index = geometry.index!;
	const position = geometry.getAttribute('position');
	let passes = true;

	bvh.traverse((depth: number, isLeaf: boolean, boundingData: Float32Array, offset: number, count: number) =>
	{

		const info = {
			depth,
			isLeaf,
			boundingData,
			offset,
			count,
		};
		depthStack[depth] = info;

		arrayToBox(0, boundingData, _box1);
		const parent = depthStack[depth - 1];

		if (isLeaf)
		{

			// check triangles
			for (let i = offset * 3, l = (offset + count) * 3; i < l; i += 3)
			{

				const i0 = index.getX(i);
				const i1 = index.getX(i + 1);
				const i2 = index.getX(i + 2);

				let isContained;

				_vec.fromBufferAttribute(position, i0);
				isContained = _box1.containsPoint(_vec);

				_vec.fromBufferAttribute(position, i1);
				isContained = isContained && _box1.containsPoint(_vec);

				_vec.fromBufferAttribute(position, i2);
				isContained = isContained && _box1.containsPoint(_vec);

				console.assert(isContained, 'Leaf bounds does not fully contain triangle.');
				passes = passes && isContained;

			}

		}

		if (parent)
		{

			// check if my bounds fit in my parents
			arrayToBox(0, boundingData, _box2);

			const isContained = _box2.containsBox(_box1);
			console.assert(isContained, 'Parent bounds does not fully contain child.');
			passes = passes && isContained;

		}

	});

	return passes;

}

interface NodeInfo
{
	right: NodeInfo | null;
	left: NodeInfo | null;
	offset: number;
	count: number;
	bounds: Box3;
}

// Returns a simple, human readable object that represents the BVH.
function getJSONStructure(bvh: MeshBVH)
{

	const depthStack: NodeInfo[] = [];

	bvh.traverse((depth: number, isLeaf: boolean, boundingData: Float32Array, offset: number, count: number) =>
	{

		const info: NodeInfo = {
			bounds: arrayToBox(0, boundingData, new Box3()),
		} as any;

		if (isLeaf)
		{

			info.count = count;
			info.offset = offset;

		} else
		{

			info.left = null;
			info.right = null;

		}

		depthStack[depth] = info;

		// traversal hits the left then right node
		const parent = depthStack[depth - 1];
		if (parent)
		{

			if (parent.left === null)
			{

				parent.left = info;

			} else
			{

				parent.right = info;

			}

		}

	});

	return depthStack[0];

}

export { estimateMemoryInBytes, getBVHExtremes, validateBounds, getJSONStructure };
