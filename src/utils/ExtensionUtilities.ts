import { Ray, Matrix4, Mesh, Raycaster, Event, Intersection, Object3D, Material } from 'three';
import { convertRaycastIntersect } from './GeometryRayIntersectUtilities';
import { MeshBVH } from '../core/MeshBVH';

const ray = /* @__PURE__ */ new Ray();
const tmpInverseMatrix = /* @__PURE__ */ new Matrix4();
const origMeshRaycastFunc = Mesh.prototype.raycast;

export function acceleratedRaycast(this: Mesh, raycaster: Raycaster, intersects: Intersection<Object3D<Event>>[])
{

	if (this.geometry.boundsTree)
	{

		if (this.material === undefined) return;

		tmpInverseMatrix.copy(this.matrixWorld).invert();
		ray.copy(raycaster.ray).applyMatrix4(tmpInverseMatrix);

		const bvh = this.geometry.boundsTree;
		if (raycaster.firstHitOnly === true)
		{

			const hit = convertRaycastIntersect(bvh.raycastFirst(ray, this.material as Material), this, raycaster);
			if (hit)
			{

				intersects.push(hit);

			}

		} else
		{

			const hits = bvh.raycast(ray, this.material as Material);
			for (let i = 0, l = hits.length; i < l; i++)
			{

				const hit = convertRaycastIntersect(hits[i], this, raycaster);
				if (hit)
				{

					intersects.push(hit);

				}

			}

		}

	} else
	{

		origMeshRaycastFunc.call(this, raycaster, intersects);

	}

}

export function computeBoundsTree(options?: { setBoundingBox?: boolean; useSharedArrayBuffer?: boolean; strategy?: number; maxLeafTris?: number })
{

	this.boundsTree = new MeshBVH(this, options);
	return this.boundsTree;

}

export function disposeBoundsTree()
{

	this.boundsTree = null;

}
