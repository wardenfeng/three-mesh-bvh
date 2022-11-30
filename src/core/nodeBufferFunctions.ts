export function IS_LEAF(n16: number, uint16Array: Uint16Array)
{

	return uint16Array[n16 + 15] === 0xFFFF;

}

export function OFFSET(n32: number, uint32Array: Uint32Array)
{

	return uint32Array[n32 + 6];

}

export function COUNT(n16: number, uint16Array: Uint16Array)
{

	return uint16Array[n16 + 14];

}

export function LEFT_NODE(n32: number)
{

	return n32 + 8;

}

export function RIGHT_NODE(n32: number, uint32Array: Uint32Array)
{

	return uint32Array[n32 + 6];

}

export function SPLIT_AXIS(n32: number, uint32Array: Uint32Array)
{

	return uint32Array[n32 + 7];

}

export function BOUNDING_DATA_INDEX(n32: number)
{

	return n32;

}
