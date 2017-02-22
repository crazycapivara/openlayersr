HTMLWidgets.widget({

  name: 'ol',

  type: 'output',

  factory: function(el, width, height) {

    // TODO: define shared variables for this instance
    var geojsonObject = {
        'type': 'FeatureCollection',
        'crs': {
          'type': 'name',
          'properties': {
            'name': 'EPSG:3857'
          }
        },
        'features': [{
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [0, 0]
          }
        }, {
          'type': 'Feature',
          'geometry': {
            'type': 'LineString',
            'coordinates': [[4e6, -2e6], [8e6, 2e6]]
          }
        }]
      };

    var map = new ol.Map({
      target: el.id
      //renderer: 'canvas'
    });
    //var map = new ol.Map(el);

    return {

      renderValue: function(x) {

        // TODO: code to render the widget, e.g.
        //el.innerText = x.message;
        console.log(x.func(10));

        // set view
        if(x.view){
          console.log(x.view);
          map.setView(
            new ol.View({
              center: ol.proj.fromLonLat([x.view.lon, x.view.lat]),
              zoom: x.view.zoom
            })
          );
        }

        // add osm tiles
        if(x.osm_tiles){
          map.addLayer(
            new ol.layer.Tile({source: new ol.source.OSM()})
          );
        }

        // add xyz tiles
        if(x.xyz_url){
          map.addLayer(
            new ol.layer.Tile({
              source: new ol.source.XYZ({url: x.xyz_url})
            })
          );
        }

        // add earthquakes
        // countries: https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson
        if(x.earthquakes_url){
          map.addLayer(
            new ol.layer.Vector({
              //title: 'Earthquakes',
              source: new ol.source.Vector({
                url: x.earthquakes_url,
                format: new ol.format.GeoJSON()
              })
            })
          );
        }

        // add geojson
        if(x.dsn){
          console.log(JSON.stringify(x.dsn));
          x.dsn = JSON.parse(x.dsn);
          console.log(x.dsn);
          console.log(geojsonObject);
          map.addLayer(
            new ol.layer.Vector({
              source: new ol.source.Vector({
                //defaultProjection :'EPSG:4326',
                //projection: 'EPSG:3857',
                //projection: "EPSG:4326",
                //url: x.dsn,
                //format: new ol.format.GeoJSON()
                features: (new ol.format.GeoJSON()).readFeatures(
                  x.dsn, {dataProjection: "",featureProjection: "EPSG:3857"})
                //features: (new ol.format.GeoJSON()).readFeatures(geojsonObject)
              })
            })
          );
        }

      },

      resize: function(width, height) {

        // TODO: code to re-render the widget with a new size

      }

    };
  }
});
