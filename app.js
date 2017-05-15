
define([
	    "dojo/_base/declare",
		"d3",
		"use!underscore",
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
		"esri/geometry/Extent",
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
			Extent
		  ) 
		
		{

		var slrTool = function(plugin, appData, appConfig){
			var self = this;
			this._plugin = plugin;
			this._app = this._plugin.app;
			this._container = this._plugin.container;
			this._plugin_directory = this._plugin.plugin_directory;
			this._legend = this._plugin.legendContainer;
			this._map = this._plugin.map;
			this._mapLayers = {};
			this._mapLayer = {};
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
			this._data = JSON.parse(appData);
			this._interface = JSON.parse(appConfig);
			this._firstLoad = this._plugin._firstLoad;
			this._defaultLabels = {
				climate:["Current", "2030", "2060", "2100"],
				scenario:["Low", "Medium", "High"],
				hurricane:["1","2","3","4","5"],
				sealevelrise: ["0","1","2","3","4","5"],
				stormSurge: ["Low", "Medium", "High", "Highest"]
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
				
				var loadingDiv = domConstruct.create("div", {
					innerHTML:"<i class='fa fa-spinner fa-spin fa-3x fa-fw'></i>",
					style:"position:absolute; left: 110px; top:50%; width:100px; height:100px; line-height:100px; text-align:center;"
				}, this._container);
				
				this.loadInterface(this);
			}
			
			this.showIntro = function(){
				var self = this;	
			};

			this.showTool = function(){
				//console.log("showTool");
				this._firstLoad = false;
				/* if (this.regionSelect.value != "") {
					this.updateMapLayers();
					this._map.setExtent(new Extent(this._interface.region[this._region].extent), false);
				} else {
					this._map.setExtent(new Extent(this._extent), false);
				} */
			} 

			this.hideTool = function(){
				//console.log("hideTool");
				/* if (this._mapLayer && this._mapLayer.loaded) { 
					this._mapLayer.setVisibleLayers([]);
					this._mapLayer.hide();
				} */
			}
			
			this.closeTool = function(){
				//console.log("closeTool");
				//this.slr.regionSelect.value = _.first(this.slr.regionSelect.options).value;
				//this.slr.resetInterface();
				if (!_.isEmpty(this._mapLayers)) {
					//console.log("hide layers");
					array.forEach(_.keys(this._mapLayers), function(region) {
						array.forEach(_.keys(self._mapLayers[region]), function(layer) {
							//self._mapLayers[region][layer].hide();
						})
					})
				}
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
							mapLayer.setVisibleLayers([]);
						} else {
							var mapLayer = new TiledMapServiceLayer(self._interface.region[region].layers[layer].url, { id:id });
						}
						if (mapLayer) {
							self._mapLayers[region][layer] = mapLayer;
							self._map.addLayer(mapLayer);
							mapLayer.hide();
						}
						i += 1
					});
				});
			}
			
			this.updateMapLayers = function() {
				//console.log("updateMapLayers");
				var parameters = {}
				
				parameters.hazard = this.hazardSelect.value.toLowerCase();
				
				var options = this._interface.region[this._region].controls.select.hazard.options
				var hazardOption = options[array.map(options, function(option) { return option.value }).indexOf(parameters.hazard)]
				
				parameters.climate = (!_.has(this._interface.region[this._region].controls.slider, "climate")) ? this.climateSlider.get("value") : (_.isArray(this._interface.region[this._region].controls.slider.climate.labels)) ? this._interface.region[this._region].controls.slider.climate.labels[this.climateSlider.get("value")].toLowerCase() : this._interface.region[this._region].controls.slider.climate.labels[parameters.hazard][this.climateSlider.get("value")].toLowerCase();
				
				parameters.sealevelrise = (!_.has(this._interface.region[this._region].controls.slider, "sealevelrise")) ? this.sealevelriseSlider.get("value") : (_.isArray(this._interface.region[this._region].controls.slider.sealevelrise.labels)) ? this._interface.region[this._region].controls.slider.sealevelrise.labels[this.sealevelriseSlider.get("value")].toLowerCase() : this._interface.region[this._region].controls.slider.sealevelrise.labels[parameters.hazard][this.sealevelriseSlider.get("value")].toLowerCase();
				
				parameters.scenario = (!_.has(this._interface.region[this._region].controls.slider, "scenario")) ? this.scenarioSlider.get("value") : (_.isArray(this._interface.region[this._region].controls.slider.scenario.labels)) ? this._interface.region[this._region].controls.slider.scenario.labels[this.scenarioSlider.get("value")].toLowerCase() : this._interface.region[this._region].controls.slider.scenario.labels[parameters.hazard][this.scenarioSlider.get("value")].toLowerCase();
				
				parameters.hurricane = (!_.has(this._interface.region[this._region].controls.slider, "hurricane")) ? this.hurricaneSlider.get("value") : (_.isArray(this._interface.region[this._region].controls.slider.hurricane.labels)) ? this._interface.region[this._region].controls.slider.hurricane.labels[this.hurricaneSlider.get("value")].toLowerCase() : this._interface.region[this._region].controls.slider.hurricane.labels[parameters.hazard][this.hurricaneSlider.get("value")].toLowerCase();
				
				parameters.stormSurge = (!_.has(this._interface.region[this._region].controls.slider, "stormSurge")) ? this.stormSurgeSlider.get("value") : (_.isArray(this._interface.region[this._region].controls.slider.stormSurge.labels)) ? this._interface.region[this._region].controls.slider.stormSurge.labels[this.stormSurgeSlider.get("value")].toLowerCase() : this._interface.region[this._region].controls.slider.stormSurge.labels[parameters.hazard][this.stormSurgeSlider.get("value")].toLowerCase();
				
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
			}
			
			this.updateExtentByRegion = function(region) {
				this._map.setExtent(new Extent(region.extent), false)
			}
						
			this.loadInterface = function() {
				var self = this;
				domStyle.set(this._container, { 
					"overflow": "visible"
				});
				
				//empty layout containers
			    this.cp = new ContentPane({
					id: "plugin-slr-" + self._map.id,
					style: "position:relative; overflow: visible; width:100%; height:100%;",
					className: 'cr-dojo-dijits'
			    });
			    this.cp.startup();
				this._container.appendChild(this.cp.domNode);
				
				this.createInputs();
				
				this.tip = domConstruct.create("div", { className: "plugin-slr slr-tooltip interface" });
				win.body().appendChild(this.tip);
				
				this.createTooltips();
				domStyle.set(_.first(query(".plugin-slr .fa-spinner")).parentNode, "display", "none");
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
				
				var otherTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:20px; padding:0px; margin:0px 0px 0px 0px; visibility:hidden;"
				}, this.inputsPane.containerNode);
				
				// region control
				var regionText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;",
					innerHTML: '<span class="info-circle fa-stack fa slr-' + this._map.id + '-region"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">1</span></span><b> Select a Region:</b>'
				}, regionTd);
				
				var regionSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:200px;display:inline-block;" 
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
				
				this.downloadReport = domConstruct.create("div", { className:"downloadButton", innerHTML:'<i class="fa fa-file-pdf-o downloadIcon"></i><span class="downloadText">Report</span>' }, regionTd);
				on(this.downloadReport,"mouseover", function(){
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							coreFx.combine([
							   xFx.wipeTo({ node: this, duration: 150, width: 80 }),
							   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 153 })
							]).play();
							domStyle.set(this, "background", "#0096d6");
						}
					}
				});
				on(this.downloadReport,"mouseout", function(){
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							coreFx.combine([
							   xFx.wipeTo({ node: this, duration: 150, width: 33 }),
							   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 200 })
						   ]).play();
						   domStyle.set(this, "background", "#2B2E3B");
						}
					}
				});
				on(this.downloadReport,"click", function(){
					 if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							var url = self._interface.region[self._region].download.report.replace("HOSTNAME-", window.location.href);
							window.open(url, "_blank");
						}
					 }
				});
				
				this.downloadData = domConstruct.create("div", { className:"downloadButton", innerHTML:'<i class="fa fa-file-zip-o downloadIcon"></i><span class="downloadText">Data</span>' }, regionTd);
				on(this.downloadData,"mouseover", function(){
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							coreFx.combine([
							   xFx.wipeTo({ node: this, duration: 150, width: 75 }),
							   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 158 })
							]).play();
						   domStyle.set(this, "background", "#0096d6");
						}
				   }
				});
				on(this.downloadData,"mouseout", function(){
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							coreFx.combine([
							   xFx.wipeTo({ node: this, duration: 150, width: 33 }),
							   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 200 })
							]).play();
						   domStyle.set(this, "background", "#2B2E3B");
						}
					}
				});
				on(this.downloadData,"click", function(){
					 if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							var url = self._interface.region[self._region].download.data;
							window.open(url, "_blank");
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
					style:"width:275px;display:block;margin-bottom:5px;"
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
					for: "slr-hazard-layer-" + self._map.id,
					className:"styled-checkbox",
					style:"display:block;margin-left: 5px;"
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
					innerHTML: '<span></span>'
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
								self[rb.name + "ToggleButton"] = domConstruct.create("input", { 
									type: "radio", 
									value: rb.value, 
									name: rb.group, 
									id: "plugin-slr-togglebutton-" + rb.group + "-" + rb.name + "-" + self._map.id
								}, containerDiv);
								
								if (rb.checked) { self[rb.name + "ToggleButton"].checked = true }
								
								domConstruct.create("label", { 
									for: "plugin-slr-togglebutton-" + rb.group + "-" + rb.name + "-" + self._map.id,
									innerHTML: rb.label
								}, containerDiv);
								
								on(self[rb.name + "ToggleButton"] , "change", function() {
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
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-climate'></i>&nbsp;<b>Climate Year: </b>",
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
			        style: "width:160px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						self.setControlDependency("slider", this.name, this.value);
						if (self._region != "") {
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
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-scenario'></i>&nbsp;<b>Sea Level Rise: </b>",
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
			        style: "width:160px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						self.setControlDependency("slider", this.name, this.value);
						if (self._region != "") {
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
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-sealevelrise'></i>&nbsp;<b>Sea Level Rise (ft): </b>",
					style:"position:relative; width:130px; top:-10px; display:inline-block;"
				}, seaLevelRiseTd);
				this.sealevelriseSlider = new HorizontalSlider({
			        name: "sealevelriseSlider",
			        value: 0,
			        minimum: 0,
			        maximum: this._defaultLabels.sealevelrise.length-1,
			        discreteValues: this._defaultLabels.sealevelrise.length,
			        showButtons: false,
					disabled: true,
			        style: "width:140px; display:inline-block; margin:0px; background:none;",
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
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-hurricane'></i>&nbsp;<b>Surge Severity: </b>",
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
			        style: "width:160px; display:inline-block; margin:0px; background:none;",
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
								var node = _.first(query(".slr-model-storm-" + key.replace(/ /g,"_").toLowerCase() + "_" + value.value + " .storm-toggle-td"))
								var nodeOpen = domStyle.get(node,"display") == "none";
								
								var i = _.first(query(".slr-model-storm-" + key.replace(/ /g,"_").toLowerCase() + "_" + value.value + " .storm-toggle-icon"));
								var previous = (nodeOpen) ? "right" : "down";
								var current = (previous == "right") ? "down" : "right";
								domClass.replace(i, "fa-caret-" + current, "fa-caret-" + previous);
								
								var display = (nodeOpen) ? "block" : "none";
								domStyle.set(node,"display", display);
							})
							
							var stormToggleTd = domConstruct.create("div", {
								className:"storm-toggle-td",
								style: "display:none;padding-left:15px;"
							}, stormToggle)
							
							array.forEach(value.controls, function(control){
								var checkBoxDiv = domConstruct.create("label", { 
									for: "slr-model-storm-" + control.value + "-layer-" + key.replace(/ /g,"_").toLowerCase() + "_" + value.value,
									className:"styled-checkbox",
									style:"display:inline-block; margin-left: 15px;"
								}, stormToggleTd);
								
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
									innerHTML: '<span>' + control.label + '</span>'
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
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-stormSurge'></i>&nbsp;<b>Storm Type: </b>",
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
			        style: "width:160px; display:inline-block; margin:0px; background:none;",
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
			}
			
			this.setControlDependency = function(c, name, value, sub = null) {
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
									var y = _.first(_.values(v));
									var w = y.whitelist;
									var z = _.first(query(".plugin-slr .toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + control + " input:checked")).value;
									if (!_.isUndefined(w) && w.length > 0 && _.indexOf(w, z) < 0) {
										self[ _.first(w) + suffix[type]].checked = true;
									}
								}
							
							});
							
						}
					});
				}
			}
			
			this.updateInterface = function(control){
				//console.log("updateInterface");
				domConstruct.empty(this.hazardSelect);
				if (this._region != "") {
					array.forEach(this._interface.region[this._region].controls.select.hazard.options, function(item) {
						domConstruct.create("option", { innerHTML: item.name, value: item.value }, self.hazardSelect);
					});
				} else {
					domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.hazardSelect);
				}
				
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
						query(".downloadButton").style("backgroundColor", "#2B2E3B");
						
						domStyle.set(this.dataSourceSelect.parentNode.parentNode, "display",  "none");
						_.first(query('.slr-' + this._map.id + '-hazard .info-circle-text')).innerHTML = 2;
					}
				}
								
				if (this._region != "" && _.has(this._interface.region[this._region].controls.slider.climate, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.climate.labels)) ? this._interface.region[this._region].controls.slider.climate.labels : this._interface.region[this._region].controls.slider.climate.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.climate.labels))]
				} else {
					var labels = this._defaultLabels.climate;
				}
				this.climateSlider.set("maximum", labels.length-1);
				this.climateSlider.set("discreteValues", labels.length);
				this.climateSliderLabels.set("labels",labels);
				this.climateSliderLabels.set("count", labels.length);
				this.climateSliderLabels.buildRendering();
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls.slider.scenario, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.scenario.labels)) ? this._interface.region[this._region].controls.slider.scenario.labels : this._interface.region[this._region].controls.slider.scenario.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.scenario.labels))]
				} else {
					var labels = this._defaultLabels.scenario;
				}
				this.scenarioSlider.set("maximum", labels.length-1);
				this.scenarioSlider.set("discreteValues", labels.length);
				this.scenarioSliderLabels.set("labels",labels);
				this.scenarioSliderLabels.set("count", labels.length);
				this.scenarioSliderLabels.buildRendering();
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls.slider.stormSurge, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.stormSurge.labels)) ? this._interface.region[this._region].controls.slider.stormSurge.labels : this._interface.region[this._region].controls.slider.stormSurge.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.stormSurge.labels))]
				} else {
					var labels = this._defaultLabels.stormSurge;
				}
				this.stormSurgeSlider.set("maximum", labels.length-1);
				this.stormSurgeSlider.set("discreteValues", labels.length);
				this.stormSurgeSliderLabels.set("labels",labels);
				this.stormSurgeSliderLabels.set("count", labels.length);
				this.stormSurgeSliderLabels.buildRendering();
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls.slider.hurricane, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.hurricane.labels)) ? this._interface.region[this._region].controls.slider.hurricane.labels : this._interface.region[this._region].controls.slider.hurricane.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.hurricane.labels))]
				} else {
					var labels = this._defaultLabels.hurricane;
				}
				this.hurricaneSlider.set("maximum", labels.length-1);
				this.hurricaneSlider.set("discreteValues", labels.length);
				this.hurricaneSliderLabels.set("labels",labels);
				this.hurricaneSliderLabels.set("count", labels.length);
				this.hurricaneSliderLabels.buildRendering();
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls.slider.sealevelrise, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.sealevelrise.labels)) ? this._interface.region[this._region].controls.slider.sealevelrise.labels : this._interface.region[this._region].controls.slider.sealevelrise.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.sealevelrise.labels))]
				} else {
					var labels = this._defaultLabels.sealevelrise;
				}
				this.sealevelriseSlider.set("maximum", labels.length-1);
				this.sealevelriseSlider.set("discreteValues", labels.length);
				this.sealevelriseSliderLabels.set("labels",labels);
				this.sealevelriseSliderLabels.set("count", labels.length);
				this.sealevelriseSliderLabels.buildRendering();
				
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
						
						this._mapLayers[this._region].model_storm.setVisibleLayers([]);
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
					this.hazardCheckBoxLabel.innerHTML = this._interface.region[this._region].controls.radiocheck.hazard.label;
				}
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
				
				/* if (this._region != "" && _.has(this._interface.region[this._region].controls, "togglebutton")) {
					array.forEach(_.keys(this._interface.region[this._region].controls.togglebutton), function(tb) {
						domStyle.set(_.first(query(".toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + tb)).parentNode, "display", "none");
					});
				} */
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
				
				if (this._region != "") {
					this._mapLayer = this._mapLayers[this._region].main;
					this._mapLayer.show();
					var extent = new Extent(this._interface.region[this._region].extent);
					this._map.setExtent(extent, false);
				} else {
					this._mapLayer = {};
				}
				
			}
			
			this.updateControls = function() {
				var hazard = this.hazardSelect.value.toLowerCase();
				if (hazard != "") {
					var options = this._interface.region[this._region].controls.select.hazard.options
					var hazardOption = options[array.map(options, function(option) { return option.value }).indexOf(hazard)];
					
					domStyle.set(this.climateSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.sealevelriseSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.stormSurgeSlider.domNode.parentNode, "display",  "none");
					
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
									tb.firstChild.checked = true;
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
							}
							if (key == "radiocheck" ) {
								if (self._interface.region[self._region].controls.radiocheck[control].type == "check") {
									domStyle.set(self[control + "CheckBox"].parentNode.parentNode, "display", "block");
								} else {
									domStyle.set(self[control + "RadioButton"].parentNode.parentNode.parentNode, "display", "block");
								}
							}
							if (key == "togglebutton") {
								domStyle.set(_.first(query(".toggle-btn." + self._region.replace(/ /g,"_").toLowerCase() + "." + control)).parentNode.parentNode, "display", "block");
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
					
					this.hazardDescriptionDiv.innerHTML = "";
					domStyle.set(this.hazardDescriptionDiv, "display", "none");
					
					this.climateSlider.set("value", 0);
					this.climateSlider.set("disabled", true);
					this.scenarioSlider.set("value", 0);
					this.scenarioSlider.set("disabled", true);
					this.hurricaneSlider.set("value", 1);
					this.hurricaneSlider.set("disabled", true);
					this.stormSurgeSlider.set("value", 1);
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
				}
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
				
				/* Do we need the _firsLoad check? */
				this._mapLayer = {};
				if (!this._plugin._firstLoad) {
					this._map.setExtent(new Extent(this._extent), false);
				}
			}

			this.createTooltips = function() {
				on(query('*.fa[class*="slr-' + this._map.id + '"]'), "click", function(evt) {
					var cssClass = _.last(domAttr.get(this, "class").split(" "));
					var control = _.last(cssClass.split("-"));
					var tooltips = (self._interface.region[self._region] && _.has(self._interface.region[self._region], "tooltips")) ? self._interface.region[self._region].tooltips : self._interface.tooltips;
					var message = tooltips[control];
					if (!_.isUndefined(message)) {
						self.showMessageDialog(this, message);
					}
				});
				
				on(query('*.fa[class*="slr-' + this._map.id + '"]'), "mouseout", function() {
					self.hideMessageDialog();
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
            }

            this.hideMessageDialog = function() {
        		domStyle.set(self.tip, { "display": "none" });
			}


		};// End slrTool

		
		return slrTool;	
		
	} //end anonymous function

); //End define
