
// Plugins should load their own versions of any libraries used even if those libraries are also used
// by the GeositeFramework, in case a future framework version uses a different library version.

require({
    // Specify library locations.
    // The calls to location.pathname.replace() below prepend the app's root path to the specified library location.
    // Otherwise, since Dojo is loaded from a CDN, it will prepend the CDN server path and fail, as described in
    // https://dojotoolkit.org/documentation/tutorials/1.7/cdn
    packages: [
        {
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3",
            main: "underscore-min"
        }
    ]
});

define([
		"dojo/_base/declare",
		"framework/PluginBase",
		"dojo/parser",
		"dojo/on",
		"dijit/registry",
		"dojo/_base/array",
		"dojo/dom-construct",
		"dojo/query",
		"dojo/dom",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-attr",
		 "d3",
		"underscore",
		"./app",
		"dojo/text!plugins/flood-slr/data.json",
		"dojo/text!plugins/flood-slr/interface.json"
       ],
       function (declare, PluginBase, parser, on, registry, array, domConstruct, query, dom, domClass, domStyle, domAttr, d3, _, slr, appData, appConfig) {
           return declare(PluginBase, {
               toolbarName: "Flood and Sea Level Rise",
               toolbarType: "sidebar",
               hasHelp: false,
               showServiceLayersInLegend: true,
               allowIdentifyWhenActive: true,
               plugin_directory: "plugins/flood-slr",
			   infoGraphic: "<div><img src='plugins/flood-slr/slr_flooding_c.jpg'/></div>",
			   size:"custom",
               width: 320,
			   _state: {},
			   _firstLoad: true,
			   _saveAndShare: true,

               activate: function () {
					//console.log("activate");
					if (_.isUndefined(this.map.getLayer("slr-layer-0"))) {
						var plugin = this;
						window.setTimeout(function() {
							if (plugin._firstLoad) {
								plugin.slr.loadLayers();
								plugin.slr.loadInterface(plugin);
								plugin.slr.showTool();
								if (!_.isEmpty(plugin._state)) {
									plugin.loadState();
									plugin.slr.updateMapLayers();
								}
							}
						}, 1000);
					} else {
						this.slr.showTool();
					}
               },

               deactivate: function () {
                   //console.log("deactivate");
				   this.slr.hideTool();
               },

               hibernate: function () {
				   //console.log("hibernate");
				   this.slr.closeTool();
               },

               initialize: function (frameworkParameters) {
				   //console.log("initialize - plugin");
					declare.safeMixin(this, frameworkParameters);
					  var djConfig = {
						parseOnLoad: true
				    };
				    domClass.add(this.container, "claro");
				    domClass.add(this.container, "plugin-slr");
					this.slr = new slr(this, appData, appConfig);
					tool_slr = this.slr;
					this.slr.initialize(this.slr);
					domStyle.set(this.container.parentNode, {
						"padding": "0px"
					});
               },

               getState: function () {
                   var state = new Object();
				   
				   state.controls = {};
				   state.controls.selects = {};
				   state.controls.sliders = {};
				   state.controls.radiocheck = {};
				   
				   state.controls.selects.regionSelect = {
						"value": this.slr.regionSelect.value
				   }
				   state.controls.selects.dataSourceSelect = {
						"value": this.slr.dataSourceSelect.value,
					   "display": domStyle.get(this.slr.dataSourceSelect.parentNode.parentNode, "display")
				   }
				   state.controls.selects.hazardSelect = {
						"value": this.slr.hazardSelect.value
				   }
				   
				   if (domStyle.get(this.slr.hazardDescriptionDiv, "display") == "block") {
						state.controls.selects.hazardSelect.description = this.slr.hazardDescriptionDiv.innerHTML;
					}
					
				   state.controls.sliders.climateSlider = {
						"value": this.slr.climateSlider.get("value"),
					   "disabled": this.slr.climateSlider.get("disabled"),
					   "display": domStyle.get(this.slr.climateSlider.domNode.parentNode, "display")
				   }
				   state.controls.sliders.scenarioSlider = {
						"value": this.slr.scenarioSlider.get("value"),
					   "disabled": this.slr.scenarioSlider.get("disabled"),
					   "display": domStyle.get(this.slr.scenarioSlider.domNode.parentNode, "display")
				   }
				   state.controls.sliders.sealevelriseSlider = {
						"value": this.slr.sealevelriseSlider.get("value"),
					   "disabled": this.slr.sealevelriseSlider.get("disabled"),
					   "display": domStyle.get(this.slr.sealevelriseSlider.domNode.parentNode, "display")
				   }
				   state.controls.sliders.hurricaneSlider = {
						"value": this.slr.hurricaneSlider.get("value"),
					   "disabled": this.slr.hurricaneSlider.get("disabled"),
					   "display": domStyle.get(this.slr.hurricaneSlider.domNode.parentNode, "display")
				   }
				   state.controls.sliders.opacitySlider = {
						"value": this.slr.opacitySlider.get("value"),
					   "disabled": this.slr.opacitySlider.get("disabled")
				   }
				   state.controls.radiocheck.hazardLayerCheckBox = {
					   "checked": this.slr.hazardLayerCheckBox.checked,
					   "disabled": this.slr.hazardLayerCheckBox.disabled,
					   "display": domStyle.get(this.slr.hazardLayerCheckBox.parentNode.parentNode, "display")
				   }
				   state.controls.radiocheck.femaLayerCheckBox = {
					   "checked": this.slr.femaLayerCheckBox.checked,
					   "disabled": this.slr.femaLayerCheckBox.disabled,
					   "visibility": domStyle.get(this.slr.femaLayerCheckBox.parentNode.parentNode, "visibility")
				   }
				   
				   var modelStorms = query("[id*=slr-model-storm-]");
				   if (modelStorms.length > 0) { 
						state.controls.storm = {};
						state.controls.storm.container = {};
						state.controls.storm.subitems = {};
						
						state.controls.storm.container["storm-toggle"] = { 
							"display": domStyle.get(_.first(query(".storm-toggle")), "display"),
						}
						
						state.controls.storm.container["storm-toggle-header"] = { 
							"toggleClass": domAttr.get(_.first(query(".storm-toggle-header i")),"class")
						}
						
						state.controls.storm.container["storm-toggle-container"] = { 
							"display": domStyle.get(_.first(query(".storm-toggle-container")), "display")
						}
						
						var subitems = query(".storm-toggle-subitem");
						array.forEach(subitems, function(node) {
							var id = domAttr.get(node, "class").split(" ").pop();
							state.controls.storm.subitems[id] = { 
								"display": domStyle.get(node, "display"),
								"toggleClass": domAttr.get(node.firstChild, "class")
							}
							state.controls.storm.subitems[id].radiocheck = {}
							array.forEach(modelStorms, function(input) {
								if (input.id.indexOf(id.split("-").pop()) > -1) {
									state.controls.storm.subitems[id].radiocheck[input.id] = {
									   "checked": input.checked,
									   "disabled": input.disabled
									}
								}
							})
						})
				   }
				   //console.log(state);
                   return state;
                },

               setState: function (data) {
				   //console.log("setState");
				   this._state = data;
               },
			   
			   loadState: function () {
				   //console.log("loadState");
				   //console.log(this._state);
				   var plugin = this.slr;
				   for (var control in this._state.controls.selects) {
						 for (var property in this._state.controls.selects[control]) {
							 
							 if (control == "regionSelect") {
								plugin._region = this._state.controls.selects[control][property];
								if (plugin._region != "" && _.has(plugin._interface.region[plugin._region].controls.select, "datasource")) {
									var options = plugin._interface.region[plugin._region].controls.select.datasource.options;
									array.forEach(options, function(item) {
										domConstruct.create("option", { innerHTML: item.name, value: item.value }, plugin.dataSourceSelect);
									});
									var number = (options.length > 1) ? 3 : 2;
									_.first(query('.slr-' + plugin._map.id + '-hazard .info-circle-text')).innerHTML = number;
									
									var backgroundColor = (plugin.dataSourceSelect.value != "") ? "#2B2E3B" : "#94959C";
									query(".downloadButton").style("backgroundColor", backgroundColor);
								} else {
									query(".downloadButton").style("backgroundColor", "#2B2E3B");
									_.first(query('.slr-' + this._map.id + '-hazard .info-circle-text')).innerHTML = 2;
								}
							 }
							 if (control == "hazardSelect") {
								array.forEach(plugin._interface.region[plugin._region].controls.select.hazard.options, function(item) {
									domConstruct.create("option", { innerHTML: item.name, value: item.value }, plugin.hazardSelect);
								});
								plugin.updateControls();
								
								if (property == "description") {
									domStyle.set(plugin.hazardDescriptionDiv, "display", "block");
									plugin.hazardDescriptionDiv.innerHTML = this._state.controls.selects[control][property]								
								 }
							 }
							 if (property == "display") {
								domStyle.set(plugin[control].parentNode.parentNode, property, this._state.controls.selects[control][property]) 
							 }
							 plugin[control][property] = this._state.controls.selects[control][property];
						 }
					 }

					 for (var slider in this._state.controls.sliders) {
						 for (var property in this._state.controls.sliders[slider]) {
							plugin[slider].set(property, this._state.controls.sliders[slider][property]);
							if (property == "display") {
								domStyle.set(plugin[slider].domNode.parentNode, property, this._state.controls.sliders[slider][property]) 
							 }
						 }
					 }
					 
					for (var control in this._state.controls.radiocheck) {
						 for (var property in this._state.controls.radiocheck[control]) {
							 plugin[control][property] = this._state.controls.radiocheck[control][property];
							 if (property == "display" || property == "visibility") {
								domStyle.set(plugin[control].parentNode.parentNode, property, this._state.controls.radiocheck[control][property]) 
							 }
						 }
					 }
					 
					 if (_.has(this._state.controls, "storm")) {
						for (var item in this._state.controls.storm) {
							for (var control in this._state.controls.storm[item]) {
								var node = _.first(query("." + control));
								for (var property in this._state.controls.storm[item][control]) {
									if (property == "toggleClass") {
										domAttr.set(node.firstChild, "class", this._state.controls.storm[item][control][property]);
									} else if (property == "display") {
										domStyle.set(node, "display", this._state.controls.storm[item][control][property]);
										domStyle.set(node.lastChild, "display", this._state.controls.storm[item][control][property]);
									} else if (property == "radiocheck") {
										for(var id in this._state.controls.storm[item][control].radiocheck) {
											var input = dom.byId(id);
											for (var attr in this._state.controls.storm[item][control].radiocheck[id]) {
												input[attr] = this._state.controls.storm[item][control].radiocheck[id][attr];
											}
										}
									}
								}
							}
						}
					 }
					 this._state = {};
			   },

               identify: function(){

               }
           });
       });
