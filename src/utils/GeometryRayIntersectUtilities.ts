import { BufferGeometry, Side, Ray, Event, Intersection, Material, Mesh, Object3D } from 'three';
import { IntersectionType, intersectTri } from './ThreeRayIntersectUtilities';

export function intersectTris(geo: BufferGeometry, side: Side, ray: Ray, offset: number, count: number, intersections: IntersectionType[])
{

	for (let i = offset, end = offset + count; i < end; i++)
	{

		intersectTri(geo, side, ray, i, intersections);

	}

}

export function intersectClosestTri(geo: BufferGeometry, side: Side, ray: Ray, offset: number, count: number)
{

	let dist = Infinity;
	let res = null;
	for (let i = offset, end = offset + count; i < end; i++)
	{

		const intersection = intersectTri(geo, side, ray, i);
		if (intersection && intersection.distance < dist)
		{

			res = intersection;
			dist = intersection.distance;

		}

	}

	return res;

}

// converts the given BVH raycast intersection to align with the three.js raycast
// structure (include object, world space distance and point).
export function convertRaycastIntersect(hit: Intersection<Object3D<Event>> | null, object: Mesh<BufferGeometry, Material | Material[]>, raycaster: { ray: Ray; near: number; far: number; })
{

	if (hit === null)
	{

		return null;

	}

	hit.point.applyMatrix4(object.matrixWorld);
	hit.distance = hit.point.distanceTo(raycaster.ray.origin);
	hit.object = object;

	if (hit.distance < raycaster.near || hit.distance > raycaster.far)
	{

		return null;

	} else
	{

		return hit;

	}

}
