
// Plugins should load their own versions of any libraries used even if those libraries are also used
// by the GeositeFramework, in case a future framework version uses a different library version.

require({
    // Specify library locations.
    // The calls to location.pathname.replace() below prepend the app's root path to the specified library location.
    // Otherwise, since Dojo is loaded from a CDN, it will prepend the CDN server path and fail, as described in
    // https://dojotoolkit.org/documentation/tutorials/1.7/cdn
    packages: [
        {
        	name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
		{
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
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
			   fullName: "Flood and Sea Level Rise",
               hasHelp: false,
               showServiceLayersInLegend: true,
               allowIdentifyWhenActive: true,
               plugin_directory: "plugins/flood-slr",
			   resizable: false,
			   width: 425,
			   _state: {},
			   _firstLoad: true,
			   _saveAndShare: true,

               activate: function () {
					//console.log("activate");
					if (this._firstLoad && this.app.singlePluginMode) {
                        $('#show-single-plugin-mode-help').click();
                        $('body').removeClass('pushy-open-left').removeClass('pushy-open-right');
                    }
					
					this.slr._status = "active";
					if (_.isUndefined(this.map.getLayer("slr-layer-0"))) {
						var plugin = this;
						window.setTimeout(function() {
							if (plugin._firstLoad) {
								plugin.slr.loadLayers();
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
				   
				    if (_.has(this.slr._interface, "includeMinimize") && !this.slr._interface.includeMinimize && _.has(this.slr, "closeTool")) {
					   this.slr.closeTool();
					   this.slr._status = "close";
				   } else if (_.has(this.slr, "hideTool")) {
					   this.slr.hideTool();
					   this.slr._status = "minimize";
				   }
               },

               hibernate: function () {
				   //console.log("hibernate");
				   if (_.has(this.slr, "closeTool")) {
					   this.slr._status = "close";
					   this.slr.closeTool();
				   }
               },

               initialize: function (frameworkParameters) {
				   //console.log("initialize - plugin");
					var plugin = this;
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
                   var plugin = this;
				   var state = new Object();
				   
				   state.controls = {};
				   state.controls.selects = {};
				   state.controls.sliders = {};
				   state.controls.checkbox = {};
				   state.controls.radiobutton = {};
				   state.controls.togglebutton = {};
				   
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
						"labels": this.slr.climateSliderLabels.labels,
						"value": this.slr.climateSlider.get("value"),
					   "disabled": this.slr.climateSlider.get("disabled"),
					   "display": domStyle.get(this.slr.climateSlider.domNode.parentNode, "display")
					   
				   }
				   state.controls.sliders.scenarioSlider = {
						"labels": this.slr.scenarioSliderLabels.labels,
						"value": this.slr.scenarioSlider.get("value"),
					   "disabled": this.slr.scenarioSlider.get("disabled"),
					   "display": domStyle.get(this.slr.scenarioSlider.domNode.parentNode, "display")
					   
				   }
				   state.controls.sliders.sealevelriseSlider = {
						"labels": this.slr.sealevelriseSliderLabels.labels,
						"value": this.slr.sealevelriseSlider.get("value"),
					   "disabled": this.slr.sealevelriseSlider.get("disabled"),
					   "display": domStyle.get(this.slr.sealevelriseSlider.domNode.parentNode, "display")
					   
				   }
				   state.controls.sliders.hurricaneSlider = {
						"labels": this.slr.hurricaneSliderLabels.labels,
						"value": this.slr.hurricaneSlider.get("value"),
					   "disabled": this.slr.hurricaneSlider.get("disabled"),
					   "display": domStyle.get(this.slr.hurricaneSlider.domNode.parentNode, "display")
					   
				   }
				   state.controls.sliders.stormSurgeSlider = {
						"labels": this.slr.stormSurgeSliderLabels.labels,
						"value": this.slr.stormSurgeSlider.get("value"),
					   "disabled": this.slr.stormSurgeSlider.get("disabled"),
					   "display": domStyle.get(this.slr.stormSurgeSlider.domNode.parentNode, "display")
					   
				   }
				   state.controls.sliders.opacitySlider = {
						"value": this.slr.opacitySlider.get("value"),
					   "disabled": this.slr.opacitySlider.get("disabled")
				   }
				   state.controls.checkbox.hazardCheckBox = {
					   "checked": this.slr.hazardCheckBox.checked,
					   "disabled": this.slr.hazardCheckBox.disabled,
					   "value": this.slr.hazardCheckBox.value,
					   "display": domStyle.get(this.slr.hazardCheckBox.parentNode.parentNode, "display"),
					   "show": domStyle.get(this.slr.hazardCheckBox.parentNode, "display"),
					   "label": this.slr.hazardCheckBoxLabel.innerHTML
				   }
				   state.controls.checkbox.armorCheckBox = {
					   "checked": this.slr.armorCheckBox.checked,
					   "disabled": this.slr.armorCheckBox.disabled,
					   "value": this.slr.armorCheckBox.value,
					   "display": domStyle.get(this.slr.armorCheckBox.parentNode.parentNode, "display"),
					   "show": domStyle.get(this.slr.armorCheckBox.parentNode, "display"),
					   "label": this.slr.armorCheckBoxLabel.innerHTML
				   }
				   state.controls.checkbox.otherCheckBox = {
					   "checked": this.slr.otherCheckBox.checked,
					   "disabled": this.slr.otherCheckBox.disabled,
					   "value": this.slr.otherCheckBox.value,
					   "display": domStyle.get(this.slr.otherCheckBox.parentNode.parentNode, "display"),
					   "visibility": domStyle.get(this.slr.otherCheckBox.parentNode.parentNode, "visibility"),
					   "label": this.slr.otherCheckBoxLabel.innerHTML
				   }
				   
				   array.forEach(_.keys(this.slr._interface.region), function(key) { 
					if (!_.isUndefined(plugin.slr._interface.region[key].controls.radiocheck)) {
						var rbs = _.where(plugin.slr._interface.region[key].controls.radiocheck, { "type":"radio" });
						array.forEach(rbs, function(rb) {
							state.controls.radiobutton[rb.name + "RadioButton"] = {
								"checked": plugin.slr[rb.name + "RadioButton"].checked,
								"disabled": plugin.slr[rb.name + "RadioButton"].disabled,
								"display": domStyle.get(plugin.slr[rb.name + "RadioButton"].parentNode.parentNode.parentNode, "display")
							}
						});
					}
				   });
				   
				   array.forEach(_.keys(this.slr._interface.region), function(key) { 
					if (!_.isUndefined(plugin.slr._interface.region[key].controls.togglebutton)) {
						array.forEach(_.keys(plugin.slr._interface.region[key].controls.togglebutton), function(group) {
							array.forEach(_.keys(plugin.slr._interface.region[key].controls.togglebutton[group].controls), function(name) {
								if (!_.isUndefined(plugin.slr[name + "ToggleButton"])) {
									state.controls.togglebutton[name + "ToggleButton"] = {
										"checked": plugin.slr[name + "ToggleButton"].checked,
										"disabled": plugin.slr[name + "ToggleButton"].disabled,
										"display": domStyle.get(plugin.slr[name + "ToggleButton"].parentNode.parentNode.parentNode, "display")
									}
								}
							});
						});
					}
				   });
				   
				   var modelStorms = query("[id*=slr-model-storm-]");
				   if (modelStorms.length > 0) { 
						state.controls.storm = {};
						state.controls.storm.container = {};
						state.controls.storm.subitems = {};
						
						state.controls.storm.container["storm-toggle parentNode"] = { 
							"display": domStyle.get(_.first(query(".storm-toggle")).parentNode, "display"),
							"margin-bottom": domStyle.get(_.first(query(".storm-toggle")).parentNode, "margin-bottom")
						}
						
						state.controls.storm.container["storm-toggle-header"] = { 
							"toggleClass": domAttr.get(_.first(query(".storm-toggle-header i")),"class"),
							"display": domStyle.get(_.first(query(".storm-toggle-header")), "display")
						}
						
						state.controls.storm.container["storm-toggle-header-label"] = { 
							"label": _.first(query(".storm-toggle-header-label")).innerHTML
						}
						
						state.controls.storm.container["storm-toggle-container"] = { 
							"display": domStyle.get(_.first(query(".storm-toggle-container")), "display")
						}
						
						var subitems = query(".storm-toggle-subitem");
						array.forEach(subitems, function(node) {
							var id = domAttr.get(node, "class").split(" ").pop();
							state.controls.storm.subitems[id] = { 
								"css": { "display": domStyle.get(node, "display"), "padding-left": domStyle.get(node, "padding-left") }
							}
							
							var textNode = _.first(query("div[class*=" + id +"] .storm-toggle-text"))
							state.controls.storm.subitems[id]["storm-toggle-text"] = {
								"css": { "display": domStyle.get(textNode, "display") },
								"class": domAttr.get(textNode, "class")
							}
							
							var tdNode = _.first(query("div[class*=" + id +"] .storm-toggle-td"))
							state.controls.storm.subitems[id]["storm-toggle-td"] = {
								"css": { "display": domStyle.get(tdNode, "display"), "padding-left": domStyle.get(tdNode, "padding-left") },
								"firstChild": { "margin-left": domStyle.get(tdNode.firstChild, "display") }
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
				   
				   if (_.has(this.slr._interface.region[this.slr._region], "chart")) {
						state.chart = true;
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
									_.first(query('.slr-' + plugin._map.id + '-hazard .info-circle-text')).innerHTML = 2;
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
							switch(property) {
								case "display":
									domStyle.set(plugin[slider].domNode.parentNode, property, this._state.controls.sliders[slider][property]) 
									break;
								case "labels":
									var labels = this._state.controls.sliders[slider][property];
									plugin[slider].set("maximum", labels.length-1);
									plugin[slider].set("discreteValues", labels.length);
									plugin[slider + "Labels"].set("labels",labels);
									plugin[slider + "Labels"].set("count", labels.length);
									plugin[slider + "Labels"].buildRendering();
									break;
								default:
									plugin[slider].set(property, this._state.controls.sliders[slider][property]);
									break;
							}
						 }
					 }
					 
					for (var control in this._state.controls.checkbox) {
						 for (var property in this._state.controls.checkbox[control]) {
							 if (property == "display" || property == "visibility") {
								domStyle.set(plugin[control].parentNode.parentNode, property, this._state.controls.checkbox[control][property]) 
							 } else if (property == "show") {
								domStyle.set(plugin[control].parentNode, "display", this._state.controls.checkbox[control][property]) 
							 } else if (property == "label") {
								plugin[control + "Label"].innerHTML = this._state.controls.checkbox[control][property];
							 } else {
								plugin[control][property] = this._state.controls.checkbox[control][property];
							 }
						 }
					 }
					 
					 for (var control in this._state.controls.radiobutton) {
						 for (var property in this._state.controls.radiobutton[control]) {
							 if (property == "display") {
								domStyle.set(plugin[control].parentNode.parentNode.parentNode, property, this._state.controls.radiobutton[control][property]) 
							 } else {
								plugin[control][property] = this._state.controls.radiobutton[control][property];
							 }
						 }
					 }
					 
					 for (var control in this._state.controls.togglebutton) {
						 for (var property in this._state.controls.togglebutton[control]) {
							 if (property == "display") {
								domStyle.set(plugin[control].parentNode.parentNode.parentNode, property, this._state.controls.togglebutton[control][property]) 
							 } else {
								plugin[control][property] = this._state.controls.togglebutton[control][property]; 
							 }
						 }
					 }
					 
					 if (_.has(this._state.controls, "storm")) {
						for (var item in this._state.controls.storm) {
							for (var control in this._state.controls.storm[item]) {
								var parts = control.split(" ");
								var node = _.first(query("." + _.first(parts)));
								for (var property in this._state.controls.storm[item][control]) {
									if (property == "display") {
										if (_.last(parts) == "parentNode") {
											domStyle.set(node.parentNode, "display", this._state.controls.storm[item][control][property]);
										}
										domStyle.set(node, "display", this._state.controls.storm[item][control][property]);
										domStyle.set(node.lastChild, "display", this._state.controls.storm[item][control][property]);
									} else if (property == "radiocheck") {
										for(var id in this._state.controls.storm[item][control].radiocheck) {
											var input = dom.byId(id);
											for (var attr in this._state.controls.storm[item][control].radiocheck[id]) {
												input[attr] = this._state.controls.storm[item][control].radiocheck[id][attr];
											}
										}
									} else if (property == "label") {
										node.innerHTML = this._state.controls.storm[item][control][property];
									} else if (property == "css") {
										domStyle.set(node, this._state.controls.storm[item][control][property]);
									} else if (property == "storm-toggle-text") {
										var textNode = _.first(query("div[class*=" + control +"] ." + property));
										for(var attr in this._state.controls.storm[item][control][property]) {
											if (attr == "css") {
												domStyle.set(textNode, this._state.controls.storm[item][control][property][attr]);
											}
											if (attr == "class") {
												domAttr.set(textNode, attr, this._state.controls.storm[item][control][property][attr]);
											}
										}	
									} else if (property == "storm-toggle-td") {
										var tdNode = _.first(query("div[class*=" + control +"] ." + property));
										for(var attr in this._state.controls.storm[item][control][property]) {
											if (attr == "css") {
												domStyle.set(tdNode, this._state.controls.storm[item][control][property][attr]);
											} else if (attr == "firstChild") {
												domStyle.set(tdNode.firstChild, this._state.controls.storm[item][control][property][attr]);
											}
										}	
									}
								}
							}
						}
					 }
					 
					 if (_.has(this._state, "chart")) {
						plugin.createChart();
						window.setTimeout(function(){
							plugin.updateChart();
							plugin.highlightChart();
						}, 500)						
					 }
					 
					 this._state = {};
			   }
           });
       });
