sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, Common, JSONModel, History) {
        "use strict";

        var that;

        return Controller.extend("zuiio2.controller.AssignMaterial", {    
            onInit: function(){
                that = this;  

                //Initialize Router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteIOAssignMaterial").attachPatternMatched(this._routePatternMatched, this);

                //Initialize Translations
                // this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            _routePatternMatched: function (oEvent) {
                this._ioNo = oEvent.getParameter("arguments").iono; //get IONO from route pattern
                this._sbu = oEvent.getParameter("arguments").sbu; //get SBU from route pattern
                console.log(oEvent.getParameter("arguments"))
                //set change false as initial
                this._materialListChanged = false;
                // this.setChangeStatus(false);

                //get data
                // this.getMaterialList();
                this.getMaterials(); 

                var oData = this.getOwnerComponent().getModel("ASSIGNMATNO_MODEL").getData().data;
                oData.forEach(item => item.EDITED = false);
                console.log(oData)
                this.getView().setModel(new JSONModel(oData), "materialList");
                this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").getData().oDDTextResult), "ddtext");

                this._validationErrors = [];
            },

            setChangeStatus: function(changed) {
                //set change flag
                sap.ushell.Container.setDirtyFlag(changed);
            },

            //******************************************* */
            // Material List
            //******************************************* */

            getMaterials: function() {
                //get Materials for value help
                var oSHModel = this.getOwnerComponent().getModel("ZGW_3DERP_SH_SRV");
                var oView = this.getView();
                var oJSONModel = new JSONModel();

                Common.openLoadingDialog(that);
                
                oSHModel.read("/MaterialNoSet", {
                    success: function(oData, oResponse) {
                        oJSONModel.setData(oData.results);
                        oView.setModel(oJSONModel, "materials");
                        Common.closeLoadingDialog(that);
                    },
                    error: function() { 
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            //******************************************* */
            // Assign Automatic
            //******************************************* */

            onAssignAutomatic: function() {
                //Assign automatic clicked
                var me = this;

                //get selected items for automatic assignment
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                var oTable = this.getView().byId("materialListTab");
                var aData = oTable.getModel("materialList").getData();
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var oJSONModel = new JSONModel();
                var aParam = [];
                var me = this;
                var materialListChanged = false;

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        if (aData.at(item).MATNO === "") {
                            aParam.push({ 
                                SEQNO: aData.at(item).SEQNO,
                                GMC: aData.at(item).GMC,
                                MATDESC1: aData.at(item).MATDESC1,
                                MATNO: ""
                            });
                        }
                    })

                    if (aParam.length > 0) {
                        var oEntry = {
                            IONO: aData.at(oSelectedIndices[0]).IONO,
                            N_AutoAssign: aParam
                        }
    
                        Common.openProcessingDialog(that);
    
                        oModel.create("/AutoAssignSet", oEntry, {
                            method: "POST",
                            success: function(oDataReturn, oResponse) {
                                //assign the materials based on the return
                                var oReturnItems = oDataReturn.N_AutoAssign.results;
    
                                for (var i = 0; i < aData.length; i++) {
                                    var seqno = aData[i].SEQNO;
                                    var item = oReturnItems.find((result) => result.SEQNO === seqno);
    
                                    if (item !== undefined) {
                                        try {
                                            if (item.MATNO !== "") {
                                                aData[i].MATNO = item.MATNO;
                                                aData[i].EDITED = true;
                                                materialListChanged = true;
                                            }
                                        } catch(err) {}
                                    }
                                }
    
                                oJSONModel.setData(aData);
                                oTable.setModel(oJSONModel, "materialList");
                                Common.closeProcessingDialog(me);
    
                                if (materialListChanged) {
                                    me._materialListChanged = true;
                                    Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_MATNO_ASSIGNED"]);
                                }
                            },
                            error: function(err) {
                                Common.closeProcessingDialog(that);
                                // Common.showMessage(me._i18n.getText('t5'));
                            }
                        });
                    }
                    else {
                        Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_MATNO_ALREADY_EXIST"]);
                    }
                }
                else {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_RECORD_TO_PROC"]);
                }
            },

            //******************************************* */
            // Create Material
            //******************************************* */

            onCreateMaterial: function() {
                //create material clicked
                var me = this;

                //get selected items for automatic assignment
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                var oTable = this.getView().byId("materialListTab");
                var aData = oTable.getModel("materialList").getData();
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var oJSONModel = new JSONModel();
                var aParam = [];
                var me = this;
                var materialListChanged = false;

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        if (aData.at(item).MATNO === "") {
                            aParam.push({
                                SEQNO: aData.at(item).SEQNO,
                                GMC: aData.at(item).GMC,
                                GMCDESC: aData.at(item).GMCDESC,
                                GMCDESCCN: aData.at(item).GMCDESCCN,
                                MATDESC1: aData.at(item).MATDESC1,
                                MATTYP: aData.at(item).MATTYP,
                                MATGRPCD: aData.at(item).MATGRPCD,
                                UOM: aData.at(item).UOM,
                                PURPLANT: aData.at(item).PURPLANT,
                                MATNO: ""
                            });
                        }
                    })

                    if (aParam.length > 0) {
                        var oEntry = {
                            SBU: this._sbu,
                            IONO: this._ioNo,
                            N_MaterialParam: aParam
                        }
    
                        Common.openProcessingDialog(this);
                        console.log(oEntry)
                        oModel.create("/MaterialSet", oEntry, {
                            method: "POST",
                            success: function(oDataReturn, oResponse) {
                                //assign the materials based on the return
                                var oReturnItems = oDataReturn.N_MaterialParam.results;
                                Common.closeProcessingDialog(me);
                                console.log(oDataReturn)
                                for (var i = 0; i < aData.length; i++) {
                                    var seqno = aData[i].SEQNO;
                                    var item = oReturnItems.find((result) => result.SEQNO === seqno);
    
                                    if (item !== undefined) {
                                        try {
                                            if (item.MATNO !== "") {
                                                aData[i].MATNO = item.MATNO;
                                                aData[i].EDITED = true;
                                                materialListChanged = true;
                                            }
                                        } catch(err) {}
                                    }
                                }
    
                                oJSONModel.setData(aData);
                                oTable.setModel(oJSONModel, "materialList");
                                Common.closeProcessingDialog(me);
    
                                if (materialListChanged) {
                                    me._materialListChanged = true;
                                    Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_MATERIAL_CREATED"]);
                                }
                            },
                            error: function(err) {
                                Common.closeProcessingDialog(me);
                                // Common.showMessage(me._i18n.getText('t5'));
                            }
                        });
                    }
                    else {
                        Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_MATNO_ALREADY_EXIST"]);
                    }
                }
                else {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_RECORD_TO_PROC"]);
                }
            },

            onMaterialListChange: function () {
                //material list change flag
                this._materialListChanged = true;
                this.setChangeStatus(true);
            },

            onSaveMaterialList: function() {
                //save clicked
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                var oTableModel = this.getView().byId("materialListTab").getModel("materialList");
                var oData = oTableModel.getData();
                var iEdited = 0;
                var oEditedData = oData.filter(fItem => fItem.MATNO !== "");

                if (oEditedData.length === 0) {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                } else {                  
                    var param = {};
                    Common.openProcessingDialog(me);
                    oModel.setHeaders({ UPDTYP: "MAT" });

                    oEditedData.forEach(item => {
                        param["MATNO"] = item.MATNO;

                        setTimeout(() => {
                            oModel.update("/MainSet(IONO='" + item.IONO + "',SEQNO='" + item.SEQNO + "')", param, {
                                method: "PUT",
                                success: function (data, oResponse) {
                                    iEdited++;
        
                                    if (iEdited === oEditedData.length) {
                                        Common.closeProcessingDialog(me);
                                        Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);    
                                    }
                                },
                                error: function () {
                                    iEdited++;
                                    // alert("Error");
                                    if (iEdited === oEditedData.length) Common.closeProcessingDialog(me);
                                }
                            });                            
                        }, 500);
                    })
                }
            },

            onBatchSaveMaterialList(arg) {
                // alert("on Save");
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                var oTableModel = this.getView().byId("materialListTab").getModel("materialList");
                var oData = oTableModel.getData();
                var iEdited = 0;
                var oEditedData = oData.filter(fItem => fItem.MATNO !== "");

                if (oEditedData.length === 0) {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                }
                else {
                    Common.openProcessingDialog(me);

                    oModel.setUseBatch(true);
                    oModel.setDeferredGroups(["update"]);
                    oModel.setHeaders({ UPDTYP: "MAT" });

                    var mParameters = {
                        "groupId":"update"
                    }

                    oEditedData.forEach(item => {
                        param["MATNO"] = item.MATNO;

                        console.log(entitySet);
                        console.log(param);
                        oModel.update("/MainSet(IONO='" + item.IONO + "',SEQNO='" + item.SEQNO + "')", param, mParameters);
                    })
                    
                    oModel.submitChanges({
                        groupId: "update",
                        success: function (oData, oResponse) {
                            Common.closeProcessingDialog(me);
                            Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                        },
                        error: function () {
                            Common.closeProcessingDialog(me);
                        }
                    })
                }
            },

            //******************************************* */
            // Search Helps
            //******************************************* */

            handleValueHelp : function (oEvent) {
                //open Materials value help
                var oData = oEvent.getSource().getParent().getBindingContext("materialList");
                var gmc = oData.getProperty('GMC');
                var oSource = oEvent.getSource();
                this._inputSource = oSource;
                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                
                var vh = this.getView().getModel("materials").getData().filter(fItem => fItem.Gmc === gmc);
                
                vh.forEach(item => {
                    item.VHTitle = item.MatNo;
                    item.VHDesc = item.DescEn;
                    item.VHSelected = (item.MatNo === this._inputValue);
                })

                vh.sort((a, b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                var oVHModel = new JSONModel({
                    items: vh,
                    title: "Material No.",
                    table: "materialListTab"
                });

                // create value help dialog
                if (!this._valueHelpDialog) {
                    this._valueHelpDialog = sap.ui.xmlfragment(
                        "zuiio2.view.fragments.valuehelp.ValueHelpDialog",
                        this
                    );

                    this._valueHelpDialog.setModel(oVHModel);
                    this.getView().addDependent(this._valueHelpDialog);
                }
                else {
                    this._valueHelpDialog.setModel(oVHModel);
                }

                this._valueHelpDialog.open();
            },

            handleValueHelpSearch : function (oEvent) {
                //search materials
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter("DescEn", sap.ui.model.FilterOperator.Contains, sValue);

                // var oFilter = new sap.ui.model.Filter({
                //     filters: [
                //         new sap.ui.model.Filter("VHTitle", sap.ui.model.FilterOperator.Contains, sValue),
                //         new sap.ui.model.Filter("VHDesc", sap.ui.model.FilterOperator.Contains, sValue)
                //     ],
                //     and: false
                // });

                oEvent.getSource().getBinding("items").filter([oFilter]);
            },

            handleValueHelpClose : function (oEvent) {
                //on select Material
                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");

                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());

                        if (this._inputValue !== oSelectedItem.getTitle()) {
                            var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;

                            this.byId("materialListTab").getModel("materialList").setProperty(sRowPath + '/EDITED', true);                            
                            this._materialListChanged = true;
                            // this.setChangeStatus(true);
                        }
                    }

                    this._inputSource.setValueState("None");
                }                
            },

            handleValueHelpChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                oSource.getSuggestionItems().forEach(item => {
                    if (item.getProperty("key") === oSource.getValue().trim()) {
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                })

                if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
                else {
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                if (oSource.getValue().trim() !== "") {
                    this.byId("materialListTab").getModel("materialList").setProperty(sRowPath + '/EDITED', true);
                    this._materialListChanged = true;
                }
                else {
                    this.byId("materialListTab").getModel("materialList").setProperty(sRowPath + '/EDITED', false);
                }
                // this.setChangeStatus(true);                
            },

            handleSuggestion: function (oEvent) {
                var oInput = oEvent.getSource();
                var gmc = oEvent.getSource().getParent().getBindingContext("materialList").getProperty('GMC');

                if (oInput.getSuggestionItems().length === 0) {
                    var oData = this.getView().getModel("materials").getData().filter(fItem => fItem.Gmc === gmc);
                    this.getView().setModel(new JSONModel(oData), "material");

                    oInput.bindAggregation("suggestionItems", {
                        path: "material>/",
                        length: 10000,
                        template: new sap.ui.core.ListItem({
                            key: "{material>MatNo}",
                            text: "{material>MatNo}",
                            additionalText: "{material>DescEn}",
                        }),
                        templateShareable: false
                    });
                }
            },

        })
    })