// Adding mapbox basemap
mapboxgl.accessToken = 'pk.eyJ1IjoiZHJpc3NkcmRveGkiLCJhIjoiY2xhbGVudjByMDFpeTN2a2R1N3o4ejFieCJ9.fScK3YiEEJcw0Dyuoscnew';

// Creating a map object
const map = new mapboxgl.Map({
	style: 'mapbox://styles/drissdrdoxi/cl8owuj4b001q14ph74dfszi9',
	center: [ -6.8932888, 33.954826 ],
	zoom: 16,
	pitch: 40,
	bearing: 220,
	container: 'map',
	antialias: true,
	attributionControl: false,
	minZoom: 10
});

// parameters to ensure the model is georeferenced correctly on the map
const modelOrigin = [ -6.894218, 33.955746 ];
const modelAltitude = 0;
const modelRotate = [ 0, 0, 0 ];

const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(modelOrigin, modelAltitude);

// transformation parameters to position, rotate and scale the 3D model onto the map
const modelTransform = {
	translateX: modelAsMercatorCoordinate.x,
	translateY: modelAsMercatorCoordinate.y,
	translateZ: modelAsMercatorCoordinate.z,
	rotateX: modelRotate[0],
	rotateY: modelRotate[1],
	rotateZ: modelRotate[2],
	/* Since the 3D model is in real world meters, a scale transform needs to be
         * applied since the CustomLayerInterface expects units in MercatorCoordinates.
         */
	scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
};

modelTransform.scale = 0.2017080146240745e-8;

const THREE = window.THREE;

// configuration of the custom layer for a 3D model per the CustomLayerInterface
const customLayer = {
	id: '3d-model',
	type: 'custom',
	renderingMode: '3d',
	onAdd: function(map, gl) {
		this.camera = new THREE.Camera();
		this.scene = new THREE.Scene();

		// create two three.js lights to illuminate the model
		const directionalLight = new THREE.DirectionalLight(0x9d8474);
		directionalLight.position.set(0, -70, 100).normalize();
		this.scene.add(directionalLight);

		const directionalLight2 = new THREE.DirectionalLight(0x9d8474);
		directionalLight2.position.set(0, 70, 100).normalize();
		this.scene.add(directionalLight2);

		// use the three.js GLTF loader to add the 3D model to the three.js scene
		const loader = new THREE.GLTFLoader();
		loader.load('assets/3D/lion_zoo.gltf', (gltf) => {
			this.scene.add(gltf.scene);
		});
		this.map = map;

		// use the Mapbox GL JS map canvas for three.js
		this.renderer = new THREE.WebGLRenderer({
			canvas: map.getCanvas(),
			context: gl,
			antialias: true
		});

		this.renderer.autoClear = false;
	},
	render: function(gl, matrix) {
		const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), modelTransform.rotateX);
		const rotationY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), modelTransform.rotateY);
		const rotationZ = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), modelTransform.rotateZ);

		const m = new THREE.Matrix4().fromArray(matrix);
		const l = new THREE.Matrix4()
			.makeTranslation(modelTransform.translateX, modelTransform.translateY, modelTransform.translateZ)
			.scale(new THREE.Vector3(modelTransform.scale, -modelTransform.scale, modelTransform.scale))
			.multiply(rotationX)
			.multiply(rotationY)
			.multiply(rotationZ);

		this.camera.projectionMatrix = m.multiply(l);
		this.renderer.resetState();
		this.renderer.render(this.scene, this.camera);
		this.map.triggerRepaint();
	}
};

const start = [ -6.894425, 33.955313 ];

