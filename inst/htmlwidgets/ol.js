// define ol to use strict mode
var ol = window.ol;

(function() {"use strict"; // anonymos start
  var debug = {};

  debug.active = false;

  debug.log = function() {
    if (this.active) console.log.apply(console, arguments);
  };

  // vector tiles (used in vector tiles debug mode)
  var vt = {};

  vt.defaultColor = "#990000";

  // TODO: remove mapzen because service is shut down!
  vt.mapzenAndMapboxColors = {
    // mapzen (kind)
    major_road: "blue",
    minor_road: "green",
    // mapbox (class)
    primary: "blue",
    secondary: "green",
    street: "yellow",
    pedestrian: "grey"
  };

  // TODO: remove mapzen because service is shut down!
  debug.vectorTiles = function(layer) {
    if (olWidget.options.debugVT) {
      //layer.setStyle(freakyStyley.getStyleFunction_("class", vt.mapzenAndMapboxColors));
      layer.setStyle(function(feature, resolution) { // style function start
        console.log(feature.getProperties());
        var key = feature.get("kind") || feature.get("class");
        var color = vt.mapzenAndMapboxColors[key] || vt.defaultColor;
        return new ol.style.Style({
          stroke: new ol.style.Stroke({ color: color, width: 2 })
        });
      }); // style function end
    }
  };

  var olWidget = window.olWidget = {};

  olWidget.element = null;

  olWidget.options = {
    debug: false,
    renderer: "canvas",
    minZoom: undefined,
    maxZoom: undefined,
    maxZoomFit: 16,
    collapsibleAttribution: false,
    zoomControl: true,
    // TODO: use base64
    markerIcon: "http://openlayers.org/en/v4.2.0/examples/data/icon.png"
  };

  // help(ers) as an homage to the Beatles
  var helpMe = {};

  helpMe.getLayers = function(map) {
    return map.getLayers().getArray();
  };

  helpMe.getLayerByName = function(map, layerName) {
    var layer = this.getLayers(map).filter(function(layer) {
      return layer.get("name") === layerName;
    });
    return layer;
  };

  // TODO: obsolete? remove!
  helpMe.addTileLayer = function(map, source, options){
    options.source = source;
    map.addLayer(new ol.layer.Tile(options));
  };

  helpMe.setFeatureIds = function(features) {
    features.forEach(function(feature, i) {
      debug.log("set feature id: ", i);
      feature.setId(i);
    });
  };

  helpMe.setFeatureProperties = function(features, propertyName, values) {
    for (var i = 0; i < features.length; ++i) {
        var value = values instanceof Array ? values[i] : values;
        debug.log(value);
        features[i].set(propertyName, value);
    }
  };

  helpMe.getFeaturesFromGeojson = function(data) {
    var format = new ol.format.GeoJSON();
    var features = format.readFeatures(data, {
      // TODO: get projection from data source
      dataProjection: "",
      featureProjection: "EPSG:3857"
    });
    this.setFeatureIds(features);
    return features;
  };

  helpMe.addContainer = function(containerId, el) {
    el = el || olWidget.element;
    var container = document.createElement("div");
    container.setAttribute("id", containerId);
    el.parentElement.insertBefore(container, el.nextSibling);
    return container;
  };

  helpMe.getFeatureProperties = function(feature) {
    var properties = { id: feature.getId() };
    feature.getKeys().forEach(function(key) {
      if (key !== "geometry") properties[key] = feature.get(key);
    });
    debug.log("feature properties:", properties);
    return properties;
  };

  helpMe.dragAndDrop = function(targetElement, callback) {
    // disable default drag & drop functionality
    targetElement.addEventListener("dragenter", function(e){ e.preventDefault(); });
    targetElement.addEventListener("dragover",  function(e){ e.preventDefault(); });
    targetElement.addEventListener("drop", function(event) {
      var reader = new FileReader();
      reader.onloadend = function() {
        var data = JSON.parse(this.result);
        callback(data);
      };
      var f = event.dataTransfer.files[0];
      reader.readAsText(f);
      event.preventDefault();
    });
  };

  // style helpers as a homage to the RHCP
  var freakyStyley = {};

  // should/can be used to style vector tiles
  // (used as 'hidden' feature in 'addVectorTiles')
  freakyStyley.getStyleFunction_ = function(property, colors) {
    return function(feature, resolution) {
      var color = colors[feature.get(property)] || "black";
      return new ol.style.Style({
          stroke: new ol.style.Stroke({ color: color, width: 2 })
        });
    };
  };

  freakyStyley.getOptionValue = function(feature, style, option) {
    return style[option] instanceof Array ?
      style[option][feature.getId()] : style[option];
  };

  freakyStyley.fill = function(options, feature) {
    return options ? new ol.style.Fill({
      color: this.getOptionValue(feature, options, "color")
    }) : undefined;
  };

  freakyStyley.stroke = function(options, feature) {
    return options ? new ol.style.Stroke({
      color: this.getOptionValue(feature, options, "color"),
      width: options.width
    }) : undefined;
  };

  freakyStyley.circle = function(options, feature) {
    return new ol.style.Circle({
      stroke: this.stroke(options.stroke, feature),
      fill: this.fill(options.fill, feature),
      radius: this.getOptionValue(feature, options, "radius")
    });
  };

  freakyStyley.getTextValue = function(options, feature) {
    return options.property ? String(feature.get(options.property)) :
      this.getOptionValue(feature, options, "text");
  };

  freakyStyley.text = function(options, feature) {
    return options ? new ol.style.Text({
      //font: "bold 12px Ubuntu",
      text: this.getTextValue(options, feature),
      scale: options.scale || 1, // TODO: use olWidget.options to set default value
      stroke: this.stroke(options.stroke, feature),
      fill: this.fill(options.fill, feature),
      offsetX: options.offsetX,
      offsetY: options.offsetY
      }) : undefined;
  };

  freakyStyley.icon = function(options, feature) {
    return new ol.style.Icon({
      src: options.src || olWidget.options.markerIcon,
      anchor: options.anchor || undefined,
      anchorOrigin: "top-left",
      color: this.getOptionValue(feature, options, "color") || undefined
    });
  };

  var styleIt = function(style) {
    return function(feature, resolution) {
      var style_ = new ol.style.Style({
        stroke: freakyStyley.stroke(style.stroke, feature),
        fill: freakyStyley.fill(style.fill, feature),
        text: freakyStyley.text(style.text, feature)
      });
      if (style.circle) {
        style_.setImage(freakyStyley.circle(style.circle, feature));
      }
      else if (style.marker) {
        style_.setImage(freakyStyley.icon(style.marker, feature));
      }
      return style_;
    };
  };

  // use this function to apply style depending on resolution
  // NOT USED at the moment
  var _styleIt = function(style) {
    var res_test = 4000;
    console.log("using _styleIt!");
    return function(feature, resolution) {
      return resolution < res_test ? styleIt(style)(feature, resolution) : null;
    };
  };

  // methods to be invoked from R, this = map object!
  var methods = olWidget.methods = {};

  methods.setView = function(lon, lat, zoom) {
    this.setView(new ol.View({
      center: ol.proj.fromLonLat([lon, lat]),
      zoom: zoom
    }));
  };

  // options: opacity, [title, type] used by layer switcher
  var getTileOptions = function(options, source) {
    options = options || {};
    options.source = source;
    options.preload = true;
    options.title = options.name || undefined; // title is used in layer switcher plugin
    return options;
  };

  methods.addStamenTiles = function(layer, options) {
    var source = new ol.source.Stamen({ layer: layer });
    options = getTileOptions(options, source);
    this.addLayer(new ol.layer.Tile(options));
  };

  methods.addOSMTiles = function(options) {
    var source = new ol.source.OSM();
    options = getTileOptions(options, source);
    this.addLayer(new ol.layer.Tile(options));
  };

  methods.addXYZTiles = function(xyz_url, attribution, options) {
    var source = new ol.source.XYZ({
      url: xyz_url,
      attributions: attribution || null
    });
    options = getTileOptions(options, source);
    this.addLayer(new ol.layer.Tile(options));
  };

  methods.addWMSTiles = function(url, params, attributions, options) {
    params.TILED = true;
    debug.log(params);
    var source = new ol.source.TileWMS({
      url: url,
      params: params,
      attributions: attributions || undefined,
      hidpi: false
    });
    options = getTileOptions(options, source);
    this.addLayer(new ol.layer.Tile(options));
  };

  // not used at the moment,
  // same as above for servers providing single images
  methods.addWMS = function(url, params, attributions) {
    var source = new ol.source.ImageWMS({
      url: url,
      params: params,
      attributions: attributions || undefined,
      hidpi: false
    });
    this.addLayer(new ol.layer.Image({ source: source }));
  };

  // supported formats:
  // MVT (mapbox vector tile), GeoJSON and TopoJSON
  methods.addVectorTiles = function(url, attribution, style, options, format) {
    format = format || "MVT";
    var source = new ol.source.VectorTile({
      format: new ol.format[format](),
      //tileGrid: ol.tilegrid.createXYZ({ maxZoom: 22 }),
      url: url,
      attributions: attribution
    });
    //var layer = new ol.layer.VectorTile({ source: source });
    options = getTileOptions(options, source);
    var layer = new ol.layer.VectorTile(options);
    // hidden feature start
    if (style && style.property) {
      layer.setStyle(freakyStyley.getStyleFunction_(style.property, style.colors));
    } // hidden feature end
    else if (style) {
      var style_ = typeof(style) === "function" ? style : styleIt(style);
      layer.setStyle(style_);
    }
    debug.vectorTiles(layer);
    this.addLayer(layer);
  };

  var callbacks = {};

  callbacks.renderFeatureProperties = function(properties) {
    var text = Object.keys(properties).map(function(key){
        return "<b>" + key + ":</b> " + properties[key];
      }).join(", ");
    text = "<div style='padding: 10px;'>" + text + "</div>";
    return text;
  };

  callbacks.renderPopup = function(feature, overlay, text) {
    debug.log("popup text:", text);
    overlay.getElement().innerHTML = text;
    var geometry = feature.getGeometry();
    var extent = geometry.getExtent();
    var anchor = ol.extent.getCenter(extent);
    var offset = geometry.getType() === "Point" ? [0, -50] : [0, 0];
    overlay.setOffset(offset);
    overlay.setPosition(anchor);
  };

  // Move to 'helpMe'
  var displayFeatureProperties = function(properties) {
    var containerId = "selected-feature";
    // var container = document.getElementById(containerId) || helpMe.addContainer(containerId);
    var container = document.getElementById(containerId) || propertiesElement();
    container.innerHTML = properties ? callbacks.renderFeatureProperties(properties) : "";
  };

  // TODO: remove?
  var addSelectListener = function(options) {
    return function(e) {
      // not implemented yet
    };
  };

  methods.addSelect = function(options, layers) {
    var condition = options.condition || "pointerMove";
    var select = new ol.interaction.Select({
      condition: ol.events.condition[condition],
      layers: layers // if undefined all layers are selectable!
    });
    this.addInteraction(select);
    // TODO: put to seperate function?
    select.on("select", function(e) {
      var feature = e.target.getFeatures().item(0);
      var properties = null;
      if (feature) {
        properties = helpMe.getFeatureProperties(feature);
      }
      // Pass feature properties back to R
      if (HTMLWidgets.shinyMode) {
        Shiny.onInputChange(olWidget.element.id + "_select", properties);
      }
      if (options.displayProperties) {
          displayFeatureProperties(properties);
      }
    });
  };

  methods.addGeojson = function(data, style, popup, options) {
    var features = helpMe.getFeaturesFromGeojson(data);
    var dataSource = new ol.source.Vector({
      features: features
    });
    options = options || {};
    options.source = dataSource;
    options.name = options.docker ? getDockerContainerName() : options.name || undefined;
    var layer = new ol.layer.Vector(options);
    layer.set("title", layer.get("name"));
    if (style) {
      var style_ = typeof(style) === "function" ? style : styleIt(style);
      layer.setStyle(style_);
    }
    this.addLayer(layer);
    // Add popup text to features
    if (popup) {
      helpMe.setFeatureProperties(features, "popup", popup);
      layer.set("popupProperty", "popup");
    }
    // TODO: fit should be optional
    this.getView().fit(dataSource.getExtent(), {
      maxZoom: olWidget.options.maxZoomFit
    });
    debug.log("properties:", layer.getProperties());
    debug.log("zoom:", this.getView().getZoom());
    debug.log("resolution:", this.getView().getResolution());
  };

  // TODO: check how to set feature ids
  methods.addGeojsonFromUrl = function(url) {
    var dataSource = new ol.source.Vector({
      url: url,
      format: new ol.format.GeoJSON()
    });
    var layer = new ol.layer.Vector({
      source: dataSource,
    });
    this.addLayer(layer);
  };

  // TODO: maybe move to 'helpMe'
  // offset and position are optional
  methods.addOverlay = function(containerId, offset, position) {
    var el = helpMe.addContainer(containerId);
    // el.setAttribute("style", "background: white; padding: 10px; border-radius: 10px;");
    var overlay = new ol.Overlay({
      element: el,
      positioning: 'bottom-center',
      offset: offset || [0, -50],
      autoPan: true,
      position: position || undefined
    });
    this.addOverlay(overlay);
    return overlay;
  };

  var legendElement = function() {
    var el = window.el_legend = document.createElement("div");
    el.setAttribute("class", "legend legend-overlay");
    document.getElementsByClassName("ol-overlaycontainer")[0].append(el);
    return el;
  };

  var legendElement_ = function() {
    var el = window.el_legend = helpMe.addContainer("legend");
    el.setAttribute("class", "legend");
    return el;
  };

  methods.addLegend = function(colors, labels, title, style, overlay) {
    var el = overlay ? legendElement() : legendElement_();
    if (style) Object.assign(el.style, style); // el.setAttribute("style", style);
    el.innerHTML = title ? "<b>" + title + "</b></br><br>" : "";
    for (var i = 0; i < colors.length; i++) {
      el.innerHTML += "<i style='background:" + colors[i] + ";'></i>" + labels[i] + "</br>";
    }
  };

  // TODO: same as for legend: refactor it!
  var propertiesElement = function() {
    var el = window.el_properties = document.createElement("div");
    el.id = "selected-feature";
    // el.setAttribute("class", "properties-overlay");
    document.getElementsByClassName("ol-overlaycontainer")[0].append(el);
    return el;
  };

  HTMLWidgets.widget({
    name: 'ol',
    type: 'output',

    factory: function(el, width, height) {
      olWidget.element = el;

      var map = null;

      return {
        renderValue: function(x) { // renderValue start
          debug.active = x.options.debug;

          debug.log("Welcome to the machine!");
          debug.log(getDockerContainerName());
          debug.log("passed options:", x.options);

          // TODO: move to helper func, set null to undefined
          for (var key in x.options) {
            olWidget.options[key] = x.options[key] === null ? undefined : x.options[key];
          }

          debug.log("current options:", olWidget.options);

          // create map object
          map = new ol.Map({
            target: el.id,
            controls: ol.control.defaults({
              zoom: olWidget.options.zoomControl,
              attributionOptions:  /** @type {olx.control.AttributionOptions} */ ({
                collapsible: olWidget.options.collapsibleAttribution
              })
            }),
            view: new ol.View({
              center: [0, 0],
              zoom: 2,
              minZoom: olWidget.options.minZoom,
              maxZoom: olWidget.options.maxZoom
            }),
            renderer: olWidget.options.renderer,
            loadTilesWhileAnimating: true
          });

          // add overlay container to show popups
          var popupOverlay = methods.addOverlay.call(map, "popup-container");
          // close popup on click event
          popupOverlay.getElement().addEventListener('click', function() {
            popupOverlay.setPosition();
          });

          map.on("singleclick", function(e) {
            var coordinate = ol.proj.transform(
              e.coordinate, "EPSG:3857", "EPSG:4326");
            debug.log("xy:", coordinate);
            var coordHDMS = ol.coordinate.toStringHDMS(coordinate);
            // pass coordinate back to R
            if (HTMLWidgets.shinyMode) {
              debug.log("Shiny mode!");
              var lnglat = { lng: coordinate[0], lat: coordinate[1], HDMS: coordHDMS };
              Shiny.onInputChange(el.id + "_click", lnglat);
            }
            // popup support
            // TODO: move to separate function?
            map.forEachFeatureAtPixel(e.pixel, function(feature, layer) {
              debug.log("layer name:", layer.get("name"));
              var popupProperty = layer.get("popupProperty");
              if(popupProperty) {
                var popupText = feature.get(popupProperty);
                callbacks.renderPopup(feature, popupOverlay, popupText);
              }
            });
          });

          // add scale line to map
          if (x.scale_line) {
            map.addControl(new ol.control.ScaleLine({
              units: x.scale_line.units
            }));
          }

          if (x.mouse_position) {
            map.addControl(new ol.control.MousePosition({
              coordinateFormat: ol.coordinate.createStringXY(4),
              projection: x.mouse_position.projection || "EPSG:4326"
            }));
          }

          if (x.overview_map) {
            map.addControl(new ol.control.OverviewMap({
              collapsed: x.overview_map.collapsed
            }));
          }

          if (x.full_screen) {
            map.addControl(new ol.control.FullScreen());
          }

          if (x.enable_drag_and_drop) {
            helpMe.dragAndDrop(el, function(data) {
              debug.log(data);
              if (!data.features) {
                console.log("no features found");
                return;
              }
              methods.addGeojson.call(map, data, null, null, {name: getDockerContainerName()});
            });
          }

          // execute calls
          debug.log("all calls:", x.calls);

          for (var i = 0; i < x.calls.length; ++i) {
            var call = x.calls[i];
            debug.log("current call:", call);
            methods[call.method].apply(map, call.args);
          }

          debug.log("layers:", helpMe.getLayers(map));
        }, // renderValue end

        resize: function(width, height) {
          // TODO: code to re-render the widget with a new size
        }
      };
    }
  });
})(); // anonymos end
