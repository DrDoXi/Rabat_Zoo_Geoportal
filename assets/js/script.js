// Adding mapbox basemap
// mapboxgl.accessToken = 'pk.eyJ1IjoiZHJpc3NkcmRveGkiLCJhIjoiY2xhbGVudjByMDFpeTN2a2R1N3o4ejFieCJ9.fScK3YiEEJcw0Dyuoscnew';
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FsYWhlbGZhcmlzc2kiLCJhIjoiY2ttb3p1Yzk3Mjl2bzJ2bno3OGlqcjJ2bCJ9.pErPZNgS_t5jzHlsp_XyRQ';
// pk.eyJ1Ijoic2FsYWhlbGZhcmlzc2kiLCJhIjoiY2ttb3p1Yzk3Mjl2bzJ2bno3OGlqcjJ2bCJ9.pErPZNgS_t5jzHlsp_XyRQ
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
	minZoom: 14,
	maxZoom: 20
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
	
function forwardGeocoder(query) {
	const matchingFeatures = [];
	for (const feature of customData.features) {
	// Handle queries with different capitalization
	// than the source data by calling toLowerCase().
	if (
	feature.properties.Name
	.toLowerCase()
	.includes(query.toLowerCase())
	) {
	// Add a tree emoji as a prefix for custom
	// data results using carmen geojson format:
	// https://github.com/mapbox/carmen/blob/master/carmen-geojson.md
	feature['place_name'] = `🐾 ${feature.properties.Name}`;
	feature['center'] = feature.geometry.coordinates;
	feature['place_type'] = ['park'];
	matchingFeatures.push(feature);
	}
	}
	return matchingFeatures;
	}