// create a function to make a directions request
async function getRoute(end) {
	// make a directions request using cycling profile
	// an arbitrary start will always be the same
	// only the end or destination will change
	const query = await fetch(
		`https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
		{ method: 'GET' }
	);
	const json = await query.json();
	const data = json.routes[0];
	const route = data.geometry.coordinates;
	const geojson = {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'LineString',
			coordinates: route
		}
	};
	// if the route already exists on the map, we'll reset it using setData
	if (map.getSource('route')) {
		map.getSource('route').setData(geojson);
	} else {
		// otherwise, we'll make a new request
		map.addLayer({
			id: 'route',
			type: 'line',
			source: {
				type: 'geojson',
				data: geojson,
				lineMetrics: true
			},
			layout: {
				'line-join': 'round',
				'line-cap': 'round'
			},
			paint: {
				'line-color': 'red',
				'line-width': 10,
				'line-opacity': 1,
				'line-gradient': [ 'interpolate', [ 'linear' ], [ 'line-progress' ], 0, '#007acc', 1, '#001e32' ]
			}
		});
	}
	// add turn instructions here at the end
}

// map.addControl(new mapboxgl.FullscreenControl());
// Correcting for arabic text direction for street names
mapboxgl.setRTLTextPlugin(
	'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
	null,
	true // Lazy load the plugin
);

map.addControl(
	new mapboxgl.AttributionControl({
		customAttribution: "By Driss L'hamdochi"
	})
);


map.doubleClickZoom.disable();

map.on('load', () => {
	function addIconPlacement() {
		var animaux = [
			'Crocodile',
			'Panthére',
			'Oryx algazelle',
			'Eléphant',
			'Rhinocéros',
			'Giraphe',
			'Zébre',
			'Lion de latlas',
			'Hippopotame',
			'Hyène rayée',
			'Vautours'
		];
		var arrayLength = animaux.length;
		for (var i = 0; i < arrayLength; i++) {
			eval(
				"map.loadImage('./assets/img/icons/" +
					animaux[i] +
					".png',(error, image) => {if (error) throw error;map.addImage('" +
					animaux[i] +
					"', image);map.addLayer({'id':'" +
					animaux[i] +
					"','type': 'symbol','source': 'Animals','filter': ['==', 'Name', '" +
					animaux[i] +
					"'],'layout': {'visibility': 'visible','icon-image': '" +
					animaux[i] +
					"','icon-size': 0.15},'minzoom': 10})})"
			);
		}
	}

	map.addSource('Animals', {
		type: 'geojson',
		data: './data/Animals.geojson'
	});

	map.addLayer({
		id: 'Animals',
		type: 'circle',
		source: 'Animals',
		paint: {
			'circle-radius': 10,
			'circle-color': '#5b94c6',
			'circle-opacity': 0
		}
	});

	map.addSource('Circuits', {
		type: 'geojson',
		data: './data/Circuits.geojson'
	});

	map.addLayer({
		id: 'Circuits1',
		type: 'fill',
		source: 'Circuits',
		filter: [ '==', 'id', '1' ],
		layout: {},
		paint: {
			'fill-color': '#ebba5a',
			'fill-opacity': 1
		}
	});

	map.addLayer({
		id: 'Circuits2',
		type: 'fill',
		source: 'Circuits',
		filter: [ '==', 'id', '2' ],
		layout: {},
		paint: {
			'fill-color': '#df413f',
			'fill-opacity': 1
		}
	});

	map.addLayer({
		id: 'Circuits3',
		type: 'fill',
		source: 'Circuits',
		filter: [ '==', 'id', '3' ],
		layout: {},
		paint: {
			'fill-color': '#85339d',
			'fill-opacity': 1
		}
	});

	map.addSource('wa', {
		type: 'geojson',
		data: './data/water.geojson'
	});

	map.addLayer({
		id: 'wa',
		type: 'fill',
		source: 'wa',
		layout: {},
		paint: {
			'fill-color': '#43a2e4', // blue color fill
			'fill-opacity': 0.8
		}
	});


	const popup = new mapboxgl.Popup({
		closeButton: false,
		closeOnClick: false,
		closeOnMove: true
	});

	map.on('mouseenter', 'Animals', (e) => {
		const coordinates = e.features[0].geometry.coordinates.slice();
		const img = e.features[0].properties.img;
		const Animal_name = e.features[0].properties.Name;

		html_in_popup =
			'<h2 style="font-family: Neucha, sans-serif; font-size: 1rem;">' +
			Animal_name +
			'</h2>' +
			img +
			'<button type="button" id="open-sheet" aria-controls="sheet">Show Details</button>' +
			'<button type="button" id="Direction_btn" aria-controls="sheet">Drirection</button>';

		while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
			coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
		}

		popup.setLngLat(coordinates).setHTML(html_in_popup).addTo(map);
		openSheetButton = $('#open-sheet');
		Direction_btn = $('#Direction_btn');
		try {
			openSheetButton.addEventListener('click', () => {
				setSheetHeight(Math.min(50, 720 / window.innerHeight * 100));
				setIsSheetShown(true);
			});
		} catch (err) {}
		document.getElementsByTagName('main')[0].innerHTML = '<iframe src=' + 'txxt.html' + '></iframe>';
		try {
			Direction_btn.addEventListener('click', () => {
				const coords = coordinates;
				const end = {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							properties: {},
							geometry: {
								type: 'Point',
								coordinates: coords
							}
						}
					]
				};
				if (map.getLayer('end')) {
					map.getSource('end').setData(end);
				} else {
					map.addLayer({
						id: 'end',
						type: 'circle',
						source: {
							type: 'geojson',
							data: {
								type: 'FeatureCollection',
								features: [
									{
										type: 'Feature',
										properties: {},
										geometry: {
											type: 'Point',
											coordinates: coords
										}
									}
								]
							}
						},
						paint: {
							'circle-radius': 10,
							'circle-color': '#f30'
						}
					});
				}
				getRoute(coords);
			});
		} catch (err) {}
	});

	map.on('click', 'Animals', (e) => {
		// Copy coordinates array.
		const coordinates = e.features[0].geometry.coordinates.slice();
		const img = e.features[0].properties.img;
		const Animal_name = e.features[0].properties.Name;

		html_in_popup =
			'<h2 style="font-family: Neucha, sans-serif; font-size: 1rem">' +
			Animal_name +
			'</h2>' +
			img +
			'<button type="button" id="open-sheet" aria-controls="sheet">Show Details</button>' +
			'<button type="button" id="Direction_btn" aria-controls="sheet">Drirection</button>';

		// Ensure that if the map is zoomed out such that multiple
		// copies of the feature are visible, the popup appears
		// over the copy being pointed to.
		while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
			coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
		}

		popup.setLngLat(coordinates).setHTML(html_in_popup).addTo(map);
		openSheetButton = $('#open-sheet');
		Direction_btn = $('#Direction_btn');
		try {
			openSheetButton.addEventListener('click', () => {
				setSheetHeight(Math.min(50, 720 / window.innerHeight * 100));
				setIsSheetShown(true);
			});
		} catch (err) {}

		try {
			Direction_btn.addEventListener('click', () => {
				const coords = coordinates;
				const end = {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							properties: {},
							geometry: {
								type: 'Point',
								coordinates: coords
							}
						}
					]
				};
				if (map.getLayer('end')) {
					map.getSource('end').setData(end);
				} else {
					map.addLayer({
						id: 'end',
						type: 'circle',
						source: {
							type: 'geojson',
							data: {
								type: 'FeatureCollection',
								features: [
									{
										type: 'Feature',
										properties: {},
										geometry: {
											type: 'Point',
											coordinates: coords
										}
									}
								]
							}
						},
						paint: {
							'circle-radius': 10,
							'circle-color': '#f30'
						}
					});
				}
				getRoute(coords);
			});
		} catch (err) {}
	});

	// map.on("mouseleave", "Animals", () => {
	//   popup.remove();
	// });

	addIconPlacement();

	getRoute(start);

	map.addLayer({
		id: 'point',
		type: 'circle',
		source: {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: {},
						geometry: {
							type: 'Point',
							coordinates: start
						}
					}
				]
			}
		},
		paint: {
			'circle-radius': 10,
			'circle-color': '#3887be'
		}
	});
	// this is where the code from the next step will go

	map.addSource('Constructions', {
		type: 'geojson',
		data: './data/Constructions.geojson'
	});

	map.addLayer({
		id: 'Constructions',
		type: 'fill-extrusion',
		source: 'Constructions',
		layout: {},
		paint: {
			// Get the `fill-extrusion-color` from the source `color` property.
			'fill-extrusion-color': '#795f47',

			// Get `fill-extrusion-height` from the source `height` property.
			'fill-extrusion-height': 4,

			// Get `fill-extrusion-base` from the source `base_height` property.
			'fill-extrusion-base': 0,

			// Make extrusions slightly opaque to see through indoor walls.
			'fill-extrusion-opacity': 0.9
		}
	});
});

document.getElementsByClassName('VillVisi')[0].addEventListener('click', () => {
	map.flyTo({
		essential: true, // this animation is considered essential with respect to prefers-reduced-motion
		center: [ -6.89442, 33.95529 ],
		zoom: 17.51,
		pitch: 39.01,
		bearing: -147.5,
		duration: 5000
	});
});

document.getElementsByClassName('FerPeda')[0].addEventListener('click', () => {
	map.flyTo({
		essential: true, // this animation is considered essential with respect to prefers-reduced-motion
		center: [ -6.89352, 33.95424 ],
		zoom: 18.43,
		pitch: 39.01,
		bearing: -147.5,
		duration: 5000
	});
});

document.getElementsByClassName('MonAtlas')[0].addEventListener('click', () => {
	map.flyTo({
		essential: true, // this animation is considered essential with respect to prefers-reduced-motion
		center: [ -6.89523, 33.95447 ],
		zoom: 18.25,
		pitch: 39.01,
		bearing: -147.5,
		duration: 5000
	});
});

document.getElementsByClassName('Des')[0].addEventListener('click', () => {
	map.flyTo({
		essential: true, // this animation is considered essential with respect to prefers-reduced-motion
		center: [ -6.89626, 33.95415 ],
		zoom: 18.23,
		pitch: 39.01,
		bearing: -147.5,
		duration: 5000
	});
});

document.getElementsByClassName('SavAfri')[0].addEventListener('click', () => {
	map.flyTo({
		essential: true, // this animation is considered essential with respect to prefers-reduced-motion
		center: [ -6.89804, 33.95265 ],
		zoom: 18.25,
		pitch: 39.01,
		bearing: -147.5,
		duration: 5000
	});
});

document.getElementsByClassName('Mare')[0].addEventListener('click', () => {
	map.flyTo({
		essential: true, // this animation is considered essential with respect to prefers-reduced-motion

		center: [ -6.89508, 33.95274 ],
		zoom: 18.25,
		pitch: 39.01,
		bearing: -147.5,
		duration: 5000
	});
});

document.getElementsByClassName('frotro')[0].addEventListener('click', () => {
	map.flyTo({
		essential: true, // this animation is considered essential with respect to prefers-reduced-motion

		center: [ -6.89416, 33.95218 ],
		zoom: 17.54,
		pitch: 39.01,
		bearing: -147.5,
		duration: 5000
	});
});

map.on('style.load', () => {
	map.addLayer(customLayer, 'waterway-label');
});
