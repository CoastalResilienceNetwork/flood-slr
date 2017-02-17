
define([
	    "dojo/_base/declare",
		"d3",
		"use!underscore",
		"dojo/json",
		"dojo/parser",
		"dojo/on",
		"dojo/_base/array",
		"dojo/_base/html",
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
					this._mapLayer.hide();
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
					className: 'plugin-slr'
			    });
			    this.cp.startup();
				this._container.appendChild(this.cp.domNode);
				
				this.createInputs();
				
				this.tip = domConstruct.create("div", { className: "slr-tooltip interface" });
				this.cp.containerNode.appendChild(this.tip);
				
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
					"padding": "20px"
				});
				
				var regionTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px;"
				}, this.inputsPane.containerNode);
				
				var dataSourceTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px; display:none;"
				}, this.inputsPane.containerNode);
				
				var hazardTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px;"
				}, this.inputsPane.containerNode);
				
				var climateTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:40px; padding:0px; margin:40px 0px 10px 0px; display:block;"
				}, this.inputsPane.containerNode);
				
				var scenarioTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:30px; padding:0px; margin:15px 0px 10px 0px; display:block;"
				}, this.inputsPane.containerNode);
				
				var hurricaneTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:30px; padding:0px; margin:15px 0px 0px 0px; display:none;"
				}, this.inputsPane.containerNode);
				
				var femaTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:15px; padding:0px; margin:10px 0px 0px 0px; display:none;"
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
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.regionSelect);
				array.forEach(_.keys(this._interface.region), function(item) {
					domConstruct.create("option", { innerHTML: item, value: item }, self.regionSelect);
				});
				on(this.regionSelect, "change", function() {
					self._region = this.value;
					if (self._region != "") {
						self.updateInterface();
					} else {
						self.resetInterface();
					}
				});
				this.downloadReport = domConstruct.create("div", { className:"downloadButton", innerHTML:'<i class="fa fa-file-pdf-o downloadIcon"></i><span class="downloadText">Report</span>' }, regionTd);
				on(this.downloadReport,"mouseover", function(){
					if (self._region && self._region != "") {
						if (!_.has(self._interface.region[self._region].controls.select, "datasource") || (_.has(self._interface.region[self._region].controls.select, "datasource") && self.dataSourceSelect.value != "")) {
							coreFx.combine([
							   xFx.wipeTo({ node: this, duration: 150, width: 80 }),
							   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 153 })
							]).play();
							domStyle.set(this, "background", "#59C3CD");
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
						   domStyle.set(this, "background", "#888888");
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
						   domStyle.set(this, "background", "#59C3CD");
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
						   domStyle.set(this, "background", "#888888");
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
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, self.dataSourceSelect);
				on(this.dataSourceSelect, "change", function() { 
					if (self.regionSelect != "" && self.dataSourceSelect.value != "") {
						query(".downloadButton").style("backgroundColor", "#888888");
					} else {
						query(".downloadButton").style("backgroundColor", "#d3d3d3");
					}
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
				
				var checkBoxDiv = domConstruct.create("div", {
					style:"position:relative; width:100%; height:15px; padding:0px; margin:0px 0px 0px 0px; display:none;"
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
				
				var checkBoxDiv = domConstruct.create("label", { 
					for: "slr-fema-layer-" + self._map.id,
					className:"styled-checkbox",
					style:"display:block; margin-left: 5px;"
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
					innerHTML: '<span>FEMA flood zones</span>'
				}, checkBoxDiv);
				on(self.femaLayerCheckBox, "change", function(){
					if (this.checked) {
						self._mapLayers[self._region].fema.setVisibleLayers(self._data.region[self._region].fema)
						self._mapLayers[self._region].fema.show();
					} else {
						self._mapLayers[self._region].fema.hide();
					}
					
				});
				
				//climate year slider
			    var climateSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-info-circle slr-" + this._map.id + "-climate'></i>&nbsp;<b>Climate Year: </b>",
					style:"position:relative; width:105px; top:-7px; display:inline-block;"
				}, climateTd);
				this.climateSlider = new HorizontalSlider({
			        name: "climateSlider",
			        value: 0,
			        minimum: 0,
			        maximum: this._interface.controls.slider.climate.length-1,
			        discreteValues: this._interface.controls.slider.climate.length,
			        showButtons: false,
					disabled: true,
			        style: "width:170px; display:inline-block; margin:0px; background:none;",
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
					innerHTML: "<i class='fa fa-info-circle slr-" + this._map.id + "-scenario'></i>&nbsp;<b>Sea Level Rise: </b>",
					style:"position:relative; width:105px; top:-7px; display:inline-block;"
				}, scenarioTd);
				this.scenarioSlider = new HorizontalSlider({
			        name: "scenarioSlider",
			        value: 0,
			        minimum: 0,
			        maximum: this._interface.controls.slider.scenario.length-1,
			        discreteValues: this._interface.controls.slider.scenario.length,
			        showButtons: false,
					disabled: true,
			        style: "width:170px; display:inline-block; margin:0px; background:none;",
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
					innerHTML: "<i class='fa fa-info-circle slr-" + this._map.id + "-hurricane'></i>&nbsp;<b>Hurricane: </b>",
					style:"position:relative; width:105px; top:-7px; display:inline-block;"
				}, hurricaneTd);
				this.hurricaneSlider = new HorizontalSlider({
			        name: "hurricaneSlider",
			        value: 1,
			        minimum: 1,
			        maximum: this._interface.controls.slider.hurricane.length,
			        discreteValues: this._interface.controls.slider.hurricane.length,
			        showButtons: false,
					disabled: true,
			        style: "width:170px; display:inline-block; margin:0px; background:none;",
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
				
				/* var radioButtonLabel = domConstruct.create("label", { className:"styled-radio", for: "armor-" + self._map.id }, this.inputsPane.containerNode);
				this.armorRadioButton = domConstruct.create("input", { type:"radio", value:"armoring", name:"management", id:"armor-" + self._map.id }, radioButtonLabel);
				domConstruct.create("span", { innerHTML:"Coastal Armoring" }, radioButtonLabel );
				
				var radioButtonLabel = domConstruct.create("label", { className:"styled-radio", for: "nature-" + self._map.id }, this.inputsPane.containerNode);
				this.natureRadioButton = domConstruct.create("input", { type:"radio", value:"nature-based", name:"management", id:"nature-" + self._map.id }, radioButtonLabel);
				domConstruct.create("span", { innerHTML:"Nature-based" }, radioButtonLabel ); */
				
				this.utilityPane = new ContentPane({});
				this.cp.domNode.appendChild(this.utilityPane.domNode);
			    domStyle.set(this.utilityPane.containerNode, {
					"position": "relative",
					"overflow": "visible",
					"background": "#f3f4f3",
					"border": "1px dotted #ccc",
					"padding": "10px 20px 10px 20px"
				});
				
				var opacityTd = domConstruct.create("div", {
					className: "utility",
					style:"position:relative; width:100%; height:25px; padding:0px; margin:15px 0px 0px 0px;"
				}, this.utilityPane.containerNode);
				
				//opacity slider
			    var opacitySliderLabel = domConstruct.create("div", {
					innerHTML: "<b>Layer Opacity: </b>",
					style:"position:relative; width:105px; top:-7px; display:inline-block; color:#888888;"
				}, opacityTd);
				this.opacitySlider = new HorizontalSlider({
			        name: "opacitySlider",
			        value: 0,
			        minimum: 0,
			        maximum: 1,
			        intermediateChanges: true,
			        showButtons: false,
					disabled: true,
			        style: "width:170px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						array.forEach(_.keys(self._mapLayers), function(region){
							array.forEach(_.keys(self._mapLayers[region]), function(layer){
								self._mapLayers[region][layer].setOpacity(Math.abs(value-1));
							})
						})
			        }
			    });
				opacityTd.appendChild(this.opacitySlider.domNode);

			    var opacitySliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: 0,
			    	labels: ["opaque", "clear"],
			    	style: "margin-top:5px;"
			    });
			    this.opacitySlider.addChild(opacitySliderLabels);
				
				/* var table = domConstruct.create("table", {style:"position:relative;width: 100%;background: none;border: none; margin:0px 0px 10px 0px;"}, this.utilityPane.containerNode);
				var tr = domConstruct.create("tr", {}, table);
				var reportTd = domConstruct.create("td", { style:"position:relative;width:50%; text-align:center;"}, tr);
				var dataTd = domConstruct.create("td", { style:"position:relative;width:50%; text-align:center;"}, tr);
				
				this.downloadReport = domConstruct.create("div", { className:"downloadButton", innerHTML:'<i class="fa fa-file-pdf-o downloadIcon"></i><span class="downloadText">Report</span>' }, reportTd)
				this.downloadData = domConstruct.create("div", { className:"downloadButton", innerHTML:'<i class="fa fa-file-zip-o downloadIcon"></i><span class="downloadText">Data</span>' }, dataTd) */
			}
			
			this.updateInterface = function(){
				domConstruct.empty(this.hazardSelect)
				array.forEach(this._interface.region[this._region].controls.select.hazard.options, function(item) {
					domConstruct.create("option", { innerHTML: item.name, value: item.value }, self.hazardSelect);
				});
				
				if (_.has(this._interface.region[this._region].controls.select, "datasource")) {
					query(".downloadButton").style("backgroundColor", "#d3d3d3");
					
					domConstruct.empty(this.dataSourceSelect)
					array.forEach(this._interface.region[this._region].controls.select.datasource.options, function(item) {
						domConstruct.create("option", { innerHTML: item.name, value: item.value }, self.dataSourceSelect);
					});
					domStyle.set(this.dataSourceSelect.parentNode.parentNode, "display",  "block");
					_.first(query('.slr-' + this._map.id + '-hazard .info-circle-text')).innerHTML = 3;
				} else {
					query(".downloadButton").style("backgroundColor", "#888888");
					
					domStyle.set(this.dataSourceSelect.parentNode.parentNode, "display",  "none");
					_.first(query('.slr-' + this._map.id + '-hazard .info-circle-text')).innerHTML = 2;
				}
				
				var labels = (_.has(this._interface.region[this._region].controls.slider.climate, "values")) ? this._interface.region[this._region].controls.slider.climate.values : this._interface.controls.slider.climate;
				array.forEach(query("#" + this.climateSliderLabels.id + " .dijitRuleLabel"), function(label,i) { label.innerHTML = labels[i]; })
				
				domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
				
				if (_.has(this._interface.region[this._region].controls.radiocheck, "aggregate")) {
					this.hazardLayerCheckBox.checked = false;
					this.hazardLayerCheckBox.disabled = this._interface.region[this._region].controls.radiocheck.aggregate.disabled;
					domStyle.set(this.hazardLayerCheckBox.parentNode.parentNode, "display", "block");
				} else {
					domStyle.set(this.hazardLayerCheckBox.parentNode.parentNode, "display", "none");
				}
				
				var display = (_.has(this._interface.region[this._region].controls.radiocheck, "fema")) ? "block" : "none";
				domStyle.set(this.femaLayerCheckBox.parentNode.parentNode, "display",  display);
				
				this.climateSlider.set("value", 0);
				this.climateSlider.set("disabled", true);
				this.scenarioSlider.set("value", 0);
				this.scenarioSlider.set("disabled", true);
				
				this.opacitySlider.set("disabled", false);
				
				array.forEach(_.keys(this._mapLayers), function(region) {
					array.forEach(_.keys(self._mapLayers[region]), function(layer) {
						self._mapLayers[region][layer].setVisibleLayers([]);
						self._mapLayers[region][layer].hide()	
					})
				})
				
				if (this._region != "") {
					this._mapLayer = this._mapLayers[this._region].main;
					this._mapLayer.show();
				} else {
					this._mapLayer = {};
				}
				
				var extent = new Extent(this._interface.region[this._region].extent);
				this._map.setExtent(extent, false);
				
			}
			
			this.updateControls = function() {
				var hazard = this.hazardSelect.value.toLowerCase();
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
				
				var disable = (hazard == "") ? true : false;
				this.climateSlider.set("disabled", disable);
			}
			
			this.resetInterface = function(){
				query(".downloadButton").style("backgroundColor", "#d3d3d3");
				
				domConstruct.empty(this.hazardSelect);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.hazardSelect);
				
				domConstruct.empty(this.dataSourceSelect);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.dataSourceSelect);
				domStyle.set(this.dataSourceSelect.parentNode.parentNode, "display",  "none");
				_.first(query('.slr-' + this._map.id + '-hazard .info-circle-text')).innerHTML = 2;
				
				this.hazardLayerCheckBox.checked = false;
				this.hazardLayerCheckBox.disabled = true;
				domStyle.set(this.hazardLayerCheckBox.parentNode.parentNode, "display", "none");
				
				this.femaLayerCheckBox.checked = false;
				domStyle.set(this.femaLayerCheckBox.parentNode.parentNode, "display", "none");
				
				this.climateSlider.set("value", 0);
				this.climateSlider.set("disabled", true);
				this.scenarioSlider.set("value", 0);
				this.scenarioSlider.set("disabled", true);
				this.hurricaneSlider.set("value", 1);
				this.hurricaneSlider.set("disabled", true);
				
				domStyle.set(this.climateSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.scenarioSlider.domNode.parentNode, "display",  "block");
				domStyle.set(this.hurricaneSlider.domNode.parentNode, "display",  "none");
				
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
				
				var p = domGeom.position(self._container);
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