// Add the control to the map.
map.addControl(
	new MapboxGeocoder({
	accessToken: mapboxgl.accessToken,
	localGeocoder: forwardGeocoder,
	zoom: 19,
	placeholder: 'Enter search e.g. Giraffe',
	mapboxgl: mapboxgl,
	limit:5,
	marker :false
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
			'Vautours',
			'Dromadaire',
			'Perroquet',
			'Bovin',
			'Mouton soay',
			'Mouflon à manchette',
			'Chévre',
			'Tortue sulcata',
			'Lion Blanc',
			'Poule geante',
			'Ecureuil',
			'Cerf',
			'Renard',
			'Singe magot',
			'Autruche Africaine',
			'Autruche à coup rouge',
			'Oryx beisa',
			'Buffle',
			'Chimpanzé',
			'Cobe lechwé',
			'Addax',
			'Lycaon',
			'Babouin',
			'Gazelle thomson',
			'Cigogne blanche',
			'Daim européen',
			'émeus',
			'Flamant rose',
			'Mandrill',
			'Gazelle dorcas',
			'Perruche',
			'Mangouste',
			'Mangouste rayée',
			'Cygens',
			'Cygnes noirs',
			'Paon',
			'Poney',
			'Fennec',
			'Ibis chauve',
			'Canards',
			'Loutre',
			'Pélican',
			'Rapaces',
			'Buse',
			'Watussi',
			'Porc-épic',
			'Genette',
			'Vrai Roux',
			'Serval',
			'Lémur catta'
			
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
		content=document.getElementsByTagName('main')[0] ;

		content.innerHTML='';

		var new_p = document.createElement("p");
		new_p.style='text-align: center;';
        new_p.innerHTML = e.features[0].properties.img
        content.appendChild(new_p);

		var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Nom :'+'</strong>'+'<br>'+ e.features[0].properties.Name
        content.appendChild(new_p);

		var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Nom scientifique :'+'</strong>'+'<br>'+ e.features[0].properties.Nom_scientifique
        content.appendChild(new_p);

        var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Classe :'+'</strong>'+'<br>'+e.features[0].properties.Classe
        content.appendChild(new_p);

        var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Famille :'+'</strong>'+'<br>'+e.features[0].properties.Famille
        content.appendChild(new_p);

        var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Longueur :'+'</strong>'+'<br>'+e.features[0].properties.Longueur
        content.appendChild(new_p);

        var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Régime :'+'</strong>'+'<br>'+e.features[0].properties.Régime
        content.appendChild(new_p);

        var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Gestation :'+'</strong>'+'<br>'+e.features[0].properties.Gestation
        content.appendChild(new_p);

        var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Répartition :'+'</strong>'+'<br>'+e.features[0].properties.Répartition
        content.appendChild(new_p);

		var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Statut :'+'</strong>'+'<br>'+e.features[0].properties.Statut
        content.appendChild(new_p);

        var new_p = document.createElement("p");
        new_p.innerHTML = '<strong style='+'color:'+'#38837b'+'>'+'Longévité :'+'</strong>'+'<br>'+e.features[0].properties.Longévité
        content.appendChild(new_p);

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
				popup.remove();
				map.flyTo({
					essential: true, // this animation is considered essential with respect to prefers-reduced-motion
					center: [ -6.8932888, 33.954826 ],
					zoom: 16,
					pitch: 40,
					bearing: 220,
					duration: 5000
				});
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

document.getElementsByClassName('nav__item')[1].addEventListener('click', () => {
	document.getElementsByTagName('main')[0].innerHTML='<iframe src="https://ticket.rabatzoo.ma/" ></iframe>';
	setSheetHeight(window.innerHeight);
	setIsSheetShown(true);
});

document.getElementsByClassName('nav__item')[2].addEventListener('click', () => {
	setSheetHeight(Math.min(0, 720 / window.innerHeight * 100));
	setIsSheetShown(false);
});

document.getElementsByClassName('nav__item')[4].addEventListener('click', () => {
	document.getElementsByTagName('main')[0].innerHTML='<iframe src="https://drdoxi.github.io/Resume/" ></iframe>';
	setSheetHeight(window.innerHeight);
	setIsSheetShown(true);
});

document.getElementsByClassName('nav__item')[3].addEventListener('click', () => {
	// document.getElementsByTagName('main')[0].innerHTML='<iframe src="grid_imgs/index.html" ></iframe>';
	document.getElementsByTagName('main')[0].innerHTML='<article class="flow"><div class="team"><ul class="auto-grid" role="list"></ul></div></article>';
	var animals={
		"type": "FeatureCollection",
		"name": "Animals",
		"crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
		"features": [
		{ "type": "Feature", "properties": { "Name": "Eléphant", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Eléphant-d_afrique-1-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.897321513447501, 33.9514314683992 ] } },
		{ "type": "Feature", "properties": { "Name": "Giraphe", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Girafe.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Giraffa camelopardalis", "Classe": "Mammifères", "Famille": "Giraffidés", "Longueur": "", "Régime": null, "Gestation": null, "Répartition": null }, "geometry": { "type": "Point", "coordinates": [ -6.898077978828276, 33.952131597882044 ] } },
		{ "type": "Feature", "properties": { "Name": "Lion de latlas", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/DSC_1061-600x600.jpg\" alt=\"Lion de l'Atlas\" width=\"200\" height=\"200\">", "Nom scientifique": "Panthera leo leo" }, "geometry": { "type": "Point", "coordinates": [ -6.898606567332478, 33.953035292528739 ] } },
		{ "type": "Feature", "properties": { "Name": "Lémur catta", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Lémur_catta.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Lemur catta" }, "geometry": { "type": "Point", "coordinates": [ -6.897991953620861, 33.953272592676448 ] } },
		{ "type": "Feature", "properties": { "Name": "Zébre", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Zèbre-de-grant-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Equus quagga bohemi" }, "geometry": { "type": "Point", "coordinates": [ -6.897971888247699, 33.952765866133575 ] } },
		{ "type": "Feature", "properties": { "Name": "Rhinocéros", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Rhinocéros-1-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Ceratotherium simum" }, "geometry": { "type": "Point", "coordinates": [ -6.897507687029755, 33.953944454265759 ] } },
		{ "type": "Feature", "properties": { "Name": "Watussi", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Watussi.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.897147055422114, 33.95255460615352 ] } },
		{ "type": "Feature", "properties": { "Name": "Babouin", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Babouin.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Papio anubis" }, "geometry": { "type": "Point", "coordinates": [ -6.896043436352688, 33.953558594299601 ] } },
		{ "type": "Feature", "properties": { "Name": "Addax", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Addax-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Addax nasomaculatus", "Classe": null }, "geometry": { "type": "Point", "coordinates": [ -6.895924026690253, 33.954836736342429 ] } },
		{ "type": "Feature", "properties": { "Name": "Oryx algazelle", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Oryx_algazelle.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.897175198544271, 33.954214630013517 ] } },
		{ "type": "Feature", "properties": { "Name": "Buffle", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Buffle.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.894992462111438, 33.951739648584152 ] } },
		{ "type": "Feature", "properties": { "Name": "Autruche à coup rouge", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Autruche%20Africaine.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Struthio camelus" }, "geometry": { "type": "Point", "coordinates": [ -6.896920462811277, 33.953262910202099 ] } },
		{ "type": "Feature", "properties": { "Name": "Lion Blanc", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Lion_Blanc.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.896897352745306, 33.954553885620278 ] } },
		{ "type": "Feature", "properties": { "Name": "Gazelle thomson", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/gazelle-m-600x600.png\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Gazelle dama", "Longueur": null, "Gestation": null }, "geometry": { "type": "Point", "coordinates": [ -6.896949683459092, 33.952909793044952 ] } },
		{ "type": "Feature", "properties": { "Name": "Flamant rose", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Flamant-Rose-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Phoenicopterus roseus" }, "geometry": { "type": "Point", "coordinates": [ -6.894221152882348, 33.953258001835771 ] } },
		{ "type": "Feature", "properties": { "Name": "Singe magot", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Singe-Magot-1-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null }, "geometry": { "type": "Point", "coordinates": [ -6.895334270949593, 33.954872061753925 ] } },
		{ "type": "Feature", "properties": { "Name": "émeus", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/émeus.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.894080343620834, 33.954566874881252 ] } },
		{ "type": "Feature", "properties": { "Name": "Poule geante", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Poule_geante.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.894001409414533, 33.954090740753976 ] } },
		{ "type": "Feature", "properties": { "Name": "Paon", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Paon.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.893802182784119, 33.954344053630699 ] } },
		{ "type": "Feature", "properties": { "Name": "Poney", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Poney-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.892180842150753, 33.953593685424671 ] } },
		{ "type": "Feature", "properties": { "Name": "Dromadaire", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/dromadaire.png\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.893003137323289, 33.953380143303519 ] } },
		{ "type": "Feature", "properties": { "Name": "Cygnes noirs", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Cygnes_noirs.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.892441686838461, 33.954048622043281 ] } },
		{ "type": "Feature", "properties": { "Name": "Daim européen", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Daim.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.891922127517889, 33.954037422649229 ] } },
		{ "type": "Feature", "properties": { "Name": "Chévre", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Chèvre-nain-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Capra hircus" }, "geometry": { "type": "Point", "coordinates": [ -6.891875154690251, 33.953723830851921 ] } },
		{ "type": "Feature", "properties": { "Name": "Perruche", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Perruche.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.893210170756049, 33.953853300871415 ] } },
		{ "type": "Feature", "properties": { "Name": "Mouton soay", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Mouton_soay.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.893645170224637, 33.953800544963158 ] } },
		{ "type": "Feature", "properties": { "Name": "Perroquet", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Perroquet.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Psittacus erithacus" }, "geometry": { "type": "Point", "coordinates": [ -6.89283858870969, 33.954206035568127 ] } },
		{ "type": "Feature", "properties": { "Name": "Canards", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Canards.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.892465959279849, 33.953838192767634 ] } },
		{ "type": "Feature", "properties": { "Name": "Bovin", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Bovin.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.89273288382914, 33.953440459941362 ] } },
		{ "type": "Feature", "properties": { "Name": "Mouflon à manchette", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Mouflons-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Ammotragus lervia" }, "geometry": { "type": "Point", "coordinates": [ -6.894703286301524, 33.954549165019102 ] } },
		{ "type": "Feature", "properties": { "Name": "Hippopotame", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Hippopotame-1-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Hippopotamus amphibius" }, "geometry": { "type": "Point", "coordinates": [ -6.894583725553247, 33.952444024608432 ] } },
		{ "type": "Feature", "properties": { "Name": "Crocodile", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Crocodile-1-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Crocodylus niloticus" }, "geometry": { "type": "Point", "coordinates": [ -6.894850536549303, 33.952299211653568 ] } },
		{ "type": "Feature", "properties": { "Name": "Pélican", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Pélican.jpeg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.895189490788648, 33.952349452445347 ] } },
		{ "type": "Feature", "properties": { "Name": "Canards", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Canards.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.89452753669388, 33.952802305454547 ] } },
		{ "type": "Feature", "properties": { "Name": "Loutre", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Loutre.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.894290391113994, 33.953006389476329 ] } },
		{ "type": "Feature", "properties": { "Name": "Cygens", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Cygens.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.894579413324924, 33.953536528137036 ] } },
		{ "type": "Feature", "properties": { "Name": "Vrai Roux", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Vrai_Roux.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.893889308919515, 33.953146080794632 ] } },
		{ "type": "Feature", "properties": { "Name": "Chimpanzé", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Chimpanzé-1-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Pan troglodytes" }, "geometry": { "type": "Point", "coordinates": [ -6.89416405214386, 33.951994680207243 ] } },
		{ "type": "Feature", "properties": { "Name": "Cobe lechwé", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Cobe-lechwe-1-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.894959829526456, 33.953206747742833 ] } },
		{ "type": "Feature", "properties": { "Name": "Ibis chauve", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Ibis-Chauve-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Geronticus eremita" }, "geometry": { "type": "Point", "coordinates": [ -6.893199987724175, 33.952423611766108 ] } },
		{ "type": "Feature", "properties": { "Name": "Cerf", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Cerf.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.893488723723625, 33.953466074619946 ] } },
		{ "type": "Feature", "properties": { "Name": "Mandrill", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Mandrill.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Mandrillus sphinx" }, "geometry": { "type": "Point", "coordinates": [ -6.896355934891602, 33.951601534186196 ] } },
		{ "type": "Feature", "properties": { "Name": "Panthére", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Panthére.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.89663548312604, 33.951504493580003 ] } },
		{ "type": "Feature", "properties": { "Name": "Vautours", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Vautour-fauve-1-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Gyps fulvus" }, "geometry": { "type": "Point", "coordinates": [ -6.896632355848397, 33.952141361871469 ] } },
		{ "type": "Feature", "properties": { "Name": "Fennec", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/fenenc-e1545643887672-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Vulpes zerda", "Classe": "Mammifères", "Famille": "Canidés", "Répartition": null, "Statut": "Rare – Protégé" }, "geometry": { "type": "Point", "coordinates": [ -6.896195072026975, 33.954183883971773 ] } },
		{ "type": "Feature", "properties": { "Name": "Porc-épic", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Porc-épic.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.896033211907156, 33.954224579955728 ] } },
		{ "type": "Feature", "properties": { "Name": "Hyène rayée", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Hyène_rayée.jpg\" alt=\"\" width=\"200\" height=\"200\">" }, "geometry": { "type": "Point", "coordinates": [ -6.896669632192058, 33.952407277708915 ] } },
		{ "type": "Feature", "properties": { "Name": "Oryx beisa", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Oryx-beisa-2-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Oryx beisa" }, "geometry": { "type": "Point", "coordinates": [ -6.896543036997123, 33.954068098339157 ] } },
		{ "type": "Feature", "properties": { "Name": "Lycaon", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Lycaon-2-600x600.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": "Lycaon pictus" }, "geometry": { "type": "Point", "coordinates": [ -6.895967711859759, 33.953086632798993 ] } },
		{ "type": "Feature", "properties": { "Name": "Mangouste", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Mangouste.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.896288584756079, 33.954357369907115 ] } },
		{ "type": "Feature", "properties": { "Name": "Cigogne blanche", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Cigogne_blanche.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.896641275527356, 33.953056106974309 ] } },
		{ "type": "Feature", "properties": { "Name": "Autruche Africaine", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Autruche%20Africaine.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.897671704906049, 33.952983535304263 ] } },
		{ "type": "Feature", "properties": { "Name": "Tortue sulcata", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Tortue_sulcata.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.896253851995985, 33.952858264282 ] } },
		{ "type": "Feature", "properties": { "Name": "Mangouste rayée", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Mangouste_rayée.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.896544486980803, 33.95269121859058 ] } },
		{ "type": "Feature", "properties": { "Name": "Renard", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Renard.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.895161939038933, 33.954336946118879 ] } },
		{ "type": "Feature", "properties": { "Name": "Genette", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Genette.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.894826826519151, 33.954572341769627 ] } },
		{ "type": "Feature", "properties": { "Name": "Buse", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Buse.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.896769827357678, 33.952068268092546 ] } },
		{ "type": "Feature", "properties": { "Name": "Rapaces", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Rapaces.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.896946100661076, 33.951948582845873 ] } },
		{ "type": "Feature", "properties": { "Name": "Ecureuil", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Ecureuil.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.89642371161221, 33.952746998351842 ] } },
		{ "type": "Feature", "properties": { "Name": "Gazelle dorcas", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Gazelle_dorcas.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.896806944506035, 33.953913873975253 ] } },
		{ "type": "Feature", "properties": { "Name": "Serval", "img": "<img src=\"https:\/\/cdn.jsdelivr.net\/gh\/DrDoXi\/JZN_Animals@main\/Serval.jpg\" alt=\"\" width=\"200\" height=\"200\">", "Nom scientifique": null, "Classe": null, "Famille": null, "Longueur": null, "Régime": null, "Gestation": null, "Répartition": null, "Statut": null }, "geometry": { "type": "Point", "coordinates": [ -6.893228579934036, 33.95290939124753 ] } }
		]
		};
		grid = document.getElementsByClassName('auto-grid')[0];
		for (let i = 0; i < animals.features.length; i++) {
	
			new_li=document.createElement("li");
			a=document.createElement("a");
			a.className = "profile";
			new_h2=document.createElement("h2");
			new_h2.className = "profile__name";
			new_h2.innerText= animals.features[i].properties.Name;
			new_p=document.createElement("p");
			new_p.innerText= 'Savane';
			a.appendChild(new_h2);
			a.appendChild(new_p);
			new_li.appendChild(a);
			grid.appendChild(new_li);
			a.insertAdjacentHTML("beforeEnd",animals.features[i].properties.img);
			new_li.addEventListener("click", function() {
				setSheetHeight(Math.min(0, 720 / window.innerHeight * 100));
				setIsSheetShown(false);
				map.flyTo({
					essential: true, // this animation is considered essential with respect to prefers-reduced-motion
			
					center: animals.features[i].geometry.coordinates,
					zoom: 19,
					pitch: 39.01,
					bearing: -147.5,
					duration: 5000
				});
				;
			  });
		} 
	
	setSheetHeight(window.innerHeight);
	setIsSheetShown(true);
});

