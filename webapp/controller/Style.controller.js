sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel) {
        "use strict";

        return Controller.extend("zuiio2.controller.Style", {

            onInit: function () {
                this.showLoadingDialog('Loading...');
                this._oModel = this.getOwnerComponent().getModel();
                this._aColumns = {};
                this._aDataBeforeChange = [];

                var me = this;

                this.byId("colorTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("processTab")
                .setModel(new JSONModel({
                    columns: [],
                    rows: []
                }));

                this.byId("sizeTab")
                .setModel(new JSONModel({
                    columns: [],
                    rows: []
                }));

                this.getHeaderData();

                var vIONo = "1000115";
                this._oModel.read('/AttribSet', { 
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'COLOR'"
                    },
                    success: function (oData, response) {
                        me.byId("colorTab").getModel().setProperty("/rows", oData.results);
                        me.byId("colorTab").bindRows("/rows");
                    },
                    error: function (err) { }
                })

                this._oModel.read('/ProcessSet', { 
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData, response) {
                        me.byId("processTab").getModel().setProperty("/rows", oData.results);
                        me.byId("processTab").bindRows("/rows");
                    },
                    error: function (err) { }
                })

                this._oModel.read('/AttribSet', { 
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'SIZE'"
                    },
                    success: function (oData, response) {
                        me.byId("sizeTab").getModel().setProperty("/rows", oData.results);
                        me.byId("sizeTab").bindRows("/rows");
                    },
                    error: function (err) { }
                })

                //get column value help prop
                this.getColumnProp();

                var oDDTextParam = [], oDDTextResult = {};
                var oJSONModelDDText = new JSONModel();
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});  
                oDDTextParam.push({CODE: "COLORS"});
                oDDTextParam.push({CODE: "PROCESSES"});  
                oDDTextParam.push({CODE: "SIZE"});  
                oDDTextParam.push({CODE: "DTLDBOM"});  
                oDDTextParam.push({CODE: "BOMBYUV"});  
                oDDTextParam.push({CODE: "MATLIST"});  
                oDDTextParam.push({CODE: "EDIT"});  
                oDDTextParam.push({CODE: "SAVE"});  
                oDDTextParam.push({CODE: "CANCEL"});  
                oDDTextParam.push({CODE: "MANAGESTYLE"});  
                oDDTextParam.push({CODE: "NEW"});  
                oDDTextParam.push({CODE: "STYLEHDR"});

                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {        
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })
                        
                        oJSONModelDDText.setData(oDDTextResult);
                        me.getView().setModel(oJSONModelDDText, "ddtext");
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                }); 
            },
            
            getHeaderData() {
                var me = this;
                var aStyleHdr = [];
                var oJSONModel = new JSONModel();
                var vStyle = "1000000369";
                
                this._oModel.read('/HeaderSet', { 
                    urlParameters: {
                        "$filter": "STYLENO eq '" + vStyle + "'"
                    },
                    success: function (oData, response) {
                        var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                        var vSBU = "VER"; //this.getView().getModel("ui").getData().sbu;
        
                        oModel.setHeaders({
                            sbu: vSBU,
                            type: "IOSTYLHDR",
                            tabname: "ZERP_STYLHDR"
                        });
        
                        oModel.read("/ColumnsSet", {
                            success: function (oDataCols, oResponse) {
                                if (oDataCols.results.length > 0) {
                                    me._aColumns["header"] = oData.results;
                                    console.log(oDataCols.results)
                                    oDataCols.results.forEach(item => {
                                        aStyleHdr.push({ 
                                            KEY: item.ColumnName, 
                                            LABEL: item.ColumnLabel,
                                            VALUE: oData.results[0][item.ColumnName], 
                                            VISIBLE: item.Visible});
                                    })

                                    // Object.keys(oData.results[0]).forEach(key => {
                                    //     oDataCols.results.filter(fItem => fItem.ColumnName === key)
                                    //         .forEach(item => aStyleHdr.push({KEY: key, VALUE: oData.results[0][key], VISIBLE: item.Visible}))
                                    // })

                                    oJSONModel.setData(aStyleHdr);
                                    me.getView().setModel(oJSONModel, "styleHeader");
                                }
                            },
                            error: function (err) { }
                        });
                    },
                    error: function (err) { }
                })
            },

            getColumnProp: async function() {
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");
    
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);
    
                var oColumns = oModelColumns.getData();
                // console.log(oColumns)
                //get dynamic columns based on saved layout or ZERP_CHECK
                this.getDynamicColumns("IOCOLOR", "ZERP_IOATTRIB", "colorTab", oColumns);

                setTimeout(() => {
                    this.getDynamicColumns("IOPROCESS", "ZERP_IOPROC", "processTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getDynamicColumns("IOSIZE", "ZERP_IOATTRIB", "sizeTab", oColumns);
                }, 100);  
            },

            getDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = "VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {

                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp )
                                })
                            }

                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setTableColumns(sTabId, oData.results);
                            me.closeLoadingDialog();
                        }
                    },
                    error: function (err) {
                        me.closeLoadingDialog();
                    }
                });
            },

            setTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: sColumnLabel,
                        template: new sap.m.Text({ 
                            text: "{" + sColumnId + "}", 
                            wrapping: false, 
                            tooltip: "{" + sColumnId + "}"
                        }),
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                });
            },

            onEdit(arg) {
                if (arg === "color") {
                    this.byId("btnEditColor").setVisible(false);
                    this.byId("btnSaveColor").setVisible(true);
                    this.byId("btnCancelColor").setVisible(true);
                }
                else if (arg === "process") {
                    this.byId("btnEditProcess").setVisible(false);
                    this.byId("btnSaveProcess").setVisible(true);
                    this.byId("btnCancelProcess").setVisible(true);
                }

                this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel().getData().rows);
                this.setRowEditMode(arg);
                this._validationErrors = [];
                this._sTableModel = arg;
            },

            onCancel(arg) {
                var bChanged = false;
                
                if (arg === "color") bChanged = this._bColorChanged;
                else if (arg === "process") bChanged = this._bProcessChanged;
                console.log(bChanged)
                if (bChanged) {
                    var oData = {
                        Action: "update-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONFIRM_DISREGARD_CHANGE"]
                    }
                    console.log(oData)
                    var oJSONModel = new JSONModel();
                    oJSONModel.setData(oData);
                    
                    if (!this._ConfirmDialog) {
                        this._ConfirmDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmDialog", this);
    
                        this._ConfirmDialog.setModel(oJSONModel);
                        this.getView().addDependent(this._ConfirmDialog);
                    }
                    else this._ConfirmDialog.setModel(oJSONModel);
                        
                    this._ConfirmDialog.open();
                }
                else {
                    if (arg === "color") {
                        this.byId("btnEditColor").setVisible(true);
                        this.byId("btnSaveColor").setVisible(false);
                        this.byId("btnCancelColor").setVisible(false);
                    }
                    else if (arg === "process") {
                        this.byId("btnEditProcess").setVisible(true);
                        this.byId("btnSaveProcess").setVisible(false);
                        this.byId("btnCancelProcess").setVisible(false);                    
                    }
    
                    this.setRowReadMode(arg);
                    this.byId(arg + "Tab").getModel().setProperty("/rows", this._aDataBeforeChange);
                    this.byId(arg + "Tab").bindRows("/rows");
                }
            },

            onSave(arg) {
                this.setRowReadMode(arg);
            },

            setRowEditMode(arg) {
                var oTable = this.byId(arg + "Tab");
                var me = this;

                if (arg === "color") this._bColorChanged = false;
                if (arg === "process") this._bProcessChanged = false;

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";
                    var oValueHelp = false;
    
                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    
                    this._aColumns[arg].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];

                            if (oValueHelp) {
                                col.setTemplate(new sap.m.Input({
                                    type: "Text",
                                    value: "{" + sColName + "}",
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                    suggestionItems: {
                                        path: ci.ValueHelp["SuggestionItems"].path,
                                        length: 10000,
                                        template: new sap.ui.core.ListItem({
                                            key: ci.ValueHelp["SuggestionItems"].text, 
                                            text: ci.ValueHelp["SuggestionItems"].text,
                                            additionalText: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '',
                                        }),
                                        templateShareable: false
                                    },
                                    // suggest: this.handleSuggestion.bind(this),
                                    change: this.handleValueHelpChange.bind(this)
                                }));
                            }
                            else if (ci.DataType === "NUMBER") {
                                col.setTemplate(new sap.m.Input({
                                    type: sap.m.InputType.Number,
                                    textAlign: sap.ui.core.TextAlign.Right,
                                    value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                    change: this.onNumberChange.bind(this)
                                }));
                            }
                        })
                })
    
                // this.getView().getModel(arg).getData().forEach(item => item.EDITED = false);
                var vIONo = "1000115";

                if (arg === "color") {
                    this._oModel.read('/CustColorSet', { 
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            me.getView().setModel(new JSONModel(oData.results), "CUSTCOLOR_MODEL");
                        },
                        error: function (err) { }
                    })
                }

                if (arg === "process") {
                    this._oModel.read('/AttribTypeSet', { 
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            me.getView().setModel(new JSONModel(oData.results), "ATTRIBTYPE_MODEL");
                        },
                        error: function (err) { }
                    })
                    
                    var mVASTypeData = {}, mAttribCodeData = {};
                    var iCounter1 = 0, iCounter2 = 0;
                    var oTabData = this.byId(arg + "Tab").getModel().getData().rows;

                    oTabData.forEach(item => {
                        this._oModel.read('/VASTypeSet', { 
                            urlParameters: {
                                "$filter": "PROCESSCD eq '" + item.PROCESSCD + "'"
                            },
                            success: function (oData, response) {
                                iCounter1++; 
                                mVASTypeData[item.PROCESSCD] = oData.results;

                                if (iCounter1 === oTabData.length) {
                                    me.getView().setModel(new JSONModel(mVASTypeData), "VASTYPE_MODEL");
                                }
                            },
                            error: function (err) {
                                iCounter1++; 
                            }
                        })

                        this._oModel.read('/AttribCodeSet', { 
                            urlParameters: {
                                "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq '" + item.ATTRIBTYP + "'"
                            },
                            success: function (oData, response) {
                                iCounter2++; 
                                mAttribCodeData[item.PROCESSCD] = oData.results;

                                if (iCounter2 === oTabData.length) {
                                    me.getView().setModel(new JSONModel(mAttribCodeData), "ATTRIBCODE_MODEL");
                                }
                            },
                            error: function (err) {
                                iCounter2++; 
                            }
                        })
                    })
                }
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                var sColName = "";

                // this._validationErrors = [];

                oTable.getColumns().forEach((col, idx) => {    
                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                    }

                    this._aColumns[arg].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.DataType === "STRING" || ci.DataType === "DATETIME" || ci.DataType === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + sColName + "}",
                                    wrapping: false,
                                    tooltip: "{" + sColName + "}"
                                }));
                            }
                            else if (ci.DataType === "BOOLEAN" ) {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + sColName + "}",
                                    wrapping: false,
                                    editable: false,
                                    tooltip: "{" + sColName + "}"
                                }));
                            }
                        })
                })
            },

            handleValueHelp: function(oEvent) {
                var me = this;
                var oSource = oEvent.getSource();
                var sModel = this._sTableModel;
                
                this._inputSource = oSource;
                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputField = oSource.getBindingInfo("value").parts[0].path;
                
                var vColProp = this._aColumns[sModel].filter(item => item.ColumnName === this._inputField);
                var vItemValue = vColProp[0].ValueHelp.items.value;
                var vItemDesc = vColProp[0].ValueHelp.items.text;
                var sPath = vColProp[0].ValueHelp.items.path;
                var vh = this.getView().getModel(sPath).getData();
                
                vh.forEach(item => {
                    item.VHTitle = item[vItemValue];
                    item.VHDesc = vItemValue === vItemDesc ? "" : item[vItemDesc];
                    item.VHSelected = (item[vItemValue] === this._inputValue);
                })

                vh.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                var oVHModel = new JSONModel({
                    items: vh,
                    title: vColProp[0].label,
                    table: sModel
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
    
            handleValueHelpClose : function (oEvent) {
                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");
    
                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());
        
                        if (this._inputValue !== oSelectedItem.getTitle()) {                                
                            var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;                            
                            this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);
                            this._bColorChanged = true;
                        }
                    }
    
                    this._inputSource.setValueState("None");
                }
            },
    
            handleValueHelpChange: function(oEvent) {   
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

                this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sTableModel === "color") this._bColorChanged = true;
                if (this._sTableModel === "process") this._bProcessChanged = true;
            },

            handleSuggestion: function(oEvent) {
                var me = this;
                var oInput = oEvent.getSource();
                var sInputField = oInput.getBindingInfo("value").parts[0].path;
    
                if (sInputField === "CPOATRIB") {
                    console.log(oInput.getSuggestionItems())
                    if (oInput.getSuggestionItems().length === 0) { 
                        var oData = me.getView().getModel("CUSTCOLOR_MODEL").getData();
                        var sKey = "";
                        // console.log(oData);
                        if (sInputField === "CPOATRIB") { 
                            sKey = "CUSTCOLOR";
                        }
                        // else if (sInputField === "PAYTERMS") { 
                        //     sKey = "INCO1";
                        // }
                        // else if (sInputField === "DESTINATION") {
                        //     sKey = "INCO2";
                        // }
                        
                        oInput.bindAggregation("suggestionItems", {
                            path: "CUSTCOLOR_MODEL>/",
                            length: 10000,
                            template: new sap.ui.core.ListItem({
                                key: "{CUSTCOLOR_MODEL>" + sKey + "}",
                                text: "{CUSTCOLOR_MODEL>" + sKey + "}"
                            }),
                            templateShareable: false
                        });
                    }
                }
            },

            onCloseConfirmDialog: function(oEvent) {   
                if (this._ConfirmDialog.getModel().getData().Action === "update-cancel") {
                    if (this._sTableModel === "color") {
                        this.byId("btnEditColor").setVisible(true);
                        this.byId("btnSaveColor").setVisible(false);
                        this.byId("btnCancelColor").setVisible(false);
                    }
                    else if (this._sTableModel === "process") {
                        this.byId("btnEditProcess").setVisible(true);
                        this.byId("btnSaveProcess").setVisible(false);
                        this.byId("btnCancelProcess").setVisible(false);                    
                    }
    
                    this.setRowReadMode(this._sTableModel);
                    this.byId(this._sTableModel + "Tab").getModel().setProperty("/rows", this._aDataBeforeChange);
                    this.byId(this._sTableModel + "Tab").bindRows("/rows");
                }
    
                this._ConfirmDialog.close();
            },  
    
            onCancelConfirmDialog: function(oEvent) {   
                this._ConfirmDialog.close();
            },

            onManageStyle: function(oEvent) {
                // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                // oRouter.navTo("RouteStyles");
                // console.log()
                var vStyle = "1000000369";
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                    target: {
                        semanticObject: "ZUI_3DERP",
                        action: "manage&/RouteStyleDetail/VERSTY-013/VER"
                    }
                    // params: {
                    // "supplierID": supplier
                    // }
                    })) || ""; // generate the Hash to display a Supplier

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                }); // navigate to Supplier application
            },

            showLoadingDialog(arg) {
                if (!this._LoadingDialog) {
                    this._LoadingDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.LoadingDialog", this);
                    this.getView().addDependent(this._LoadingDialog);
                }
                
                this._LoadingDialog.setTitle(arg);
                this._LoadingDialog.open();
            },

            closeLoadingDialog() {
                this._LoadingDialog.close();
            },

        });
    });
