export class MeshBVHNode
{

	boundingData?: Float32Array;

	constructor()
	{

		// internal nodes have boundingData, left, right, and splitAxis
		// leaf nodes have offset and count (referring to primitives in the mesh geometry)

	}

}
