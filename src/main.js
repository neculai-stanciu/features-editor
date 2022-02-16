import 'ol/ol.css';
import Draw from 'ol/interaction/Draw';
import Map from 'ol/Map';
import View from 'ol/View';
import ImageLayer from 'ol/layer/Image';
import Projection from 'ol/proj/Projection';
import { getCenter, wrapX } from 'ol/extent';
import Static from 'ol/source/ImageStatic';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Feature } from 'ol';
import { GeoJSON } from 'ol/format'
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Select from 'ol/interaction/Select';
// import Fill from 'ol/style/Fill';
import {layers} from './layers.js'
import image002 from '../assets/image002.png';
import image007 from '../assets/image007.png';
import seats from '../assets/floor4_properties.json'

const typeSelect = document.getElementById('type');
const featuresWriteBtn = document.getElementById('features-write');
const floor1Btn = document.getElementById('floor1Btn');
const featuresTextarea = document.getElementsByClassName('features-content')[0];


document.getElementById("features-save").addEventListener('click',(_e) => {
  let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(featuresTextarea.value);
  let dlAnchorElem = document.getElementById('downloadAnchorElem');
  dlAnchorElem.setAttribute("href",     dataStr     );
  dlAnchorElem.setAttribute("download", "scene.json");
  dlAnchorElem.click();
});



const createImageLayer = function(imageInfo) {
  const extent = [0,0,imageInfo.width, imageInfo.height];
  const projection = new Projection({
    code: 'xkcd-image',
    units: 'pixels',
    extent: extent,
  });

  const imageLayer = new ImageLayer({
    source: new Static({
      attributions: '© <a href="https://xkcd.com/license.html">xkcd</a>',
      url: image002,
      projection: projection,
      imageExtent: extent,
    })
  });


  const imageView = new View({
    projection: projection,
    center: getCenter(extent),
    zoom: 2,
    maxZoom: 8,
  });
  
  return [imageLayer, imageView];
}

// let getData = function(url, cb) {
//   fetch(url)
//   .then(r => r.json())
//   .then(r => cb(r))
// }
// let seatsJson;
//
// getData(seats, data => { seatsJson = data});

let [imageLayer, imageView] = createImageLayer(layers[0]);

const source = new VectorSource({
  wrapX: false,
  features: new GeoJSON().readFeatures(seats)
});

const vector = new VectorLayer({
  source: source,
});

const map = new Map({
  layers: [imageLayer, vector],
  target: 'map',
  view: imageView, 
});

const selected = new Style({
  stroke: new Stroke({
    color: 'rgba(255, 0, 0, 0.7)',
    width: 2,
  }),
});
function selectStyle(feature) {
  const color = feature.get('COLOR') || '#eeeeee';
  // selected.getFill().setColor(color);
  return selected;
}

let selectInteraction = new Select({
  style: selectStyle 
});

map.addInteraction(selectInteraction);

let selectedFeature = null;

let displayFeatureInfo = function(pixel) {
  let features = [];
  map.forEachFeatureAtPixel(pixel, function(feature, _layer) {
    features.push(feature);
  });
  if(features.length > 0) {
    // if(!features[0].getId()) {
    //   let featureId = prompt("What whould be the id of this object: ");
    //   features[0].setId(new String(featureId));
    // }
    // features[0].setProperties({"id": "test2"});
    selectedFeature = features[0];
  
    const featureIdTxt = document.querySelector("#featureId");
    const propertiesContentJson = document.querySelector("#propertiesContent");
    
    if(features[0].getProperties() && features[0].getProperties()['properties']) {

      const customId = features[0].getProperties()["properties"]["customId"];
      featureIdTxt.value = customId?customId:"";
      const jsonStr = JSON.stringify(features[0].getProperties()["properties"]["customProperties"], null, 2);
      propertiesContentJson.value = features[0].getProperties()["properties"]["customProperties"] ? jsonStr : "";

    console.log("Selected feature customProperties are ", 
      selectedFeature.getProperties()["properties"]["customId"]);
    }

    // let geom = [];
    // geom.push(new Feature(features[0].getGeometry().clone()));

    // const writer = new GeoJSON();
    // const geoJsonObj = JSON.parse(writer.writeFeatures(geom));
    // alert("Selected feature" + JSON.stringify(features[0].getProperties(), null, 2));
  }
}

map.on('click', function(evt){
     const pixel = evt.pixel
     displayFeatureInfo(pixel)
});

document.querySelector("#saveId").addEventListener('click', e => {
  console.log("Clicked saved");
  if(!selectedFeature) {
    alert("Please select an object from the map!");
  }
  let featureIdTxt = document.querySelector("#featureId");
  let propertiesContentJson = document.querySelector("#propertiesContent");
  if(!featureIdTxt.value && !propertiesContentJson.value) {
    alert("Please fill id or properties json textarea");
  }
  try {
    if(!propertiesContentJson.value || propertiesContentJson.value == "") {
      selectedFeature.setProperties({ "properties": { "customId": featureIdTxt.value } });
      selectedFeature.setId(featureIdTxt.value);
    } else {
      const properties = JSON.parse(propertiesContentJson.value);
      selectedFeature.setProperties({
        "properties": {
          "customId": featureIdTxt.value,
          "customProperties": properties
        }
      });

      selectedFeature.setId(featureIdTxt.value);
    }

  } catch(_ex) {
    alert("Not a valid json in Properties area");
  }
  
});

document.querySelector("#deleteFeature").addEventListener('click', e => {
  console.log("Clicked delete");

  if(!selectedFeature) {
    alert("Please select an object from the map!");
  }
  selectedFeature.setId("deleteFeature");
  source.removeFeature(selectedFeature);
});


featuresWriteBtn.addEventListener('click', (_e) => {
  let geom = [];
  const features = vector.getSource().forEachFeature(function(feature){
    const customId = feature.getProperties()["properties"]["customId"];
    const customProperties = feature.getProperties()["properties"]["customProperties"];

    geom.push(new Feature({
      geometry: feature.getGeometry().clone(),
      properties: {
        "customId": customId ? customId : "",
        "customProperties": customProperties ? customProperties : "",
      }
    }));
  });
  const writer = new GeoJSON();
  const geoJsonObj = JSON.parse(writer.writeFeatures(geom));
  featuresTextarea.value = JSON.stringify(geoJsonObj, null, 2);
});

let draw; // global so we can remove it later
function addInteraction() {
  const value = typeSelect.value;
  if (value !== 'None') {
    draw = new Draw({
      source: source,
      type: typeSelect.value,
    });
    map.addInteraction(draw);
  }
}

/**
 * Handle change event.
 */
typeSelect.onchange = function () {
  map.removeInteraction(draw);
  addInteraction();
};

document.getElementById('undo').addEventListener('click', function () {
  draw.removeLastPoint();
});

addInteraction();
