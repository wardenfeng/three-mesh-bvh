import { Box3, BufferAttribute, BufferGeometry } from 'three';
import { MeshBVH } from '../core/MeshBVH';

export class GenerateMeshBVHWorker
{
	running: boolean;
	worker: Worker;

	constructor()
	{

		this.running = false;
		this.worker = new Worker(new URL('./generateAsync.worker.ts', import.meta.url), { type: 'module' });
		this.worker.onerror = e =>
		{

			if (e.message)
			{

				throw new Error(`GenerateMeshBVHWorker: Could not create Web Worker with error "${e.message}"`);

			} else
			{

				throw new Error('GenerateMeshBVHWorker: Could not create Web Worker.');

			}

		};

	}

	generate(geometry: BufferGeometry, options: {
		onProgress?: (progress: number) => void;
		maxLeafTris?: number; strategy?: number
	} = {})
	{

		if (this.running)
		{

			throw new Error('GenerateMeshBVHWorker: Already running job.');

		}

		if (this.worker === null)
		{

			throw new Error('GenerateMeshBVHWorker: Worker has been disposed.');

		}

		const { worker } = this;
		this.running = true;

		return new Promise<MeshBVH>((resolve, reject) =>
		{

			worker.onerror = e =>
			{

				reject(new Error(`GenerateMeshBVHWorker: ${e.message}`));
				this.running = false;

			};

			worker.onmessage = e =>
			{

				this.running = false;
				const { data } = e;

				if (data.error)
				{

					reject(new Error(data.error));
					worker.onmessage = null;

				} else if (data.serialized)
				{

					const { serialized, position } = data;
					const bvh = MeshBVH.deserialize(serialized, geometry, { setIndex: false });
					const boundsOptions = Object.assign({

						setBoundingBox: true,

					}, options);

					// we need to replace the arrays because they're neutered entirely by the
					// webworker transfer.
					(geometry.attributes.position as BufferAttribute).array = position;
					if (geometry.index)
					{

						geometry.index.array = serialized.index;

					} else
					{

						const newIndex = new BufferAttribute(serialized.index, 1, false);
						geometry.setIndex(newIndex);

					}

					if (boundsOptions.setBoundingBox)
					{

						geometry.boundingBox = bvh.getBoundingBox(new Box3());

					}

					resolve(bvh);
					worker.onmessage = null;

				} else if (options.onProgress)
				{

					options.onProgress(data.progress);

				}

			};

			const index = geometry.index ? geometry.index.array : null;
			const position = geometry.attributes.position.array as Float32Array;

			// @ts-ignore
			if (position.isInterleavedBufferAttribute || index && index.isInterleavedBufferAttribute)
			{

				throw new Error('GenerateMeshBVHWorker: InterleavedBufferAttribute are not supported for the geometry attributes.');

			}

			const transferrables = [position];
			if (index)
			{

				transferrables.push(index as any);

			}

			worker.postMessage({

				index,
				position,
				options: {
					...options,
					onProgress: null,
					includedProgressCallback: Boolean(options.onProgress),
					groups: [...geometry.groups],
				},

			}, transferrables.map(arr => arr.buffer));

		});

	}

	dispose()
	{

		this.worker.terminate();
		this.worker = null;

	}

	terminate()
	{

		console.warn('GenerateMeshBVHWorker: "terminate" is deprecated. Use "dispose" instead.');
		this.dispose();

	}

}
