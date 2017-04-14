
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

			this.initialize = function(){
				this._extent.xmin = _.min(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.xmin; }));
				this._extent.ymin = _.min(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.ymin; }));
				this._extent.xmax = _.max(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.xmax; }));
				this._extent.ymax = _.max(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.ymax; }));
				
				domStyle.set(this._container, {
					"padding": "0px"
				});
				this.loadInterface(this);
			}
			
			this.showIntro = function(){
				var self = this;	
			};

			this.showTool = function(){
				if (this._map.getLayer("slr-layer-0") == undefined) {
					this.initializeMap();
				} else {
					if (this.regionSelect.value != "") {
						//this._mapLayer = this._mapLayers[this._region][(_.has(this._mapLayers[this._region], parameters.hazard)) ? parameters.hazard : "main"];
						this.updateMapLayers();
						this._map.setExtent(new Extent(this._interface.region[this._region].extent), false);
					} else {
						this._map.setExtent(new Extent(this._extent), false);
					}
				}
			} 

			this.hideTool = function(){
				if (this._mapLayer && this._mapLayer.loaded) { 
					//this._mapLayer.setVisibleLayers([]);
					//this._mapLayer.hide();
				}
			}
			
			this.closeTool = function(){
				if (this._mapLayer && this._mapLayer.loaded) { 
					array.forEach(_.keys(this._mapLayers), function(region) {
						array.forEach(_.keys(self._mapLayers[region]), function(layer) {
							self._map.removeLayer(self._mapLayers[region][layer]);
						})
					})
					this._firstLoad = true;
				}
			}

			this.initializeMap = function(){
				if (this._firstLoad) {
					var i = 0
					array.forEach(_.keys(this._interface.region), function(region){
						self._mapLayers[region] = {}
						array.forEach(_.keys(self._interface.region[region].layers), function(layer) {
							var mapLayer = new DynamicMapServiceLayer(self._interface.region[region].layers[layer], { id:"slr-layer-" + i });
							self._mapLayers[region][layer] = mapLayer;
							self._map.addLayer(mapLayer);
							mapLayer.hide();
							mapLayer.setVisibleLayers([]);
							i += 1
						});
					});
					if (!this._plugin._saveAndShare) {
						this._map.setExtent(new Extent(this._extent), false);
						this._firstLoad = false;
					}
				}
			}
			
			this.updateMapLayers = function() {
				var parameters = {}
				
				parameters.hazard = this.hazardSelect.value.toLowerCase();
				
				var options = this._interface.region[this._region].controls.select.hazard.options
				var hazardOption = options[array.map(options, function(option) { return option.value }).indexOf(parameters.hazard)]

				parameters.climate = this._interface.controls.slider.climate[this.climateSlider.get("value")].toLowerCase();
				parameters.scenario = this._interface.controls.slider.scenario[this.scenarioSlider.get("value")].toLowerCase();
				parameters.hurricane = this.hurricaneSlider.get("value");
				
				var parts = [parameters.hazard];
				if (!_.has(hazardOption, "controls") ) {
					parts.push(parameters.climate)
					parts.push(parameters.scenario)
					if ( _.has(this._interface.region[this._region].controls.radiocheck, "aggregate") && this.hazardLayerCheckBox.checked) {
						parts.push("aggregate");
					}
				} else {
					array.forEach(hazardOption.controls, function(control) {
						parts.push(parameters[control]);
					});
				}
				
				if (!_.isEmpty(this._mapLayer)) {
					this._mapLayer.hide();
				}
				this._mapLayer = this._mapLayers[this._region][(_.has(this._mapLayers[this._region], parameters.hazard)) ? parameters.hazard : "main"];
				var visibleLayers = (parameters.hazard != "") ? this._data.region[this._region][parts.join("|")] : [];
				this._mapLayer.setVisibleLayers(visibleLayers);
				this._mapLayer.show();
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
					style: "position:relative; overflow: visible;",
					className: 'cr-dojo-dijits'
			    });
			    this.cp.startup();
				this._container.appendChild(this.cp.domNode);
				
				this.createInputs();
				
				this.tip = domConstruct.create("div", { className: "slr-tooltip interface" });
				win.body().appendChild(this.tip);
				
				this.createTooltips();
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
				
				var scenarioTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:30px; padding:0px; margin:15px 0px 15px 0px; display:block;"
				}, slidersTd);
				
				var hurricaneTd = domConstruct.create("div", {
					style:"position:relative; width:100%; min-height:30px; padding:0px; margin:15px 0px 15px 0px; display:none;"
				}, slidersTd);
				
				var femaTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:20px; padding:0px; margin:0px 0px 0px 0px; display:block;"
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
					innerHTML: '<span class="info-circle fa-stack fa slr-' + this._map.id + '-hazard"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">3</span></span><b> Select a Hazard:</b>'
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
				this.hazardLayerCheckBox = domConstruct.create("input", {
					type:"checkbox",
					value:"hazard",
					name:"hazard-layer",
					id:"slr-hazard-layer-" + self._map.id,
					disabled:true,
					checked:false
				}, checkBoxLabel);
				var checkBoxLabel = domConstruct.create("div", {
					innerHTML: '<span>view aggregate data</span>'
				}, checkBoxLabel);
				on(self.hazardLayerCheckBox, "change", function(){
					var climate = self.climateSlider.get("value");
					if (this.checked) {
						self.scenarioSlider.set("value", 0);
						self.scenarioSlider.set("disabled", true);
					} else {
						if (climate > 0) {
							self.scenarioSlider.set("disabled", false);
						}
					}
					self.updateMapLayers();
				});
				
				//climate year slider
			    var climateSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-climate'></i>&nbsp;<b>Climate Year: </b>",
					style:"position:relative; width:110px; top:-10px; display:inline-block;"
				}, climateTd);
				this.climateSlider = new HorizontalSlider({
			        name: "climateSlider",
			        value: 0,
			        minimum: 0,
			        maximum: this._interface.controls.slider.climate.length-1,
			        discreteValues: this._interface.controls.slider.climate.length,
			        showButtons: false,
					disabled: true,
			        style: "width:160px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						if (value == 0 || self.hazardLayerCheckBox.checked) {
							self.scenarioSlider.set("value", 0);
							self.scenarioSlider.set("disabled", true);
						} else {
							self.scenarioSlider.set("disabled", false);
						}
						if (self._region != "") {
							self.updateMapLayers();
						}
			        }
			    });
			    climateTd.appendChild(this.climateSlider.domNode);

			    this.climateSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: 0,
			    	labels: this._interface.controls.slider.climate,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.climateSlider.addChild(this.climateSliderLabels);
				
				//scenario slider
			    var scenarioSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-scenario'></i>&nbsp;<b>Sea Level Rise: </b>",
					style:"position:relative; width:110px; top:-10px; display:inline-block;"
				}, scenarioTd);
				this.scenarioSlider = new HorizontalSlider({
			        name: "scenarioSlider",
			        value: 0,
			        minimum: 0,
			        maximum: this._interface.controls.slider.scenario.length-1,
			        discreteValues: this._interface.controls.slider.scenario.length,
			        showButtons: false,
					disabled: true,
			        style: "width:160px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						if (self._region != "") {
							self.updateMapLayers();
						}
			        }
			    });
				scenarioTd.appendChild(this.scenarioSlider.domNode);

			    var scenarioSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: 0,
			    	labels: this._interface.controls.slider.scenario,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.scenarioSlider.addChild(scenarioSliderLabels);
				
				//hurricane slider
			    var hurricaneSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-question-circle slr-" + this._map.id + "-hurricane'></i>&nbsp;<b>Surge Severity: </b>",
					style:"position:relative; width:115px; top:-10px; display:inline-block;"
				}, hurricaneTd);
				this.hurricaneSlider = new HorizontalSlider({
			        name: "hurricaneSlider",
			        value: 1,
			        minimum: 1,
			        maximum: this._interface.controls.slider.hurricane.length,
			        discreteValues: this._interface.controls.slider.hurricane.length,
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

			    var hurricaneSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: 0,
			    	labels: this._interface.controls.slider.hurricane,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.hurricaneSlider.addChild(hurricaneSliderLabels);
				
				this.modelStorms = _.pick(self._interface.region, function(value) {
					return _.has(value.controls, "tree") && _.has(value.controls.tree, "storm")
				})
				if (!_.isEmpty(this.modelStorms)) {
					var stormToggleDiv = domConstruct.create("div", {
						className: "storm-toggle"
					}, hurricaneTd)
					
					var stormsToggle = domConstruct.create("div", {
						className: "storm-toggle-header",
						innerHTML: "<i class='fa fa-caret-right storm-toggle-icon'></i>&nbsp;Modeled Potential Storm Surge"
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
						array.forEach(self.modelStorms[key].controls.tree.storm, function(value) {
							var stormToggle = domConstruct.create("div", {
								className: "storm-toggle-text storm-toggle-subitem slr-storm-" + key.replace(" ", "_") + "-" + value.value,
								innerHTML: "<i class='fa fa-caret-right storm-toggle-icon'></i>&nbsp;<i class='fa fa-question-circle'></i>&nbsp" + value.label
							}, stormsToggleContainer)
							
							on(stormToggle, "click", function(evt) {
								var node = _.first(query(".slr-storm-" + key.replace(" ", "_") + "-" + value.value + " .storm-toggle-td"))
								var nodeOpen = domStyle.get(node,"display") == "none";
								
								var i = _.first(query(".slr-storm-" + key.replace(" ", "_") + "-" + value.value + " .storm-toggle-icon"));
								var previous = (nodeOpen) ? "right" : "down";
								var current = (previous == "right") ? "down" : "right";
								domClass.replace(i, "fa-caret-" + current, "fa-caret-" + previous);
								
								var display = (nodeOpen) ? "block" : "none";
								domStyle.set(node,"display", display);
							})
							
							var stormToggleTd = domConstruct.create("div", {
								className:"storm-toggle-td",
								style: "display:none;"
							}, stormToggle)
							
							var checkBoxDiv = domConstruct.create("label", { 
								for: "slr-storm-surge-layer-" + key.replace(" ", "_") + "-" + value.value,
								className:"styled-checkbox",
								style:"display:inline-block; margin-left: 30px;"
							}, stormToggleTd);
							
							var stormSurgeCheckBox = domConstruct.create("input", {
								type:"checkbox",
								value: value.value,
								name:"storm-surge",
								id:"slr-storm-surge-layer-" + key.replace(" ", "_") + "-" + value.value,
								disabled:false,
								checked:false
							}, checkBoxDiv);
							
							var checkBoxLabel = domConstruct.create("div", {
								innerHTML: '<span>Surge</span>'
							}, checkBoxDiv);
							
							on(stormSurgeCheckBox, "change", function(){
								self._mapLayers[self._region].model_storm.show();
								var visibleLayers = self._mapLayers[self._region].model_storm.visibleLayers;
								if (this.checked) {
									visibleLayers = _.union(visibleLayers, self._data.region[self._region]["model_storm|surge|" + this.value]);
								} else {
									visibleLayers = _.difference(visibleLayers, self._data.region[self._region]["model_storm|surge|" + this.value]);
								}
								self._mapLayers[self._region].model_storm.setVisibleLayers(visibleLayers);
							});
							
							var checkBoxDiv = domConstruct.create("label", { 
								for: "slr-storm-track-layer-" + key.replace(" ", "_") + "-" + value.value,
								className:"styled-checkbox",
								style:"display:inline-block; margin-left: 20px;"
							}, stormToggleTd);
							
							var stormTrackCheckBox = domConstruct.create("input", {
								type:"checkbox",
								value: value.value,
								name:"storm-track",
								id:"slr-storm-track-layer-" + key.replace(" ", "_") + "-" + value.value,
								disabled:false,
								checked:false
							}, checkBoxDiv);
							
							var checkBoxLabel = domConstruct.create("div", {
								innerHTML: '<span>Track</span>'
							}, checkBoxDiv);
							
							on(stormTrackCheckBox, "change", function(){
								self._mapLayers[self._region].model_storm.show();
								var visibleLayers = self._mapLayers[self._region].model_storm.visibleLayers;
								if (this.checked) {
									visibleLayers = _.union(visibleLayers, self._data.region[self._region]["model_storm|track|" + this.value]);
								} else {
									visibleLayers = _.difference(visibleLayers, self._data.region[self._region]["model_storm|track|" + this.value]);
								}
								self._mapLayers[self._region].model_storm.setVisibleLayers(visibleLayers);
							});
							
							var checkBoxDiv = domConstruct.create("label", { 
								for: "slr-storm-swath-layer-" + key.replace(" ", "_") + "-" + value.value,
								className:"styled-checkbox",
								style:"display:inline-block;margin-left: 20px;"
							}, stormToggleTd);
							
							var stormSwathCheckBox = domConstruct.create("input", {
								type:"checkbox",
								value: value.value,
								name:"storm-swath",
								id:"slr-storm-swath-layer-" + key.replace(" ", "_") + "-" + value.value,
								disabled:false,
								checked:false
							}, checkBoxDiv);
							
							var checkBoxLabel = domConstruct.create("div", {
								innerHTML: '<span>Swath</span>'
							}, checkBoxDiv);
							
							on(stormSwathCheckBox, "change", function(){
								self._mapLayers[self._region].model_storm.show();
								var visibleLayers = self._mapLayers[self._region].model_storm.visibleLayers;
								if (this.checked) {
									visibleLayers = _.union(visibleLayers, self._data.region[self._region]["model_storm|swath|" + this.value]);
								} else {
									visibleLayers = _.difference(visibleLayers, self._data.region[self._region]["model_storm|swath|" + this.value]);
								}
								self._mapLayers[self._region].model_storm.setVisibleLayers(visibleLayers);
							});
						});
						
					});
				}
				
				var checkBoxDiv = domConstruct.create("label", { 
					for: "slr-fema-layer-" + self._map.id,
					className:"styled-checkbox",
					style:"display:block;"
				}, femaTd);
				this.femaLayerCheckBox = domConstruct.create("input", {
					type:"checkbox",
					value:"fema",
					name:"fema-layer",
					id:"slr-fema-layer-" + self._map.id,
					disabled:false,
					checked:false
				}, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", {
					innerHTML: '<span>FEMA zones (as of 2006)</span>'
				}, checkBoxDiv);
				on(self.femaLayerCheckBox, "change", function(){
					if (this.checked) {
						self._mapLayers[self._region].fema.setVisibleLayers(self._data.region[self._region].fema)
						self._mapLayers[self._region].fema.show();
					} else {
						self._mapLayers[self._region].fema.hide();
					}
					
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
			
			this.updateInterface = function(control){
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
				
				this.hazardDescriptionDiv.innerHTML = "";
				domStyle.set(this.hazardDescriptionDiv, "display", "none");
				if (this._region != "" && _.has(this._interface.region[this._region].controls.radiocheck, "aggregate")) {
					this.hazardLayerCheckBox.checked = false;
					this.hazardLayerCheckBox.disabled = this._interface.region[this._region].controls.radiocheck.aggregate.disabled;
				}
				domStyle.set(this.hazardLayerCheckBox.parentNode.parentNode, "display", "none");
				
				
				var labels = (this._region != "" && _.has(this._interface.region[this._region].controls.slider.climate, "values")) ? this._interface.region[this._region].controls.slider.climate.values : this._interface.controls.slider.climate;
				array.forEach(query("#" + this.climateSliderLabels.id + " .dijitRuleLabel"), function(label,i) { label.innerHTML = labels[i]; })
				
				domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
				
				if (this._region != "") {
					if (_.has(this._interface.region[this._region].controls, "tree") && _.has(this._interface.region[this._region].controls.tree, "storm")) {
						query(".storm-toggle").style("display", "block");
						array.forEach(query(".storm-toggle-icon"), function(node) {
							domClass.replace(node, "fa-caret-right", "fa-caret-down");
						});
						query(".storm-toggle-container").style("display", "none");
						query(".storm-toggle-td").style("display", "none");
						
						query(".storm-toggle-subitem").style("display", "none");
						query("div[class*=slr-storm-" + this._region.replace(" ", "_") + "]").style("display", "block");
						
						array.forEach(this._interface.region[this._region].controls.tree.storm, function(value) {
							dojo.byId("slr-storm-surge-layer-" + self._region.replace(" ", "_") + "-" + value.value).checked = false;
							dojo.byId("slr-storm-track-layer-" + self._region.replace(" ", "_") + "-" + value.value).checked = false;
							dojo.byId("slr-storm-swath-layer-" + self._region.replace(" ", "_") + "-" + value.value).checked = false;
						})
						self._mapLayers[self._region].model_storm.setVisibleLayers([]);
					} else {
						query(".storm-toggle").style("display", "none");
					}
				} else {
					query(".storm-toggle").style("display", "none");
				}
				
				this.femaLayerCheckBox.checked = false;
				var display = (this._region != "" && _.has(this._interface.region[this._region].controls.radiocheck, "fema")) ? "block" : "none";
				domStyle.set(this.femaLayerCheckBox.parentNode, "display",  display);
				
				this.climateSlider.set("value", 0);
				this.climateSlider.set("disabled", true);
				this.scenarioSlider.set("value", 0);
				this.scenarioSlider.set("disabled", true);
				
				this.opacitySlider.set("disabled", true);
				
				array.forEach(_.keys(this._mapLayers), function(region) {
					array.forEach(_.keys(self._mapLayers[region]), function(layer) {
						self._mapLayers[region][layer].setVisibleLayers([]);
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
					domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "none");
					domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
					
					if (!_.has(hazardOption, "controls") ) {
						domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
						domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
					} else {
						array.forEach(hazardOption.controls, function(control) {
							domStyle.set(self[control + "Slider"].domNode.parentNode, "display",  "block")
							self[control + "Slider"].set("disabled", false);
						});
					}
					
					if (_.has(this._interface.region[this._region].controls.radiocheck, "aggregate")) {
						domStyle.set(this.hazardLayerCheckBox.parentNode.parentNode, "display", "block");
					}
					
					if (_.has(hazardOption, "description") ) {
						this.hazardDescriptionDiv.innerHTML = hazardOption.description;
						domStyle.set(this.hazardDescriptionDiv, "display", "block");
					} else {
						this.hazardDescriptionDiv.innerHTML = "";
						domStyle.set(this.hazardDescriptionDiv, "display", "none");
					}
					
					if (_.has(this._interface.region[this._region].controls, "tree") && _.has(this._interface.region[this._region].controls.tree, "storm")) {
						query(".storm-toggle").style("display", "block");
						array.forEach(query(".storm-toggle-icon"), function(node) {
							domClass.replace(node, "fa-caret-right", "fa-caret-down");
						});
						query(".storm-toggle-container").style("display", "none");
						query(".storm-toggle-td").style("display", "none");
						
						query(".storm-toggle-subitem").style("display", "none");
						query("div[class*=slr-storm-" + this._region.replace(" ", "_") + "]").style("display", "block");
						
						array.forEach(this._interface.region[this._region].controls.tree.storm, function(value) {
							dojo.byId("slr-storm-surge-layer-" + self._region.replace(" ", "_") + "-" + value.value).checked = false;
							dojo.byId("slr-storm-track-layer-" + self._region.replace(" ", "_") + "-" + value.value).checked = false;
							dojo.byId("slr-storm-swath-layer-" + self._region.replace(" ", "_") + "-" + value.value).checked = false;
						})
						self._mapLayers[self._region].model_storm.setVisibleLayers([]);
					}
					
					var disable = (hazard == "") ? true : false;
					this.climateSlider.set("disabled", disable);
					this.opacitySlider.set("disabled", false);
				} else {
					domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
					domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
					domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
				
					if (_.has(this._interface.region[this._region].controls.radiocheck, "aggregate")) {
						this.hazardLayerCheckBox.checked = false;
						domStyle.set(this.hazardLayerCheckBox.parentNode.parentNode, "display", "none");
					}
					
					this.hazardDescriptionDiv.innerHTML = "";
					domStyle.set(this.hazardDescriptionDiv, "display", "none");
					
					this.climateSlider.set("value", 0);
					this.climateSlider.set("disabled", true);
					this.scenarioSlider.set("value", 0);
					this.scenarioSlider.set("disabled", true);
					this.hurricaneSlider.set("value", 1);
					this.hurricaneSlider.set("disabled", true);
					
					if (_.has(this._interface.region[this._region].controls, "tree") && _.has(this._interface.region[this._region].controls.tree, "storm")) {
						query(".storm-toggle").style("display", "none");
					}
					
					var disable = (!_.has(this._interface.region[this._region].controls.radiocheck, "fema")) ? true : false;
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
				
				this.hazardLayerCheckBox.checked = false;
				this.hazardLayerCheckBox.disabled = true;
				domStyle.set(this.hazardLayerCheckBox.parentNode.parentNode, "display", "none");
				
				this.hazardDescriptionDiv.innerHTML = "";
				domStyle.set(this.hazardDescriptionDiv, "display", "none");
				
				this.femaLayerCheckBox.checked = false;
				domStyle.set(this.femaLayerCheckBox.parentNode, "display", "none");
				
				this.climateSlider.set("value", 0);
				this.climateSlider.set("disabled", true);
				this.scenarioSlider.set("value", 0);
				this.scenarioSlider.set("disabled", true);
				this.hurricaneSlider.set("value", 1);
				this.hurricaneSlider.set("disabled", true);
				
				domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
				
				if (!_.isEmpty(this.modelStorms)) {
					query(".storm-toggle").style("display", "none");
					array.forEach(_.keys(this.modelStorm), function(key) {
						array.forEach(this._interface.region[this._region].controls.tree.storm, function(value) {
							dojo.byId("slr-storm-surge-layer-" + key.replace(" ", "_") + "-" + value.value).checked = false;
							dojo.byId("slr-storm-track-layer-" + key.replace(" ", "_") + "-" + value.value).checked = false;
							dojo.byId("slr-storm-swath-layer-" + key.replace(" ", "_") + "-" + value.value).checked = false;
							
						})
						self._mapLayers[key].model_storm.setVisibleLayers([]);
					})
				}
				
				this.opacitySlider.set("disabled", true);
				
				array.forEach(_.keys(this._mapLayers), function(region) {
					array.forEach(_.keys(self._mapLayers[region]), function(layer) {
						self._mapLayers[region][layer].setVisibleLayers([]);
						self._mapLayers[region][layer].hide()	
					})
				})
				
				this._mapLayer = {};
				if (!this._firstLoad) {
					this._map.setExtent(new Extent(this._extent), false);
				}
			}

			this.createTooltips = function() {
				on(query('*.fa[class*="slr-' + this._map.id + '"]'), "mousemove", function(evt) {
					var cssClass = _.last(domAttr.get(this, "class").split(" "));
					var control = _.last(cssClass.split("-"));
					var message = self._interface.tooltips[control];
					self.showMessageDialog(this, message);
				});
				
				on(query('*.fa[class*="slr-' + this._map.id + '"]'), "mouseout", function() {
					self.hideMessageDialog();
				});
			}

			this.showMessageDialog = function(node, message, position) {
				self.tip.innerHTML = message;
				domStyle.set(self.tip, { "display": "block" });
				
				var p = domGeom.position(win.body());
				var n = domGeom.position(node);
				var t = domGeom.getMarginBox(self.tip);
				
				var left = n.x - p.x - t.w/2 + n.w/2;
				var top = n.y - p.y - t.h - n.h/2;
				
				left = (position && position.l) ? n.x - p.x - t.w/2 + position.l : left;
				top = (position && position.t) ? n.y - p.y - t.h - position.t : top;
				
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
