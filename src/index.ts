import { MeshBVH } from './core/MeshBVH';
import { computeBoundsTree, disposeBoundsTree } from './utils/ExtensionUtilities';

export { MeshBVH } from './core/MeshBVH';
export { MeshBVHVisualizer } from './objects/MeshBVHVisualizer';
export { CENTER, AVERAGE, SAH, NOT_INTERSECTED, INTERSECTED, CONTAINED } from './core/Constants';
export { getBVHExtremes, estimateMemoryInBytes, getJSONStructure, validateBounds } from './debug/Debug';
export { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from './utils/ExtensionUtilities';
export { getTriangleHitPointInfo } from './utils/TriangleUtilities';
export * from './math/ExtendedTriangle';
export * from './math/OrientedBox';
export * from './gpu/MeshBVHUniformStruct';
export * from './gpu/shaderFunctions';
export * from './gpu/VertexAttributeTexture';
export * from './utils/StaticGeometryGenerator';

declare module 'three/src/core/BufferGeometry' {
	export interface BufferGeometry
	{
		boundsTree?: MeshBVH;
		computeBoundsTree: typeof computeBoundsTree;
		disposeBoundsTree: typeof disposeBoundsTree;
	}
}

declare module 'three/src/core/Raycaster' {
	export interface Raycaster
	{
		firstHitOnly?: boolean;
	}
}
