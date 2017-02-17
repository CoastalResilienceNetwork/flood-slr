
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
		"dijit/registry",
		"dojo/_base/array",
		"dojo/dom-construct",
		"dojo/dom-class",
		"dojo/dom-style",
		 "d3",
		"underscore",
		"./app",
		"dojo/text!plugins/flood-slr/data.json",
		"dojo/text!plugins/flood-slr/interface.json"
       ],
       function (declare, PluginBase, parser, registry, array, domConstruct, domClass, domStyle, d3, _, slr, appData, appConfig) {
           return declare(PluginBase, {
               toolbarName: "Flood and Sea Level Rise",
               toolbarType: "sidebar",
               resizable: false,
               showServiceLayersInLegend: true,
               allowIdentifyWhenActive: true,
               plugin_directory: "plugins/flood-slr",
			   infoGraphic: "<div><img src='plugins/flood-slr/slr_flooding_c.jpg'/></div>",
               width: 330,
			   height: "auto",
			   _state: {},
			   _firstLoad: true,
			   _saveAndShare: false,

               activate: function () {
					//process this._state if a populated object from setState exists
					if (!_.isEmpty(this._state)) {
						console.log(this._state);
						
						this._saveAndShare = true;
						this.slr.initializeMap();
						this._saveAndShare = false;
						
						for (var control in this._state.controls.selects) {
							 for (property in this._state.controls.selects[control]) {
								 this.slr[control][property] = this._state.controls.selects[control][property];
								 if (control == "regionSelect") {
									this.slr._region = this._state.controls.selects[control][property]
									this.slr.updateInterface();
								 }
								 if (control == "hazardSelect") {
									this.slr.updateControls();
								 }
								 if (property == "display") {
									domStyle.set(this.slr[control].parentNode.parentNode, property, this._state.controls.selects[control][property]) 
								 }
							 }
						 }

						 for (var slider in this._state.controls.sliders) {
							 for (property in this._state.controls.sliders[slider]) {
								this.slr[slider].set(property, this._state.controls.sliders[slider][property]);
								if (property == "display") {
									domStyle.set(this.slr[slider].domNode.parentNode, property, this._state.controls.sliders[slider][property]) 
								 }
							 }
						 }
						 
						for (var control in this._state.controls.radiocheck) {
							 for (property in this._state.controls.radiocheck[control]) {
								 this.slr[control][property] = this._state.controls.radiocheck[control][property];
								 if (property == "display") {
									domStyle.set(this.slr[control].parentNode.parentNode, property, this._state.controls.radiocheck[control][property]) 
								 }
							 }
						 }
						 
						this._state = {};
					} else {
						this.slr.showTool();
					}
               },

               deactivate: function () {
                   this.slr.hideTool();
               },

               hibernate: function () {
				   this.slr.closeTool();
				   this.slr.regionSelect.value = "";
				   this.slr.resetInterface();
               },

               initialize: function (frameworkParameters) {
				   declare.safeMixin(this, frameworkParameters);
                      var djConfig = {
                        parseOnLoad: true
                   };
                   domClass.add(this.container, "claro");
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
					   "display": domStyle.get(this.slr.femaLayerCheckBox.parentNode.parentNode, "display")
				   }
				   
                   return state;

                },

               setState: function (state) {
				   this._state = state;
               },

               identify: function(){

               }
           });
       });
