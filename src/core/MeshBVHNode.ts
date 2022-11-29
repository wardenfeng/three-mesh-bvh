export class MeshBVHNode
{

	boundingData!: Float32Array;
	offset: number | undefined;
	count: number | undefined;
	splitAxis!: number;
	left!: MeshBVHNode;
	right!: MeshBVHNode;

	constructor()
	{

		// internal nodes have boundingData, left, right, and splitAxis
		// leaf nodes have offset and count (referring to primitives in the mesh geometry)

	}

}
