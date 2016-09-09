
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
					if (this._region && this._region != "") {
						this._mapLayers[this._region].show();
						this._map.setExtent(new Extent(this._interface.region[this._region].extent), false);
					} else {
						this._map.setExtent(new Extent(this._extent), false);
					}
				}
			} 

			this.hideTool = function(){
				if (this._mapLayer && this._mapLayer.loaded) { 
					this._mapLayer.hide();
				}
			}
			
			this.closeTool = function(){
				if (this._mapLayer && this._mapLayer.loaded) { 
					array.forEach(_.keys(this._interface.region), function(region){
						self._map.removeLayer(self._mapLayers[region]);
					});
					this._firstLoad = true;
				}
			}

			this.initializeMap = function(){
				if (this._firstLoad) {
					array.forEach(_.keys(this._interface.region), function(region, i){
						var mapLayer = new DynamicMapServiceLayer(self._interface.region[region].url, { id:"slr-layer-" + i });
						self._mapLayers[region] = mapLayer;
						self._map.addLayer(mapLayer);
						mapLayer.hide();
						mapLayer.setVisibleLayers([]);
					});
					if (!this._plugin._saveAndShare) {
						this._map.setExtent(new Extent(this._extent), false);
						this._firstLoad = false;
					}
				}
			}
			
			this.updateMapLayers = function() {
				
				var hazard = this.hazardSelect.value.toLowerCase();
				var climate = this._interface.controls.slider.climate[this.climateYearSlider.get("value")].toLowerCase();
				var scenario = this._interface.controls.slider.scenario[this.scenarioSlider.get("value")].toLowerCase();
				var parts = (this.hazardLayerCheckBox.checked) ? [hazard, climate, scenario, "aggregate"] : [hazard, climate, scenario];
				
				var visibleLayers = (hazard != "") ? this._data.region[this._region][parts.join("|")] : [];
				
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
				/* this.introPane = new ContentPane({ innerHTML:"Explore areas affected by increased coastal hazards due to future sea level rise." });
				this.cp.domNode.appendChild(this.introPane.domNode);
			    domStyle.set(this.introPane.containerNode, {
					"position": "relative",
					"overflow": "visible",
					"background": "#f3f4f3",
					"border": "1px dotted #ccc",
					"padding": "15px 20px 15px 20px",
					"font-size": "16px",
					"text-align": "center"
				}); */
				
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
				
				var hazardTd = domConstruct.create("div", {
					style:"position:relative; width:100%; margin-bottom:20px;"
				}, this.inputsPane.containerNode);
				
				var climateTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:30px; padding:0px; margin:30px 0px 10px 0px;"
				}, this.inputsPane.containerNode);
				
				var scenarioTd = domConstruct.create("div", {
					style:"position:relative; width:100%; height:30px; padding:0px; margin:30px 0px 0px 0px;"
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
					coreFx.combine([
					   xFx.wipeTo({ node: this, duration: 150, width: 80 }),
					   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 153 })
				   ]).play();
				   domStyle.set(this, "background", "#59C3CD");
				});
				on(this.downloadReport,"mouseout", function(){
					coreFx.combine([
					   xFx.wipeTo({ node: this, duration: 150, width: 33 }),
					   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 200 })
				   ]).play();
				   domStyle.set(this, "background", "#888888");
				});
				on(this.downloadReport,"click", function(){
					 if (self._region && self._region != "") {
						 var url = window.location.href + self._interface.region[self._region].download.report;
						window.open(url, "_blank");
					 }
				});
				
				this.downloadData = domConstruct.create("div", { className:"downloadButton", innerHTML:'<i class="fa fa-file-zip-o downloadIcon"></i><span class="downloadText">Data</span>' }, regionTd);
				on(this.downloadData,"mouseover", function(){
					coreFx.combine([
					   xFx.wipeTo({ node: this, duration: 150, width: 75 }),
					   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 158 })
					]).play();
				   domStyle.set(this, "background", "#59C3CD");
				});
				on(this.downloadData,"mouseout", function(){
					coreFx.combine([
					   xFx.wipeTo({ node: this, duration: 150, width: 33 }),
					   xFx.wipeTo({ node: regionSelectDiv, duration: 150, width: 200 })
					]).play();
				   domStyle.set(this, "background", "#888888");
				});
				on(this.downloadData,"click", function(){
					 if (self._region && self._region != "") {
						 var url = self._interface.region[self._region].download.data;
						window.open(url, "_blank");
					 }
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
					self.updateMapLayers();
				});
				
				var checkBoxDiv = domConstruct.create("label", { 
					for: "slr-hazard-layer-" + self._map.id,
					className:"styled-checkbox",
					style:"display:block;margin-left: 5px;"
				}, hazardTd);
				this.hazardLayerCheckBox = domConstruct.create("input", {
					type:"checkbox",
					value:"hazard",
					name:"hazard-layer",
					id:"slr-hazard-layer-" + self._map.id,
					disabled:true,
					checked:false
				}, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", {
					innerHTML: '<span>view aggregate data</span>'
				}, checkBoxDiv);
				on(self.hazardLayerCheckBox, "change", function(){
					var climate = self.climateYearSlider.get("value");
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
			    var climateYearSliderLabel = domConstruct.create("div", {
					innerHTML: "<i class='fa fa-info-circle slr-" + this._map.id + "-climate'></i>&nbsp;<b>Climate Year: </b>",
					style:"position:relative; width:105px; top:-7px; display:inline-block;"
				}, climateTd);
				this.climateYearSlider = new HorizontalSlider({
			        name: "climateYearSlider",
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
						self.updateMapLayers();
			        }
			    });
			    climateTd.appendChild(this.climateYearSlider.domNode);

			    var climateYearSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: 0,
			    	labels: this._interface.controls.slider.climate,
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.climateYearSlider.addChild(climateYearSliderLabels);
				
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
						self.updateMapLayers();
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
				
				//scenario slider
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
						array.forEach(_.values(self._mapLayers), function(layer){
							layer.setOpacity(Math.abs(value-1))
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
				
				this.hazardLayerCheckBox.checked = false;
				this.hazardLayerCheckBox.disabled = this._interface.region[this._region].controls.radiocheck.aggregate.disabled;
				var display = (this._interface.region[this._region].controls.radiocheck.aggregate.disabled) ? "none" : "block";
				domStyle.set(this.hazardLayerCheckBox.parentNode, "display", display);
				
				this.climateYearSlider.set("value", 0);
				this.climateYearSlider.set("disabled", false);
				this.scenarioSlider.set("value", 0);
				this.scenarioSlider.set("disabled", true);
				var display = (this._interface.region[this._region].controls.slider.scenario.disabled) ? "none" : "block";
				domStyle.set(this.scenarioSlider.domNode.parentNode, "display", display);
				this.opacitySlider.set("disabled", false);
				
				if (!_.isEmpty(this._mapLayer)) {
					this._mapLayer.setVisibleLayers([]);
					this._mapLayer.hide();
				}
				this._mapLayer = this._mapLayers[this._region];
				this._mapLayer.show();
				
				var extent = new Extent(this._interface.region[this._region].extent);
				this._map.setExtent(extent, false);
				
			}
			
			this.resetInterface = function(){
				domConstruct.empty(this.hazardSelect);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.hazardSelect);
				
				this.hazardLayerCheckBox.checked = false;
				this.hazardLayerCheckBox.disabled = true;
				domStyle.set(this.hazardLayerCheckBox.parentNode, "display", "block");
				
				this.climateYearSlider.set("value", 0);
				this.climateYearSlider.set("disabled", true);
				this.scenarioSlider.set("value", 0);
				this.scenarioSlider.set("disabled", true);
				domStyle.set(this.scenarioSlider.domNode.parentNode, "display", "block");
				this.opacitySlider.set("disabled", true);
				
				if (!_.isEmpty(this._mapLayer)) {
					this._mapLayer.setVisibleLayers([]);
					this._mapLayer.hide();
				}
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
