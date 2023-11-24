/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "zuiio2/model/models"
    ],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("zuiio2.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
            }
            // ,

            // destroy: function() {
            //     // var parent = this.getParent();
            //     // if (parent) {
            //     //     var commandInfo = this._getCommandInfo();
            //     //     if (commandInfo && commandInfo.shortcut !== null) {
            //     //         r.unregister(parent, commandInfo.shortcut);                        
            //     //     }
            //     //     this._cleanupContext(parent);
            //     // }
            //     // n.prototype.destroy.apply(this, arguments);

            //     UIComponent.prototype.destroy.apply(this, arguments);
            //   }
        });
    }
);