
define([
	    "dojo/_base/declare",
		"d3",
		"underscore",
		"dojo/json",
		"dojo/parser",
		"dojo/on",
		"dojo/_base/array",
		"dojo/_base/html",
		"dojo/_base/window",
		"dojo/query",
		"dojo/dom",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-attr",
		"dojo/dom-construct",
		"dojo/dom-geometry",
		"dojo/_base/fx",
		"dojo/fx",
		"dojox/fx",
		"dijit/registry",
		"dijit/layout/ContentPane",
		"dijit/form/HorizontalSlider",
		"dijit/form/HorizontalRuleLabels",
		"esri/layers/ArcGISDynamicMapServiceLayer",
		"esri/layers/ArcGISTiledMapServiceLayer",
		"esri/layers/FeatureLayer",
		"esri/layers/GraphicsLayer",
		"esri/graphic",
		"esri/geometry/Extent",
		"esri/tasks/IdentifyTask",
		"esri/tasks/IdentifyParameters",
		"esri/symbols/SimpleMarkerSymbol",
		"esri/symbols/SimpleLineSymbol",
		"esri/symbols/TextSymbol",  
		"esri/symbols/Font",  
		"esri/Color",
		"dojo/NodeList-traverse"
		], 


	function (declare,
			d3,
			_, 
			JSON,
			parser,
			on,
			array,
			html,
			win,			
			query,
			dom,
			domClass,
			domStyle,
			domAttr,
			domConstruct,
			domGeom,
			fx,
			coreFx,
			xFx,
			registry,
			ContentPane,
			HorizontalSlider,
			HorizontalRuleLabels,
			DynamicMapServiceLayer,
			TiledMapServiceLayer,
			FeatureLayer,
			GraphicsLayer,
			Graphic,
			Extent,
			IdentifyTask,
			IdentifyParameters,
			SimpleMarkerSymbol,
			SimpleLineSymbol,
			TextSymbol,
			Font,
			Color
		  ) 
		
		{

		var slrTool = function(plugin, appData, appConfig){
			var self = this;
			this._data = JSON.parse(appData);
			this._interface = JSON.parse(appConfig);
			this._plugin = plugin;
			this._app = this._plugin.app;
			this._container = this._plugin.container;
			this._plugin_directory = this._plugin.plugin_directory;
			this._legend = this._plugin.legendContainer;
			this._map = this._plugin.map;
			this._status = "close";
			
			on(dom.byId(this._map.getMapId() + "_layers"), "click", function(evt) {
				domStyle.set(self.mapTip, { "display": "none" });
				if (self._status != "close") {
					if (_.has(self._interface.region[self._region], "identify")) {
						
						window.setTimeout(function() {
							var identifyParams = new IdentifyParameters();
							identifyParams.tolerance = 3;
							identifyParams.layerIds = self._mapLayer.visibleLayers;
							identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
							identifyParams.width = self._map.width;
							identifyParams.height = self._map.height;
							identifyParams.geometry = evt.mapPoint;
							identifyParams.mapExtent = self._map.extent;
							identifyParams.returnGeometry = false;

							var identifyTask = new IdentifyTask(self._mapLayer.url);
							identifyTask.execute(identifyParams, function(response) {
								
								if (response.length > 0) {
									var field = self._interface.region[self._region].identify.field;
									var value = response[0].feature.attributes[field];
									value = (_.has(self._interface.region[self._region].identify, "lookup")) ? self._interface.region[self._region].identify.lookup[value] : value;

									if (!_.isUndefined(value)) {
										self.mapTip.innerHTML = value;
										domStyle.set(self.mapTip, { "display": "block" });
										var left = evt.screenPoint.x;
										var top = evt.screenPoint.y - domGeom.getMarginBox(self.mapTip).h/2;
										domStyle.set(self.mapTip, {
											"left": left + "px",
											"top": top + "px"
										});
										
										self.mapTip.focus();
									}
									
								}
							});
							
						}, 250);
					}
				
				}
				
			})
			this._mapLayers = {};
			this._mapLayer = {};
			this._mapLayers_closeState = {};
			this._extent = {
				"xmin": 0,
				"ymin": 0,
				"xmax": 0,
				"ymax": 0,
				"spatialReference": {
					"wkid": 102100,
					"latestWkid": 3857
				}
			};
			
			this._firstLoad = this._plugin._firstLoad;
			this._defaultLabels = {
				climate:["Current", "2030", "2060", "2100"],
				scenario:["Low", "Medium", "High"],
				hurricane:["1","2","3","4","5"],
				sealevelrise: ["0","1","2","3","4","5"],
				stormSurge: ["Low", "Medium", "High", "Highest"]
			}
			this._defaultTitles = {
				climate:"Climate Year",
				scenario:"Sea Level Rise",
				hurricane:"Surge Severity",
				sealevelrise:"Sea Level Rise (ft)",
				stormSurge:"Storm Type"
			}

			this.initialize = function(){
				//console.log("initialize - container");
				
				this._extent.xmin = _.min(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.xmin; }));
				this._extent.ymin = _.min(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.ymin; }));
				this._extent.xmax = _.max(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.xmax; }));
				this._extent.ymax = _.max(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.ymax; }));
				
				domStyle.set(this._container, {
					"padding": "0px"
				});
				
				
				var node = _.first(query("#" + this._container.parentNode.id + " .sidebar-nav"));
				this.infoGraphicButton = domConstruct.create("button", {
					class: "button button-default plugin-slr info-graphic",
					style: "display:none",
					innerHTML: '<img src="' + this._plugin_directory + '/InfographicIcon_v1_23x23.png" alt="show overview graphic">'
				}, node, "first")
				
				if (_.has(this._interface, "infoGraphic")) {
					domAttr.set(this.infoGraphicButton, "data-popup", JSON.stringify(this._interface.infoGraphic.popup));
					domAttr.set(this.infoGraphicButton, "data-url", this._interface.infoGraphic.url);
					
					var display = (this._interface.infoGraphic.show) ? "block" : "none";
					domStyle.set(this.infoGraphicButton, "display", display);
				}
				
				on(this.infoGraphicButton, "mouseover", function(){
					self.showMessageDialog(this, "Learn more");
				})
				
				on(this.infoGraphicButton, "mouseout", function(){
					self.hideMessageDialog();
				})
				
				var plugin = this;
				on(this.infoGraphicButton, "click", function(c){
					var popup = JSON.parse(domAttr.get(this, "data-popup"));
					var url = domAttr.get(this, "data-url");
					if (popup) {
						var html = url.replace("PLUGIN-DIRECTORY", plugin._plugin_directory);
						TINY.box.show({
							animate: true,
							html: html,
							fixed: true,
							width: 640,
							height: 450
						});
					} else {
						window.open(url, "_blank");
					}
					
				})
				
				this.loadingDiv = domConstruct.create("div", {
					innerHTML:"<i class='fa fa-spinner fa-spin fa-3x fa-fw'></i>",
					style:"position:absolute; left: 110px; top:50%; width:100px; height:100px; line-height:100px; text-align:center; z-index:1000;"
				}, this._container);
				
				this.loadInterface(this);
			}
			
			this.showIntro = function(){
				var self = this;	
			};

			this.showTool = function(){
				//console.log("showTool");
				this._firstLoad = false;
				if (!_.isEmpty(this._mapLayers_closeState)) {
					array.forEach(_.keys(this._mapLayers_closeState), function(region) {
						array.forEach(_.keys(self._mapLayers_closeState[region]), function(layer) {
							if (self._mapLayers_closeState[region][layer]) {
								self._mapLayers[region][layer].show();
							}
						})
					})
				}
				console.log('set extent');
				this._map.setExtent(new Extent(this._extent));
			} 

			this.hideTool = function(){
				//console.log("hideTool");
				domStyle.set(self.tip, { "display": "none" });
			}
			
			this.closeTool = function(){
				//console.log("closeTool");
				if (!_.isEmpty(this._mapLayers)) {
					array.forEach(_.keys(this._mapLayers), function(region) {
						self._mapLayers_closeState[region] = {};
						array.forEach(_.keys(self._mapLayers[region]), function(layer) {
							self._mapLayers_closeState[region][layer] = self._mapLayers[region][layer].visible;
							self._mapLayers[region][layer].hide();
						})
					})
				}
				domStyle.set(self.tip, { "display": "none" });
				domStyle.set(self.mapTip, { "display": "none" });
			}

			this.loadLayers = function() {
				//console.log("loadLayers");
				this._plugin._firstLoad = false;
				var i = 0
				array.forEach(_.keys(self._interface.region), function(region){
					self._mapLayers[region] = {}
					
					array.forEach(_.keys(self._interface.region[region].layers), function(layer) {
						var id = "slr-layer-" + i;
						if (!_.isObject(self._interface.region[region].layers[layer])) {
							var mapLayer = new DynamicMapServiceLayer(self._interface.region[region].layers[layer], { id:id });
							mapLayer.setImageFormat("png32");
							mapLayer.setVisibleLayers([]);
							on(mapLayer,"update-start",function(){
								domStyle.set(self.loadingDiv,"display", "block");
							})
							on(mapLayer,"update-end",function(){
								domStyle.set(self.loadingDiv,"display", "none");
							})
							
						} else if (_.isObject(self._interface.region[region].layers[layer]) && self._interface.region[region].layers[layer].type == "tiled") {
							var mapLayer = new TiledMapServiceLayer(self._interface.region[region].layers[layer].url, { id:id });
						}
						
						
						if (mapLayer) {
							self._mapLayers[region][layer] = mapLayer;
							self._map.addLayer(mapLayer);
							mapLayer.hide();
						}
						i += 1
					});
					
					if (_.has(self._interface.region[region], "images")) {
						var layer = "slr-image-layer-" + region.toLowerCase().replace(" ", "_");
						var mapLayer = new FeatureLayer(self._interface.region[region].images.layer.url, { id:layer, outFields:["*"] });
						
						var font = new Font("18pt", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLD,"FontAwesome");
						var color = new Color("#F2C744");
						var symbol = new TextSymbol("\uf1c5", font, color);
						self.imageSymbol = dojo.clone(symbol);
						
						var color = new Color("#D94A4A");
						var symbol = new TextSymbol("\uf1c5", font, color);
						self.imageHighlightSymbol = dojo.clone(symbol);
						
						self.imageHighlightId = null;
						
						mapLayer.setRenderer(new esri.renderer.SimpleRenderer(self.imageSymbol));
						
						on(mapLayer,"graphic-draw",function(evt){
							var color = (evt.graphic.attributes[self._interface.region[self._region].images.layer.idField] == self.imageHighlightId) ? new Color("#D94A4A") : new Color("#F2C744");
							dojo.attr(evt.node, "fill", "rgb(" + color.r + ", " + color.g + ", " + color.b + ")");
							query(evt.node).style("cursor", "pointer");
						})
						
						on(mapLayer,"click",function(evt){
							self.loadImageOnClick(evt);
						})
						
						self._mapLayers[region][layer] = mapLayer;
						self._map.addLayer(mapLayer);
						mapLayer.hide();
					}
					
				});
			}
			
			this.updateMapLayers = function() {
				
				var parameters = {}
				parameters.hazard = this.hazardSelect.value.toLowerCase();
				
				if (parameters.hazard != "") {
				
					var options = this._interface.region[this._region].controls.select.hazard.options;
					var hazardOption = options[array.map(options, function(option) { return option.value }).indexOf(parameters.hazard)];
					
					//rewrite to include support for an json object;w
					parameters.climate = (!_.has(this._interface.region[this._region].controls.slider, "climate")) ? this.climateSlider.get("value") : (_.isObject(this._interface.region[this._region].controls.slider.climate.labels) && _.has(this._interface.region[this._region].controls.slider.climate.labels, parameters.hazard)) ? this._interface.region[this._region].controls.slider.climate.labels[parameters.hazard][this.climateSlider.get("value")].toLowerCase() :(_.isArray(this._interface.region[this._region].controls.slider.climate.labels)) ? this._interface.region[this._region].controls.slider.climate.labels[this.climateSlider.get("value")].toLowerCase() : this.climateSlider.get("value");
					
					parameters.sealevelrise = (!_.has(this._interface.region[this._region].controls.slider, "sealevelrise")) ? this.sealevelriseSlider.get("value") : (_.isObject(this._interface.region[this._region].controls.slider.sealevelrise.labels) && _.has(this._interface.region[this._region].controls.slider.sealevelrise.labels, parameters.hazard)) ? this._interface.region[this._region].controls.slider.sealevelrise.labels[parameters.hazard][this.sealevelriseSlider.get("value")].toLowerCase() :(_.isArray(this._interface.region[this._region].controls.slider.sealevelrise.labels)) ? this._interface.region[this._region].controls.slider.sealevelrise.labels[this.sealevelriseSlider.get("value")].toLowerCase() : this.sealevelriseSlider.get("value");
					
					parameters.scenario = (!_.has(this._interface.region[this._region].controls.slider, "scenario")) ? this.scenarioSlider.get("value") : (_.isObject(this._interface.region[this._region].controls.slider.scenario.labels) && _.has(this._interface.region[this._region].controls.slider.scenario.labels, parameters.hazard)) ? this._interface.region[this._region].controls.slider.scenario.labels[parameters.hazard][this.scenarioSlider.get("value")].toLowerCase() :(_.isArray(this._interface.region[this._region].controls.slider.scenario.labels)) ? this._interface.region[this._region].controls.slider.scenario.labels[this.scenarioSlider.get("value")].toLowerCase() : this.scenarioSlider.get("value");
					
					parameters.hurricane = (!_.has(this._interface.region[this._region].controls.slider, "hurricane")) ? this.hurricaneSlider.get("value") : (_.isObject(this._interface.region[this._region].controls.slider.hurricane.labels) && _.has(this._interface.region[this._region].controls.slider.hurricane.labels, parameters.hazard)) ? this._interface.region[this._region].controls.slider.hurricane.labels[parameters.hazard][this.hurricaneSlider.get("value")].toLowerCase() :(_.isArray(this._interface.region[this._region].controls.slider.hurricane.labels)) ? this._interface.region[this._region].controls.slider.hurricane.labels[this.hurricaneSlider.get("value")].toLowerCase() : this.hurricaneSlider.get("value");
					
					parameters.stormSurge = (!_.has(this._interface.region[this._region].controls.slider, "stormSurge")) ? this.stormSurgeSlider.get("value") : (_.isObject(this._interface.region[this._region].controls.slider.stormSurge.labels) && _.has(this._interface.region[this._region].controls.slider.stormSurge.labels, parameters.hazard)) ? this._interface.region[this._region].controls.slider.stormSurge.labels[parameters.hazard][this.stormSurgeSlider.get("value")].toLowerCase() :(_.isArray(this._interface.region[this._region].controls.slider.stormSurge.labels)) ? this._interface.region[this._region].controls.slider.stormSurge.labels[this.stormSurgeSlider.get("value")].toLowerCase() : this.stormSurgeSlider.get("value");
					
					var parts = [parameters.hazard];
					array.forEach(_.keys(hazardOption.controls), function(key) {
						array.forEach(hazardOption.controls[key], function(control) {
							if (key == "slider") {
								parts.push(parameters[control]);
							}
							if (key == "radiocheck") {
								if (self[control + "RadioButton"] && self[control + "RadioButton"].checked) {
									parts.push(self._interface.region[self._region].controls.radiocheck[control].value);
								}
								if (self[control + "CheckBox"] && self[control + "CheckBox"].checked) {
									parts.push(self._interface.region[self._region].controls.radiocheck[control].value);
								}
							} 
							if (key == "togglebutton") {
								var tbs = _.keys(self._interface.region[self._region].controls.togglebutton);
								array.forEach(tbs, function(tb) {
									if (_.has(self._interface.region[self._region].controls.togglebutton[tb], "dependency") && _.has(self._interface.region[self._region].controls.togglebutton[tb].dependency, "radiocheck")) {
										var rcs = _.keys(self._interface.region[self._region].controls.togglebutton[tb].dependency.radiocheck);
										if (_.contains(rcs, tb)) {
											array.forEach(_.keys(self._interface.region[self._region].controls.togglebutton[tb].dependency.radiocheck[tb]), function(p) {
												if (self[tb + "RadioButton"] && self[control + "RadioButton"][p]) {
													parts.push(_.first(query(".plugin-slr .toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + tb + " input:checked")).value);
												}
												if (self[tb + "CheckBox"] && self[control + "CheckBox"][p]) {
													parts.push(_.first(query(".plugin-slr .toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + tb + " input:checked")).value);
												}
											});
										}
									} else {
										if (_.contains(hazardOption.controls[key], tb)) {
											var value = _.first(query(".plugin-slr .toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + tb + " input:checked")).value;
											if (!_.contains(parts, value)) {
												parts.push(_.first(query(".plugin-slr .toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + tb + " input:checked")).value);
											}
										}
									}
								})
							}
						})
					});
					
					if (!_.isEmpty(this._mapLayer) && !_.has(this._mapLayer, "tileInfo")) {
						this._mapLayer.setVisibleLayers([]);
					};
					if (!_.isEmpty(this._mapLayer)) {
						this._mapLayer.hide();
					}
					
					if (_.has(this._data.region[this._region], parts.join("|"))) {
						var dynamic = _.isArray(this._data.region[this._region][parts.join("|")]);
						if (dynamic) {
							var layer = (_.has(this._mapLayers[this._region], parameters.hazard)) ? parameters.hazard : "main";
							this._mapLayer = this._mapLayers[this._region][layer];
							var visibleLayers = this._data.region[this._region][parts.join("|")];
							this._mapLayer.setVisibleLayers(visibleLayers);
						} else {
							this._mapLayer = this._mapLayers[this._region][this._data.region[this._region][parts.join("|")]];
						}
					} else {
						this._mapLayer = this._mapLayers[this._region]["main"]
					}
					
					this._mapLayer.show();
					
					if (_.has(this._interface.region[this._region].controls.radiocheck, "other")) {
						 if (_.has(this._interface.region[this._region].controls.radiocheck.other, "layer") && _.has(this._mapLayers[this._region], this._interface.region[this._region].controls.radiocheck.other.layer)) {
							 if (this.otherCheckBox.checked) {
								this._mapLayers[this._region][this._interface.region[this._region].controls.radiocheck.other.layer].setVisibleLayers(this._data.region[this._region][this._interface.region[this._region].controls.radiocheck.other.layer])
								this._mapLayers[this._region][this._interface.region[this._region].controls.radiocheck.other.layer].show();
								if (!this._interface.region[this._region].controls.radiocheck.other.overlay) {
									this._mapLayer.hide();
								}
							} else {
								this._mapLayers[this._region][this._interface.region[this._region].controls.radiocheck.other.layer].hide();
							}
						}
					}
					
					if (_.has(this._mapLayers[this._region], "model_storm")) { 
						self._mapLayers[self._region].model_storm.setVisibleLayers([]);
						var storm = "";
						array.forEach(query('input[id*="' + this._region.replace(/ /g,"_").toLowerCase() + '"]'), function(input) {
							var visibleLayers = self._mapLayers[self._region].model_storm.visibleLayers;
							storm = input.value;
							var type = _.last(input.name.split("-"));
							var data = domAttr.get(input, "data-controls");
							if (!_.isNull(data)) {
								var items = []
								var controls = data.split("+");
								array.forEach(controls, function(control){
									var type = _.first(control.split("@"));
									if (type == "slider") {
										array.forEach(_.last(control.split("@")).split("|"), function(c) {
											items.push(parameters[c])
										})
									}
								});
								var suffix = (storm != "") ? ("|" + storm) : "";
								var key = "model_storm|" + type + "|" + items.join("|") + suffix;
							} else {
								var suffix = (storm != "") ? ("|" + storm) : "";
								var key = "model_storm|" + type + suffix;
							}
							if (input.checked) {
								visibleLayers = _.union(visibleLayers, self._data.region[self._region][key]);
							} else {
								visibleLayers = _.difference(visibleLayers, self._data.region[self._region][key]);
							}
							self._mapLayers[self._region].model_storm.setVisibleLayers(visibleLayers);
						})
						
						if (array.some(query('input[id*="' + this._region.replace(/ /g,"_").toLowerCase() + '"]'), function(item) { return item.checked })) {
							array.forEach(self._interface.region[self._region].controls.tree.storm.values, function(item) {
								array.forEach(item.layers.hide, function(layer) {
									self._mapLayers[self._region][layer].hide();
								});
								array.forEach(item.layers.show, function(layer) {
									self._mapLayers[self._region][layer].show();
								});
							});
						} else {
							array.forEach(self._interface.region[self._region].controls.tree.storm.values, function(item) {
								array.forEach(item.layers.show, function(layer) {
									self._mapLayers[self._region][layer].hide();
								});
								array.forEach(item.layers.hide, function(layer) {
									self._mapLayers[self._region][layer].show();
								});
							});
						}
						
					}
					
					if (_.has(self._interface.region[self._region], "images")) {
						var layer = "slr-image-layer-" + self._region.toLowerCase().replace(" ", "_");
						self._mapLayers[self._region][layer].hide();
						
						if (_.has(hazardOption, "images") &&  hazardOption.images) {
							self._mapLayers[self._region][layer].show();
						}
					}
				
				} else {
					array.forEach(_.keys(this._mapLayers[this._region]), function(layer) {
						if (!_.isEmpty(self._mapLayers[self._region][layer]) && !_.has(self._mapLayers[self._region][layer], "tileInfo")) {
							self._mapLayers[self._region][layer].setVisibleLayers([]);
						};
						if (!_.isEmpty(self._mapLayers[self._region][layer])) {
							self._mapLayers[self._region][layer].hide();
						}
					});
				}
			}
			
			this.updateExtentByRegion = function(region) {
				this._map.setExtent(new Extent(region.extent), true)
			}
						
			this.loadInterface = function() {
				var self = this;
				
				if (!this._app.singlePluginMode) {
					domStyle.set(this._container, { 
						"overflow": "visible"
					});
				}
				
				//empty layout containers
			    this.cp = new ContentPane({
					id: "plugin-slr-" + self._map.id,
					style: "position:relative; overflow: visible; width:100%; height:100%;",
					className: 'cr-dojo-dijits'
			    });
			    this.cp.startup();
				this._container.appendChild(this.cp.domNode);
				
				this.createInputs();
				
				if (_.keys(this._interface.region).length == 1) {
					this.updateInterface("region");
				}
				
				this.tip = domConstruct.create("div", { className: "plugin-slr slr-tooltip interface", tabindex: -1 });
				win.body().appendChild(this.tip);
				
				this.mapTip = domConstruct.create("div", { className: "plugin-slr slr-tooltip slr-maptip interface", tabindex: -1 });
				this._plugin.app._unsafeMap.container.appendChild(this.mapTip);
				on(this.mapTip, "blur", function() {
					domStyle.set(self.mapTip, { "display": "none" });
				});
				
				on(this.mapTip, "click", function() {
					domStyle.set(self.mapTip, { "display": "none" });
				});
				
				this.createTooltips();
				domStyle.set(this.loadingDiv,"display", "none");
			}
			
			this.createInputs = function(){
				this.inputsPane = new ContentPane({});
				this.cp.domNode.appendChild(this.inputsPane.domNode);
			    domStyle.set(this.inputsPane.containerNode, {
					"position": "relative",
					"overflow": "visible",
					"background": "none",
					"border": "none",
					"width": "100%",
					"height": "auto",
					"padding": "20px 20px 5px 20px"
				});
				on(this._map, "resize", function() {
					domStyle.set(self.inputsPane.containerNode, { "width": "100%", "height": "auto" });
				});
				
				var regionTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px;"
				}, this.inputsPane.containerNode);
				
				var dataSourceTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px; display:none;"
				}, this.inputsPane.containerNode);
				
				var hazardTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:auto; margin:0px 0px 15px 0px;"
				}, this.inputsPane.containerNode);
				
				var slidersTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:auto; padding:1px 0px 0px 0px; margin:0px 0px 0px 0px; display:block;"
				}, this.inputsPane.containerNode);
				
				var climateTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:40px; padding:0px; margin:15px 0px 15px 0px; display:block;"
				}, slidersTd);
				
				var seaLevelRiseTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:30px; padding:0px; margin:15px 0px 15px 0px; display:none;"
				}, slidersTd)
				
				var scenarioTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:30px; padding:0px; margin:15px 0px 15px 0px; display:block;"
				}, slidersTd);
				
				var hurricaneTd = domConstruct.create("div", {
					style:"position:relative; width:100%; min-height:30px; padding:0px; margin:15px 0px 15px 0px; display:none;"
				}, slidersTd);
				
				var stormSurgeTd = domConstruct.create("div", {
					style:"position:relative; width:100%; min-height:30px; padding:0px; margin:15px 0px 15px 0px; display:none;"
				}, slidersTd);
				
				var modelStormTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:auto; padding:0px; margin:-10px 0px 15px 0px; display:none;"
				}, this.inputsPane.containerNode); 
				
				var chartTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:auto; padding:0px; margin:0px 0px 0px 0px;"
				}, this.inputsPane.containerNode);
				
				var imagesTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:auto; padding:0px; margin:0px 0px 0px 0px;"
				}, this.inputsPane.containerNode);
				
				var otherTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:20px; padding:0px; margin:0px 0px 0px 0px; visibility:hidden;"
				}, this.inputsPane.containerNode);
				
				// region control
				var regionText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;",
					innerHTML: '<span class="info-circle fa-stack fa slr-' + this._map.id + '-region"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">1</span></span><b> Select a <span class="slr-region-geography">Region</span>:</b>'
				}, regionTd);
				
				var regionSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:calc(100% - 85px);display:inline-block;" 
				}, regionTd);
				this.regionSelect = domConstruct.create("select", { name: "region"}, regionSelectDiv);
				if (_.keys(this._interface.region).length > 1) {
					domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.regionSelect);
				}
				array.forEach(_.keys(this._interface.region), function(item) {
					domConstruct.create("option", { innerHTML: item, value: item }, self.regionSelect);
				});
				on(this.regionSelect, "change", function() {
					self._region = this.value;
					if (self._region != "") {
						self.updateInterface("region");
					} else {
						self.resetInterface();
					}
				});
				this.regionSelect.value = _.first(this.regionSelect.options).value;
				this._region = this.regionSelect.value;
				
				this.downloadReport = domConstruct.create("div", { className:"downloadButton slr-report", innerHTML:'<i class="fa fa-file-pdf-o downloadIcon"></i><span class="downloadText">Report</span>' }, regionTd);
				on(this.downloadReport,"mouseover", function(){
					// self._interface.region[self._region].download.report.default != "")
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							
							if ((!_.isObject(self._interface.region[self._region].download.report) && self._interface.region[self._region].download.report != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, "default") && self._interface.region[self._region].download.report.default != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, self.hazardSelect.value))) {
								
								var width = domGeom.getMarginBox(self._container).w - 125 - 47;
								
								coreFx.combine([
								   xFx.wipeTo({ node: this, duration: 150, width: 80 }),
								   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: width })
								]).play();
								domStyle.set(this, "background", "#0096d6");
							}
						}
					}
				});
				on(this.downloadReport,"mouseout", function(){
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							if ((!_.isObject(self._interface.region[self._region].download.report) && self._interface.region[self._region].download.report != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, "default") && self._interface.region[self._region].download.report.default != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, self.hazardSelect.value))) {
								
								var width = domGeom.getMarginBox(self._container).w - 125;
								
								coreFx.combine([
								   xFx.wipeTo({ node: this, duration: 150, width: 33 }),
								   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: width, onEnd: function() { domStyle.set(regionSelectDiv, "width", "calc(100% - 85px)"); } })
							   ]).play();
							   domStyle.set(this, "background", "#2B2E3B");
							}
						}
					}
				});
				on(this.downloadReport,"click", function(){
					 if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							
							if ((!_.isObject(self._interface.region[self._region].download.report) && self._interface.region[self._region].download.report != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, "default") && self._interface.region[self._region].download.report.default != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, self.hazardSelect.value))) {
								
								var url = (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, self.hazardSelect.value)) ? self._interface.region[self._region].download.report[self.hazardSelect.value] : (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, "default")) ? self._interface.region[self._region].download.report["default"] : self._interface.region[self._region].download.report;
								
								var href = window.location.origin + window.location.pathname;
								url = url.replace("HOSTNAME-", href);
								window.open(url, "_blank");
								
								var width = domGeom.getMarginBox(self._container).w - 125;
								
								domStyle.set(regionSelectDiv, "width", "calc(100% - 85px)");
							    domStyle.set(this, "background", "#2B2E3B");
							}
							
						}
					 }
				});
				
				this.downloadData = domConstruct.create("div", { className:"downloadButton slr-data", innerHTML:'<i class="fa fa-file-zip-o downloadIcon"></i><span class="downloadText">Data</span>' }, regionTd);
				on(this.downloadData,"mouseover", function(){
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							
							if ((!_.isObject(self._interface.region[self._region].download.data) && self._interface.region[self._region].download.data != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, "default") && self._interface.region[self._region].download.data.default != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, self.hazardSelect.value))) {
								
								var width = domGeom.getMarginBox(self._container).w - 125 - 42;
								
								coreFx.combine([
								   xFx.wipeTo({ node: this, duration: 150, width: 75 }),
								   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: width })
								]).play();
							   domStyle.set(this, "background", "#0096d6");
						   
							}
						}
				   }
				});
				on(this.downloadData,"mouseout", function(){
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							if ((!_.isObject(self._interface.region[self._region].download.data) && self._interface.region[self._region].download.data != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, "default") && self._interface.region[self._region].download.data.default != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, self.hazardSelect.value))) {
								
								var width = domGeom.getMarginBox(self._container).w - 120;
								
								coreFx.combine([
								   xFx.wipeTo({ node: this, duration: 150, width: 33 }),
								   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: width, onEnd: function() { domStyle.set(regionSelectDiv, "width", "calc(100% - 80px)"); } })
								]).play();
							   domStyle.set(this, "background", "#2B2E3B");
							}
						}
					}
				});
				on(this.downloadData,"click", function(){
					 if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							
							if ((!_.isObject(self._interface.region[self._region].download.data) && self._interface.region[self._region].download.data != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, "default") && self._interface.region[self._region].download.data.default != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, self.hazardSelect.value))) {
								
								var url = (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, self.hazardSelect.value)) ? self._interface.region[self._region].download.data[self.hazardSelect.value] : (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, "default")) ? self._interface.region[self._region].download.data["default"] : self._interface.region[self._region].download.data;
								
								var popup = (_.has(url, "popup") && url.popup) ? true : false;
								if (popup) {
									var content = (_.has(url, "url")) ? url.url : "";
									var html = content.replace("PLUGIN-DIRECTORY", self._plugin_directory);
									var width = (_.has(url, "width")) ? url.width : 600;
									var height = (_.has(url, "height")) ? url.height : 400;
									TINY.box.show({
										animate: true,
										html: html,
										fixed: true,
										width: width + 40,
										height: height + 40
									});
									//query(".tbox .tinner").style("height", "auto");
								} else {
									var href = window.location.origin + window.location.pathname;
									url = url.replace("HOSTNAME-", href);
									window.open(url, "_blank");
									
									domStyle.set(regionSelectDiv, "width", "calc(100% - 80px)");
									domStyle.set(this, "background", "#2B2E3B");
								}
								
							}
						}
					 }
				});
				
				// datasource controls
				var dataSourceText = domConstruct.create("div", {
					style: "position:relative;margin-bottom:5px;",
					innerHTML: '<span class="info-circle fa-stack fa slr-' + this._map.id + '-dataSource"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">2</span></span><b> Select a Data Source:</b>'
				}, dataSourceTd);
				
				var dataSourceSelectDiv = domConstruct.create("div", {
					className: "styled-select",
					style:"width:275px;display:block;margin-bottom:5px;"
				}, dataSourceTd);
				this.dataSourceSelect = domConstruct.create("select", { name: "dataSource" }, dataSourceSelectDiv);
				on(this.dataSourceSelect, "change", function() { 
					if (self.regionSelect != "" && self.dataSourceSelect.value != "") {
						query(".downloadButton").style("backgroundColor", "#2B2E3B");
					} else {
						query(".downloadButton").style("backgroundColor", "#94959C");
					}
					self.updateInterface("dataSource");
				});
				
				// hazard controls
				var hazardText = domConstruct.create("div", {
					style: "position:relative;margin-bottom:5px;",
					innerHTML: '<span class="info-circle fa-stack fa slr-' + this._map.id + '-hazard"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">2</span></span><b> Select a Hazard:</b>'
				}, hazardTd);
				
				var hazardSelectDiv = domConstruct.create("div", {
					className: "styled-select",
					style:"width:100%;display:block;margin-bottom:5px;"
				}, hazardTd);
				this.hazardSelect = domConstruct.create("select", { name: "hazard" }, hazardSelectDiv);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, self.hazardSelect);
				on(this.hazardSelect, "change", function() { 
					self.updateControls();
					self.updateMapLayers();
				});
				
				this.hazardDescriptionDiv = domConstruct.create("div", {
					class: "hazard-description",
					style:"display:none;"
				}, hazardTd);
				
				var checkBoxDiv = domConstruct.create("div", {
					style:"position:relative; width:100%; height:20px; padding:0px; margin:0px 0px 0px 0px; display:none;"
				}, hazardTd);
				
				var checkBoxLabel = domConstruct.create("label", { 
					for: "slr-armor-layer-" + self._map.id,
					className:"styled-checkbox",
					style:"display:inline-block;margin-left:5px; margin-right:40px;"
				}, checkBoxDiv);
				this.armorCheckBox = domConstruct.create("input", {
					type:"checkbox",
					value:"armor",
					name:"armor-layer",
					id:"slr-armor-layer-" + self._map.id,
					disabled:true,
					checked:false
				}, checkBoxLabel);
				this.armorCheckBoxLabel = domConstruct.create("div", {
					innerHTML: '<span>with armoring</span>'
				}, checkBoxLabel);
				on(self.armorCheckBox, "change", function(){
					if (this.checked) {
						self.setControlDependency("check", this.value, "checked");
					} else {
						self.setControlDependency("check", this.value, "unchecked");
					}
					self.updateMapLayers();
				});
				
				var checkBoxLabel = domConstruct.create("label", { 
					for: "slr-hazard-layer-" + self._map.id,
					className:"styled-checkbox",
					style:"display:inline-block; margin-left:5px;"
				}, checkBoxDiv);
				this.hazardCheckBox = domConstruct.create("input", {
					type:"checkbox",
					value:"hazard",
					name:"hazard-layer",
					id:"slr-hazard-layer-" + self._map.id,
					disabled:true,
					checked:false
				}, checkBoxLabel);
				this.hazardCheckBoxLabel = domConstruct.create("div", {
					innerHTML: '<span>aggregate data</span>'
				}, checkBoxLabel);
				on(self.hazardCheckBox, "change", function(){
					if (this.checked) {
						self.setControlDependency("check", this.value, "checked");
					} else {
						self.setControlDependency("check", this.value, "unchecked");
					}
					self.updateMapLayers();
				});
				
				this.radioButtonDiv = domConstruct.create("div", {
					style:"position:relative; width:100%; height:auto; padding:0px; margin:20px 0px 0px 0px; display:none;"
				}, hazardTd);
				
				array.forEach(_.keys(this._interface.region), function(key) { 
					if (!_.isUndefined(self._interface.region[key].controls.radiocheck)) {
						var rbs = _.where(self._interface.region[key].controls.radiocheck, {"type":"radio"});
						var groups = _.unique(array.map(rbs, function(r) { return r.group }));
						if (rbs.length > 0) {
								array.forEach(groups, function(group) {
									var groupDiv = domConstruct.create("div", {
										className: "toggle-div " + key.replace(/ /g,"_").toLowerCase()
										}, self.radioButtonDiv);
									
									//var label = self._interface.region[key].controls.togglebutton[g].label;
									var label = "Display hazard as:";
									var titleDiv = domConstruct.create("div", {
										innerHTML: '<i class="fa fa-question-circle slr-' + self._map.id + '-' + key.replace(/ /g,"_").toLowerCase() + '-radiogroup_' + group +'"></i>&nbsp;<b>' + label + '</b>'
									}, groupDiv);
									
									var containerDiv = domConstruct.create("div", {
									className: "toggle-btn " + key.replace(/ /g,"_").toLowerCase()
									}, groupDiv);
									
									var rbfs = _.where(rbs, {"group":group});
									array.forEach(rbfs, function(rb, i) { 
									/* var radioButtonLabel = domConstruct.create("label", { 
										className:"styled-radio",
										style:"display:inline-block;margin:0px 0px 0px 25px;", 
										for: "plugin-slr-" + rb.name + "-" + self._map.id
										}, self.radioButtonDiv);
									
									self[rb.name + "RadioButton"] = domConstruct.create("input", { 
										type: "radio", 
										value: rb.value, 
										name: rb.group, 
										id: "plugin-slr-" + rb.name + "-" + self._map.id
									}, radioButtonLabel);
									
									if (rb.checked) { self[rb.name + "RadioButton"].checked = true }
									
									domConstruct.create("span", {
										innerHTML:rb.label 
									}, radioButtonLabel );
									
									on(self[rb.name + "RadioButton"] , "change", function() {
										if (this.checked && self._region != "") {
											self.updateMapLayers();
										}
									}); */
									
									self[rb.name + "RadioButton"] = domConstruct.create("input", { 
										type: "radio", 
										value: rb.value, 
										name: rb.group, 
										id: "plugin-slr-radiobutton-" + rb.group + "-" + rb.name + "-" + self._map.id
									}, containerDiv);
									
									if (rb.checked) { self[rb.name + "RadioButton"].checked = true }
									
									domConstruct.create("label", { 
										for: "plugin-slr-radiobutton-" + rb.group + "-" + rb.name + "-" + self._map.id,
										innerHTML: rb.label
									}, containerDiv);
									
									on(self[rb.name + "RadioButton"] , "change", function() {
										if (this.checked && self._region != "") {
											self.updateMapLayers();
										}
										
										var name = this.id.replace("plugin-slr-radiobutton-" + this.name + "-", "").replace("-" + self._map.id,"");
										var rb = self._interface.region[self._region].controls.radiocheck[name].dependency;
										if (!_.isUndefined(rb)) {
											array.forEach(_.values(rb), function(a) {
												array.forEach(_.keys(a), function(b) {
													domStyle.set(_.first(query(".toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + b)).parentNode, "display", a[b].display);
												});
											});
										}
										
									});
								});
								});
						} 
					} 
				});
				
				this.toggleDiv = domConstruct.create("div", {
					style:"position:relative; width:100%; height:auto; padding:0px; margin:20px 0px 0px 0px; display:none;line-height:12px;"
				}, hazardTd);
				
				array.forEach(_.keys(this._interface.region), function(key) { 
					if (!_.isUndefined(self._interface.region[key].controls.togglebutton)) {
						
						array.forEach(_.keys(self._interface.region[key].controls.togglebutton), function(g) {
						
							var groupDiv = domConstruct.create("div", {
								className: "toggle-div " + key.replace(/ /g,"_").toLowerCase() + " " + g
							}, self.toggleDiv);
							
							domConstruct.create("div", {
								innerHTML: '<i class="fa fa-question-circle slr-' + self._map.id + '-togglegroup_' + g + '"></i>&nbsp;<b>' + self._interface.region[key].controls.togglebutton[g].label + '</b>'
							}, groupDiv);
							
							var containerDiv = domConstruct.create("div", {
								className: "toggle-btn " + key.replace(/ /g,"_").toLowerCase() + " " + g
							}, groupDiv);
							
							var rbs = _.values(self._interface.region[key].controls.togglebutton[g].controls)
							array.forEach(rbs, function(rb) {
								self[rb.name + "_" + key.replace(/ /g,"_").toLowerCase() + "_ToggleButton"] = domConstruct.create("input", { 
									type: "radio", 
									value: rb.value, 
									name: rb.group, 
									id: "plugin-slr-" + key.replace(/ /g,"_").toLowerCase() + "-togglebutton-"  + rb.group + "-" + rb.name + "-" + self._map.id
								}, containerDiv);
								
								if (rb.checked) { self[rb.name + "_" + key.replace(/ /g,"_").toLowerCase() + "_ToggleButton"].checked = true }
								
								domConstruct.create("label", { 
									for: "plugin-slr-" + key.replace(/ /g,"_").toLowerCase() + "-togglebutton-"  + rb.group + "-" + rb.name + "-" + self._map.id,
									innerHTML: rb.label
								}, containerDiv);
								
								on(self[rb.name + "_" + key.replace(/ /g,"_").toLowerCase() + "_ToggleButton"] , "change", function() {
									if (this.checked) {
										self.setControlDependency("togglebutton", this.value, "checked", this.name);
									}
									if (this.checked && self._region != "") {
										self.updateMapLayers();
									}
								});
							}); 
						});
					} 
				})
				
				//climate year slider
			    var climateSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-climate'></i>&nbsp;<b><span class='slr-control-title climate'>" + this._defaultTitles.climate + "</span>: </b>",
					style:"position:relative; width:110px; top:-10px; display:inline-block;"
				}, climateTd);
				this.climateSlider = new HorizontalSlider({
			        name: "climate",
			        value: 0,
			        minimum: 0,
			        maximum: this._defaultLabels.climate.length-1,
			        discreteValues: this._defaultLabels.climate.length,
			        showButtons: false,
					disabled: true,
			        style: "width:calc(100% - 115px); display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						self.setControlDependency("slider", this.name, this.value);
						if (self._region != "") {
							if (_.has(self._interface.region[self._region], "chart")) {
								self.highlightChart();
							}
							self.updateMapLayers();
						}
			        }
			    });
			    climateTd.appendChild(this.climateSlider.domNode);

			    this.climateSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: this._defaultLabels.climate.length,
			    	labels: this._defaultLabels.climate,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.climateSlider.addChild(this.climateSliderLabels);
				
				//scenario slider
			    var scenarioSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-scenario'></i>&nbsp;<b><span class='slr-control-title scenario'>" + this._defaultTitles.scenario + "</span>: </b>",
					style:"position:relative; width:110px; top:-10px; display:inline-block;"
				}, scenarioTd);
				this.scenarioSlider = new HorizontalSlider({
			        name: "scenario",
			        value: 0,
			        minimum: 0,
			        maximum: this._defaultLabels.scenario.length-1,
			        discreteValues: this._defaultLabels.scenario.length,
			        showButtons: false,
					disabled: true,
			        style: "width:calc(100% - 115px); display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						self.setControlDependency("slider", this.name, this.value);
						if (self._region != "") {
							if (_.has(self._interface.region[self._region], "chart")) {
								self.updateChart();
							}
							self.updateMapLayers();
						}
			        }
			    });
				scenarioTd.appendChild(this.scenarioSlider.domNode);

			    this.scenarioSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: this._defaultLabels.scenario.length,
			    	labels: this._defaultLabels.scenario,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.scenarioSlider.addChild(this.scenarioSliderLabels);
				
				var sealevelriseLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-sealevelrise'></i>&nbsp;<b><span class='slr-control-title sealevelrise'>" + this._defaultTitles.sealevelrise + "</span>: </b>",
					style:"position:relative; width:135px; top:-10px; display:inline-block;"
				}, seaLevelRiseTd);
				this.sealevelriseSlider = new HorizontalSlider({
			        name: "sealevelriseSlider",
			        value: 0,
			        minimum: 0,
			        maximum: this._defaultLabels.sealevelrise.length-1,
			        discreteValues: this._defaultLabels.sealevelrise.length,
			        showButtons: false,
					disabled: true,
			        style: "width:calc(100% - 140px); display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						if (self._region != "") {
							self.updateMapLayers();
						}
					}
			    });
			    seaLevelRiseTd.appendChild(this.sealevelriseSlider.domNode);

			    this.sealevelriseSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: this._defaultLabels.sealevelrise.length,
			    	labels: this._defaultLabels.sealevelrise,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.sealevelriseSlider.addChild(this.sealevelriseSliderLabels);
				
				//hurricane slider
			    var hurricaneSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-hurricane'></i>&nbsp;<b><span class='slr-control-title hurricane'>" + this._defaultTitles.hurricane + "</span>: </b>",
					style:"position:relative; width:115px; top:-10px; display:inline-block;"
				}, hurricaneTd);
				this.hurricaneSlider = new HorizontalSlider({
			        name: "hurricaneSlider",
			        value: 0,
			        minimum: 0,
			        maximum: this._defaultLabels.hurricane.length-1,
			        discreteValues: this._defaultLabels.hurricane.length,
			        showButtons: false,
					disabled: true,
			        style: "width:calc(100% - 115px); display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						if (self._region != "") {
							self.updateMapLayers();
						}
			        }
			    });
				hurricaneTd.appendChild(this.hurricaneSlider.domNode);

			    this.hurricaneSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: this._defaultLabels.hurricane.length,
			    	labels: this._defaultLabels.hurricane,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.hurricaneSlider.addChild(this.hurricaneSliderLabels);
				
				this.modelStorms = _.pick(self._interface.region, function(value) {
					return _.has(value.controls, "tree") && _.has(value.controls.tree, "storm")
				})
				if (!_.isEmpty(this.modelStorms)) {
					var stormToggleDiv = domConstruct.create("div", {
						className: "storm-toggle"
					}, modelStormTd)
					
					var stormsToggle = domConstruct.create("div", {
						className: "storm-toggle-header",
						innerHTML: "<i class='fa fa-caret-right storm-toggle-icon'></i>&nbsp;<span class='storm-toggle-header-label'></span>"
					}, stormToggleDiv)
					
					on(stormsToggle, "click", function(evt) {
						var node = _.first(query(".storm-toggle-container"))
						var nodeOpen = domStyle.get(node,"display") == "none";
						
						var i = _.first(query(".storm-toggle-header .storm-toggle-icon"));
						var previous = (nodeOpen) ? "right" : "down";
						var current = (previous == "right") ? "down" : "right";
						domClass.replace(i, "fa-caret-" + current, "fa-caret-" + previous)
						
						var display = (nodeOpen) ? "block" : "none";
						domStyle.set(node, "display", display);
					})
					var stormsToggleContainer = domConstruct.create("div", {
						className: "storm-toggle-container"
					}, stormToggleDiv)
					
					array.forEach(_.keys(this.modelStorms), function(key) {
						array.forEach(self.modelStorms[key].controls.tree.storm.values, function(value) {
							var display = (_.has(value, "displayLabel") && value.displayLabel) ? "block" : "none";
							var label = (_.has(value, "label")) ? value.label : "";
							var stormToggle = domConstruct.create("div", {
								className: "storm-toggle-table storm-toggle-subitem slr-model-storm-" + key.replace(/ /g,"_").toLowerCase() + "_" + value.value,
								style:"display:" + display + ";",
								innerHTML: "<span class='storm-toggle-text'><i class='fa fa-caret-right storm-toggle-icon'></i>&nbsp;<i class='fa fa-question-circle slr-" + self._map.id + "-storm_" + value.value + "'></i>&nbsp" + label + "</span>"
							}, stormsToggleContainer)
							
							on(stormToggle, "click", function(evt) {
								var type = (_.has(self._interface.region[self._region].controls.tree.storm, "displayType")) ? self._interface.region[self._region].controls.tree.storm.displayType : "fixed";
								if (type != "fixed") {
									var node = _.first(query(".slr-model-storm-" + key.replace(/ /g,"_").toLowerCase() + "_" + value.value + " .storm-toggle-td"))
									var nodeOpen = domStyle.get(node,"display") == "none";
									
									var i = _.first(query(".slr-model-storm-" + key.replace(/ /g,"_").toLowerCase() + "_" + value.value + " .storm-toggle-icon"));
									var previous = (nodeOpen) ? "right" : "down";
									var current = (previous == "right") ? "down" : "right";
									domClass.replace(i, "fa-caret-" + current, "fa-caret-" + previous);
									
									var display = (nodeOpen) ? "block" : "none";
									domStyle.set(node,"display", display);
								}
							})
							
							var stormToggleTd = domConstruct.create("div", {
								className:"storm-toggle-td",
								style: "display:none;padding-left:15px;"
							}, stormToggle)
							
							array.forEach(value.controls, function(control){
								var help = (_.has(control, "help") && control.help) ? "<i style='margin-left:0px;' class='fa fa-question-circle slr-" + self._map.id + "-label-storm_" + control.value +  "_" + value.value + "'></i>&nbsp;" : "";
								var checkBoxDiv = domConstruct.create("label", { 
									for: "slr-model-storm-" + control.value + "-layer-" + key.replace(/ /g,"_").toLowerCase() + "_" + value.value,
									className:"styled-checkbox",
									style:"display:inline-block; margin-left: 15px;",
									innerHTML: help
								}, stormToggleTd);
								
								on(checkBoxDiv,"click", function(evt){
									var target = domAttr.get(evt.target,"class");
									if (target.indexOf("fa-question") > 0) {
										evt.preventDefault();
									}
								})
								
								var checkBox = domConstruct.create("input", {
									type:"checkbox",
									value: value.value,
									name:"storm-" + control.value,
									id:"slr-model-storm-" + control.value + "-layer-" + key.replace(/ /g,"_").toLowerCase() + "_" + value.value,
									disabled:false,
									checked:false
								}, checkBoxDiv);
								
								if (_.has(control, "controls")) {
									array.forEach(_.keys(control.controls), function(c) {
										var el = control.controls[c];
										domAttr.set(checkBox, "data-controls", c + "@" + el.join("|"));
									});
								}
								
								var checkBoxLabel = domConstruct.create("div", {
									innerHTML: "<span>" + control.label + "</span>",
									style:"display:inline-block;"
								}, checkBoxDiv);
								
								on(checkBox, "change", function(){
									if (_.has(value, "dependency")) {
										array.forEach(_.keys(value.dependency), function(type) {
											var d = value.dependency[type];
											if (type == "slider") {
												array.forEach(_.keys(d), function(c) {
													if (d[c].disabled) {
														if (array.some(query('input[id*="' + key.replace(/ /g,"_").toLowerCase() + "_" + value.value + '"]'), function(item) { return item.checked })) {
															self[c + "Slider"].set("disabled", true);
														} else {
															self[c + "Slider"].set("disabled", false);
														}
													}
												});
											}
										});
									}
									self.updateMapLayers();
								});
							});
						});
						
					});
				}
				
				//stormSurge slider
			    var stormSurgeSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-stormSurge'></i>&nbsp;<b><span class='slr-control-title stormSurge'>" + this._defaultTitles.stormSurge + "</span>: </b>",
					style:"position:relative; width:110px; top:-10px; display:inline-block;"
				}, stormSurgeTd);
				this.stormSurgeSlider = new HorizontalSlider({
			        name: "stormSurgeSlider",
			        value: 0,
			        minimum: 0,
			        maximum: this._defaultLabels.stormSurge.length-1,
			        discreteValues: this._defaultLabels.stormSurge.length,
			        showButtons: false,
					disabled: true,
			        style: "width:calc(100% - 115px); display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						if (self._region != "") {
							self.updateMapLayers();
						}
			        }
			    });
				stormSurgeTd.appendChild(this.stormSurgeSlider.domNode);

			    this.stormSurgeSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: this._defaultLabels.stormSurge.length,
			    	labels: this._defaultLabels.stormSurge,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.stormSurgeSlider.addChild(this.stormSurgeSliderLabels);
				
				
				this.chartContainer = domConstruct.create("div", {
					className: "slr-chart-container"
				}, chartTd)
				
				this.chartHeader = domConstruct.create("div", {
					className: "slr-chart-header",
					innerHTML: ""
				}, this.chartContainer)
				
				this.chartContent = domConstruct.create("div", {
					className: "slr-chart-content",
					innerHTML: ""
				}, this.chartContainer)
				
				
				this.imagesContainer = domConstruct.create("div", {
					className: "slr-images-container"
				}, imagesTd)
				
				this.imagesHeader = domConstruct.create("div", {
					className: "slr-images-header",
					innerHTML: ""
				}, this.imagesContainer)
				
				this.imagesContent = domConstruct.create("div", {
					className: "slr-images-content",
					innerHTML: ""
				}, this.imagesContainer)
				
				this.imagesImage = domConstruct.create("div", {
					className: "slr-images-image",
					innerHTML: ""
				}, this.imagesContent)
				
				this.imagesClose = domConstruct.create("div", {
					className: "slr-images-close",
					innerHTML: '<i class="fa fa-times" aria-hidden="true"></i>'
				}, this.imagesContent)
				
				on(this.imagesClose, "click", function(evt) {
					self.closeImageOnClick();
				});
				
				var checkBoxDiv = domConstruct.create("label", { 
					for: "slr-other-layer-" + self._map.id,
					className:"styled-checkbox",
					style:"display:block;"
				}, otherTd);
				this.otherCheckBox = domConstruct.create("input", {
					type:"checkbox",
					value:"other",
					name:"other-layer",
					id:"slr-other-layer-" + self._map.id,
					disabled:false,
					checked:false
				}, checkBoxDiv);
				this.otherCheckBoxLabel = domConstruct.create("div", {
					id:"slr-other-layer-" + self._map.id + "-label",
					innerHTML: '<span></span>'
				}, checkBoxDiv);
				on(this.otherCheckBox, "change", function(){
					var checked = this.checked;
					var value = self._interface.region[self._region].controls.radiocheck.other;
					if (_.has(value, "dependency")) {
						array.forEach(_.keys(value.dependency), function(type) {
							var d = value.dependency[type];
							if (type == "slider") {
								array.forEach(_.keys(d), function(c) {
									if (d[c].disabled) {
										if (checked) {
											self[c + "Slider"].set("disabled", true);
										} else {
											self[c + "Slider"].set("disabled", false);
										}
									}
								});
							}
						});
					}
					
					self.updateMapLayers();
				});
				
				var opacity = domConstruct.create("div", {
					className: "utility-control",
					innerHTML: '<span class="slr-' + this._map.id + '-opacity"><b>Opacity</b>&nbsp;<i class="fa fa-adjust"></i></span>'
				}, this.inputsPane.containerNode);
				
				on(opacity,"click", function() {
					var status = domStyle.get(self.opacityContainer, "display");
					var display = (status == "none") ? "block" : "none";
					domStyle.set(self.opacityContainer, "display", display);
				})
				
				this.opacityContainer = domConstruct.create("div", {
					className: "utility"
				}, this.inputsPane.containerNode);
				
				//opacity slider
				this.opacitySlider = new HorizontalSlider({
			        name: "opacitySlider",
			        value: 1,
			        minimum: 0,
			        maximum: 1,
			        intermediateChanges: true,
			        showButtons: false,
					disabled: true,
			        style: "width:75px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						array.forEach(_.keys(self._mapLayers), function(region){
							array.forEach(_.keys(self._mapLayers[region]), function(layer){
								self._mapLayers[region][layer].setOpacity(Math.abs(value));
							})
						})
			        }
			    });
				this.opacityContainer.appendChild(this.opacitySlider.domNode);
				
				this.hazardFooterDiv = domConstruct.create("div", {
					class: "hazard-footer",
					style:"display:none;"
				}, this.cp.domNode);
				
				this.partnersContainer = domConstruct.create("div", {
					className: "slr-partners-container"
				}, this.cp.domNode)
				
				this.partnersContent = domConstruct.create("div", {
					className: "slr-partners-content",
					innerHTML: ""
				}, this.partnersContainer)
			}
			
			this.setControlDependency = function(c, name, value, sub) {
				var sub = (_.isUndefined(sub)) ? null : sub;
				var suffix = { "slider": "Slider", "radio": "RadioButton", "check": "CheckBox", "togglebutton":"ToggleButton" };
				var category = { "slider": "slider", "radio": "radiocheck", "check": "radiocheck", "togglebutton":"togglebutton" };
				if (_.isNull(sub)) {
					var el = this._interface.region[this._region].controls[category[c]][name];
				} else {
					var el = this._interface.region[this._region].controls[category[c]][sub].controls[name];
				}
				if (_.has(el, "dependency")) {
					var n = el.dependency;
					array.forEach(_.keys(n), function(type) {
						var d = n[type];
						if (type == "slider") {
							if (c == "slider") {
								array.forEach(_.keys(d), function(control) {
									var v = _.pick(d[control], self._interface.region[self._region].controls[category[type]][name].labels[value]);
									if (!_.isEmpty(v) && !_.isUndefined(v)) {
										var p = _.first(_.values(v));
										var w = p.whitelist;
										var z = self._interface.region[self._region].controls[category[type]][control].labels[self[control + suffix[type]].get("value")]
										if (!_.isUndefined(w) && w.length > 0 && _.indexOf(w, z) < 0) {
											self[control + suffix[type]].set("value", _.indexOf(self._interface.region[self._region].controls[category[type]][control].labels, _.first(w)));
										}
										
										var disabled = (_.has(p, "disabled")) ? p.disabled : false;
										self[control + suffix[type]].set("disabled", disabled);
									} else {
										self[control + suffix[type]].set("disabled", false);
									}
								});
							}
							
							if (c == "check") {
								array.forEach(_.keys(d), function(control) {
									var v = _.pick(d[control], value);
									var y = _.first(_.values(v));
									var w = y.whitelist;
									
									var m = control;
									var n = m + suffix[type];
									var s = category[type];
									
									var z = self._interface.region[self._region].controls[s][m].labels[self[n].get("value")];
									if (!_.isUndefined(w) && w.length > 0 && _.indexOf(w, z) < 0) {
										self[n].set("value", _.indexOf(self._interface.region[self._region].controls[s][m].labels, _.first(w)));
									}
									var disabled = (_.has(y, "disabled")) ? y.disabled : false;
									self[n].set("disabled", disabled);
								});
							}
							
							if (c == "togglebutton") {
								array.forEach(_.keys(d), function(control) {
									var v = _.pick(d[control], value);
									var y = _.first(_.values(v));
									var w = y.whitelist;
									
									var m = control;
									var n = m + suffix[type];
									var s = category[type]
									
									var hazard = self.hazardSelect.value;
									var labels = (_.isArray(self._interface.region[self._region].controls[s][m].labels)) ? self._interface.region[self._region].controls[s][m].labels : self._interface.region[self._region].controls[s][m].labels[hazard];
									
									var z = labels[self[n].get("value")];
									if (!_.isUndefined(w) && w.length > 0 && _.indexOf(w, z) < 0) {
										self[n].set("value", _.indexOf(labels, _.first(w)));
									}
									
									var disabled = (_.has(y, "disabled")) ? y.disabled : false;
									self[n].set("disabled", disabled);
								});
							}
						}
						if (type == "check") {
							array.forEach(_.keys(d), function(control) {
								var checked = (self[control + suffix[type]].checked) ? "checked" : "unchecked";
								
								var v = _.pick(d[control], checked);
								var y = _.first(_.values(v));
								var w = y.whitelist;
								
								var m = y.control;
								var n = m + suffix[c];
								var s = category[c];
								
								var z = self._interface.region[self._region].controls[s][m].labels[self[n].get("value")];
								if (!_.isUndefined(w) && w.length > 0 && _.indexOf(w, z) < 0) {
									self[n].set("value", _.indexOf(self._interface.region[self._region].controls[s][m].labels, _.first(w)));
								}
								var disabled = (_.has(y, "disabled")) ? y.disabled : false;
								self[n].set("disabled", disabled);
							});
						}
						if (type == "togglebutton") {
							array.forEach(_.keys(d), function(control) {
								if (c == "slider") {
									var hazard = self.hazardSelect.value;
									var labels = (_.isArray(self._interface.region[self._region].controls[c][name].labels)) ? self._interface.region[self._region].controls[c][name].labels : self._interface.region[self._region].controls[c][name].labels[hazard];
									var v = _.pick(d[control], labels[value]);
									if (!_.isEmpty(v)) {
										var y = _.first(_.values(v));
										var w = y.whitelist;
										var z = _.first(query(".plugin-slr .toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + control + " input:checked")).value;
										if (!_.isUndefined(w) && w.length > 0 && _.indexOf(w, z) < 0) {
											self[ _.first(w) + suffix[type]].checked = true;
										}
									}
								}
							
							});
							
						}
					});
				}
			}
			
			this.updateInterface = function(control){
				
				this.chart = {}
				domStyle.set(this.chartContainer, "display", "none");
				domConstruct.empty(this.chartHeader);
				domConstruct.empty(this.chartContent);
				
				domStyle.set(this.imagesContainer, "display", "none");
				domConstruct.empty(this.imagesHeader);
				domConstruct.empty(this.imagesImage);
				
				domStyle.set(this.hazardFooterDiv, "display", "none");
				domConstruct.empty(this.hazardFooterDiv);
				
				domStyle.set(this.partnersContainer, "display", "none");
				domConstruct.empty(this.partnersContent);
				
				domConstruct.empty(this.hazardSelect);
				if (this._region != "") {
					array.forEach(this._interface.region[this._region].controls.select.hazard.options, function(item) {
						domConstruct.create("option", { innerHTML: item.name, value: item.value }, self.hazardSelect);
					});
				} else {
					domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.hazardSelect);
				}
				
				_.first(query(".slr-region-geography")).innerHTML = (_.has(this._interface.region[this._region], "geography")) ? this._interface.region[this._region].geography : "Region";
				
				if (control == "region") {
					if (this._region != "" && _.has(this._interface.region[this._region].controls.select, "datasource")) {
						
						domConstruct.empty(this.dataSourceSelect);
						var options = this._interface.region[this._region].controls.select.datasource.options;
						array.forEach(options, function(item) {
							domConstruct.create("option", { innerHTML: item.name, value: item.value }, self.dataSourceSelect);
						});
						
						var display = (options.length > 1) ? "block" : "none";
						domStyle.set(this.dataSourceSelect.parentNode.parentNode, "display",  display);
						
						var number = (options.length > 1) ? 3 : 2;
						_.first(query('.slr-' + this._map.id + '-hazard .info-circle-text')).innerHTML = number;
						
						var backgroundColor = (this.dataSourceSelect.value != "") ? "#2B2E3B" : "#94959C";
						query(".downloadButton").style("backgroundColor", backgroundColor);
						
					} else {
						var backgroundColor = ((!_.isObject(self._interface.region[self._region].download.report) && self._interface.region[self._region].download.report != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, "default") && self._interface.region[self._region].download.report.default != "")) ? "#2B2E3B" : "#94959C";
						query(".downloadButton.slr-report").style("backgroundColor", backgroundColor);
						
						var backgroundColor = ((!_.isObject(self._interface.region[self._region].download.data) && self._interface.region[self._region].download.data != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, "default") && self._interface.region[self._region].download.data.default != "")) ? "#2B2E3B" : "#94959C";
						query(".downloadButton.slr-data").style("backgroundColor", backgroundColor);
						
						domStyle.set(this.dataSourceSelect.parentNode.parentNode, "display",  "none");
						_.first(query('.slr-' + this._map.id + '-hazard .info-circle-text')).innerHTML = 2;
						
						
					}
				}
								
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "climate") && _.has(this._interface.region[this._region].controls.slider.climate, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.climate.labels)) ? this._interface.region[this._region].controls.slider.climate.labels : this._interface.region[this._region].controls.slider.climate.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.climate.labels))]
				} else {
					var labels = this._defaultLabels.climate;
				}
				this.climateSlider.set("maximum", labels.length-1);
				this.climateSlider.set("discreteValues", labels.length);
				this.climateSliderLabels.set("labels",labels);
				this.climateSliderLabels.set("count", labels.length);
				this.climateSliderLabels.buildRendering();
								
				//var title = (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "climate") && _.has(this._interface.region[this._region].controls.slider.climate, "title")) ? this._interface.region[this._region].controls.slider.climate.title : this._defaultTitles.climate;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "climate") && _.has(this._interface.region[this._region].controls.slider.climate, "title")) {
					var title = (_.isObject(self._interface.region[self._region].controls.slider.climate.title)) ? this._interface.region[this._region].controls.slider.climate.title[_.first(_.keys(this._interface.region[this._region].controls.slider.climate.title))] : this._interface.region[this._region].controls.slider.climate.title;
				} else {
					var title = self._defaultTitles.climate;
				}
				_.first(query("span.slr-control-title.climate")).innerHTML = title;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "scenario") && _.has(this._interface.region[this._region].controls.slider.scenario, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.scenario.labels)) ? this._interface.region[this._region].controls.slider.scenario.labels : this._interface.region[this._region].controls.slider.scenario.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.scenario.labels))]
				} else {
					var labels = this._defaultLabels.scenario;
				}
				this.scenarioSlider.set("maximum", labels.length-1);
				this.scenarioSlider.set("discreteValues", labels.length);
				this.scenarioSliderLabels.set("labels",labels);
				this.scenarioSliderLabels.set("count", labels.length);
				this.scenarioSliderLabels.buildRendering();
				
				//var title = (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "scenario") && _.has(this._interface.region[this._region].controls.slider.scenario, "title")) ? this._interface.region[this._region].controls.slider.scenario.title : this._defaultTitles.scenario;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "scenario") && _.has(this._interface.region[this._region].controls.slider.scenario, "title")) {
					var title = (_.isObject(self._interface.region[self._region].controls.slider.scenario.title)) ? this._interface.region[this._region].controls.slider.scenario.title[_.first(_.keys(this._interface.region[this._region].controls.slider.scenario.title))] : this._interface.region[this._region].controls.slider.scenario.title;
				} else {
					var title = self._defaultTitles.scenario;
				}
				_.first(query("span.slr-control-title.scenario")).innerHTML = title;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "stormSurge") && _.has(this._interface.region[this._region].controls.slider.stormSurge, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.stormSurge.labels)) ? this._interface.region[this._region].controls.slider.stormSurge.labels : this._interface.region[this._region].controls.slider.stormSurge.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.stormSurge.labels))]
				} else {
					var labels = this._defaultLabels.stormSurge;
				}
				this.stormSurgeSlider.set("maximum", labels.length-1);
				this.stormSurgeSlider.set("discreteValues", labels.length);
				this.stormSurgeSliderLabels.set("labels",labels);
				this.stormSurgeSliderLabels.set("count", labels.length);
				this.stormSurgeSliderLabels.buildRendering();
				
				//var title = (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "stormSurge") && _.has(this._interface.region[this._region].controls.slider.stormSurge, "title")) ? this._interface.region[this._region].controls.slider.stormSurge.title : this._defaultTitles.stormSurge;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "stormSurge") && _.has(this._interface.region[this._region].controls.slider.stormSurge, "title")) {
					var title = (_.isObject(self._interface.region[self._region].controls.slider.stormSurge.title)) ? this._interface.region[this._region].controls.slider.stormSurge.title[_.first(_.keys(this._interface.region[this._region].controls.slider.stormSurge.title))] : this._interface.region[this._region].controls.slider.stormSurge.title;
				} else {
					var title = self._defaultTitles.stormSurge;
				}
				_.first(query("span.slr-control-title.stormSurge")).innerHTML = title;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "hurricane") && _.has(this._interface.region[this._region].controls.slider.hurricane, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.hurricane.labels)) ? this._interface.region[this._region].controls.slider.hurricane.labels : this._interface.region[this._region].controls.slider.hurricane.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.hurricane.labels))]
				} else {
					var labels = this._defaultLabels.hurricane;
				}
				this.hurricaneSlider.set("maximum", labels.length-1);
				this.hurricaneSlider.set("discreteValues", labels.length);
				this.hurricaneSliderLabels.set("labels",labels);
				this.hurricaneSliderLabels.set("count", labels.length);
				this.hurricaneSliderLabels.buildRendering();
				
				//var title = (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "hurricane") && _.has(this._interface.region[this._region].controls.slider.hurricane, "title")) ? this._interface.region[this._region].controls.slider.hurricane.title : this._defaultTitles.hurricane;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "hurricane") && _.has(this._interface.region[this._region].controls.slider.hurricane, "title")) {
					var title = (_.isObject(self._interface.region[self._region].controls.slider.hurricane.title)) ? this._interface.region[this._region].controls.slider.hurricane.title[_.first(_.keys(this._interface.region[this._region].controls.slider.hurricane.title))] : this._interface.region[this._region].controls.slider.hurricane.title;
				} else {
					var title = self._defaultTitles.hurricane;
				}
				_.first(query("span.slr-control-title.hurricane")).innerHTML = title;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "sealevelrise") && _.has(this._interface.region[this._region].controls.slider.sealevelrise, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.sealevelrise.labels)) ? this._interface.region[this._region].controls.slider.sealevelrise.labels : this._interface.region[this._region].controls.slider.sealevelrise.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.sealevelrise.labels))]
				} else {
					var labels = this._defaultLabels.sealevelrise;
				}
				this.sealevelriseSlider.set("maximum", labels.length-1);
				this.sealevelriseSlider.set("discreteValues", labels.length);
				this.sealevelriseSliderLabels.set("labels",labels);
				this.sealevelriseSliderLabels.set("count", labels.length);
				this.sealevelriseSliderLabels.buildRendering();
				
				//var title = (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "sealevelrise") && _.has(this._interface.region[this._region].controls.slider.sealevelrise, "title")) ? this._interface.region[this._region].controls.slider.sealevelrise.title : this._defaultTitles.sealevelrise;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "slider") && _.has(this._interface.region[this._region].controls.slider, "sealevelrise") && _.has(this._interface.region[this._region].controls.slider.sealevelrise, "title")) {
					var title = (_.isObject(self._interface.region[self._region].controls.slider.sealevelrise.title)) ? this._interface.region[this._region].controls.slider.sealevelrise.title[_.first(_.keys(this._interface.region[this._region].controls.slider.sealevelrise.title))] : this._interface.region[this._region].controls.slider.sealevelrise.title;
				} else {
					var title = self._defaultTitles.sealevelrise;
				}
				_.first(query("span.slr-control-title.sealevelrise")).innerHTML = title;
				
				domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.sealevelriseSlider.domNode.parentNode, "display",  "none");
				domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
				domStyle.set(this.stormSurgeSlider.domNode.parentNode, "display",  "none");
				
				this.climateSlider.set("value", 0);
				this.climateSlider.set("disabled", true);
				this.scenarioSlider.set("value", 0);
				this.scenarioSlider.set("disabled", true);
				this.sealevelriseSlider.set("value", 0);
				this.sealevelriseSlider.set("disabled", true);
				this.stormSurgeSlider.set("value", 0);
				this.stormSurgeSlider.set("disabled", true);
				
				this.opacitySlider.set("disabled", true);
				
				if (this._region != "") {
					if (_.has(this._interface.region[this._region].controls, "tree") && _.has(this._interface.region[this._region].controls.tree, "storm")) {
						domStyle.set(_.first(query(".storm-toggle")).parentNode, "display", "none");
						
						var indent = (_.has(this._interface.region[this._region].controls.tree.storm, "displayIndent")) ? this._interface.region[this._region].controls.tree.storm.displayIndent : true;
						var bottom = (indent) ? "15px" : "5px";
						domStyle.set(_.first(query(".storm-toggle")).parentNode, "margin-bottom", bottom);
						
						var label = (_.has(this._interface.region[this._region].controls.tree.storm, "label")) ? this._interface.region[this._region].controls.tree.storm.label : "";
						_.first(query(".storm-toggle-header-label")).innerHTML = label;
						
						var display = (_.has(this._interface.region[this._region].controls.tree.storm, "displayLabel") && this._interface.region[this._region].controls.tree.storm.displayLabel) ? "block" : "none";
						query(".storm-toggle-header").style("display", display);
						
						array.forEach(query(".storm-toggle-icon"), function(node) {
							domClass.replace(node, "fa-caret-right", "fa-caret-down");
						});
						query(".storm-toggle-container").style("display", "none");
						query(".storm-toggle-td").style("display", "none");
						query(".storm-toggle-subitem").style("display", "none");
						query("div[class*=slr-model-storm-" + this._region.replace(/ /g,"_").toLowerCase()  + "]").style("display", "block");
						
						var type = (_.has(this._interface.region[this._region].controls.tree.storm, "displayType")) ? this._interface.region[this._region].controls.tree.storm.displayType : "fixed";
						var indent = (_.has(this._interface.region[this._region].controls.tree.storm, "displayIndent")) ? this._interface.region[this._region].controls.tree.storm.displayIndent : false;
						if (type == "fixed") {
							query(".storm-toggle-container").style("display", "block");
						}
						
						array.forEach(this._interface.region[this._region].controls.tree.storm.values, function(value) {
							if (type == "fixed") {
								var node = _.first(query("div[class*=slr-model-storm-" + self._region.replace(/ /g,"_").toLowerCase() + "_" + value.value +"] .storm-toggle-text"));
								var display = (_.has(value, "displayLabel") && value.displayLabel) ? "block" : "none";
								domStyle.set(node, "display", display);
								if (!indent) {
									domStyle.set(node.parentNode, "padding-left", "0px");
								}
								
								var td = _.first(query("div[class*=slr-model-storm-" + self._region.replace(/ /g,"_").toLowerCase() + "_" + value.value +"] .storm-toggle-td"))
								domStyle.set(td, "display", "block");
								if (!indent) {
									domStyle.set(td, "padding-left", "0px");
									domStyle.set(td.firstChild, "margin-left", "0px");
								}
							}
							array.forEach(value.controls, function(control) {
								dojo.byId("slr-model-storm-" + control.value + "-layer-" + self._region.replace(/ /g,"_").toLowerCase() + "_" + value.value).checked = false;
							});
						});
						if (!_.isEmpty(this._mapLayers)) {
							this._mapLayers[this._region].model_storm.setVisibleLayers([]);
						}
					} else {
						if (query(".storm-toggle").length > 0) {
							domStyle.set(_.first(query(".storm-toggle")).parentNode, "display", "none");
						}
					}
				} else {
					if (query(".storm-toggle").length > 0) {
						domStyle.set(_.first(query(".storm-toggle")).parentNode, "display", "none");
					}
				}
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "radiocheck") && _.has(this._interface.region[this._region].controls.radiocheck, "hazard")) {
					this.hazardCheckBox.checked = false;
					this.hazardCheckBox.disabled = this._interface.region[this._region].controls.radiocheck.hazard.disabled;
				}
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls, "radiocheck") && _.has(this._interface.region[this._region].controls.radiocheck, "armor")) {
					this.armorCheckBox.checked = false;
					this.armorCheckBox.disabled = this._interface.region[this._region].controls.radiocheck.armor.disabled;
					
				}
				domStyle.set(this.hazardCheckBox.parentNode, "display", "none");
				domStyle.set(this.armorCheckBox.parentNode, "display", "none");
				domStyle.set(this.hazardCheckBox.parentNode.parentNode, "display", "none");
				
				this.hazardDescriptionDiv.innerHTML = "";
				domStyle.set(this.hazardDescriptionDiv, "display", "none");
				
				var rbs = _.where(this._interface.region[this._region].controls.radiocheck, {"type":"radio"});
				if (rbs.length > 0) {
					array.forEach(rbs, function(rb) {
						self[rb.name + "RadioButton"].checked = rb.checked;
					});
				}
				domStyle.set(this.radioButtonDiv, "display", "none");
				
				array.forEach(query('.plugin-slr .toggle-btn input[id*="togglebutton"]'), function(node) {
					domStyle.set(node.parentNode.parentNode, "display", "none");
				})
				domStyle.set(this.toggleDiv, "display", "none");
				
				this.otherCheckBox.checked = false;
				var label = ( _.has(this._interface.region[this._region].controls.radiocheck, "other")) ? this._interface.region[this._region].controls.radiocheck.other.label : "";
				this.otherCheckBoxLabel.innerHTML = label;
				//_.first(query("#" + this.otherCheckBox.id + "-label span")).innerHTML = label;
				var visible = (this._region != "" && _.has(this._interface.region[this._region].controls.radiocheck, "other")) ? "visible" : "hidden";
				domStyle.set(this.otherCheckBox.parentNode.parentNode, "visibility",  visible);
				
				array.forEach(_.keys(this._mapLayers), function(region) {
					array.forEach(_.keys(self._mapLayers[region]), function(layer) {
						if (!_.isObject(self._interface.region[region].layers[layer]) || (_.has(self._interface.region[region].layers[layer], "type") && self._interface.region[region].layers[layer].type == "dynamic") ) {
							self._mapLayers[region][layer].setVisibleLayers([]);
						}
						self._mapLayers[region][layer].hide()	
					})
				})
				
				if (this._region != "" && !_.isEmpty(this._mapLayers)) {
					this._mapLayer = this._mapLayers[this._region].main;
					this._mapLayer.show();
					var extent = new Extent(this._interface.region[this._region].extent);
					this._map.setExtent(extent, true);
				} else {
					this._mapLayer = {};
				}
				
				domStyle.set(this.chartContainer, "display", "none");
				if (this._region != "" && _.has(this._interface.region[this._region], "chart")) {
					this.createChart();
				}
			}
			
			this.updateControls = function() {
				var display = (this._interface.infoGraphic.show) ? "block": "none";
				domStyle.set(this.infoGraphicButton, "display", display);
				
				var hazard = this.hazardSelect.value.toLowerCase();
				if (hazard != "") {
					var options = this._interface.region[this._region].controls.select.hazard.options
					var hazardOption = options[array.map(options, function(option) { return option.value }).indexOf(hazard)];
					
					domStyle.set(this.climateSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.sealevelriseSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.stormSurgeSlider.domNode.parentNode, "display",  "none");
					
					domStyle.set(this.hazardCheckBox.parentNode, "display", "none");
					domStyle.set(this.armorCheckBox.parentNode, "display", "none");
					query(".toggle-div." + this._region.replace(/ /g,"_").toLowerCase()).style("display", "none");
					
					if (query(".storm-toggle").length > 0) {
						domStyle.set(_.first(query(".storm-toggle")).parentNode, "display", "none");
					}
					
					array.forEach(options, function(opt) { 
						if (_.has(opt, "controls")) {
							if (_.has(opt.controls, "radiocheck")) {
								var control = _.first(opt.controls.radiocheck);
								if (self._interface.region[self._region].controls.radiocheck[control].type == "check") {
									var type = "CheckBox";
									self[control + type].checked = false;
									domStyle.set(self[control + type].parentNode.parentNode, "display", "none");
								} else {
									var type = "RadioButton";
									self[control + "RadioButton"].checked = true;
									domStyle.set(self[control + type].parentNode.parentNode.parentNode, "display", "none");
								}
							}
							if (_.has(opt.controls, "togglebutton")) {
								array.forEach(opt.controls.togglebutton, function(control) {
									var tb = _.first(query(".toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + control));
									array.forEach(query("input", tb), function(rb) {
										var checked = self._interface.region[self._region].controls.togglebutton[control].controls[rb.value].checked;
										rb.checked = checked;
									})
									domStyle.set(tb.parentNode.parentNode, "display", "none");
								})
							}
						}
					});
					
					array.forEach(_.keys(hazardOption.controls), function(key) {
						array.forEach(hazardOption.controls[key], function(control) {
							if (key == "slider") {
								domStyle.set(self[control + "Slider"].domNode.parentNode, "display",  "block")
								self[control + "Slider"].set("disabled", false);
								
								if (_.has(self._interface.region[self._region].controls.slider[control], "labels") && !_.isArray(self._interface.region[self._region].controls.slider[control].labels)) {
									var labels = self._interface.region[self._region].controls.slider[control].labels[hazard];
									self[control + "Slider"].set("value", 0);
									self[control + "Slider"].set("maximum", labels.length-1);
									self[control + "Slider"].set("discreteValues", labels.length);
									self[control + "SliderLabels"].set("labels",labels);
									self[control + "SliderLabels"].set("count", labels.length);
									self[control + "SliderLabels"].buildRendering();
								}
								
								if (_.has(self._interface.region[self._region].controls.slider[control], "title")) {
									var title = (_.keys(self._interface.region[self._region].controls.slider[control].title).length > 0 && _.has(self._interface.region[self._region].controls.slider[control].title, hazard)) ? self._interface.region[self._region].controls.slider[control].title[hazard] : (_.keys(self._interface.region[self._region].controls.slider[control].title).length == 0) ? self._interface.region[self._region].controls.slider[control].title : self._defaultTitles[control];
								} else {
									var title = self._defaultTitles[control];
								}
								_.first(query("span.slr-control-title." + control)).innerHTML = title;
							}
							if (key == "radiocheck" ) {
								if (self._interface.region[self._region].controls.radiocheck[control].type == "check") {
									domStyle.set(self[control + "CheckBox"].parentNode.parentNode, "display", "block");
									domStyle.set(self[control + "CheckBox"].parentNode, "display", "inline-block");
								} else {
									domStyle.set(self[control + "RadioButton"].parentNode.parentNode.parentNode, "display", "block");
								}
							}
							if (key == "togglebutton") {
								if (_.contains(hazardOption.controls[key], control)) {
									domStyle.set(_.first(query(".toggle-div." + self._region.replace(/ /g,"_").toLowerCase() + "." + control)), "display", "block");
									domStyle.set(_.first(query(".toggle-div." + self._region.replace(/ /g,"_").toLowerCase() + "." + control)).parentNode, "display", "block");
								}
							}
							if (key == "tree") {
								domStyle.set(_.first(query("." + control + "-toggle")).parentNode, "display", "block");
							}
						})
					});
					
					if (_.has(hazardOption, "description") ) {
						this.hazardDescriptionDiv.innerHTML = hazardOption.description;
						domStyle.set(this.hazardDescriptionDiv, "display", "block");
					} else {
						this.hazardDescriptionDiv.innerHTML = "";
						domStyle.set(this.hazardDescriptionDiv, "display", "none");
					}
					
					if (_.has(hazardOption, "footer") ) {
						domStyle.set(this.hazardFooterDiv, "display", "block");
						this.hazardFooterDiv.innerHTML = hazardOption.footer;
					} else {
						domStyle.set(this.hazardFooterDiv, "display", "none");
						domConstruct.empty(this.hazardFooterDiv);
					}
					
					if (_.has(hazardOption, "chart") && hazardOption.chart) {
						domStyle.set(this.chartContainer, "display", "block");
					} else {
						domStyle.set(this.chartContainer, "display", "none");
					}
					
					if (_.has(hazardOption, "images") && hazardOption.images) {
						domStyle.set(this.imagesContainer, "display", "block");
						this.imagesHeader.innerHTML = this._interface.region[self._region].images.header;
					} else {
						domStyle.set(this.imagesContainer, "display", "none");
						this.imagesHeader.innerHTML = "";
					}
					
					if (_.has(hazardOption, "partners")) {
						domStyle.set(this.partnersContainer, "display", "block");
						var content = "";
						dojo.forEach(hazardOption.partners, function(partner) {
							content += "<div><img src='" + self._plugin_directory + "/" + partner.logoPath + "'></div>"
						})
						this.partnersContent.innerHTML = content;
					} else {
						domStyle.set(this.partnersContainer, "display", "none");
						domConstruct.empty(this.partnersContent);
					}
					
					if (_.has(hazardOption.controls, "infoGraphic") && hazardOption.controls.infoGraphic) {
						domStyle.set(this.infoGraphicButton, "display", "block");
						domAttr.set(this.infoGraphicButton, "data-popup", JSON.stringify(this._interface.region[this._region].controls.infoGraphic[hazard].popup));
						domAttr.set(this.infoGraphicButton, "data-url", this._interface.region[this._region].controls.infoGraphic[hazard].url)
					}
					
					if (_.has(this._interface.region[this._region].controls, "tree") && _.has(this._interface.region[this._region].controls.tree, "storm")) {
						
						array.forEach(query(".storm-toggle-icon"), function(node) {
							domClass.replace(node, "fa-caret-right", "fa-caret-down");
						});
						query(".storm-toggle-container").style("display", "none");
						query(".storm-toggle-td").style("display", "none");
						query(".storm-toggle-subitem").style("display", "none");
						query("div[class*=slr-model-storm-" + this._region.replace(/ /g,"_").toLowerCase()  + "]").style("display", "block");
						
						var type = (_.has(this._interface.region[this._region].controls.tree.storm, "displayType")) ? this._interface.region[this._region].controls.tree.storm.displayType : "fixed";
						if (type == "fixed") {
							query(".storm-toggle-container").style("display", "block");
						}
						
						array.forEach(this._interface.region[this._region].controls.tree.storm.values, function(value) {
							if (type == "fixed") {
								var node = _.first(query("div[class*=slr-model-storm-" + self._region.replace(/ /g,"_").toLowerCase() + "_" + value.value +"] .storm-toggle-text"));
								var display = (_.has(value, "displayLabel") && value.displayLabel) ? "block" : "none";
								domStyle.set(node, "display", display);
								
								query("div[class*=slr-model-storm-" + self._region.replace(/ /g,"_").toLowerCase() + "_" + value.value +"] .storm-toggle-td").style("display", "block");
							}
							array.forEach(value.controls, function(control) {
								dojo.byId("slr-model-storm-" + control.value + "-layer-" + self._region.replace(/ /g,"_").toLowerCase() + "_" + value.value).checked = false;
							});
						});
						
					}
					
					var disable = (hazard == "") ? true : false;
					this.climateSlider.set("disabled", disable);
					this.opacitySlider.set("disabled", false);
					
					var backgroundColor = ((!_.isObject(self._interface.region[self._region].download.report) && self._interface.region[self._region].download.report != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, "default") && self._interface.region[self._region].download.report.default != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, self.hazardSelect.value)))  ? "#2B2E3B" : "#94959C";
					query(".downloadButton").style("backgroundColor", backgroundColor);
					
					var backgroundColor = ((!_.isObject(self._interface.region[self._region].download.data) && self._interface.region[self._region].download.data != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, "default") && self._interface.region[self._region].download.data.default != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, self.hazardSelect.value)))  ? "#2B2E3B" : "#94959C";
					query(".downloadButton.slr-data").style("backgroundColor", backgroundColor);
					
					
				} else {
					domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
					domStyle.set(this.sealevelriseSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
					domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.stormSurgeSlider.domNode.parentNode, "display",  "none");
				
					if (_.has(this._interface.region[this._region].controls.radiocheck, "hazard")) {
						this.hazardCheckBox.checked = false;
						domStyle.set(this.hazardCheckBox.parentNode.parentNode, "display", "none");
					}
					
					domStyle.set(this.radioButtonDiv, "display", "none");
					domStyle.set(this.toggleDiv, "display", "none");
					
					this.hazardDescriptionDiv.innerHTML = "";
					domStyle.set(this.hazardDescriptionDiv, "display", "none");
					
					this.climateSlider.set("value", 0);
					this.climateSlider.set("disabled", true);
					this.scenarioSlider.set("value", 0);
					this.scenarioSlider.set("disabled", true);
					this.hurricaneSlider.set("value", 0);
					this.hurricaneSlider.set("disabled", true);
					this.stormSurgeSlider.set("value", 0);
					this.stormSurgeSlider.set("disabled", true);
					
					if (_.has(this._interface.region[this._region].controls, "tree") && _.has(this._interface.region[this._region].controls.tree, "storm")) {
						domStyle.set(_.first(query(".storm-toggle")).parentNode, "display", "none");
						array.forEach(this._interface.region[this._region].controls.tree.storm.values, function(value) {
							array.forEach(value.controls, function(control) {
								dojo.byId("slr-model-storm-" + control.value + "-layer-" + self._region.replace(/ /g,"_").toLowerCase() + "_" + value.value).checked = false;
							});
						});
					}
					
					var disable = (!_.has(this._interface.region[this._region].controls.radiocheck, "other")) ? true : false;
					this.opacitySlider.set("disabled", disable);
					
					var backgroundColor = ((!_.isObject(self._interface.region[self._region].download.report) && self._interface.region[self._region].download.report != "") || (_.isObject(self._interface.region[self._region].download.report) && _.has(self._interface.region[self._region].download.report, "default") && self._interface.region[self._region].download.report.default != ""))  ? "#2B2E3B" : "#94959C";
					query(".downloadButton.slr-report").style("backgroundColor", backgroundColor);
					
					var backgroundColor = ((!_.isObject(self._interface.region[self._region].download.data) && self._interface.region[self._region].download.data != "") || (_.isObject(self._interface.region[self._region].download.data) && _.has(self._interface.region[self._region].download.data, "default") && self._interface.region[self._region].download.data.default != ""))  ? "#2B2E3B" : "#94959C";
					query(".downloadButton.slr-data").style("backgroundColor", backgroundColor);
					
					domStyle.set(this.hazardFooterDiv, "display", "none");
					domConstruct.empty(this.hazardFooterDiv);
						
					domStyle.set(this.partnersContainer, "display", "none");
					domConstruct.empty(this.partnersContent);
				}
			}
			
			this.createChart = function() {
				this.chartHeader.innerHTML = this._interface.region[this._region].chart.title;
				
				var margin = {top: 20, right: 0, bottom: 35, left: 40}
				var width = 230;
				var height = 200;
				var padding = 0.25;
				
				this.chart = {}
				
				this.chart.formatter = function(value,n) {
					return Math.round(value/n);
				}
				
				this.chart.dimensions = { height: height, width: width, margin: margin, padding: padding }
				
				this.chart.x = d3.scale.ordinal()
					.rangeRoundBands([0, width], padding, padding);

				this.chart.y = d3.scale.linear()
					.rangeRound([height, 0]);

				this.chart.color = d3.scale.ordinal()
					.range(["#98abc5", "#7b6888", "#6b486b"]);
				
				this.chart.xaxis = d3.svg.axis()
					.scale(this.chart.x)
					.orient("bottom")
					.tickFormat(function(d) { return d; });

				this.chart.yaxis = d3.svg.axis()
					.scale(this.chart.y)
					.orient("left")
					.tickFormat(function(d) { return self.chart.formatter(d, 1000);});

				this.chart.pane = d3.select(".slr-chart-content")
					.append("svg")
					.attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
					.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				this.chart.data = [];
				d3.csv(this._plugin_directory + "/data/" + this._interface.region[this._region].chart.data, function(error, data) {
						var data = data.filter(function(d) { return d['county'] == self._region });
						
						self.chart.x.domain(data.map(function(d) { return d.category; }));
						self.chart.y.domain([0, d3.max(data, function(d) { return parseInt(d.total) + 15000; })]).nice()
						
						self.chart.color.domain(d3.keys(data[0]).filter(function(key) { return key !== "county" && key !== "total" && key !== "category" }));
						data.forEach(function(d) {
							var y0 = 0;
							d.categories = self.chart.color.domain().map(function(name, i) { return {name: name, y0: y0, y1: y0 += +d[name], order:i }; }).reverse();
						});
						self.chart.data = dojo.clone(data);
						
						self.chart.pane.append("g")
							.attr("class", "x axis")
							.attr("transform", "translate(0," + self.chart.dimensions.height + ")")
							.call(self.chart.xaxis)
							
						self.chart.pane.append("text")
							.attr("class", "x-axis-title")
							.attr("transform", "translate(" + (self.chart.dimensions.width/2) + "," + (self.chart.dimensions.height + self.chart.dimensions.margin.bottom)+ ")")
							.style("text-anchor", "middle")
							.text("Sea Level Rise");
						
						self.chart.pane.append("g")
							.attr("class", "y axis e")
							.call(self.chart.yaxis)
							.append("text")
							.attr("transform", "rotate(-90)")
							.attr("x", 0 - (self.chart.dimensions.height/2))
							.attr("y", 0 - self.chart.dimensions.margin.left)
							.attr("dy", ".7em")
							.style("text-anchor", "middle")
							.text("Acres Inundated (thousands)")
							
						var categories = self.chart.pane.selectAll(".categories")
							.data(data)
							.enter().append("g")
							.attr("class", function(d, i) { return "categories cat" + i; })
							.attr("cursor", "pointer")
							.attr("transform", function(d) { return "translate(" + self.chart.x(d.category) + ",0)"; });

						categories.selectAll("rect")
							.data(function(d) {
								d.categories.forEach(function(o){
									if (parseInt(o.order) > parseInt(self.scenarioSlider.get("value"))) {
										o.y0 = 0;
										o.y1 = 0;
									}
								}); 
								return d.categories;
							})
							.enter().append("rect")
							.attr("width", self.chart.x.rangeBand())
							.attr("y", function(d) { return self.chart.y(d.y1); })
							.attr("height", function(d) { return self.chart.y(d.y0) - self.chart.y(d.y1); })
							.style("fill", function(d) { return self.chart.color(d.name); });
							
						var legend = self.chart.pane.selectAll(".slr-chart-legend")
							.data(self.chart.color.domain().slice().reverse())
							.enter().append("g")
							.attr("class", function(d) { return "slr-chart-legend " + d; })
							.attr("transform", function(d, i) { return "translate(0," + ((i * 16) - 0) + ")"; });

						legend.append("rect")
							.attr("x", 14)
							.attr("width", 14)
							.attr("height", 14)
							.style("fill", self.chart.color)
							.style("stroke", "#bbbbbb")
							.attr("cursor", "pointer");

						legend.append("text")
							.attr("x", 33)
							.attr("y", 7)
							.attr("dy", ".35em")
							.style("text-anchor", "start")
							.text(function(d) { return d.replace("yr", " yr Flood"); });
							
							self.highlightChart(0);
				})
			
			}
			
			this.updateChart = function() {
				var value = this[this._interface.region[this._region].chart.controls.chart + "Slider"].get("value");
				var data = dojo.clone(self.chart.data);
				var categories = this.chart.pane.selectAll(".categories")
					.data(data);
				categories
					.selectAll("rect")
					.data(function(d) {
						d.categories.forEach(function(o){
							if ( parseInt(o.order) > parseInt(value) || (_.has(self._interface.region[self._region].chart, "exclude-value") && value == self._interface.region[self._region].chart["exclude-value"]) ) {
								o.y0 = 0;
								o.y1 = 0;
							}
						});					
						return d.categories;
					})
					.transition()
					.duration(500)
					.attr("y", function(d) { return self.chart.y(d.y1); })
					.attr("height", function(d) { return self.chart.y(d.y0) - self.chart.y(d.y1); })
			}
			
			this.highlightChart = function() {
				var value = this[this._interface.region[this._region].chart.controls.highlight + "Slider"].get("value");
				d3.selectAll(".slr-chart-content .categories").classed("active", false)
				d3.selectAll(".slr-chart-content .categories.cat" + value).classed("active", true);
			}
			
			this.loadImageOnClick = function(evt) {
				console.log(evt);
				
				this.imageHighlightId = evt.graphic.attributes[self._interface.region[self._region].images.layer.idField];
				
				var id = "slr-image-layer-" + this._region.toLowerCase().replace(" ", "_");
				var mapLayer = this._mapLayers[this._region][id];
				dojo.forEach(mapLayer.graphics, function(graphic) {
					graphic.setSymbol(self.imageSymbol);
				});
				
				evt.graphic.setSymbol(self.imageHighlightSymbol);
				
				var src = evt.graphic.attributes[self._interface.region[self._region].images.layer.imageField];
				var html = "<img src='" + src + "'>";
				this.imagesImage.innerHTML = html;
			}
			
			this.closeImageOnClick = function() {
				this.imagesImage.innerHTML = "";
				this.imageHighlightId = null;
				
				var id = "slr-image-layer-" + this._region.toLowerCase().replace(" ", "_");
				var mapLayer = this._mapLayers[this._region][id];
				dojo.forEach(mapLayer.graphics, function(graphic) {
					graphic.setSymbol(self.imageSymbol);
				});
	
			}
			
			this.resetInterface = function(){
				query(".downloadButton").style("backgroundColor", "#94959C");
				
				domConstruct.empty(this.hazardSelect);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.hazardSelect);
				
				domConstruct.empty(this.dataSourceSelect);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.dataSourceSelect);
				domStyle.set(this.dataSourceSelect.parentNode.parentNode, "display",  "none");
				_.first(query('.slr-' + this._map.id + '-hazard .info-circle-text')).innerHTML = 2;
				
				this.hazardCheckBox.checked = false;
				this.hazardCheckBox.disabled = true;
				domStyle.set(this.hazardCheckBox.parentNode.parentNode, "display", "none");
				
				this.hazardDescriptionDiv.innerHTML = "";
				domStyle.set(this.hazardDescriptionDiv, "display", "none");
				
				domStyle.set(this.radioButtonDiv, "display", "none");
				
				this.otherCheckBox.checked = false;
				domStyle.set(this.otherCheckBox.parentNode, "display", "none");
				
				var labels = this._defaultLabels.climate;
				this.climateSlider.set("maximum", labels.length-1);
				this.climateSlider.set("discreteValues", labels.length);
				this.climateSliderLabels.set("labels",labels);
				this.climateSliderLabels.set("count", labels.length);
				this.climateSliderLabels.buildRendering();
				
				var labels = this._defaultLabels.scenario;
				this.scenarioSlider.set("maximum", labels.length-1);
				this.scenarioSlider.set("discreteValues", labels.length);
				this.scenarioSliderLabels.set("labels",labels);
				this.scenarioSlider.set("count", labels.length);
				this.scenarioSlider.buildRendering();
				
				this.climateSlider.set("value", 0);
				this.climateSlider.set("disabled", true);
				this.sealevelriseSlider.set("value", 0);
				this.sealevelriseSlider.set("disabled", true);
				this.scenarioSlider.set("value", 0);
				this.scenarioSlider.set("disabled", true);
				this.hurricaneSlider.set("value", 1);
				this.hurricaneSlider.set("disabled", true);
				this.stormSurgeSlider.set("value", 1);
				this.stormSurgeSlider.set("disabled", true);
				
				domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.sealevelriseSlider.domNode.parentNode, "display",  "none");
				domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
				domStyle.set(this.stormSurgeSlider.domNode.parentNode, "display",  "none");
				
				if (!_.isEmpty(this.modelStorms)) {
					domStyle.set(_.first(query(".storm-toggle")).parentNode, "display", "none");
					array.forEach(_.keys(this.modelStorm), function(key) {
						array.forEach(this._interface.region[key].controls.tree.storm.values, function(value) {
							array.forEach(value.controls, function(control) {
								dojo.byId("slr-model-storm-" + control.replace(/ /g,"_").toLowerCase() + "-layer-" + self._region.replace(/ /g,"_").toLowerCase() + "_" + value.value).checked = false;
							});
						});
						self._mapLayers[key].model_storm.setVisibleLayers([]);
					})
				}
				
				this.opacitySlider.set("disabled", true);
				
				array.forEach(_.keys(this._mapLayers), function(region) {
					array.forEach(_.keys(self._mapLayers[region]), function(layer) {
						if (!_.isObject(self._interface.region[region].layers[layer]) || (_.has(self._interface.region[region].layers[layer], "type") && self._interface.region[region].layers[layer].type == "dynamic") ) {
							self._mapLayers[region][layer].setVisibleLayers([]);
						}
						self._mapLayers[region][layer].hide()	
					})
				})
				
				this._mapLayer = {};
				console.log('set extent');
				this._map.setExtent(new Extent(this._extent), false);
			}

			this.createTooltips = function() {
				on(query('*.fa[class*="slr-' + this._map.id + '"]'), "click", function(evt) {
					var cssClass = _.last(domAttr.get(this, "class").split(" "));
					var control = _.last(cssClass.split("-"));
					var tooltips = (self._interface.region[self._region] && _.has(self._interface.region[self._region], "tooltips")) ? self._interface.region[self._region].tooltips : self._interface.tooltips;
					var message = tooltips[control];
					if (!_.isUndefined(message)) {
						if (_.isObject(message)) {
							var value = self[message.control + "Select"].value;
							var popup = (_.has(message.values, value) && _.has(message.values[value], "popup") && message.values[value].popup) ? message.values[value].popup : false;
							if (popup) {
								var url = (_.has(message.values[value], "url")) ? message.values[value].url : "";
								var html = url.replace("PLUGIN-DIRECTORY", self._plugin_directory);
								var width = (_.has(message.values[value], "width")) ? message.values[value].width : 600;
								var height = (_.has(message.values[value], "height")) ? message.values[value].height : 400;
								TINY.box.show({
									animate: true,
									html: html,
									fixed: true,
									width: width + 40,
									height: height + 40
								});
							} else {
								var content = (_.has(message.values, value)) ? message.values[value] : message.values["default"];
								self.showMessageDialog(this, content);
							}
							
						} else {
							self.showMessageDialog(this, message);
						}
					}
				});
				
				on(this.tip, "blur", function() {
					window.setTimeout(function() {
						self.hideMessageDialog();
					}, 250);
				});
				
				on(this.tip, "click", function() {
					window.setTimeout(function() {
						self.hideMessageDialog();
					}, 250);
				});
			}

			this.showMessageDialog = function(node, message, position) {
				self.tip.innerHTML = message;
				domStyle.set(self.tip, { "display": "block" });
				
				var p = domGeom.position(win.body());
				var np = domGeom.position(node);
				var nm = domGeom.getMarginBox(node);
				var t = domGeom.getMarginBox(self.tip);
				
				var n = { "x": np.x, "y": np.y, "w": np.w, "h": (np.h == nm.h) ? np.h - 4 : np.h }
				
				var left = n.x - p.x + 1.5*n.w;
				var top = n.y - p.y - t.h/2 + n.h/2;
				
				left = (position && position.l) ? n.x - p.x + position.l : left;
				top = (position && position.t) ? n.y - p.y + t.h/2 + position.t : top;
				
				domStyle.set(self.tip, {
					"left": left + "px",
					"top": top + "px"
				});
				
				self.tip.focus();
            }

            this.hideMessageDialog = function() {
        		domStyle.set(self.tip, { "display": "none" });
			}


		};// End slrTool

		
		return slrTool;	
		
	} //end anonymous function

); //End define
