import { Vector3 } from "three";

export function arrayToBox(nodeIndex32: number, array: Float32Array, target: { min: Vector3, max: Vector3 })
{

	target.min.x = array[nodeIndex32];
	target.min.y = array[nodeIndex32 + 1];
	target.min.z = array[nodeIndex32 + 2];

	target.max.x = array[nodeIndex32 + 3];
	target.max.y = array[nodeIndex32 + 4];
	target.max.z = array[nodeIndex32 + 5];

	return target;

}

export function getLongestEdgeIndex(bounds: number[] | Float32Array)
{

	let splitDimIdx = - 1;
	let splitDist = - Infinity;

	for (let i = 0; i < 3; i++)
	{

		const dist = bounds[i + 3] - bounds[i];
		if (dist > splitDist)
		{

			splitDist = dist;
			splitDimIdx = i;

		}

	}

	return splitDimIdx;

}

// copys bounds a into bounds b
export function copyBounds(source: Float32Array, target: Float32Array)
{

	target.set(source);

}

// sets bounds target to the union of bounds a and b
export function unionBounds(a: number[] | Float32Array, b: number[] | Float32Array, target: number[] | Float32Array)
{

	let aVal, bVal;
	for (let d = 0; d < 3; d++)
	{

		const d3 = d + 3;

		// set the minimum values
		aVal = a[d];
		bVal = b[d];
		target[d] = aVal < bVal ? aVal : bVal;

		// set the max values
		aVal = a[d3];
		bVal = b[d3];
		target[d3] = aVal > bVal ? aVal : bVal;

	}

}

// expands the given bounds by the provided triangle bounds
export function expandByTriangleBounds(startIndex: number, triangleBounds: Float32Array | number[], bounds: number[] | Float32Array)
{

	for (let d = 0; d < 3; d++)
	{

		const tCenter = triangleBounds[startIndex + 2 * d];
		const tHalf = triangleBounds[startIndex + 2 * d + 1];

		const tMin = tCenter - tHalf;
		const tMax = tCenter + tHalf;

		if (tMin < bounds[d])
		{

			bounds[d] = tMin;

		}

		if (tMax > bounds[d + 3])
		{

			bounds[d + 3] = tMax;

		}

	}

}

// compute bounds surface area
export function computeSurfaceArea(bounds: Float32Array | number[])
{

	const d0 = bounds[3] - bounds[0];
	const d1 = bounds[4] - bounds[1];
	const d2 = bounds[5] - bounds[2];

	return 2 * (d0 * d1 + d1 * d2 + d2 * d0);

}
