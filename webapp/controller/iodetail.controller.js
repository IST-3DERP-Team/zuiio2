sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "../js/Constants",
    "sap/ui/model/json/JSONModel",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger',
    'sap/m/MessageStrip',
    "../control/DynamicTable",
    "./fragments/FASummary",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History"
],
    /** 
     * @param {typeof sap.ui.core.mvc.Controller} Controller 
     */
    function (Controller, Filter, Common, Utils, Constants, JSONModel, jQuery, HashChanger, MessageStrip, control, FASummary, MessageBox, History) {
        "use strict";

        var that;
        var _promiseResult;
        var _newIONo = "";

        var sIONo = "", sIOItem = "", sDlvSeq = "", sTableName = "", sDeleted = "";
        var sIOPrefix = "", sIODesc = "";

        var _sStyleNo, _sVerNo, _sStyleCd, _sProdTyp, _sSalesGrp, _sSeasonCd, _sCustGrp, _sUOM;

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
        var Core = sap.ui.getCore();

        return Controller.extend("zuiio2.controller.iodetail", {
            onInit: function () {
                that = this;

                //get current userid
                var oModel = new sap.ui.model.json.JSONModel();
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })
                this._oModel = this.getOwnerComponent().getModel();
                this._Model = this.getOwnerComponent().getModel();
                this._Model2 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this._Model3 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this._Model4 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteIODetail").attachPatternMatched(this._routePatternMatched, this);

                this.getView().setModel(new JSONModel({
                    sbu: '',
                    currIONo: '',
                    currStyleNo: '',
                    currDlvSeq: '1',
                    currDlvItem: '1',
                }), "ui2");

                this.getView().setModel(new JSONModel({
                    datamode: ''
                }), "ui");

                //Add the attachments to screen
                this.appendUploadCollection();

                //Set the file data model
                var oModel = this.getOwnerComponent().getModel("FileModel");
                this.getView().setModel(oModel, "FileModel");

                //set edit mode to the upload collection
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = false;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");

                var oTableEventDelegate = {
                    onkeyup: function (oEvent) {
                        that.onKeyUp(oEvent);
                    },

                    onAfterRendering: function (oEvent) {
                        that.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("ioMatListTab").addEventDelegate(oTableEventDelegate);
                this.byId("colorTab").addEventDelegate(oTableEventDelegate);
                this.byId("processTab").addEventDelegate(oTableEventDelegate);
                this.byId("sizeTab").addEventDelegate(oTableEventDelegate);
                this.byId("styleBOMUVTab").addEventDelegate(oTableEventDelegate);
                this.byId("styleFabBOMTab").addEventDelegate(oTableEventDelegate);
                this.byId("styleAccBOMTab").addEventDelegate(oTableEventDelegate);
                this.byId("styleMatListTab").addEventDelegate(oTableEventDelegate);
            },

            onNavBack: function () {
                var oHistory = History.getInstance();
                var sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.navTo("Routeioinit", {}, true);
                }
            },

            _routePatternMatched: async function (oEvent) {
                // console.log(oEvent);
                var me = this;
                this._ioNo = oEvent.getParameter("arguments").iono; //get IONO from route pattern
                this._sbu = oEvent.getParameter("arguments").sbu; //get SBU from route pattern
                this._styleno = oEvent.getParameter("arguments").styleno; //get style no from route pattern
                // this._ver = oEvent.getParameter("arguments").ver; //get ver from route pattern

                this.getView().getModel("ui2").setProperty("/sbu", oEvent.getParameter("arguments").sbu);
                this.getView().getModel("ui2").setProperty("/currIONo", oEvent.getParameter("arguments").iono);
                this.getView().getModel("ui2").setProperty("/currStyleNo", oEvent.getParameter("arguments").styleno);

                // alert(this._ioNo);
                //pivot arrays
                this._iocolors;
                this._iosizes;

                this._tblChange = false;

                this._styleNo = "";
                this._dataMode = "READ";
                this._styleVer = "";
                this._prodplant = "";
                this._tableRendered = "";

                // alert(this._ioNo);

                //set all as no changes at first load
                this._headerChanged = false;

                //set Change Status    
                this.setChangeStatus(false);

                if (this._ioNo === "NEW") {

                    this.setHeaderEditMode();
                    this.byId("onIOEdit").setVisible(false);
                    this.byId("onIORelease").setVisible(false);
                    this.byId("onIOAttribEdit").setVisible(false);
                    this.byId("onIOStatEdit").setVisible(false);
                    this.byId("onIOSave").setVisible(true);
                    this.byId("onIOCancel").setVisible(true);

                    this.disableOtherTabs();

                    var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                    oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                        .forEach(item => item.setProperty("enabled", false));

                    var oDisplayJSONModel = new JSONModel();
                    var data = {};
                    // data.editMode = true;
                    if (this._styleno === "NEW") {
                        // alert("WITHOUT STYLE");
                        data = {
                            "IONO": "",
                            "STYLENO": "",
                            "VERNO": "",
                            "STYLECD": "",
                            "PRODTYP": "",
                            "SALESGRP": "",
                            "SEASONCD": "",
                            "CUSTGRP": "",
                            "BASEUOM": ""
                        };
                        this._headerChanged = false;
                        data.editMode = true;
                        // console.log(data);
                        oDisplayJSONModel.setData(data);
                        this.getView().setModel(oDisplayJSONModel, "headerData");
                        // console.log(this.getView().setModel(oDisplayJSONModel, "headerData"));
                    }
                } else {
                    this.cancelHeaderEdit();
                    this.enableOtherTabs();
                    var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                    oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                        .forEach(item => item.setProperty("enabled", true));

                    this.enableOtherTabs();
                }

                _promiseResult = new Promise((resolve, reject) => {
                    resolve(this.getHeaderConfig());
                });
                await _promiseResult;

                _promiseResult = new Promise((resolve, reject) => {
                    resolve(this.getHeaderData());
                });
                await _promiseResult;

                if (this._styleno != "NEW" && this._ioNo === "NEW") {
                    alert("Get IO Style Data");
                    this.getIOSTYLISTData(this._styleno);
                }

                // console.log(this.getView());

                this._aIOColumns = {};
                this._aColumns = {};
                this._aIODataBeforeChange = [];
                var me = this;

                this.byId("IODLVTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("IODETTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("IOATTRIBTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("IOSTATUSTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                var ioNo = this._ioNo;

                // var me = this;

                this.oJSONModel = new sap.ui.model.json.JSONModel();

                this.getIOATTRIBData(ioNo);
                this.getIOSTATUSData(ioNo);
                this.getIODLVData(ioNo);
                this.getIODETData(ioNo);  //use DynamicColumnsSet

                // _promiseResult = new Promise((resolve, reject) => {
                setTimeout(() => {
                    // resolve(this.getIOColumnProp());
                    this.getIOColumnProp();
                }, 100);
                // });
                // await _promiseResult;

                var oIconTabBarStyle = this.byId("itbStyleDetail");
                oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));

                //Attachments
                this.bindUploadCollection();
                this.getView().getModel("FileModel").refresh();

                //IO Material List

                // _promiseResult = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.initIOMatList();
                }, 100);
                // });
                // await _promiseResult;
            },

            onIODLVCellClick: async function (oEvent) {
                // console.log(oEvent.getParameters().rowBindingContext.sPath);
                if (oEvent.getParameters().rowBindingContext.sPath === undefined)
                    return;

                var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                sRowPath = "/rows/" + sRowPath.split("/")[2];
                // var oRow = this.getView().getModel("IODLVModel").getProperty(sRowPath);
                // console.log(this.getView().byId("IODLVTab"));
                var oRow = this.getView().byId("IODLVTab").getModel().getProperty(sRowPath);

                this.getView().getModel("ui2").setProperty("/activeIONo", oRow.IONO);
                this.getView().getModel("ui2").setProperty("/activeDlvSeq", oRow.DLVSEQ);

                // var vIONo = this.getView().getModel("ui2").getProperty("/activeIONo");
                // var vDlvSeq = this.getView().getModel("ui2").getProperty("/activeDlvSeq");
                // alert(vIONo + " " + vDlvSeq);

                var me = this;
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                _promiseResult = new Promise((resolve, reject) => {

                    me._tblChange = true;
                    setTimeout(() => {
                        this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                    }, 100);
                    resolve();
                })
                await _promiseResult;;

                this._tblChange = false;
            },

            getIODLVData: async function (iono) {
                var me = this;
                var ioNo = iono;
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read('/IODLVSet', {
                            urlParameters: {
                                "$filter": "IONO eq '" + ioNo + "'"
                            },
                            success: function (oData, response) {
                                me.byId("IODLVTab").getModel().setProperty("/rows", oData.results);
                                me.byId("IODLVTab").bindRows("/rows");
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });
                await _promiseResult;
            },

            getIODETData: async function (iono) {
                var me = this;
                var ioNo = iono;
                var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read('/IODETSet', {
                            urlParameters: {
                                "$filter": "IONO eq '" + cIONo + "' and DLVSEQ eq '" + cDlvSeq + "'"
                            },
                            success: function (oData, response) {
                                me.byId("IODETTab").getModel().setProperty("/rows", oData.results);
                                me.byId("IODETTab").bindRows("/rows");
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });
                await _promiseResult;
            },

            getIOATTRIBData: async function (iono) {
                // console.log("IO ATTRIB");
                var me = this;
                var ioNo = iono;
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read("/ATTRIBSet", {
                            urlParameters: {
                                "$filter": "IONO eq '" + ioNo + "'"
                            },
                            success: function (oData, response) {
                                // console.log(oData.results);
                                me.byId("IOATTRIBTab").getModel().setProperty("/rows", oData.results);
                                me.byId("IOATTRIBTab").bindRows("/rows");

                                me._iosizes = oData.results;
                                // console.log("IO Sizes from get IO Attrib");
                                // console.log(me._iosizes);
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });
                await _promiseResult;
            },

            getIOSTATUSData: async function (iono) {
                var me = this;
                var ioNo = iono;
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read("/IOSTATSet", {
                            urlParameters: {
                                "$filter": "IONO eq '" + ioNo + "'"
                            },
                            success: function (oData, response) {
                                me.byId("IOSTATUSTab").getModel().setProperty("/rows", oData.results);
                                me.byId("IOSTATUSTab").bindRows("/rows");
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });
                await _promiseResult;
            },

            getIOSTYLISTData: function (pstyleno) {
                var me = this;
                var oView = this.getView();
                var pStyleNo = pstyleno;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();

                var entitySet = "/IOSTYLISTDETSet"

                setTimeout(() => {
                    oModel.read(entitySet, {
                        urlParameters: {
                            "$filter": "STYLENO eq '" + pStyleNo + "'"
                        },
                        success: function (oData, oResponse) {
                            oData.results.forEach(item => {

                                var styleData = {
                                    "STYLECD": item.STYLECD,
                                    "STYLENO": item.STYLENO,
                                    "VERNO": item.VERNO,
                                    "PRODTYP": item.PRODTYP,
                                    "SALESGRP": item.SALESGRP,
                                    "SEASONCD": item.SEASONCD,
                                    "CUSTGRP": item.CUSTGRP,
                                    "BASEUOM": item.UOM
                                }
                                oJSONModel.setData(styleData);
                                oView.setModel(oJSONModel, "headerData");
                            })

                        },
                        error: function () { }
                    });
                }, 100);
            },

            getIOColumnProp: async function () {
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                // _promiseResult = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.getReloadIOColumnProp();
                }, 100);
                // });
                // await _promiseResult;

                // FA Summary
                FASummary.onInit(this);
                //console.log("fadcsend2", sap.ui.getCore().byId("dcSendDetailTab"), this.getView().byId("dcSendDetailTab"))
            },

            reloadIODataModel: function () {

            },

            getReloadIOColumnProp: async function () {
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                // console.log(oColumns)
                //get dynamic columns based on saved layout or ZERP_CHECK
                this.getIODynamicColumns("IODLV", "ZDV_3DERP_IODLV", "IODLVTab", oColumns);

                // console.log("iodet");
                setTimeout(() => {
                    this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                }, 100);

                // build Dynamic table for Attributes
                // setTimeout(() => {
                //     this.getAttribDynamicTableColumns();
                // }, 100);

                setTimeout(() => {
                    this.getIODynamicColumns("IOATTRIB", "ZERP_IOATTRIB", "IOATTRIBTab", oColumns);
                }, 100);

                //build Dynamic table for Status
                // setTimeout(() => {
                //     this.getStatDynamicTableColumns();
                // }, 100);

                setTimeout(() => {
                    this.getIODynamicColumns("IOSTAT", "ZERP_IOSTATUS", "IOSTATUSTab", oColumns);
                }, 100);
            },

            getIOSTYSizes: function () {
                //get color attributes
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");

                oModel.setHeaders({
                    styleno: this._styleNo //"1000000272"
                });

                oModel.read("/StyleAttributesSizeSet", {
                    success: function (oData, oResponse) {
                        me._iosizes = oData.results;
                    },
                    error: function (err) { }
                });
            },

            getIODynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var columnData = [];
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var o3DModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                // var vSBU = "VER"; //this.getView().getModel("ui2").getData().sbu;
                var vSBU = this._sbu;

                if (arg1 === "IODET") {
                    oModel.setHeaders({
                        sbu: vSBU,
                        type: sType,
                        usgcls: ""
                    });

                    o3DModel.setHeaders({
                        sbu: vSBU,
                        type: sType,
                        usgcls: ""
                    });


                    var ccolumns;
                    var pivotArray;
                    // console.log("me._iosizes");
                    // console.log(me._iosizes);
                    pivotArray = me._iosizes;

                    // console.log("Pivot Array");
                    // console.log(pivotArray);

                    //get dynamic columns of IO Details pivoted by Size
                    // DynamicColumnsSet
                    // ColumnsSet
                    oModel.read("/ColumnsSet", {
                        success: function (oData, oResponse) {
                            ccolumns = oData.results;
                        }
                    });

                    o3DModel.read("/DynamicColumnsSet", {
                        success: function (oData, oResponse) {
                            // console.log("Dynamic Columns Set");
                            // console.log(oData);
                            var columns = oData.results;
                            // console.log("Columns");
                            // console.log(columns);
                            var pivotRow;
                            //find the column to pivot
                            for (var i = 0; i < columns.length; i++) {
                                if (columns[i].Pivot !== '') {
                                    pivotRow = columns[i].Pivot;
                                }
                            }
                            //build the table dyanmic columns
                            for (var i = 0; i < columns.length; i++) {
                                if (columns[i].Pivot === pivotRow) {
                                    //pivot the columns
                                    for (var j = 0; j < pivotArray.length; j++) {
                                        if (pivotArray[j].ATTRIBTYP === "SIZE") {
                                            columnData.push({
                                                "ColumnName": pivotArray[j].ATTRIBCD,
                                                "ColumnDesc": pivotArray[j].DESC1,
                                                "ColumnWidth": 70,
                                                "ColumnType": pivotRow,
                                                "Editable": columns[i].Editable,
                                                "Mandatory": columns[i].Mandatory,
                                                "Visible": true
                                            })
                                        }
                                    }
                                } else {
                                    if (columns[i].ColumnName !== pivotRow) {
                                        if (columns[i].Visible === true) {
                                            columnData.push({
                                                "ColumnName": columns[i].ColumnName,
                                                "ColumnDesc": columns[i].ColumnName,
                                                "ColumnWidth": columns[i].ColumnWidth,
                                                "ColumnType": columns[i].ColumnType,
                                                "Editable": columns[i].Editable,
                                                "Mandatory": columns[i].Mandatory,
                                                "Visible": columns[i].Visible
                                            })
                                        }
                                    }
                                }
                            }
                            // console.log("column Data");
                            // console.log(oData.results);
                            // console.log(columnData);
                            // me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me._aColumns[sTabId.replace("Tab", "")] = columnData;
                            me.getIODETTableData(columnData, pivotArray);
                        },
                        error: function (err) {
                            Common.closeLoadingDialog(that);
                        }
                    });


                } else {
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
                                            .forEach(col => item.ValueHelp = col.ValueHelp)
                                    })
                                }

                                me._aIOColumns[sTabId.replace("Tab", "")] = oData.results;
                                me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                                // console.log("getIODynamicColumns");
                                // console.log(oData.results);
                                // console.log(me._aColumns[sTabId.replace("Tab", "")]);
                                me.setIOTableColumns(sTabId, oData.results);
                                // Common.closeLoadingDialog();
                            }
                        },
                        error: function (err) {
                            // Common.closeLoadingDialog();
                        }
                    });
                }


            },

            setIOTableColumns(arg1, arg2) {
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
                    // console.log(sColumnDataType);

                    if (sColumnDataType === "STRING") {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: sColumnLabel,
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: false
                                // , 
                                // tooltip: "{" + sColumnId + "}"
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    } else if (sColumnDataType === "BOOLEAN") {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: sColumnLabel,
                            template: new sap.m.CheckBox({
                                selected: "{" + sColumnId + "}",
                                editable: false
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: "Center",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    } else {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: sColumnLabel,
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: false
                                // , 
                                // tooltip: "{" + sColumnId + "}"
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    }

                    // return new sap.ui.table.Column({
                    //     id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                    //     label: sColumnLabel,
                    //     template: new sap.m.Text({
                    //         text: "{" + sColumnId + "}",
                    //         wrapping: false
                    //         // , 
                    //         // tooltip: "{" + sColumnId + "}"
                    //     }),
                    //     width: sColumnWidth + "px",
                    //     sortProperty: sColumnId,
                    //     filterProperty: sColumnId,
                    //     autoResizable: true,
                    //     visible: sColumnVisible,
                    //     sorted: sColumnSorted,
                    //     hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                    //     sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    // });

                });
            },

            getIODETTableData: function (columnData, pivot) {
                //Get BOM by UV actual data
                var me = this;
                var oTable = this.getView().byId("IODETTab");
                var oModel = this.getOwnerComponent().getModel();

                var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

                oModel.read("/IODETSet", {
                    urlParameters: {
                        // "$filter": "IONO eq '" + me._ioNo + "'"
                        "$filter": "IONO eq '" + cIONo + "' and DLVSEQ eq '" + cDlvSeq + "'"
                    },
                    success: function (oData, oResponse) {
                        // console.log("IODETTab Data");
                        // console.log(oData.results);
                        var rowData = oData.results;
                        // console.log(rowData)
                        //Get unique items of BOM by UV
                        // var unique = rowData.filter((rowData, index, self) =>
                        //     index === self.findIndex((t) => (t.GMC === rowData.GMC && t.PARTCD === rowData.PARTCD && t.MATTYPCLS === rowData.MATTYPCLS)));

                        var unique = rowData.filter((rowData, index, self) =>
                            index === self.findIndex((t) => (t.DLVITEM === rowData.DLVITEM && t.CUSTSIZE === rowData.CUSTSIZE)));

                        //For every unique item
                        for (var i = 0; i < unique.length; i++) {

                            //Set the pivot column for each unique item
                            for (var j = 0; j < rowData.length; j++) {
                                if (rowData[j].DESC1 !== "") {
                                    if (unique[i].DLVITEM === rowData[j].DLVITEM && unique[i].CUSTSIZE === rowData[j].CUSTSIZE) {
                                        for (var k = 0; k < pivot.length; k++) {
                                            var colname = pivot[k].ATTRIBCD;
                                            if (rowData[j].CUSTSIZE === colname) {
                                                unique[i][colname] = rowData[j].DESC1;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        //set the table columns/rows
                        rowData = oData.results;
                        unique.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData({
                            results: unique,
                            columns: columnData
                        });

                        // console.log("oJSONModel");
                        // console.log(oJSONModel);
                        oTable.setModel(oJSONModel, "DataModel");
                        // oTable.setVisibleRowCount(unique.length);
                        oTable.attachPaste();
                        oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                            // console.log("oContext.getObject()");
                            // console.log(oContext.getObject());
                            var column = oContext.getObject();
                            var sColumnWidth = column.ColumnWidth;

                            if (sColumnWidth === 0 || sColumnWidth === undefined) sColumnWidth = 100;
                            // console.log(column);
                            return new sap.ui.table.Column({
                                // id: "IODETCol" + column.ColumnName,
                                // label: new sap.m.Text({ text: me.getStyleColumnDesc("IODETTab", column) }),
                                label: new sap.m.Text({ text: column.ColumnName }),
                                template: me.styleColumnTemplate('UV', column),
                                sortProperty: column.ColumnName,
                                filterProperty: column.ColumnName,
                                width: sColumnWidth + "px",
                                autoResizable: true,
                                visible: column.Visible,
                                sorted: column.Sorted,
                                hAlign: column.ColumnName === "SEQNO" || column.ColumnName === "CONSUMP" || column.ColumnName === "WASTAGE" ? "End" : "Begin",
                                sortOrder: ((column.Sorted === true) ? column.SortOrder : "Ascending")
                            });
                        });
                        oTable.bindRows("DataModel>/results");
                        // oTable.fireColumnFreeze();
                        // console.log(oTable.bindRows("DataModel>/results"));

                        Common.closeLoadingDialog(me);
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(me);
                    }
                });
            },

            getIODetDynamicTableColumns: function () {
                var me = this;

                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                this._Model2.setHeaders({
                    sbu: this._sbu,
                    type: 'IODET',
                    tabname: 'ZERP_IODET'
                });

                this._Model2.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "IODetDynColumns");  //set the view model
                        // console.log(me.getView().setModel(oJSONColumnsModel, "IODetDynColumns"));  //set the view model
                        me.getIODetDynamicTableData(oData.results);
                    },
                    error: function (err) { }
                })
                    ;
            },

            getIODetDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                // var ioNo = this._ioNo;

                // var oText = this.getView().byId("IODetCount");

                var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

                oModel.read("/IODETSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + cIONo + "' and DLVSEQ eq '" + cDlvSeq + "'"
                    },
                    success: function (oData, oResponse) {
                        // oText.setText(oData.Results.length + "");

                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "IODetDataModel");
                        me.setIODetTableData();

                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            setIODetTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("IODetDynColumns");
                var oDetDataModel = this.getView().getModel("IODetDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTableIODet = this.getView().byId("IODETTab");
                oDetTableIODet.setModel(oModel);

                //bind the dynamic column to the table
                oDetTableIODet.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType, "IODet"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oDetTableIODet.bindRows("/rows");
            },

            getDlvSchedDynamicTableColumns: function () {
                var me = this;

                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                this._Model4.setHeaders({
                    sbu: this._sbu,
                    type: 'IODLV',
                    tabname: 'ZDV_3DERP_IODLV'
                });

                this._Model4.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "DlvSchedDynColumns");  //set the view model
                        // console.log("Delivery Schedule Dynamic Columns");
                        // console.log(me.getView().setModel(oJSONColumnsModel, "DlvSchedDynColumns"));  //set the view model
                        me.getDlvSchedDynamicTableData(oData.results);
                    },
                    error: function (err) { }
                })
                    ;
            },

            getDlvSchedDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                var ioNo = this._ioNo;

                // var oText = this.getView().byId("DlvSchedCount");

                oModel.read("/IODLVSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) {
                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "DlvSchedDataModel");
                        // console.log("Delivery Schedule Data");
                        // console.log(me.getView().setModel(oJSONDataModel, "DlvSchedDataModel"));
                        me.setDlvSchedTableData();
                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            setDlvSchedTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("DlvSchedDynColumns");
                var oDetDataModel = this.getView().getModel("DlvSchedDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTableDlvSched = this.getView().byId("IODlvTab");
                oDetTableDlvSched.setModel(oModel);

                //bind the dynamic column to the table
                oDetTableDlvSched.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType, "DlvSched"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oDetTableDlvSched.bindRows("/rows");
            },

            getStatDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                // this._SBU = this.getView().byId("SmartFilterBar").getFilterData().SBU;  //get selected SBU
                // this._sbu = 'VER'
                this._Model3.setHeaders({
                    sbu: this._sbu,
                    type: 'IOSTAT',
                    tabname: 'ZERP_IOSTATUS'
                    // userid: this._userid
                    // userid: 'BAS_CONN'
                });

                this._Model3.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "StatDynColumns");  //set the view model
                        // console.log(me.getView().setModel(oJSONColumnsModel, "DynColumns"));  //set the view model
                        setTimeout(() => {
                            me.getStatDynamicTableData(oData.results);
                        }, 100);
                    },
                    error: function (err) { }
                })
                    ;
            },

            getStatDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                var ioNo = this._ioNo;

                var oText = this.getView().byId("StatCount");

                oModel.read("/IOSTATSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) {
                        // oText.setText(oData.Results.length + "");

                        oData.results.forEach(item => {
                            item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);
                        })

                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "StatDataModel");
                        // console.log(me.getView().setModel(oJSONDataModel, "DataModel"));
                        setTimeout(() => {
                            me.setStatTableData();
                        }, 100);
                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            setStatTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("StatDynColumns");
                var oDetDataModel = this.getView().getModel("StatDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                // //add column for copy button
                // oColumnsData.unshift({
                //     "ColumnName": "Copy",
                //     "ColumnType": "COPY",
                //     "Visible": false
                // });

                //add column for manage button
                oDetColumnsData.unshift({
                    "ColumnName": "ManageStat",
                    "ColumnType": "SEL"
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTable2 = this.getView().byId("StatDynTable");
                oDetTable2.setModel(oModel);

                //bind the dynamic column to the table
                oDetTable2.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType, "Stat"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oDetTable2.bindRows("/rows");
            },

            getAttribDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                // this._SBU = this.getView().byId("SmartFilterBar").getFilterData().SBU;  //get selected SBU
                // this._sbu = 'VER'
                this._Model2.setHeaders({
                    sbu: this._sbu,
                    type: 'IOATTRIB',
                    tabname: 'ZERP_IOATTRIB'
                    // userid: this._userid
                    // userid: 'BAS_CONN'
                });

                this._Model2.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "AttribDynColumns");  //set the view model
                        setTimeout(() => {
                            me.getAttribDynamicTableData(oData.results);
                        }, 100);
                    },
                    error: function (err) { }
                })
                    ;
            },

            getAttribDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                var ioNo = this._ioNo;

                var oText = this.getView().byId("AttribCount");

                oModel.read("/ATTRIBSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) {
                        // oText.setText(oData.Results.length + "");

                        // oData.results.forEach(item => {
                        //     item.CREATEDDT = dateFormat.format(item.CREATEDDT);    
                        //     item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);                            
                        // })

                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "AttribDataModel");
                        // console.log("attrib data");
                        // console.log(me.getView().setModel(oJSONDataModel, "AttribDataModel"));
                        setTimeout(() => {
                            me.setAttribTableData();
                        }, 100);

                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            setAttribTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("AttribDynColumns");
                var oDetDataModel = this.getView().getModel("AttribDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                // //add column for copy button
                // oColumnsData.unshift({
                //     "ColumnName": "Copy",
                //     "ColumnType": "COPY",
                //     "Visible": false
                // });

                //add column for manage button
                oDetColumnsData.unshift({
                    "ColumnName": "ManageAttrib",
                    "ColumnType": "SEL"
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTable = this.getView().byId("AttribDynTable");
                oDetTable.setModel(oModel);

                //bind the dynamic column to the table
                oDetTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType, "Attrib"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oDetTable.bindRows("/rows");
            },

            columnTemplate: function (sColumnId, sColumnType, sSource) {
                var oDetColumnTemplate;

                //different component based on field
                // if (sColumnId === "STATUSCD") { //display infolabel for Status Code
                //     oDetColumnTemplate = new sap.tnt.InfoLabel({
                //         text: "{" + sColumnId + "}",
                //         colorScheme: "{= ${" + sColumnId + "} === 'CMP' ? 8 : ${" + sColumnId + "} === 'CRT' ? 3 : 1}"
                //     })
                // } else 
                if (sColumnType === "SEL") { //Manage button
                    var tToolTip;
                    var sKey;
                    if (sSource === "Attrib") {
                        tToolTip = "Manage this Attribute"
                        sKey = "VERNO"
                    } else if (sSource === "Stat") {
                        tToolTip = "Manage this Status"
                        sKey = "STATUSCD"
                    } else if (sSource === "DlvSched") {
                        tToolTip = "Manage this Delivery Schedule"
                        sKey = "DLVSEQ"
                    } else if (sSource === "IODet") {
                        tToolTip = "Manage this IO Item"
                        sKey = "IOITEM"
                    }
                    oDetColumnTemplate = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://detail-view",
                        type: "Ghost"
                        // ,press: this.goToDetail 
                        , tooltip: tToolTip
                    });
                    oDetColumnTemplate.data(sKey, "{}"); //custom data to hold key id
                }
                // else {
                //     oDetColumnTemplate = new sap.m.Text({ 
                //         text: "{" + sColumnId + "}"
                //         , wrapping: false 
                //         // , tooltip: "{" + sColumnId + "}"
                //     }); //default text
                // }

                oDetColumnTemplate = new sap.m.Text({
                    text: "{" + sColumnId + "}"
                    , wrapping: false
                    // ,tooltip: "{" + sColumnId + "}"
                }); //default text
                return oDetColumnTemplate;
            },

            getColumnSize: function (sColumnId, sColumnType) {
                //column width of fields
                var mSize = '7';
                if (sColumnType === "SEL") {
                    mSize = '3.5rem';
                } else if (sColumnType === "COPY") {
                    mSize = '3.5rem';
                } else if (sColumnId === "STYLECD") {
                    mSize = '25rem';
                } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
                    mSize = '15rem';
                } else if (sColumnId === "DLVDT" || sColumnId === "DOCDT" || sColumnId === "CREATEDDT" || sColumnId === "UPDATEDDT") {
                    mSize = '30rem';
                }
                return mSize;
            },

            getFormatColumnSize: function (sColumnId, sColumnType, sColumnSize) {
                //column width of fields
                var mSize = sColumnSize;
                if (sColumnType === "SEL") {
                    mSize = '30';
                } else if (sColumnType === "COPY") {
                    mSize = '30';
                }
                // else if (sColumnId === "STYLECD") {
                //     mSize = '25';
                // } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
                //     mSize = '15';
                // } else if (sColumnId === "DLVDT" || sColumnId === "DOCDT" || sColumnId === "CREATEDDT" || sColumnId === "UPDATEDDT") {
                //     mSize = '30';
                // }
                return mSize;
            },

            getHeaderConfig: function () {
                // console.log("getHeaderConfig");
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oJSONModelEdit = new sap.ui.model.json.JSONModel();

                //get header fields
                oModel.setHeaders({
                    sbu: this._sbu,
                    type: 'IOHDR',
                    tabname: 'ZERP_IOHDR'
                });
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(oData);
                        var visibleFields = new JSONModel();
                        var visibleFields = {};

                        var editableFields = new JSONModel();
                        var editableFields = {};


                        for (var i = 0; i < oData.results.length; i++) {
                            //get only visible fields
                            visibleFields[oData.results[i].ColumnName] = oData.results[i].Visible;
                            //get only editable fields
                            editableFields[oData.results[i].ColumnName] = oData.results[i].Editable;
                        }
                        var JSONdata = JSON.stringify(visibleFields);
                        var JSONparse = JSON.parse(JSONdata);
                        oJSONModel.setData(JSONparse);
                        oView.setModel(oJSONModel, "VisibleFieldsData");
                        // console.log(oView.setModel(oJSONModel, "VisibleFieldsData"));

                        var JSONdataEdit = JSON.stringify(editableFields);
                        var JSONparseEdit = JSON.parse(JSONdataEdit);
                        oJSONModelEdit.setData(JSONparseEdit);
                        oView.setModel(oJSONModelEdit, "EditableFieldsData");
                    },
                    error: function (err) { }
                });

            },

            onHeaderChange: function (oEvent) {
                var me = this;
                if (oEvent === undefined)
                    return;

                var oSource = oEvent.getSource();
                var srcInput = oSource.getBindingInfo("value").parts[0].path;
                // alert(oSource.getBindingInfo("value").parts[0].path);
                if (srcInput === "/PRODSCEN") {
                    var sProdScen = this.getView().byId("PRODSCEN").getValue();

                    var oData = this.getView().getModel("ProdScenModel").oData;
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].PRODSCEN === sProdScen) {
                            // alert(oData.results[i].PRODPLANT);
                            this.getView().byId("PRODPLANT").setValue(oData.results[i].PRODPLANT);
                            this.getView().byId("TRADPLANT").setValue(oData.results[i].TRADPLANT);
                            this.getView().byId("PLANPLANT").setValue(oData.results[i].PLANPLANT);
                            this.getView().byId("FTYSALTERM").setValue(oData.results[i].FTY_SALES_TERM);
                            this.getView().byId("CUSSALTERM").setValue(oData.results[i].CUST_SALES_TERM);
                            this.getView().byId("SALESORG").setValue(oData.results[i].SALESORG);
                        }
                    }
                }

                if (srcInput === "/STYLENO") {
                    var sStyleNo = this.getView().byId("STYLENO").getValue();

                    var oData = this.getView().getModel("StyleNoModel").oData;
                    // console.log(oData);     
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].STYLENO === sStyleNo) {
                            this.getView().byId("VERNO").setValue(oData.results[i].PRODPLANT);
                            this.getView().byId("PRODTYPE").setValue(oData.results[i].PRODTYP);
                            this.getView().byId("STYLECD").setValue(oData.results[i].STYLECD);
                            this.getView().byId("SEASONCD").setValue(oData.results[i].SEASONCD);
                            this.getView().byId("CUSTGRP").setValue(oData.results[i].CUSTGRP);
                            this.getView().byId("BASEUOM").setValue(oData.results[i].UOM);
                        }
                    }
                }
                //set change flag for header
                this._headerChanged = true;
                this.setChangeStatus(true);
            },

            setChangeStatus: function (changed) {
                //controls the edited warning message
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch (err) { }
            },

            getVHSet: function (EntitySet, ModelName, SBUFilter) {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                var sEntitySet = EntitySet;
                var sModelName = ModelName;
                var bSBUFilter = SBUFilter;

                //  /SEASONSet , SeasonsModel
                if (bSBUFilter) {
                    oSHModel.read(sEntitySet, {
                        urlParameters: {
                            "$filter": "SBU eq '" + this._sbu + "'"
                        },
                        success: function (oData, oResponse) {
                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, sModelName);
                            // console.log(oView.setModel(oJSONModel, ModelName));
                        },
                        error: function (err) { }
                    });
                } else {
                    oSHModel.read(sEntitySet, {
                        urlParameters: {

                        },
                        success: function (oData, oResponse) {
                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, sModelName);
                            if (sModelName === "SalesGrpModel") {
                                // console.log(oView.setModel(oJSONModel, "SeasonsModel"));
                            }
                        },
                        error: function (err) { }
                    });
                }
            },

            getSALESORGSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/SALESORGvhSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "SALESORGModel");
                    },
                    error: function (err) { }
                });
            },

            getUOMSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/UOMvhSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "UOMModel");
                    },
                    error: function (err) { }
                });
            },

            getStyleNoSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/STYLENOvhSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "StyleNoModel");
                    },
                    error: function (err) { }
                });
            },

            getSeasonsSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/SEASONSet", {
                    urlParameters: {
                        "$filter": "SBU eq '" + this._sbu + "'"
                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "SeasonsModel");
                    },
                    error: function (err) { }
                });
            },

            getProdScenSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/PRODSCENvhSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "ProdScenModel");
                    },
                    error: function (err) { }
                });
            },

            getIOTypeSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/IOTYPSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "IOTypeModel");
                    },
                    error: function (err) { }
                });
            },

            getProdTypeSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();
                oSHModel.read("/PRODTYPvhSet", {
                    urlParameters: {
                        "$filter": "SBU eq '" + this._sbu + "'"
                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "ProdTypeModel");
                    },
                    error: function (err) { }
                });
            },

            getIOPrefixSet: async function (model, sbu, wvtyp) {
                var sModel = model;
                var ssbu = sbu;
                var swvtyp = wvtyp;

                var oModel = this.getOwnerComponent().getModel(sModel);
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oModel.read("/GetIOPrefixSet", {
                    urlParameters: {
                        "$filter": "Sbu eq '" + ssbu + "'"
                    },
                    success: function (oData, oResponse) {
                        for (var i = 0; i < oData.results.length; i++) {
                            sIOPrefix = oData.results[i].Ioprefix;
                            sIODesc = oData.results[i].Iodesc;
                        }
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "IOPrefixModel");
                    },
                    error: function (err) { }
                });
            },

            getHeaderData: function () {
                var me = this;
                var ioNo = me._ioNo;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                Common.openLoadingDialog(that);

                var entitySet = "/IOHDRSet('" + ioNo + "')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        me._styleVer = oData.VERNO;
                        me._prodplant = oData.PRODPLANT;

                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "headerData");
                        Common.closeLoadingDialog(that);
                        me.setChangeStatus(false);
                        me._styleNo = oData.STYLENO;

                        if (oData.STYLENO != "" || oData.STYLENO != undefined)
                            me.getView().getModel("ui2").setProperty("/currStyleNo", oData.STYLENO);

                        me.initStyle();
                        me.initIOMatList();
                        me.initIOCosting();
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            reloadHeaderData: function (iono) {
                var me = this;
                var ioNo = iono;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                if (ioNo === "NEW") {
                    return;
                }

                Common.openLoadingDialog(that);

                var entitySet = "/IOHDRSet('" + ioNo + "')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "headerData");
                        Common.closeLoadingDialog(that);
                        me.setChangeStatus(false);
                        me._styleNo = oData.STYLENO;

                        if (oData.STYLENO != "" || oData.STYLENO != undefined)
                            me.getView().getModel("ui2").setProperty("/currStyleNo", oData.STYLENO);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            setHeaderEditMode: function () {
                //unlock editable fields of style header
                var oJSONModel = new JSONModel();
                var data = {};
                this._headerChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "HeaderEditModeModel");

                //get Value Help for fields of IO Header
                this.getVHSet("/IOTYPSet", "IOTypeModel", false);
                this.getVHSet("/PRODTYPvhSet", "ProdTypeModel", true);
                this.getVHSet("/PRODSCENvhSet", "ProdScenModel", false);
                this.getVHSet("/SEASONSet", "SeasonsModel", true);
                this.getVHSet("/STYLENOvhSet", "StyleNoModel", false);
                this.getVHSet("/UOMvhSet", "UOMModel", false);
                this.getVHSet("/SALESORGvhSet", "SalesOrgModel", false);
                this.getVHSet("/SALESGRPvhSet", "SalesGrpModel", false);
                this.getVHSet("/PRODPLANTvhSet", "PlantModel", false);
                this.getVHSet("/STYLECDvhSet", "StyleCdModel", false);
                this.getVHSet("/CUSTGRPvhSet", "CustGrpModel", false);
            },

            cancelHeaderEdit: function () {
                //confirm cancel edit of style header
                if (this._headerChanged) {
                    if (!this._DiscardHeaderChangesDialog) {
                        this._DiscardHeaderChangesDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.DiscardHeaderChanges", this);
                        this.getView().addDependent(this._DiscardHeaderChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardHeaderChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardHeaderChangesDialog.open();
                } else {
                    this.closeHeaderEdit();
                }
            },

            closeHeaderEdit: function () {
                var me = this;
                //on cancel confirmed - close edit mode and reselect backend data
                var oJSONModel = new JSONModel();
                var data = {};
                that._headerChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "HeaderEditModeModel");
                if (that._DiscardHeaderChangesDialog) {
                    that._DiscardHeaderChangesDialog.close();
                }
                var oMsgStrip = that.getView().byId('HeaderMessageStrip');
                oMsgStrip.setVisible(false);
            },

            //******************************************* */
            //VALUE HELP
            //******************************************* */

            onSeasonsValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._seasonsHelpDialog) {
                    that._seasonsHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.Seasons", that);
                    that._seasonsHelpDialog.attachSearch(that._seasonsGroupValueHelpSearch);
                    that.getView().addDependent(that._seasonsHelpDialog);
                }
                that._seasonsHelpDialog.open(sInputValue);
            },

            _seasonsGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("SEASONCD", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _seasonsGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onProdScenValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._prodscenHelpDialog) {
                    that._prodscenHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.ProdScen", that);
                    that._prodscenHelpDialog.attachSearch(that._prodscenGroupValueHelpSearch);
                    that.getView().addDependent(that._prodscenHelpDialog);
                }
                that._prodscenHelpDialog.open(sInputValue);
            },

            _prodscenGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("PRODSCEN", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _prodscenGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value

                    var sProdScen = this.getView().byId("PRODSCEN").getValue();

                    var oData = this.getView().getModel("ProdScenModel").oData;
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].PRODSCEN === sProdScen) {
                            // alert(oData.results[i].PRODPLANT);
                            this.getView().byId("PRODPLANT").setValue(oData.results[i].PRODPLANT);
                            this.getView().byId("TRADPLANT").setValue(oData.results[i].TRADPLANT);
                            this.getView().byId("PLANPLANT").setValue(oData.results[i].PLANPLANT);
                            this.getView().byId("FTYSALTERM").setValue(oData.results[i].FTY_SALES_TERM);
                            this.getView().byId("CUSSALTERM").setValue(oData.results[i].CUST_SALES_TERM);
                            this.getView().byId("SALESORG").setValue(oData.results[i].SALESORG);
                        }
                    }

                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onIOTypeValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._iotypeHelpDialog) {
                    that._iotypeHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.IOType", that);
                    that._iotypeHelpDialog.attachSearch(that._iotypeGroupValueHelpSearch);
                    that.getView().addDependent(that._iotypeHelpDialog);
                }
                that._iotypeHelpDialog.open(sInputValue);
            },

            _iotypeGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("IOTYPE", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _iotypeGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onProdTypeValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._prodtypeHelpDialog) {
                    that._prodtypeHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.ProdType", that);
                    that._prodtypeHelpDialog.attachSearch(that._prodtypeGroupValueHelpSearch);
                    that.getView().addDependent(that._prodtypeHelpDialog);
                }
                that._prodtypeHelpDialog.open(sInputValue);
            },

            _prodtypeGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("PRODTYP", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _prodtypeGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onStyleNoValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._stylenoHelpDialog) {
                    that._stylenoHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.StyleNo", that);
                    that._stylenoHelpDialog.attachSearch(that._stylenoGroupValueHelpSearch);
                    that.getView().addDependent(that._stylenoHelpDialog);
                }
                that._stylenoHelpDialog.open(sInputValue);
            },

            _stylenoGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("STYLENO", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _stylenoGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value

                    var sStyleNo = this.getView().byId("STYLENO").getValue();

                    var oData = this.getView().getModel("StyleNoModel").oData;
                    // console.log(oData);     
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].STYLENO === sStyleNo) {
                            this.getView().byId("VERNO").setValue(oData.results[i].PRODPLANT);
                            this.getView().byId("PRODTYPE").setValue(oData.results[i].PRODTYP);
                            this.getView().byId("STYLECD").setValue(oData.results[i].STYLECD);
                            this.getView().byId("SEASONCD").setValue(oData.results[i].SEASONCD);
                            this.getView().byId("CUSTGRP").setValue(oData.results[i].CUSTGRP);
                            this.getView().byId("BASEUOM").setValue(oData.results[i].UOM);
                        }
                    }

                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onUOMValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._uomHelpDialog) {
                    that._uomHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.UOM", that);
                    that._uomHelpDialog.attachSearch(that._uomGroupValueHelpSearch);
                    that.getView().addDependent(that._uomHelpDialog);
                }
                that._uomHelpDialog.open(sInputValue);
            },

            _uomGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("MSEHI", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("MSEHL", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _uomGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onSalesOrgValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._salesorgHelpDialog) {
                    that._salesorgHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.SalesOrg", that);
                    that._salesorgHelpDialog.attachSearch(that._salesorgGroupValueHelpSearch);
                    that.getView().addDependent(that._salesorgHelpDialog);
                }
                that._salesorgHelpDialog.open(sInputValue);
            },

            _salesorgGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("SALESORG", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESCRIPTION", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _salesorgGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onSalesGrpValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._salesgrpHelpDialog) {
                    that._salesgrpHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.SalesGrp", that);
                    that._salesgrpHelpDialog.attachSearch(that._salesgrpGroupValueHelpSearch);
                    that.getView().addDependent(that._salesgrpHelpDialog);
                }
                that._salesgrpHelpDialog.open(sInputValue);
            },

            _salesgrpGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("SALESGRP", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _salesgrpGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onPlantValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._plantHelpDialog) {
                    that._plantHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.Plant", that);
                    that._plantHelpDialog.attachSearch(that._plantGroupValueHelpSearch);
                    that.getView().addDependent(that._plantHelpDialog);
                }
                that._plantHelpDialog.open(sInputValue);
            },

            _plantGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("PRODPLANT", sap.ui.model.FilterOperator.Contains, sValue));
                // orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _plantGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onStyleCdValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._stylecdHelpDialog) {
                    that._stylecdHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.StyleCd", that);
                    that._stylecdHelpDialog.attachSearch(that._stylecdGroupValueHelpSearch);
                    that.getView().addDependent(that._stylecdHelpDialog);
                }
                that._stylecdHelpDialog.open(sInputValue);
            },

            _stylecdGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("STYLECD", sap.ui.model.FilterOperator.Contains, sValue));
                // orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _seasonsGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onCustGrpValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._custgrpHelpDialog) {
                    that._custgrpHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.CustGrp", that);
                    that._custgrpHelpDialog.attachSearch(that._custgrpGroupValueHelpSearch);
                    that.getView().addDependent(that._custgrpHelpDialog);
                }
                that._custgrpHelpDialog.open(sInputValue);
            },

            _custgrpGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("CUSTGRP", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DECSRIPTION", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _custgrpGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            //******************************************* */
            // HEADER
            //******************************************* */
            onIOEdit: function (source) {
                var sSource = source;

                if (sSource === "IOHDR") {
                    //create new - only header is editable at first
                    this.setHeaderEditMode();
                    this.byId("onIOEdit").setVisible(false);
                    this.byId("onIORelease").setVisible(false);
                    this.byId("onIOAttribEdit").setVisible(false);
                    this.byId("onIOStatEdit").setVisible(false);
                    this.byId("onIOSave").setVisible(true);
                    this.byId("onIOCancel").setVisible(true);

                    this.disableOtherTabs();

                    var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                    oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                        .forEach(item => item.setProperty("enabled", false));

                    this._ioNo = this.getView().byId("IONO").getValue();
                }
            },

            onIOSave: async function (source) {
                var me = this;
                var sSource = source;
                if (sSource === "IOHDR") {
                    var sErrMsg = "";
                    if (this.getView().byId("IOTYPE").getValue() === "") sErrMsg = "IO Type";
                    else if (this.getView().byId("PRODSCEN").getValue() === "") sErrMsg = "Production Scenario";
                    else if (this._sbu.Length <= 0) sErrMsg = "SBU";

                    if (sErrMsg.length > 0) {
                        sErrMsg += " is required."
                        sap.m.MessageBox.warning(sErrMsg);
                        return;
                    }

                    _promiseResult = new Promise((resolve, reject) => {
                        resolve(this.getIOPrefixSet("ZGW_3DERP_RFC_SRV", this._sbu, ""));
                    });
                    await _promiseResult;

                    var oParamIOHeaderData = {
                        STYLECD: this.getView().byId("STYLECD").getValue(),
                        PRODTYPE: this.getView().byId("PRODTYPE").getValue(),
                        PRODSCEN: this.getView().byId("PRODSCEN").getValue(),
                        SALESORG: this.getView().byId("SALESORG").getValue(),
                        ORDQTY: this.getView().byId("ORDQTY").getValue() === "" ? "0" : this.getView().byId("ORDQTY").getValue(),
                        ACTUALQTY: this.getView().byId("ACTUALQTY").getValue() === "" ? "0" : this.getView().byId("ACTUALQTY").getValue(),
                        PLANMONTH: this.getView().byId("PLANMONTH").getValue(),
                        IOTYPE: this.getView().byId("IOTYPE").getValue(),
                        IOPREFIX: sIOPrefix,
                        IODESC: sIODesc,
                        SBU: this._sbu,
                        SALESGRP: this.getView().byId("SALESGRP").getValue(),
                        PRODPLANT: this.getView().byId("PRODPLANT").getValue(),
                        FTYSALTERM: this.getView().byId("FTYSALTERM").getValue(),
                        REVORDQTY: this.getView().byId("REVORDQTY").getValue() === "" ? "0" : this.getView().byId("REVORDQTY").getValue(),
                        SHIPQTY: this.getView().byId("SHIPQTY").getValue() === "" ? "0" : this.getView().byId("SHIPQTY").getValue(),
                        PRODWK: this.getView().byId("PRODWK").getValue() === "" || this.getView().byId("PRODWK").getValue() === "0" ? 0 : this.getView().byId("PRODWK").getValue(),
                        IOSUFFIX: this.getView().byId("IOSUFFIX").getValue(),
                        SEASONCD: this.getView().byId("SEASONCD").getValue(),
                        CUSTGRP: this.getView().byId("CUSTGRP").getValue(),
                        TRADPLANT: this.getView().byId("TRADPLANT").getValue(),
                        CUSSALTERM: this.getView().byId("CUSSALTERM").getValue(),
                        BASEUOM: this.getView().byId("BASEUOM").getValue(),
                        PLANDLVDT: this.getView().byId("PLANDLVDT").getValue(),
                        REFIONO: this.getView().byId("REFIONO").getValue(),
                        STYLENO: this.getView().byId("STYLENO").getValue(),
                        VERNO: this.getView().byId("VERNO").getValue(),
                        PLANPLANT: this.getView().byId("PLANPLANT").getValue(),
                        CUSTDLVDT: this.getView().byId("CUSTDLVDT").getValue(),
                        PLANQTY: this.getView().byId("PLANQTY").getValue() === "" ? "0" : this.getView().byId("PLANQTY").getValue(),
                        PRODSTART: this.getView().byId("PRODSTART").getValue(),
                        REMARKS: this.getView().byId("REMARKS").getValue(),
                        STATUSCD: "CRT"
                    };

                    var oModel = this.getOwnerComponent().getModel();

                    if (this._ioNo === "NEW") {
                        _promiseResult = new Promise((resolve, reject) => {
                            setTimeout(() => {
                                oModel.create("/IOHDRSet", oParamIOHeaderData, {
                                    method: "POST",
                                    success: function (oData, oResponse) {
                                        _newIONo = oData.IONO;
                                        this.getView().getModel("ui2").setProperty("/currIONo", oData.IONO);
                                        Common.showMessage("IO# " + _newIONo + " generated.");
                                        resolve();
                                    },
                                    error: function (err) {
                                        resolve();
                                    }
                                });
                            }, 100);
                        });
                        await _promiseResult;
                    } else {
                        _promiseResult = new Promise((resolve, reject) => {
                            setTimeout(() => {
                                oModel.update("/IOHDRSet(IONO='" + me._ioNo + "')", oParamIOHeaderData, {
                                    method: "PUT",
                                    success: function (oData, oResponse) {
                                        _newIONo = me._ioNo;
                                        Common.showMessage("IO# " + _newIONo + " updated.");
                                        resolve();
                                    },
                                    error: function (err) {
                                        resolve();
                                    }
                                });
                            }, 100);
                        });
                        await _promiseResult;
                    }

                    //Set Button Visibility for Read Mode
                    this.byId("onIOEdit").setVisible(true);
                    this.byId("onIORelease").setVisible(true);
                    this.byId("onIOAttribEdit").setVisible(true);
                    this.byId("onIOStatEdit").setVisible(true);
                    this.byId("onIOSave").setVisible(false);
                    this.byId("onIOCancel").setVisible(false);

                    //Enable Icon Tab Filters
                    this.enableOtherTabs();

                    setTimeout(() => {
                        this.cancelHeaderEdit();
                    }, 100);

                    var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                    oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                        .forEach(item => item.setProperty("enabled", true));

                    _promiseResult = new Promise((resolve, reject) => {
                        resolve(this.reloadHeaderData(_newIONo));
                    });
                    await _promiseResult;

                    _promiseResult = new Promise((resolve, reject) => {
                        resolve(this.closeHeaderEdit());
                    });
                    await _promiseResult;

                    _promiseResult = new Promise((resolve, reject) => {
                        resolve(this.getReloadIOColumnProp());
                    });
                    await _promiseResult;
                }
            },

            onIOCancel: function (source) {
                var sSource = source;
                // alert(sSource);
                if (sSource === "IOHDR") {
                    //prompt Dialog for Cancel
                    // Common.showMessage("Cancel IO");
                    //if 

                    //Set Button Visibility for Read Mode
                    this.byId("onIOEdit").setVisible(true);
                    this.byId("onIORelease").setVisible(true);
                    this.byId("onIOAttribEdit").setVisible(true);
                    this.byId("onIOStatEdit").setVisible(true);
                    this.byId("onIOSave").setVisible(false);
                    this.byId("onIOCancel").setVisible(false);

                    //Enable Icon Tab Filters
                    this.enableOtherTabs();

                    setTimeout(() => {
                        this.cancelHeaderEdit();
                    }, 100);

                    var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                    // oIconTabBarIO.getItems().filter(item => item.getProperty("key") !== oIconTabBarIO.getSelectedKey())
                    oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                        .forEach(item => item.setProperty("enabled", true));

                    // alert(this._ioNo);
                    // alert(this._newIONo);
                    if (this._ioNo === "NEW" && this._newIONo !== "") {
                        this.onNavBack();
                    }

                }
            },

            onIORelease: function (TableName) {
                sTableName = TableName;
                var oParam;
                var sIONo = this.getView().byId("IONO").getValue();

                // alert(sTableName);
                if (sTableName === "IOHDR") {
                    oParam = {
                        "Iono": sIONo
                    };
                }

                // if (sTableName === "IODynTable") {
                //     var oTable = this.byId(sTableName);
                //     var oSelectedIndices = oTable.getSelectedIndices();
                //     var oTmpSelectedIndices = [];
                //     var aData = oTable.getModel().getData().rows;

                //     var bProceed = true;
                //     var oParam;
                //     var sReleaseIO;

                //     if (oSelectedIndices.length > 0) {
                //         oSelectedIndices.forEach(item => {
                //             oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                //         })

                //         oSelectedIndices = oTmpSelectedIndices;

                //         if (sTableName === "IOHDR") {
                //             oSelectedIndices.forEach(item => {
                //                 sReleaseIO = aData.at(item).IONO;
                //             })
                //         }

                //         oParam = {
                //             "Iono": sReleaseIO
                //         };
                //     }
                // }

                var sEntitySet = "/Internal_CreateSet";
                var sMethod = "POST";
                var sMessage;
                var resultType;
                var resultDescription;

                // console.log(oParam);
                // console.log(sEntitySet);
                // console.log(sMethod);
                // return;

                var oModelRelease = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                oModelRelease.create(sEntitySet, oParam, {
                    method: sMethod,
                    success: function (oData, oResponse) {
                        //capture oData output if needed
                        resultType = oData.Type;
                        resultDescription = oData.Description;

                        //show MessageBox for successful execution
                        setTimeout(() => {
                            if (resultType === "E") {
                                sap.m.MessageBox.error(resultDescription);
                            }
                            if (resultType !== "E") {
                                sap.m.MessageBox.information(resultDescription);
                            }
                        }, 100);
                    },
                    error: function (err) { }
                });

                //reload data for both IO Delivery and IO Detail
                setTimeout(() => {
                    this.reloadHeaderData(sIONo);
                }, 100);

                setTimeout(() => {
                    this.reloadIOData("StatDynTable", "/IOSTATSet");
                }, 100);

                // var sText;
                // var sOutput;
                // if(sTableName === "IODLVTab"){
                //     sText = "Copy Delivery Sequence " + sDlvSeq + "?";
                //     sOutput = "Copy Successful";
                // } else if(sTableName === "IODETTab"){
                //     sText = "Copy Delivery Item " + sIOItem + "?";
                // }
                // var oDialogData = {
                //     Action: "onCopy",
                //     SourceTable:sTableName,
                //     Text: sText,
                //     Output: sOutput
                // };

                // var oJSONModel = new JSONModel();
                // oJSONModel.setData(oDialogData);

                // if(!this._ConfirmDialogIOfn){
                //     this._ConfirmDialogIOfn = sap.ui.xmlfragment("zuiio2.vew.fragments.dialog.ConfirmDialogIOfn", this);
                //     this._ConfirmDialogIOfn.setModel(oJSONModel);
                //     this.getView().addDependent(this._ConfirmDialogIOfn);
                // }
                // else this._ConfirmDialogIOfn.setModel(oJSONModel);
            },

            //******************************************* */
            // DELIVERY SCHEDULE AND DETAILS
            //******************************************* */

            onAdd: function (source) {
                var arg = source;

                if (arg === "IODLV") {
                    this.byId("btnNewDlvSched").setVisible(false);
                    this.byId("btnImportPODlvSched").setVisible(false);
                    this.byId("btnEditDlvSched").setVisible(false);
                    this.byId("btnDeleteDlvSched").setVisible(false);
                    this.byId("btnCopyDlvSched").setVisible(false);
                    this.byId("btnRefreshDlvSched").setVisible(false);
                    this.byId("btnSaveDlvSched").setVisible(true);
                    this.byId("btnCancelDlvSched").setVisible(true);
                    this.byId("btnFullScreenDlvSched").setVisible(false);

                    this.byId("btnNewIODet").setVisible(false);
                    this.byId("btnEditIODet").setVisible(false);
                    this.byId("btnDeleteIODet").setVisible(false);
                    // this.byId("btnCopyIODet").setVisible(false);
                    this.byId("btnRefreshIODet").setVisible(false);
                    this.byId("btnSaveIODet").setVisible(false);
                    this.byId("btnCancelIODet").setVisible(false);
                    this.byId("btnFullScreenIODet").setVisible(false);
                } else if (arg === "IODET") {
                    this.byId("btnNewDlvSched").setVisible(false);
                    this.byId("btnImportPODlvSched").setVisible(false);
                    this.byId("btnEditDlvSched").setVisible(false);
                    this.byId("btnDeleteDlvSched").setVisible(false);
                    this.byId("btnCopyDlvSched").setVisible(false);
                    this.byId("btnRefreshDlvSched").setVisible(false);
                    this.byId("btnSaveDlvSched").setVisible(false);
                    this.byId("btnCancelDlvSched").setVisible(false);
                    this.byId("btnFullScreenDlvSched").setVisible(false);

                    this.byId("btnNewIODet").setVisible(false);
                    this.byId("btnEditIODet").setVisible(false);
                    this.byId("btnDeleteIODet").setVisible(false);
                    // this.byId("btnCopyIODet").setVisible(false);
                    this.byId("btnRefreshIODet").setVisible(false);
                    this.byId("btnSaveIODet").setVisible(true);
                    this.byId("btnCancelIODet").setVisible(true);
                    this.byId("btnFullScreenIODet").setVisible(false);
                }
                var oIconTabBar = this.byId("idIconTabBarInlineMode");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));

                //GET TABLE
                var aNewRow = [];
                var oNewRow = {};
                var tabName = arg + "Tab";
                var oTable = this.getView().byId(tabName);

                oNewRow["New"] = true;
                aNewRow.push(oNewRow);

                //SET TABLE AS EDITABLE
                this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel().getData().rows);

                this.setRowEditMode(arg);
                this._validationErrors = [];
                this._sTableModel = arg;
                this._dataMode = "EDIT";

                // // this.setActiveRowHighlightByTableId(arg + "Tab");

                var oModel = this.getView().byId(tabName).getModel();
                oModel.setProperty("/rows", aNewRow);
                this.getView().getModel("ui").setProperty("/dataMode", 'NEW');

                if (oTable.getBinding()) {
                    this._aFiltersBeforeChange = jQuery.extend(true, [], oTable.getBinding().aFilters);

                    // oTable.getBinding().aSorters = null;
                    oTable.getBinding().aFilters = null;
                }
                // console.log(this._aFiltersBeforeChange)
                var oColumns = oTable.getColumns();
                // console.log(oColumns);

                for (var i = 0, l = oColumns.length; i < l; i++) {
                    var isFiltered = oColumns[i].getFiltered();
                    // console.log(oColumns[i].getFiltered())
                    if (isFiltered) {
                        oColumns[i].filter("");
                    }
                }

                // console.log(oTable);
                oTable.getModel().refresh(true);

            },

            onCopy: function (TableName) {
                sTableName = TableName;
                // Common.showMessage(sTableName);

                var me = this;
                var oTable = this.byId(sTableName);
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var bProceed = true;
                var oParam;

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    if (sTableName === "IODLVTab") {
                        oSelectedIndices.forEach(item => {
                            sIONo = aData.at(item).IONO;
                            sDlvSeq = aData.at(item).DLVSEQ;

                            oParam = {
                                "IONO": aData.at(item).IONO,
                                "CPONO": aData.at(item).CPONO,
                                "CPOREV": aData.at(item).CPOREV === "" ? "0" : aData.at(item).CPOREV,
                                "CPOITEM": aData.at(item).CPOITEM === "" ? "0" : aData.at(item).CPOITEM,
                                "CPODT": aData.at(item).CPODT,
                                "DLVDT": aData.at(item).DLVDT,
                                "REVDLVDT": aData.at(item).REVDLVDT,
                                "CUSTSHIPTO": aData.at(item).CUSTSHIPTO,
                                "CUSTBILLTO": aData.at(item).CUSTBILLTO,
                                "HTSNO": aData.at(item).HTSNO,
                                "SHIPMODE": aData.at(item).SHIPMODE,
                                "PAYMETHOD": aData.at(item).PAYMETHOD,
                                "LCNO": aData.at(item).LCNO,
                                "LCDT": aData.at(item).LCDT,
                                "BANK": aData.at(item).BANK,
                                "NOTIFYPARTY": aData.at(item).NOTIFYPARTY,
                                "ASNDOCNO": aData.at(item).ASNDOCNO,
                                "ASNDT": aData.at(item).ASNDT
                            };
                        })
                    }

                    if (sTableName === "IODETTab") {
                        oSelectedIndices.forEach(item => {
                            sIONo = aData.at(item).IONO;
                            sIOItem = aData.at(item).IOITEM;

                            oParam = {
                                "IONO": aData.at(item).IONO,
                                "SALDOCNO": aData.at(item).SALDOCNO,
                                "SALDOCITEM": aData.at(item).SALDOCITEM === "" ? "0" : aData.at(item).SALDOCITEM,
                                "ORDERQTY": aData.at(item).ORDERQTY === "" ? "0" : aData.at(item).ORDERQTY,
                                "REVORDERQTY": aData.at(item).REVORDERQTY === "" ? "0" : aData.at(item).REVORDERQTY,
                                "ACTUALQTY": aData.at(item).ACTUALQTY === "" ? "0" : aData.at(item).ACTUALQTY,
                                "PLANSHPQTY": aData.at(item).PLANSHPQTY === "" ? "0" : aData.at(item).PLANSHPQTY,
                                "SHIPQTY": aData.at(item).SHIPQTY === "" ? "0" : aData.at(item).SHIPQTY,
                                "MATNO": aData.at(item).MATNO,
                                "BATCH": aData.at(item).BATCH,
                                "REVDLVDT": aData.at(item).REVDLVDT,
                                "CUSTCOLOR": aData.at(item).CUSTCOLOR,
                                "CUSTDEST": aData.at(item).CUSTDEST,
                                "CUSTSIZE": aData.at(item).CUSTSIZE,
                                "UNITPRICE1": aData.at(item).UNITPRICE1 === "" ? "0" : aData.at(item).UNITPRICE1,
                                "UNITPRICE2": aData.at(item).UNITPRICE2 === "" ? "0" : aData.at(item).UNITPRICE2,
                                "UNITPRICE3": aData.at(item).UNITPRICE3 === "" ? "0" : aData.at(item).UNITPRICE3,
                                "REVUPRICE1": aData.at(item).REVUPRICE1 === "" ? "0" : aData.at(item).REVUPRICE1,
                                "REVUPRICE2": aData.at(item).REVUPRICE2 === "" ? "0" : aData.at(item).REVUPRICE2,
                                "REVUPRICE3": aData.at(item).REVUPRICE3 === "" ? "0" : aData.at(item).REVUPRICE3,
                                "DLVSEQ": aData.at(item).DLVSEQ === "" ? "0" : aData.at(item).DLVSEQ,
                                "REMARKS": aData.at(item).REMARKS
                            };
                        })
                    }
                }
                // console.log(oParam);

                var sEntitySet;
                var sMethod;
                if (sTableName === "IODLVTab") {
                    sEntitySet = "/IODLVSet";
                    sMethod = "POST";
                }

                if (sTableName === "IODETTab") {
                    sEntitySet = "/IODETSet";
                    sMethod = "POST";
                }

                var oModelCopy = this.getOwnerComponent().getModel();
                // var oJSONModel = new JSONModel();
                // var oView = this.getView();

                oModelCopy.create(sEntitySet, oParam, {
                    method: sMethod,
                    success: function (oData, oResponse) {
                        //capture oData output if needed
                        sMessage = "Copy Successful";
                        //show MessageBox for successful execution
                        setTimeout(() => {
                            sap.m.MessageBox.information(sMessage);
                        }, 100);
                    },
                    error: function (err) { }
                });

                //reload data for both IO Delivery and IO Detail
                setTimeout(() => {
                    this.reloadIOData("IODLVTab", "/IODLVSet");
                }, 100);

                setTimeout(() => {
                    this.reloadIOData("IODETTab", "/IODETSet");
                }, 100);

                // var sText;
                // var sOutput;
                // if(sTableName === "IODLVTab"){
                //     sText = "Copy Delivery Sequence " + sDlvSeq + "?";
                //     sOutput = "Copy Successful";
                // } else if(sTableName === "IODETTab"){
                //     sText = "Copy Delivery Item " + sIOItem + "?";
                // }
                // var oDialogData = {
                //     Action: "onCopy",
                //     SourceTable:sTableName,
                //     Text: sText,
                //     Output: sOutput
                // };

                // var oJSONModel = new JSONModel();
                // oJSONModel.setData(oDialogData);

                // if(!this._ConfirmDialogIOfn){
                //     this._ConfirmDialogIOfn = sap.ui.xmlfragment("zuiio2.vew.fragments.dialog.ConfirmDialogIOfn", this);
                //     this._ConfirmDialogIOfn.setModel(oJSONModel);
                //     this.getView().addDependent(this._ConfirmDialogIOfn);
                // }
                // else this._ConfirmDialogIOfn.setModel(oJSONModel);
            },

            onCloseConfirmDialogIOfn: function () {

                if (this._ConfirmDialogIOfn.getModel().getData().Action === "onCopy") {

                    this._ConfirmDialogIOfn.close();
                }
            },

            onCancelConfirmDialogIOfn: function () {
                this._ConfirmDialogIOfn.close();
            },

            onDelete: function (TableName) {
                sTableName = TableName;
                // Common.showMessage(sTableName);

                var me = this;
                var oTable = this.byId(sTableName);
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var bProceed = true;

                if (oSelectedIndices.length <= 0) {
                    Common.showMessage("No data to delete.");
                    return;
                }

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    if (sTableName === "IODLVTab") {
                        oSelectedIndices.forEach(item => {
                            sIONo = aData.at(item).IONO;
                            sDlvSeq = aData.at(item).DLVSEQ;
                            sDeleted = aData.at(item).DELETED;
                        })
                    }

                    if (sTableName === "IODETTab") {
                        oSelectedIndices.forEach(item => {
                            sIONo = aData.at(item).IONO;
                            sIOItem = aData.at(item).IOITEM;
                            sDeleted = aData.at(item).DELETED;
                        })
                    }

                    // console.log(sIONo);
                    // console.log(sDlvSeq);
                    // console.log(sIOItem);

                    if (sDeleted === true) {
                        Common.showMessage("Record already tagged as Deleted.");
                        return;
                    }

                    if (sIONo === "") {
                        Common.showMessage("No Row Selected");
                        me.closeLoadingDialog();
                    } else {

                        if (!this._ConfirmMarkAsDelete) {
                            this._ConfirmMarkAsDelete = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmMarkAsDelete", this);
                            this.getView().addDependent(this._ConfirmMarkAsDelete);
                        }
                        jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                        this._ConfirmMarkAsDelete.addStyleClass("sapUiSizeCompact");
                        this._ConfirmMarkAsDelete.open();
                    }
                }
            },

            onConfirmMarkAsDelete: function () {
                var me = this;
                var oParam;
                var sEntitySet;
                var sMessage;

                // alert("Confirm Mark as Deleted");
                // console.log(sTableName);
                // console.log(sIONo);
                // console.log(sDlvSeq);
                // console.log(sIOItem);

                if (sTableName === "IODLVTab") {
                    sEntitySet = "/IODLVSet(IONO='" + sIONo + "',DLVSEQ='" + sDlvSeq + "')";
                    // console.log(sEntitySet)

                    oParam = {
                        "IONO": sIONo,
                        "DLVSEQ": sDlvSeq,
                        "DELETED": "X"
                    };
                    // console.log(oParam);
                }

                if (sTableName === "IODETTab") {
                    sEntitySet = "/IODETSet(IONO='" + sIONo + "',IOITEM='" + sIOItem + "')";

                    oParam = {
                        "IONO": sIONo,
                        "IOITEM": sIOItem,
                        "DELETED": "X"
                    };

                    // alert(sEntitySet);
                    // alert(oParam);
                }

                // me._ConfirmMarkAsDelete.close();
                // return;

                var oMarkAsDeletedModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oMarkAsDeletedModel.update(sEntitySet, oParam, {
                    method: "PUT",
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "MarkAsDeletedModel");
                        if (sTableName === "IODLVTab") { sMessage = "Delivery Seq " + sDlvSeq + " marked as deleted"; }
                        else if (sTableName === "IODETTab") { sMessage = "Delivery Item " + sDlvItem + " marked as deleted"; }

                        sap.m.MessageBox.information(sMessage);
                    },
                    error: function (err) { }
                });

                me._ConfirmMarkAsDelete.close();

                setTimeout(() => {
                    this.reloadIOData("IODLVTab", "/IODLVSet");
                }, 100);

                setTimeout(() => {
                    this.reloadIOData("IODETTab", "/IODETSet");
                }, 100);
            },

            reloadIOData: function (source, entityset) {
                var me = this;
                var sSource = source;
                var sEntitySet = entityset;

                this.byId(sSource)
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                // var ioNo = this._ioNo;
                this.getView().getModel("ui2").setProperty("/currDlvSeq", "1");
                this.getView().getModel("ui2").setProperty("/currDlvItem", "1");
                var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

                // console.log(cIONo);
                // console.log(cDlvSeq);

                if (source === "IODET") {
                    this._oModel.read(sEntitySet, {
                        urlParameters: {
                            "$filter": "IONO eq '" + cIONo + "' and DLVSEQ eq '" + cDlvSeq + "'"
                        },
                        success: function (oData, response) {
                            // console.log("Reload IO Data");
                            // console.log(oData);
                            me.byId(sSource).getModel().setProperty("/rows", oData.results);
                            me.byId(sSource).bindRows("/rows");
                        },
                        error: function (err) { alert(err); }
                    })
                } else {
                    this._oModel.read(sEntitySet, {
                        urlParameters: {
                            "$filter": "IONO eq '" + cIONo + "'"
                        },
                        success: function (oData, response) {
                            // console.log("Reload IO Data");
                            // console.log(ioNo);
                            // console.log(oData);
                            me.byId(sSource).getModel().setProperty("/rows", oData.results);
                            me.byId(sSource).bindRows("/rows");
                        },
                        error: function (err) { alert(err); }
                    })
                }

                this.getReloadIOColumnProp();
            },

            //******************************************* */
            // STYLE
            //******************************************* */

            initStyle() {
                this._oModelStyle = this.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                this._aColumns = {};
                this._aDataBeforeChange = [];
                var me = this;

                if (this._styleNo.trim() === "") this.byId("btnCreateStyle").setVisible(true);
                else this.byId("btnCreateStyle").setVisible(false);

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

                // this.byId("styleDetldBOMTab")
                //     .setModel(new JSONModel({
                //         columns: []
                //     }));

                this.byId("styleFabBOMTab")
                    .setModel(new JSONModel({
                        columns: []
                    }));

                this.byId("styleAccBOMTab")
                    .setModel(new JSONModel({
                        columns: []
                    }));

                this.byId("styleMatListTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                //pivot arrays
                this._colors;
                this._sizes;

                this.getStyleHeaderData();

                // this._oModelStyle.update("/CreateIOStyleSet('1000118')", { IONO: "1000118", STYLENO: "1000000461"  }, {
                //     success: function (oData, response) {},
                //     error: function (err) { }
                // })

                var vIONo = this._ioNo; //"1000115";
                this._oModelStyle.read('/AttribSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'COLOR'"
                    },
                    success: function (oData, response) {
                        oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                        me.byId("colorTab").getModel().setProperty("/rows", oData.results);
                        me.byId("colorTab").bindRows("/rows");
                        me._tableRendered = "colorTab";
                    },
                    error: function (err) { }
                })

                this._oModelStyle.read('/ProcessSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData, response) {
                        oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                        me.byId("processTab").getModel().setProperty("/rows", oData.results);
                        me.byId("processTab").bindRows("/rows");
                        me._tableRendered = "processTab";
                    },
                    error: function (err) { }
                })

                this._oModelStyle.read('/AttribSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'SIZE'"
                    },
                    success: function (oData, response) {
                        oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                        me.byId("sizeTab").getModel().setProperty("/rows", oData.results);
                        me.byId("sizeTab").bindRows("/rows");
                        me._tableRendered = "sizeTab";
                    },
                    error: function (err) { }
                })

                this._oModelStyle.read('/UVSet', {
                    success: function (oData, response) {
                        me.getView().setModel(new JSONModel(oData), "UVModel");
                    },
                    error: function (err) { }
                })

                //get column value help prop
                this.getStyleColumnProp();

                var oDDTextParam = [], oDDTextResult = {};
                var oJSONModelDDText = new JSONModel();
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oDDTextParam.push({ CODE: "CONFIRM_DISREGARD_CHANGE" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_EDIT" });
                oDDTextParam.push({ CODE: "COLORS" });
                oDDTextParam.push({ CODE: "PROCESSES" });
                oDDTextParam.push({ CODE: "SIZE" });
                oDDTextParam.push({ CODE: "DTLDBOM" });
                oDDTextParam.push({ CODE: "BOMBYUV" });
                oDDTextParam.push({ CODE: "MATLIST" });
                oDDTextParam.push({ CODE: "EDIT" });
                oDDTextParam.push({ CODE: "SAVE" });
                oDDTextParam.push({ CODE: "CANCEL" });
                oDDTextParam.push({ CODE: "MANAGESTYLE" });
                oDDTextParam.push({ CODE: "NEW" });
                oDDTextParam.push({ CODE: "STYLEHDR" });
                oDDTextParam.push({ CODE: "PARTCD" });
                oDDTextParam.push({ CODE: "PARTDESC" });
                oDDTextParam.push({ CODE: "MATTYP" });
                oDDTextParam.push({ CODE: "GMC" });
                oDDTextParam.push({ CODE: "GMCDESC" });
                oDDTextParam.push({ CODE: "USGCLS" });
                oDDTextParam.push({ CODE: "SEQNO" });
                oDDTextParam.push({ CODE: "BOMITEM" });
                oDDTextParam.push({ CODE: "MATTYPCLS" });
                oDDTextParam.push({ CODE: "CONSUMP" });
                oDDTextParam.push({ CODE: "WASTAGE" });
                oDDTextParam.push({ CODE: "COLORCD" });
                oDDTextParam.push({ CODE: "ATTRIBUTE" });
                oDDTextParam.push({ CODE: "SIZECD" });
                oDDTextParam.push({ CODE: "SIZEGRP" });
                oDDTextParam.push({ CODE: "POCOLOR" });
                oDDTextParam.push({ CODE: "DESC" });
                oDDTextParam.push({ CODE: "USGCLS" });
                oDDTextParam.push({ CODE: "INFO_CHECK_INVALID_ENTRIES" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_MODIFIED" });
                oDDTextParam.push({ CODE: "INFO_DATA_SAVE" });
                oDDTextParam.push({ CODE: "SAVELAYOUT" });
                oDDTextParam.push({ CODE: "INFO_LAYOUT_SAVE" });
                oDDTextParam.push({ CODE: "FABBOM" });
                oDDTextParam.push({ CODE: "ACCBOM" });
                oDDTextParam.push({ CODE: "GENSTYLEMATLIST" });
                oDDTextParam.push({ CODE: "INFO_IOMATLIST_GENERATED" });
                oDDTextParam.push({ CODE: "INFO_NO_IOMATLIST_GENERATED" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_TO_PROC" });
                oDDTextParam.push({ CODE: "ASSIGNSAPMAT" });
                oDDTextParam.push({ CODE: "AUTOASSIGNSAPMAT" });
                oDDTextParam.push({ CODE: "CREATESAPMAT" });

                oDDTextParam.push({ CODE: "CONFIRM_DISREGARD_CHANGE" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_EDIT" });
                oDDTextParam.push({ CODE: "COLORS" });
                oDDTextParam.push({ CODE: "PROCESSES" });
                oDDTextParam.push({ CODE: "SIZE" });
                oDDTextParam.push({ CODE: "DTLDBOM" });
                oDDTextParam.push({ CODE: "BOMBYUV" });
                oDDTextParam.push({ CODE: "MATLIST" });
                oDDTextParam.push({ CODE: "EDIT" });
                oDDTextParam.push({ CODE: "SAVE" });
                oDDTextParam.push({ CODE: "CANCEL" });
                oDDTextParam.push({ CODE: "MANAGESTYLE" });
                oDDTextParam.push({ CODE: "NEW" });
                oDDTextParam.push({ CODE: "STYLEHDR" });
                oDDTextParam.push({ CODE: "PARTCD" });
                oDDTextParam.push({ CODE: "PARTDESC" });
                oDDTextParam.push({ CODE: "MATTYP" });
                oDDTextParam.push({ CODE: "GMC" });
                oDDTextParam.push({ CODE: "GMCDESC" });
                oDDTextParam.push({ CODE: "USGCLS" });
                oDDTextParam.push({ CODE: "SEQNO" });
                oDDTextParam.push({ CODE: "BOMITEM" });
                oDDTextParam.push({ CODE: "MATTYPCLS" });
                oDDTextParam.push({ CODE: "CONSUMP" });
                oDDTextParam.push({ CODE: "WASTAGE" });
                oDDTextParam.push({ CODE: "COLORCD" });
                oDDTextParam.push({ CODE: "ATTRIBUTE" });
                oDDTextParam.push({ CODE: "SIZECD" });
                oDDTextParam.push({ CODE: "SIZEGRP" });
                oDDTextParam.push({ CODE: "POCOLOR" });
                oDDTextParam.push({ CODE: "DESC" });
                oDDTextParam.push({ CODE: "USGCLS" });
                oDDTextParam.push({ CODE: "INFO_CHECK_INVALID_ENTRIES" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_MODIFIED" });
                oDDTextParam.push({ CODE: "INFO_DATA_SAVE" });
                oDDTextParam.push({ CODE: "SAVELAYOUT" });
                oDDTextParam.push({ CODE: "INFO_LAYOUT_SAVE" });
                oDDTextParam.push({ CODE: "SUBMITMRP" });
                oDDTextParam.push({ CODE: "ASSIGNMATNO" });
                oDDTextParam.push({ CODE: "EXCELEXPORT" });
                oDDTextParam.push({ CODE: "FULLSCREEN" });
                oDDTextParam.push({ CODE: "EXITFULLSCREEN" });
                oDDTextParam.push({ CODE: "INFO_MATNO_ALREADY_EXIST" });
                oDDTextParam.push({ CODE: "MATDESC1" });
                oDDTextParam.push({ CODE: "UOM" });
                oDDTextParam.push({ CODE: "MATNO" });
                oDDTextParam.push({ CODE: "INFO_NO_RECORD_TO_PROC" });
                oDDTextParam.push({ CODE: "INFO_MATNO_ASSIGNED" });
                oDDTextParam.push({ CODE: "INFO_MRPDATA_CREATED" });
                oDDTextParam.push({ CODE: "INFO_NO_SEL_RECORD_TO_PROC" });
                oDDTextParam.push({ CODE: "INFO_MATERIAL_CREATED" });

                oDDTextParam.push({ CODE: "PRINT" });

                oDDTextParam.push({ CODE: "IOITEM" });
                oDDTextParam.push({ CODE: "SALDOCNO" });
                oDDTextParam.push({ CODE: "SALDOCITEM" });
                oDDTextParam.push({ CODE: "CUSTCOLOR" });
                oDDTextParam.push({ CODE: "UNITPRICE1" });
                oDDTextParam.push({ CODE: "UNITPRICE2" });
                oDDTextParam.push({ CODE: "UNITPRICE3" });
                oDDTextParam.push({ CODE: "REVUPRICE1" });
                oDDTextParam.push({ CODE: "REVUPRICE2" });
                oDDTextParam.push({ CODE: "REVUPRICE3" });
                oDDTextParam.push({ CODE: "CUSTSIZE" });
                oDDTextParam.push({ CODE: "REVORDERQTY" });
                oDDTextParam.push({ CODE: "ORDERQTY" });
                oDDTextParam.push({ CODE: "ACTUALQTY" });
                oDDTextParam.push({ CODE: "PLANSHPQTY" });
                oDDTextParam.push({ CODE: "SHIPQTY" });
                oDDTextParam.push({ CODE: "MATNO" });
                oDDTextParam.push({ CODE: "BATCH" });
                oDDTextParam.push({ CODE: "REVDLVDT" });
                oDDTextParam.push({ CODE: "CUSTDEST" });
                oDDTextParam.push({ CODE: "DLVSEQ" });
                oDDTextParam.push({ CODE: "REVDLVDT" });

                setTimeout(() => {
                    oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam }, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            oData.CaptionMsgItems.results.forEach(item => {
                                oDDTextResult[item.CODE] = item.TEXT;
                            })

                            oJSONModelDDText.setData(oDDTextResult);
                            me.getView().setModel(oJSONModelDDText, "ddtext");
                            me.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").setData({ oDDTextResult })

                            // console.log("oJSONModelDDText");
                            // console.log(oJSONModelDDText);
                        },
                        error: function (err) {
                            // sap.m.MessageBox.error(err);
                        }
                    });
                }, 100);
            },

            getStyleHeaderData() {
                var me = this;
                var aStyleHdr = [];
                var oJSONModel = new JSONModel();
                var vStyle = this._styleNo; //"1000000272";

                setTimeout(() => {
                    this._oModelStyle.read('/HeaderSet', {
                        urlParameters: {
                            "$filter": "STYLENO eq '" + vStyle + "'"
                        },
                        success: function (oData, response) {
                            // me._styleVer = oData.results[0].VERNO;

                            me.getStyleDetailedBOM();
                            me.getStyleMaterialList();
                            me.getStyleColors();

                            var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                            var vSBU = me._sbu; //"VER"; 
                            // console.log(oData)
                            oModel.setHeaders({
                                sbu: vSBU,
                                type: "IOSTYLHDR",
                                tabname: "ZERP_STYLHDR"
                            });

                            oModel.read("/ColumnsSet", {
                                success: function (oDataCols, oResponse) {
                                    if (oDataCols.results.length > 0) {
                                        me._aColumns["header"] = oData.results;

                                        oDataCols.results.forEach(item => {
                                            aStyleHdr.push({
                                                KEY: item.ColumnName,
                                                LABEL: item.ColumnLabel,
                                                VALUE: oData.results[0][item.ColumnName],
                                                VISIBLE: item.Visible
                                            });
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
                }, 100);
            },

            getStyleColumnProp: async function () {
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getStyleDynamicColumns("IOCOLOR", "ZERP_IOATTRIB", "colorTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOPROCESS", "ZERP_IOPROC", "processTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSIZE", "ZERP_IOATTRIB", "sizeTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSTYLMATLIST", "ZERP_S_STYLMATLST", "styleMatListTab", oColumns);
                }, 100);

                // setTimeout(() => {
                //     this.getStyleDynamicColumns("IOSTYLDTLDBOM", "ZERP_S_STYLBOM", "styleDetldBOMTab", oColumns);
                // }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSTYLDTLDBOM", "ZERP_S_STYLBOM", "styleFabBOMTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSTYLDTLDBOM", "ZERP_S_STYLBOM", "styleAccBOMTab", oColumns);
                }, 100);
            },

            getStyleDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = this._sbu; //"VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(sTabId, oData)
                        if (oData.results.length > 0) {

                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setStyleTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            setStyleTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = me.getStyleColumnDesc(sTabId, context.getObject()); //context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel }),
                        template: new sap.m.Text({
                            text: sTabId === "styleFabBOMTab" || sTabId === "styleAccBOMTab" ? "{DataModel>" + sColumnId + "}" : "{" + sColumnId + "}",
                            wrapping: false,
                            tooltip: sTabId === "styleFabBOMTab" || sTabId === "styleAccBOMTab" ? "{DataModel>" + sColumnId + "}" : "{" + sColumnId + "}"
                        }),
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });
            },

            getStyleDetailedBOM: function () {
                //get detailed bom data
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var oJSONModelFAB = new JSONModel();
                var oJSONModelACC = new JSONModel();
                var oTableFAB = this.getView().byId("styleFabBOMTab");
                var oTableACC = this.getView().byId("styleAccBOMTab");
                var rowDataFAB = { items: [] };
                var rowDataACC = { items: [] };
                var dataFAB = { results: rowDataFAB };
                var dataACC = { results: rowDataACC };
                var entitySet = "/StyleDetailedBOMSet"
                // console.log(this._styleVer)
                oModel.setHeaders({
                    styleno: this._styleNo, //"1000000272",
                    verno: this._styleVer //"1"
                });
                // console.log(this._styleNo, this._styleVer);
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        me._oModelStyle.read('/MatTypeSet', {
                            success: function (oDataMT, response) {
                                var aFAB = oDataMT.results.filter(fItem => fItem.Mattypgrp === "FAB");
                                var aACC = oDataMT.results.filter(fItem => fItem.Mattypgrp === "ACC");

                                var aFABBOM = [];
                                var aACCBOM = [];

                                aFAB.forEach(item => {
                                    oData.results.filter(fItem => fItem.Mattyp === item.Mattyp).forEach(e => aFABBOM.push(e))
                                });

                                aACC.forEach(item => {
                                    oData.results.filter(fItem => fItem.Mattyp === item.Mattyp).forEach(e => aACCBOM.push(e))
                                });

                                var aDataFAB = [];

                                aFABBOM.forEach((item, index) => {
                                    var oTmpData = {};

                                    Object.keys(oData.results[0]).forEach(key => {
                                        oTmpData[key.toUpperCase()] = item[key];
                                    })

                                    oTmpData["ACTIVE"] = index === 0 ? "X" : "";
                                    aDataFAB.push(oTmpData);
                                })

                                //build the tree table based on selected data
                                var style, gmc, partcd;
                                var item = {};
                                var item2 = {};
                                var items = [];
                                var items2 = [];

                                for (var i = 0; i < aDataFAB.length; i++) {
                                    if (aDataFAB[i].BOMITMTYP === Constants.STY) { //highest level is STY

                                        item = aDataFAB[i];
                                        items = [];
                                        style = aDataFAB[i].BOMSTYLE;

                                        //add GMC items under the Style, add as child
                                        for (var j = 0; j < aDataFAB.length; j++) {
                                            if (aDataFAB[j].BOMITMTYP === Constants.GMC && aDataFAB[j].BOMSTYLE === style) {

                                                items2 = [];
                                                item2 = aDataFAB[j];
                                                gmc = aDataFAB[j].GMC;
                                                partcd = aDataFAB[j].PARTCD;

                                                //add MAT items under the GMC, add as child
                                                for (var k = 0; k < aDataFAB.length; k++) {
                                                    if (aDataFAB[k].BOMITMTYP === Constants.MAT && aDataFAB[k].GMC === gmc && aDataFAB[k].PARTCD === partcd) {
                                                        items2.push(aDataFAB[k]);
                                                    }
                                                }

                                                item2.items = items2;
                                                items.push(item2);
                                            }
                                        }

                                        item.items = items;
                                        rowDataFAB.items.push(item);

                                    } else if (aDataFAB[i].BOMITMTYP === Constants.GMC && aDataFAB[i].BOMSTYLE === '') {
                                        //for GMC type, immediately add item
                                        items = [];
                                        item = aDataFAB[i];
                                        gmc = aDataFAB[i].GMC;
                                        partcd = aDataFAB[i].PARTCD;

                                        //add MAT items under the GMC, add as child
                                        for (var k = 0; k < aDataFAB.length; k++) {
                                            if (aDataFAB[k].BOMITMTYP === Constants.MAT && aDataFAB[k].GMC === gmc && aDataFAB[k].PARTCD === partcd) {
                                                items.push(aDataFAB[k]);
                                            }
                                        }

                                        item.items = items;
                                        rowDataFAB.items.push(item);
                                    }
                                }

                                oJSONModelFAB.setData(dataFAB);
                                oTableFAB.setModel(oJSONModelFAB, "DataModel");

                                var aDataACC = [];

                                aACCBOM.forEach((item, index) => {
                                    var oTmpData = {};

                                    Object.keys(oData.results[0]).forEach(key => {
                                        oTmpData[key.toUpperCase()] = item[key];
                                    })

                                    oTmpData["ACTIVE"] = index === 0 ? "X" : "";
                                    aDataACC.push(oTmpData);
                                })

                                //build the tree table based on selected data
                                style = "", gmc = "", partcd = "";
                                item = {};
                                item2 = {};

                                for (var i = 0; i < aDataACC.length; i++) {
                                    if (aDataACC[i].BOMITMTYP === Constants.STY) { //highest level is STY

                                        item = aDataACC[i];
                                        items = [];
                                        style = aDataACC[i].BOMSTYLE;

                                        //add GMC items under the Style, add as child
                                        for (var j = 0; j < aDataACC.length; j++) {
                                            if (aDataACC[j].BOMITMTYP === Constants.GMC && aDataACC[j].BOMSTYLE === style) {

                                                items2 = [];
                                                item2 = aDataACC[j];
                                                gmc = aDataFaDataACCAB[j].GMC;
                                                partcd = aDataACC[j].PARTCD;

                                                //add MAT items under the GMC, add as child
                                                for (var k = 0; k < aDataACC.length; k++) {
                                                    if (aDataACC[k].BOMITMTYP === Constants.MAT && aDataACC[k].GMC === gmc && aDataACC[k].PARTCD === partcd) {
                                                        items2.push(aDataACC[k]);
                                                    }
                                                }

                                                item2.items = items2;
                                                items.push(item2);
                                            }
                                        }

                                        item.items = items;
                                        rowDataACC.items.push(item);

                                    } else if (aDataACC[i].BOMITMTYP === Constants.GMC && aDataACC[i].BOMSTYLE === '') {
                                        //for GMC type, immediately add item
                                        items = [];
                                        item = aDataACC[i];
                                        gmc = aDataACC[i].GMC;
                                        partcd = aDataACC[i].PARTCD;

                                        //add MAT items under the GMC, add as child
                                        for (var k = 0; k < aDataACC.length; k++) {
                                            if (aDataACC[k].BOMITMTYP === Constants.MAT && aDataACC[k].GMC === gmc && aDataACC[k].PARTCD === partcd) {
                                                items.push(aDataACC[k]);
                                            }
                                        }

                                        item.items = items;
                                        rowDataACC.items.push(item);
                                    }
                                }

                                oJSONModelACC.setData(dataACC);
                                oTableACC.setModel(oJSONModelACC, "DataModel");
                            },
                            error: function (err) { }
                        })
                    },
                    error: function () {
                    }
                })
            },

            getStyleMaterialList: function () {
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var me = this;

                oModel.setHeaders({
                    styleno: this._styleNo, //"1000000272",
                    verno: this._styleVer //"1"
                });
                // console.log(this._styleNo, this._styleVer);
                oModel.read('/StyleMaterialListSet', {
                    success: function (oData, response) {
                        // console.log(oData)
                        var aData = [];

                        oData.results.forEach((item, index) => {
                            var oTmpData = {};

                            Object.keys(oData.results[0]).forEach(key => {
                                oTmpData[key.toUpperCase()] = item[key];
                            })

                            oTmpData["ACTIVE"] = index === 0 ? "X" : "";
                            aData.push(oTmpData);
                        })

                        // me.byId("styleMatListTab").setVisibleRowCount(aData.length);
                        me.byId("styleMatListTab").getModel().setProperty("/rows", aData);
                        me.byId("styleMatListTab").bindRows("/rows");
                        me._tableRendered = "styleMatListTab";
                    },
                    error: function (err) { }
                })
            },

            getStyleColors: function () {
                //get color attributes
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");

                oModel.setHeaders({
                    styleno: this._styleNo //"1000000272"
                });

                oModel.read("/StyleAttributesColorSet", {
                    success: function (oData, oResponse) {
                        me._colors = oData.results;
                        me.getStyleSizes();
                    },
                    error: function (err) { }
                });
            },

            getStyleSizes: function () {
                //get sizes attributes
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");

                oModel.setHeaders({
                    styleno: this._styleNo //"1000000272"
                });

                oModel.read("/StyleAttributesSizeSet", {
                    success: function (oData, oResponse) {
                        me._sizes = oData.results;
                        me.getStyleBOMUV();
                    },
                    error: function (err) { }
                });
            },

            getStyleBOMUV: function () {
                //get BOM by UV 
                var me = this;
                var columnData = [];
                var oModelUV = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var usageClass = this.getView().byId("UsageClassCB").getSelectedKey();
                // console.log(usageClass)
                oModelUV.setHeaders({
                    sbu: this._sbu, //"VER",
                    type: "IOSTYLBOMUV",
                    usgcls: usageClass
                });

                var pivotArray;
                if (usageClass === Constants.AUV) { //for AUV, pivot will be colors
                    pivotArray = me._colors;
                } else {
                    pivotArray = me._sizes;
                }

                //get dynamic columns of BOM by UV
                oModelUV.read("/DynamicColumnsSet", {
                    success: function (oData, oResponse) {
                        var columns = oData.results;
                        var pivotRow;
                        //find the column to pivot
                        for (var i = 0; i < columns.length; i++) {
                            if (columns[i].Pivot !== '') {
                                pivotRow = columns[i].Pivot;
                            }
                        }
                        //build the table dyanmic columns
                        for (var i = 0; i < columns.length; i++) {
                            if (columns[i].Pivot === pivotRow) {
                                //pivot the columns
                                for (var j = 0; j < pivotArray.length; j++) {
                                    columnData.push({
                                        "ColumnName": pivotArray[j].Attribcd,
                                        "ColumnDesc": pivotArray[j].Desc1,
                                        "ColumnWidth": 125,
                                        "ColumnType": pivotRow,
                                        "Editable": false,
                                        "Mandatory": false,
                                        "Visible": true,
                                        "Sorted": false,
                                        "SortOrder": "ASC"
                                    })
                                }
                            } else {
                                if (columns[i].ColumnName !== pivotRow) {
                                    if (columns[i].Visible === true) {
                                        columnData.push({
                                            "ColumnName": columns[i].ColumnName,
                                            "ColumnDesc": columns[i].ColumnName,
                                            "ColumnWidth": columns[i].ColumnWidth,
                                            "ColumnType": columns[i].ColumnType,
                                            "Editable": columns[i].Editable,
                                            "Mandatory": columns[i].Mandatory,
                                            "Sorted": columns[i].Sorted,
                                            "SortOrder": columns[i].SortOrder
                                        })
                                    }
                                }
                            }
                        }

                        me.getBOMUVTableData(columnData, pivotArray);
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(that);
                    }
                });
            },

            getBOMUVTableData: function (columnData, pivot) {
                //Get BOM by UV actual data
                var me = this;
                var oTable = this.getView().byId("styleBOMUVTab");
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var usageClass = this.getView().byId("UsageClassCB").getSelectedKey();

                oModel.setHeaders({
                    styleno: this._styleNo, //"1000000272",
                    verno: this._styleVer, //"1",
                    usgcls: usageClass
                });
                // console.log(this._styleNo, this._styleVer, usageClass);
                oModel.read("/StyleBOMUVSet", {
                    success: function (oData, oResponse) {
                        var rowData = oData.results;
                        // console.log(rowData)
                        //Get unique items of BOM by UV
                        var unique = rowData.filter((rowData, index, self) =>
                            index === self.findIndex((t) => (t.GMC === rowData.GMC && t.PARTCD === rowData.PARTCD && t.MATTYPCLS === rowData.MATTYPCLS)));

                        //For every unique item
                        for (var i = 0; i < unique.length; i++) {

                            //Set the pivot column for each unique item
                            for (var j = 0; j < rowData.length; j++) {
                                if (rowData[j].DESC1 !== "") {
                                    if (unique[i].GMC === rowData[j].GMC && unique[i].PARTCD === rowData[j].PARTCD && unique[i].MATTYPCLS === rowData[j].MATTYPCLS) {
                                        for (var k = 0; k < pivot.length; k++) {
                                            var colname = pivot[k].Attribcd;
                                            if (rowData[j].COLOR === colname) {
                                                unique[i][colname] = rowData[j].DESC1;
                                            } else if (rowData[j].SZE === colname) {
                                                unique[i][colname] = rowData[j].DESC1;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        //set the table columns/rows
                        rowData = oData.results;
                        unique.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData({
                            results: unique,
                            columns: columnData
                        });
                        oTable.setModel(oJSONModel, "DataModel");
                        // oTable.setVisibleRowCount(unique.length);
                        oTable.attachPaste();
                        oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                            var column = oContext.getObject();
                            var sColumnWidth = column.ColumnWidth;

                            if (sColumnWidth === 0) sColumnWidth = 100;

                            return new sap.ui.table.Column({
                                id: "styleBOMUVCol" + column.ColumnName,
                                label: new sap.m.Text({ text: me.getStyleColumnDesc("styleBOMUVTab", column) }),
                                template: me.styleColumnTemplate('UV', column),
                                sortProperty: column.ColumnName,
                                filterProperty: column.ColumnName,
                                width: sColumnWidth + "px",
                                autoResizable: true,
                                visible: column.Visible,
                                sorted: column.Sorted,
                                hAlign: column.ColumnName === "SEQNO" || column.ColumnName === "CONSUMP" || column.ColumnName === "WASTAGE" ? "End" : "Begin",
                                sortOrder: ((column.Sorted === true) ? column.SortOrder : "Ascending")
                            });
                        });
                        oTable.bindRows("DataModel>/results");

                        Common.closeLoadingDialog(me);
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(me);
                    }
                });
            },

            getStyleColumnDesc: function (arg1, arg2) {
                var desc;
                var sTabId = arg1;
                var oColumn = arg2;

                // console.log(this.getView().getModel("ddtext").getData())
                if (sTabId === "styleBOMUVTab") {
                    if (oColumn.ColumnType === Constants.COLOR || oColumn.ColumnType === Constants.SIZE) desc = oColumn.ColumnDesc;
                    else desc = this.getView().getModel("ddtext").getData()[oColumn.ColumnName];
                }
                else if (sTabId === "colorTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["COLORCD"];
                    else if (oColumn.ColumnName === "DESC1") desc = this.getView().getModel("ddtext").getData()["DESC"];
                    else if (oColumn.ColumnName === "CPOATRIB") desc = this.getView().getModel("ddtext").getData()["POCOLOR"];
                    else desc = oColumn.ColumnLabel;
                }
                else if (sTabId === "sizeTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["SIZECD"];
                    else if (oColumn.ColumnName === "DESC1") desc = this.getView().getModel("ddtext").getData()["DESC"];
                    else if (oColumn.ColumnName === "ATTRIBGRP") desc = this.getView().getModel("ddtext").getData()["SIZEGRP"];
                    else desc = oColumn.ColumnLabel;
                }
                else if (sTabId === "processTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["ATTRIBUTE"];
                    else desc = oColumn.ColumnLabel;
                } else if (sTabId === "IODETTab") {
                    // if (oColumn.ColumnName === "SALDOCNO") {
                    //     console.log("SALDOCNO");
                    //     console.log(this.getView().getModel("ddtext").getData()["SALDOCNO"]);
                    //     desc = this.getView().getModel("ddtext").getData()["SALDOCNO"]; }

                    if (oColumn.ColumnName === "IOITEM") desc = this.getView().getModel("ddtext").getData()["IOITEM"];
                    else if (oColumn.ColumnName === "SALDOCNO") desc = this.getView().getModel("ddtext").getData()["SALDOCNO"];
                    // else if (oColumn.ColumnName === "SALDOCITEM") desc = this.getView().getModel("ddtext").getData()["SALDOCITEM"];
                    else if (oColumn.ColumnName === "CUSTCOLOR") desc = this.getView().getModel("ddtext").getData()["CUSTCOLOR"];
                    // else if (oColumn.ColumnName === "UNITPRICE1") desc = this.getView().getModel("ddtext").getData()["UNITPRICE1"];
                    // else if (oColumn.ColumnName === "UNITPRICE2") desc = this.getView().getModel("ddtext").getData()["UNITPRICE2"];
                    // else if (oColumn.ColumnName === "UNITPRICE3") desc = this.getView().getModel("ddtext").getData()["UNITPRICE3"];
                    // else if (oColumn.ColumnName === "REVUNITPRICE1") desc = this.getView().getModel("ddtext").getData()["REVUNITPRICE1"];
                    // else if (oColumn.ColumnName === "REVUNITPRICE2") desc = this.getView().getModel("ddtext").getData()["REVUNITPRICE2"];
                    // else if (oColumn.ColumnName === "REVUNITPRICE3") desc = this.getView().getModel("ddtext").getData()["REVUNITPRICE3"];
                    // else if (oColumn.ColumnName === "CUSTSIZE") desc = this.getView().getModel("ddtext").getData()["CUSTSIZE"];
                    // else if (oColumn.ColumnName === "REVORDERQTY") desc = this.getView().getModel("ddtext").getData()["REVORDERQTY"];
                    // else if (oColumn.ColumnName === "ORDERQTY") desc = this.getView().getModel("ddtext").getData()["ORDERQTY"];
                    // else if (oColumn.ColumnName === "ACTUALQTY") desc = this.getView().getModel("ddtext").getData()["ACTUALQTY"];
                    // else if (oColumn.ColumnName === "PLANSHPQTY") desc = this.getView().getModel("ddtext").getData()["PLANSHPQTY"];
                    // else if (oColumn.ColumnName === "SHIPQTY") desc = this.getView().getModel("ddtext").getData()["SHIPQTY"];
                    // else if (oColumn.ColumnName === "MATNO") desc = this.getView().getModel("ddtext").getData()["MATNO"];
                    // else if (oColumn.ColumnName === "BATCH") desc = this.getView().getModel("ddtext").getData()["BATCH"];
                    // else if (oColumn.ColumnName === "REVDLVDT") desc = this.getView().getModel("ddtext").getData()["REVDLVDT"];
                    // else if (oColumn.ColumnName === "CUSTDEST") desc = this.getView().getModel("ddtext").getData()["CUSTDEST"];
                    // else if (oColumn.ColumnName === "DLVSEQ") desc = this.getView().getModel("ddtext").getData()["DLVSEQ"];
                    // else if (oColumn.ColumnName === "DELETED") desc = this.getView().getModel("ddtext").getData()["DELETED"];
                    // else if (oColumn.ColumnName === "REMARKS") desc = this.getView().getModel("ddtext").getData()["REMARKS"];
                    // else if (oColumn.ColumnName === "CREATEDBY") desc = this.getView().getModel("ddtext").getData()["CREATEDBY"];
                    // else if (oColumn.ColumnName === "CREATEDDT") desc = this.getView().getModel("ddtext").getData()["CREATEDDT"];
                    // else if (oColumn.ColumnName === "CREATEDTM") desc = this.getView().getModel("ddtext").getData()["CREATEDTM"];
                    // else if (oColumn.ColumnName === "UPDATEDBY") desc = this.getView().getModel("ddtext").getData()["UPDATEDBY"];
                    // else if (oColumn.ColumnName === "UPDATEDDT") desc = this.getView().getModel("ddtext").getData()["UPDATEDDT"];
                    // else if (oColumn.ColumnName === "UPDATEDTM") desc = this.getView().getModel("ddtext").getData()["UPDATEDTM"];
                    desc = oColumn.ColumnLabel;
                    // console.log("IODETTab Column Desc");
                    // console.log(oColumn);
                    // if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["ATTRIBUTE"];
                    // else desc = oColumn.ColumnLabel;
                }
                else desc = oColumn.ColumnLabel;

                return desc;
            },

            styleColumnTemplate: function (type, column) {
                //set the column template based on gynamic fields
                var columnName = column.ColumnName;
                var oColumnTemplate;

                oColumnTemplate = new sap.m.Text({ text: "{DataModel>" + columnName + "}", wrapping: false, tooltip: "{DataModel>" + columnName + "}" });
                return oColumnTemplate;
            },

            onEdit(arg) {
                // alert(arg);
                if (arg === "color") this._bColorChanged = false;
                else if (arg === "process") this._bProcessChanged = false;
                else if (arg === "ioMatList") this._bIOMatListChanged = false;
                else if (arg === "IODLV") this._bIODLVChanged = false;
                else if (arg === "IODET") this._bIODETChanged = false;
                else if (arg === "IOATTRIB") this._bIOATTRIBChanged = false;

                // console.log("on Edit Check if has Entries");
                // console.log(this.byId(arg + "Tab").getModel());
                // return;

                // console.log("on Edit");
                // console.log(this.byId(arg + "Tab").getModel().getData());
                if (this.byId(arg + "Tab").getModel().getData().rows.length === 0) {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"]);
                }
                else {
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
                    else if (arg === "ioMatList") {
                        this.byId("btnSubmitMRP").setVisible(false);
                        this.byId("btnAssignMatNo").setVisible(false);
                        this.byId("btnEditIOMatList").setVisible(false);
                        this.byId("btnRefreshIOMatList").setVisible(false);
                        this.byId("btnExportIOMatList").setVisible(false);
                        this.byId("btnSaveIOMatList").setVisible(true);
                        this.byId("btnCancelIOMatList").setVisible(true);
                    } else if (arg === "IODLV") {
                        this.byId("btnNewDlvSched").setVisible(false);
                        this.byId("btnImportPODlvSched").setVisible(false);
                        this.byId("btnEditDlvSched").setVisible(false);
                        this.byId("btnDeleteDlvSched").setVisible(false);
                        this.byId("btnCopyDlvSched").setVisible(false);
                        this.byId("btnRefreshDlvSched").setVisible(false);
                        this.byId("btnSaveDlvSched").setVisible(true);
                        this.byId("btnCancelDlvSched").setVisible(true);
                        this.byId("btnFullScreenDlvSched").setVisible(false);

                        this.byId("btnNewIODet").setVisible(false);
                        this.byId("btnEditIODet").setVisible(false);
                        this.byId("btnDeleteIODet").setVisible(false);
                        // this.byId("btnCopyIODet").setVisible(false);
                        this.byId("btnRefreshIODet").setVisible(false);
                        this.byId("btnSaveIODet").setVisible(false);
                        this.byId("btnCancelIODet").setVisible(false);
                        this.byId("btnFullScreenIODet").setVisible(false);
                    } else if (arg === "IODET") {
                        this.byId("btnNewDlvSched").setVisible(false);
                        this.byId("btnImportPODlvSched").setVisible(false);
                        this.byId("btnEditDlvSched").setVisible(false);
                        this.byId("btnDeleteDlvSched").setVisible(false);
                        this.byId("btnCopyDlvSched").setVisible(false);
                        this.byId("btnRefreshDlvSched").setVisible(false);
                        this.byId("btnSaveDlvSched").setVisible(false);
                        this.byId("btnCancelDlvSched").setVisible(false);
                        this.byId("btnFullScreenDlvSched").setVisible(false);

                        this.byId("btnNewIODet").setVisible(false);
                        this.byId("btnEditIODet").setVisible(false);
                        this.byId("btnDeleteIODet").setVisible(false);
                        // this.byId("btnCopyIODet").setVisible(false);
                        this.byId("btnRefreshIODet").setVisible(false);
                        this.byId("btnSaveIODet").setVisible(true);
                        this.byId("btnCancelIODet").setVisible(true);
                        this.byId("btnFullScreenIODet").setVisible(false);
                    } else if (arg === "IOATTRIB") {
                        this.byId("onIOAttribEdit").setVisible(false);
                        this.byId("onIOAttribSave").setVisible(true);
                        this.byId("onIOAttribCancel").setVisible(true);

                        // sap.ui.getCore().byId("onIOEdit").setVisible(false);
                        // sap.ui.getCore().byId("onIORelease").setVisible(false);
                    }

                    this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel().getData().rows);
                    // console.log(this._aDataBeforeChange);
                    this.setRowEditMode(arg);
                    this._validationErrors = [];
                    this._sTableModel = arg;
                    this._dataMode = "EDIT";
                    this.setActiveRowHighlightByTableId(arg + "Tab");

                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                    oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                        .forEach(item => item.setProperty("enabled", false));

                    if (arg === "color" || arg === "process") {
                        var oIconTabBarStyle = this.byId("itbStyleDetail");
                        oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                            .forEach(item => item.setProperty("enabled", false));
                    }

                    if (arg === "IODLV" || arg === "IODET") {
                        var oIconTabBarStyle = this.byId("itfDLVSCHED");
                        oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                            .forEach(item => item.setProperty("enabled", false));
                    }

                    if (arg === "IOATTRIB") {
                        var oIconTabBarStyle = this.byId("itfIOATTRIB");
                        oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                            .forEach(item => item.setProperty("enabled", false));
                    }
                }
            },

            onCancel(arg) {
                var bChanged = false;

                if (arg === "color") bChanged = this._bColorChanged;
                else if (arg === "process") bChanged = this._bProcessChanged;
                else if (arg === "ioMatList") bChanged = this._bIOMatListChanged;
                else if (arg === "IODLV") bChanged = this._bIODVLChanged;
                else if (arg === "IODET") bChanged = this._bIODETChanged;

                if (bChanged) {
                    var oData = {
                        Action: "update-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONFIRM_DISREGARD_CHANGE"]
                    }

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
                    else if (arg === "ioMatList") {
                        this.byId("btnSubmitMRP").setVisible(true);
                        this.byId("btnAssignMatNo").setVisible(true);
                        this.byId("btnEditIOMatList").setVisible(true);
                        this.byId("btnRefreshIOMatList").setVisible(true);
                        this.byId("btnExportIOMatList").setVisible(true);
                        this.byId("btnSaveIOMatList").setVisible(false);
                        this.byId("btnCancelIOMatList").setVisible(false);
                    } else if (arg === "IODLV") {
                        this.byId("btnNewDlvSched").setVisible(true);
                        this.byId("btnImportPODlvSched").setVisible(true);
                        this.byId("btnEditDlvSched").setVisible(true);
                        this.byId("btnDeleteDlvSched").setVisible(true);
                        this.byId("btnCopyDlvSched").setVisible(true);
                        this.byId("btnRefreshDlvSched").setVisible(true);
                        this.byId("btnSaveDlvSched").setVisible(false);
                        this.byId("btnCancelDlvSched").setVisible(false);
                        this.byId("btnFullScreenDlvSched").setVisible(true);

                        this.byId("btnNewIODet").setVisible(true);
                        this.byId("btnEditIODet").setVisible(true);
                        this.byId("btnDeleteIODet").setVisible(true);
                        // this.byId("btnCopyIODet").setVisible(true);
                        this.byId("btnRefreshIODet").setVisible(true);
                        this.byId("btnSaveIODet").setVisible(false);
                        this.byId("btnCancelIODet").setVisible(false);
                        this.byId("btnFullScreenIODet").setVisible(true);
                    } else if (arg === "IODET") {
                        this.byId("btnNewDlvSched").setVisible(true);
                        this.byId("btnImportPODlvSched").setVisible(true);
                        this.byId("btnEditDlvSched").setVisible(true);
                        this.byId("btnDeleteDlvSched").setVisible(true);
                        this.byId("btnCopyDlvSched").setVisible(true);
                        this.byId("btnRefreshDlvSched").setVisible(true);
                        this.byId("btnSaveDlvSched").setVisible(false);
                        this.byId("btnCancelDlvSched").setVisible(false);
                        this.byId("btnFullScreenDlvSched").setVisible(true);

                        this.byId("btnNewIODet").setVisible(true);
                        this.byId("btnEditIODet").setVisible(true);
                        this.byId("btnDeleteIODet").setVisible(true);
                        // this.byId("btnCopyIODet").setVisible(true);
                        this.byId("btnRefreshIODet").setVisible(true);
                        this.byId("btnSaveIODet").setVisible(false);
                        this.byId("btnCancelIODet").setVisible(false);
                        this.byId("btnFullScreenIODet").setVisible(true);
                    } else if (arg === "IOATTRIB") {
                        this.byId("onIOAttribEdit").setVisible(true);
                        this.byId("onIOAttribSave").setVisible(false);
                        this.byId("onIOAttribCancel").setVisible(false);

                        // sap.ui.getCore().byId("onIOEdit").setVisible(true);
                        // sap.ui.getCore().byId("onIORelease").setVisible(true);
                    }

                    this.setRowReadMode(arg);
                    this.byId(arg + "Tab").getModel().setProperty("/rows", this._aDataBeforeChange);
                    this.byId(arg + "Tab").bindRows("/rows");
                    this._dataMode = "READ";
                    this.setActiveRowHighlightByTableId(arg + "Tab");

                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                    if (arg === "color" || arg === "process") {
                        var oIconTabBarStyle = this.byId("itbStyleDetail");
                        oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                    }

                    if (arg === "IODVL" || arg === "IODET") {
                        var oIconTabBarStyle = this.byId("itfDLVSCHED");
                        oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));

                        setTimeout(() => {
                            this.reloadIOData("IODETTab", "/IODETSet");
                        }, 100);
                    }

                    if (arg === "IOATTRIB") {
                        var oIconTabBarStyle = this.byId("itfIOATTRIB");
                        oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                            .forEach(item => item.setProperty("enabled", true));
                    }
                }
            },

            async onSave(arg) {
                var me = this;
                var aNewRows = this.byId(arg + "Tab").getModel().getData().rows.filter(item => item.New === true);
                var iNew = 0;
                var aEditedRows = this.byId(arg + "Tab").getModel().getData().rows.filter(item => item.EDITED === true && item.New !== true);
                var iEdited = 0;

                // console.log(aNewRows);
                // console.log(aEditedRows);
                // return;

                if (aNewRows.length > 0) {
                    if (this._validationErrors.length === 0) {
                        var entitySet = "/";
                        var oModel;

                        switch (arg) {
                            case "IODLV":
                                entitySet = entitySet + "IODLVSet"
                                oModel = me.getOwnerComponent().getModel();
                                break;
                            case "IODET":
                                entitySet = entitySet + "IODETSet"
                                oModel = me.getOwnerComponent().getModel();
                                break;
                            default: break;
                        }

                        aNewRows.forEach(item => {
                            var param = {};
                            param["IONO"] = me._ioNo;

                            this._aColumns[arg].forEach(col => {
                                if (col.Key !== "X" && item[col.ColumnName] !== undefined) {
                                    if (col.DataType === "DATETIME") {
                                        param[col.ColumnName] = sapDateFormat.format(new Date(item[col.ColumnName])) //+ "T00:00:00" //DlvDt
                                    } else {
                                        param[col.ColumnName] = item[col.ColumnName] === "" ? "" : item[col.ColumnName]
                                    }
                                }
                            })

                            // console.log(entitySet);
                            // console.log(param);
                            // console.log(arg);

                            // return;

                            Common.openProcessingDialog(me, "Processing...");

                            setTimeout(() => {
                                oModel.create(entitySet, param, {
                                    method: "POST",
                                    success: function (data, oResponse) {
                                        iNew++;

                                        if (iNew === aNewRows.length) {
                                            Common.closeProcessingDialog(me);
                                            Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                            if (arg === "IODLV") {
                                                me.byId("btnNewDlvSched").setVisible(true);
                                                me.byId("btnImportPODlvSched").setVisible(true);
                                                me.byId("btnEditDlvSched").setVisible(true);
                                                me.byId("btnDeleteDlvSched").setVisible(true);
                                                me.byId("btnCopyDlvSched").setVisible(true);
                                                me.byId("btnRefreshDlvSched").setVisible(true);
                                                me.byId("btnSaveDlvSched").setVisible(false);
                                                me.byId("btnCancelDlvSched").setVisible(false);
                                                me.byId("btnFullScreenDlvSched").setVisible(true);

                                                me.byId("btnNewIODet").setVisible(true);
                                                me.byId("btnEditIODet").setVisible(true);
                                                me.byId("btnDeleteIODet").setVisible(true);
                                                // me.byId("btnCopyIODet").setVisible(true);
                                                me.byId("btnRefreshIODet").setVisible(true);
                                                me.byId("btnSaveIODet").setVisible(false);
                                                me.byId("btnCancelIODet").setVisible(false);
                                                me.byId("btnFullScreenIODet").setVisible(true);
                                            }
                                            else if (arg === "IODET") {
                                                me.byId("btnNewDlvSched").setVisible(true);
                                                me.byId("btnImportPODlvSched").setVisible(true);
                                                me.byId("btnEditDlvSched").setVisible(true);
                                                me.byId("btnDeleteDlvSched").setVisible(true);
                                                me.byId("btnCopyDlvSched").setVisible(true);
                                                me.byId("btnRefreshDlvSched").setVisible(true);
                                                me.byId("btnSaveDlvSched").setVisible(false);
                                                me.byId("btnCancelDlvSched").setVisible(false);
                                                me.byId("btnFullScreenDlvSched").setVisible(true);

                                                me.byId("btnNewIODet").setVisible(true);
                                                me.byId("btnEditIODet").setVisible(true);
                                                me.byId("btnDeleteIODet").setVisible(true);
                                                // me.byId("btnCopyIODet").setVisible(true);
                                                me.byId("btnRefreshIODet").setVisible(true);
                                                me.byId("btnSaveIODet").setVisible(false);
                                                me.byId("btnCancelIODet").setVisible(false);
                                                me.byId("btnFullScreenIODet").setVisible(true);
                                            }

                                            me.setActiveRowHighlightByTableId(arg + "Tab");

                                            var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                            oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                            if (arg === "IODLV" || arg === "IODET") {
                                                var oIconTabBarStyle = me.byId("itfDLVSCHED");
                                                oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                                            }

                                            me.byId(arg + "Tab").getModel().getData().rows.forEach((row, index) => {
                                                me.byId(arg + "Tab").getModel().setProperty('/rows/' + index + '/EDITED', false);
                                            })

                                            me._dataMode = "READ";
                                        }
                                    },
                                    error: function () {
                                        iNew++;
                                        // alert("Error");
                                        if (iNew === aNewRows.length) Common.closeProcessingDialog(me);
                                    }
                                });
                            }, 100)
                        })

                        this.setRowReadMode(arg);
                    }

                    else {
                        Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                    }
                }

                if (aEditedRows.length > 0) {
                    if (this._validationErrors.length === 0) {
                        var entitySet = "/";
                        var oModel;

                        switch (arg) {
                            case "color":
                                entitySet = entitySet + "AttribSet";
                                oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                                break;
                            case "process":
                                entitySet = entitySet + "ProcessSet";
                                oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                                break;
                            case "ioMatList":
                                entitySet = entitySet + "MainSet";
                                oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                                oModel.setHeaders({ UPDTYP: "MAIN" });
                                break;
                            case "IODLV":
                                entitySet = entitySet + "IODLVSet"
                                oModel = me.getOwnerComponent().getModel();
                                break;
                            case "IODET":
                                entitySet = entitySet + "IODETSet"
                                oModel = me.getOwnerComponent().getModel();
                                break;
                            default:
                                break;
                        }

                        var centitySet = entitySet;

                        Common.openProcessingDialog(me, "Processing...");

                        // console.log("Edited Rows");
                        // console.log(aEditedRows);
                        aEditedRows.forEach(async item => {

                            // console.log(item);
                            // var entitySet = "/" + (arg === "color" ? "AttribSet" : "ProcessSet") + "(";
                            entitySet = centitySet + "(";
                            var param = {};
                            var iKeyCount = this._aColumns[arg].filter(col => col.Key === "X").length;

                            this._aColumns[arg].forEach(col => {
                                if (arg === "IODLV" || arg === "IODET") {
                                    param[col.ColumnName] = item[col.ColumnName]
                                } else {
                                    if (col.Editable) param[col.ColumnName] = item[col.ColumnName]
                                }

                                if (iKeyCount === 1) {
                                    if (col.Key === "X")
                                        entitySet += "'" + item[col.ColumnName] + "'"
                                }
                                else if (iKeyCount > 1) {
                                    if (col.Key === "X") {
                                        entitySet += col.ColumnName + "='" + item[col.ColumnName] + "',"
                                    }
                                }
                            })

                            if (iKeyCount > 1) entitySet = entitySet.substr(0, entitySet.length - 1);
                            entitySet += ")";

                            // console.log(entitySet);
                            // console.log(param);
                            // console.log(arg);

                            // Common.closeProcessingDialog(me);

                            setTimeout(() => {
                                _promiseResult = new Promise((resolve, reject) => {
                                    // console.log(entitySet);
                                    oModel.update(entitySet, param, {
                                        method: "PUT",
                                        success: function (data, oResponse) {
                                            iEdited++;
                                            resolve();

                                            if (iEdited === aEditedRows.length) {
                                                Common.closeProcessingDialog(me);
                                                Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                                if (arg === "color") {
                                                    me.byId("btnEditColor").setVisible(true);
                                                    me.byId("btnSaveColor").setVisible(false);
                                                    me.byId("btnCancelColor").setVisible(false);
                                                }
                                                else if (arg === "process") {
                                                    me.byId("btnEditProcess").setVisible(true);
                                                    me.byId("btnSaveProcess").setVisible(false);
                                                    me.byId("btnCancelProcess").setVisible(false);
                                                }
                                                else if (arg === "ioMatList") {
                                                    me.byId("btnSubmitMRP").setVisible(true);
                                                    me.byId("btnAssignMatNo").setVisible(true);
                                                    me.byId("btnEditIOMatList").setVisible(true);
                                                    me.byId("btnRefreshIOMatList").setVisible(true);
                                                    me.byId("btnExportIOMatList").setVisible(true);
                                                    me.byId("btnSaveIOMatList").setVisible(false);
                                                    me.byId("btnCancelIOMatList").setVisible(false);
                                                }
                                                else if (arg === "IODLV") {
                                                    me.byId("btnNewDlvSched").setVisible(true);
                                                    me.byId("btnImportPODlvSched").setVisible(true);
                                                    me.byId("btnEditDlvSched").setVisible(true);
                                                    me.byId("btnDeleteDlvSched").setVisible(true);
                                                    me.byId("btnCopyDlvSched").setVisible(true);
                                                    me.byId("btnRefreshDlvSched").setVisible(true);
                                                    me.byId("btnSaveDlvSched").setVisible(false);
                                                    me.byId("btnCancelDlvSched").setVisible(false);
                                                    me.byId("btnFullScreenDlvSched").setVisible(true);

                                                    me.byId("btnNewIODet").setVisible(true);
                                                    me.byId("btnEditIODet").setVisible(true);
                                                    me.byId("btnDeleteIODet").setVisible(true);
                                                    // me.byId("btnCopyIODet").setVisible(true);
                                                    me.byId("btnRefreshIODet").setVisible(true);
                                                    me.byId("btnSaveIODet").setVisible(false);
                                                    me.byId("btnCancelIODet").setVisible(false);
                                                    me.byId("btnFullScreenIODet").setVisible(true);
                                                }
                                                else if (arg === "IODET") {
                                                    me.byId("btnNewDlvSched").setVisible(true);
                                                    me.byId("btnImportPODlvSched").setVisible(true);
                                                    me.byId("btnEditDlvSched").setVisible(true);
                                                    me.byId("btnDeleteDlvSched").setVisible(true);
                                                    me.byId("btnCopyDlvSched").setVisible(true);
                                                    me.byId("btnRefreshDlvSched").setVisible(true);
                                                    me.byId("btnSaveDlvSched").setVisible(false);
                                                    me.byId("btnCancelDlvSched").setVisible(false);
                                                    me.byId("btnFullScreenDlvSched").setVisible(true);

                                                    me.byId("btnNewIODet").setVisible(true);
                                                    me.byId("btnEditIODet").setVisible(true);
                                                    me.byId("btnDeleteIODet").setVisible(true);
                                                    // me.byId("btnCopyIODet").setVisible(true);
                                                    me.byId("btnRefreshIODet").setVisible(true);
                                                    me.byId("btnSaveIODet").setVisible(false);
                                                    me.byId("btnCancelIODet").setVisible(false);
                                                    me.byId("btnFullScreenIODet").setVisible(true);
                                                }

                                                me.setActiveRowHighlightByTableId(arg + "Tab");

                                                if (arg === "color" || arg === "process") {
                                                    var oIconTabBarStyle = me.byId("itbStyleDetail");
                                                    oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                                                }
                                                // else if (arg === "IODLV" || arg === "IODET") {
                                                //     var oIconTabBarStyle = me.byId("idIconTabBarInlineMode");
                                                //     oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                                                // } 
                                                else {
                                                    var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                                }

                                                me.byId(arg + "Tab").getModel().getData().rows.forEach((row, index) => {
                                                    me.byId(arg + "Tab").getModel().setProperty('/rows/' + index + '/EDITED', false);
                                                })

                                                me._dataMode = "READ";
                                            }
                                        },
                                        error: function () {
                                            iEdited++;
                                            resolve();
                                            // alert("Error");
                                            if (iEdited === aEditedRows.length) Common.closeProcessingDialog(me);
                                        }
                                    });
                                }, 100)



                            })
                            await _promiseResult;
                        })

                        this.setRowReadMode(arg);
                    }
                    //this._validationErrors.length
                    else {
                        Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                    }
                }

                if (aNewRows.length < 0 && aEditedRows.length < 0) {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                }

                //reload data based on arguments
                switch (arg) {
                    case "IODLV":
                        _promiseResult = new Promise((resolve, reject) => {
                            setTimeout(() => {
                                resolve(this.reloadIOData("IODLVTab", "/IODLVSet"));
                                // this.reloadIOData("IODLVTab", "/IODLVSet")
                            }, 100);
                        });
                        await _promiseResult;
                        break;

                    case "IODET":
                        _promiseResult = new Promise((resolve, reject) => {
                            setTimeout(() => {
                                resolve(this.reloadIOData("IODETTab", "/IODETSet"));
                            }, 100);
                        });
                        await _promiseResult;
                        break;

                    case "IOATTRIB":
                        _promiseResult = new Promise((resolve, reject) => {
                            setTimeout(() => {
                                rsolve(this.reloadIOData("IOATTRIBTab", "/IOAttribSet"));
                            }, 100);
                        });
                        await _promiseResult;
                        break;

                    default: break;
                }
            },

            setRowEditMode(arg) {
                var oTable = this.byId(arg + "Tab");
                var me = this;

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";
                    var oValueHelp = false;

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    // console.log(sColName + " Column Name " + arg);
                    // console.log(this._aColumns[arg]);

                    this._aColumns[arg].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            // console.log(sColName);
                            // console.log(ci);
                            if (ci.Editable) {
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
                                else if (ci.DataType === "DATETIME") {
                                    col.setTemplate(new sap.m.DatePicker({
                                        // id: "ipt" + ci.name,
                                        value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                        displayFormat: "short",
                                        change: "handleChange",

                                        // liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }
                                else if (ci.DataType === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                        change: this.onNumberChange.bind(this)
                                    }));
                                } else if (arg === "IODET" && ci.DataType === undefined) {
                                    switch (ci.ColumnName) {
                                        case "SALDOCNO" || "CUSTDEST" || "REMARKS" || "CREATEDBY" || "CREATEDTM" || "UPDATEDBY" || "UPDATEDTM":
                                            col.setTemplate(new sap.m.Input({
                                                type: "Text",
                                                value: "{" + sColName + "}",
                                                maxLength: ci.Length === undefined ? 10 : ci.Length,
                                                change: this.onInputLiveChange.bind(this)
                                            }));
                                            break;
                                        case "CUSTCOLOR":
                                            col.setTemplate(new sap.m.Input({
                                                type: "Text",
                                                value: "{" + sColName + "}",
                                                maxLength: ci.Length === undefined ? 10 : ci.Length,
                                                change: this.onInputLiveChange.bind(this)
                                            }));
                                            break;
                                        case "MATNO":
                                            col.setTemplate(new sap.m.Input({
                                                type: "Text",
                                                value: "{" + sColName + "}",
                                                maxLength: ci.Length === undefined ? 10 : ci.Length,
                                                change: this.onInputLiveChange.bind(this)
                                            }));
                                            break;
                                        case "BATCH":
                                            col.setTemplate(new sap.m.Input({
                                                type: "Text",
                                                value: "{" + sColName + "}",
                                                maxLength: ci.Length === undefined ? 10 : ci.Length,
                                                change: this.onInputLiveChange.bind(this)
                                            }));
                                            break;
                                        case "REVDLVDT":
                                            col.setTemplate(new sap.m.DatePicker({
                                                // id: "ipt" + ci.name,
                                                value: "{path: '" + sColName + "', mandatory: '" + ci.Mandatory + "'}",
                                                displayFormat: "short",
                                                change: "handleChange",

                                                // liveChange: this.onInputLiveChange.bind(this)
                                            }));
                                        case "UNITPRICE1" || "UNITPRICE2" || "UNITPRICE3" || "REVUPRICE1" || "REVUPRICE2" || "REVUPRICE3" || "ORDERQTY" || "ACTUALQTY" || "PLANSHPQTY" || "SHIPQTY" || "DLVSEQ" || "IOITEM":
                                            col.setTemplate(new sap.m.Input({
                                                type: sap.m.InputType.Number,
                                                textAlign: sap.ui.core.TextAlign.Right,
                                                value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:3, maxFractionDigits:3 }, constraints:{ precision:10, scale:10 }}",
                                                change: this.onNumberChange.bind(this)
                                            }));
                                            break;

                                        default:
                                            break;
                                    }
                                }
                                else {
                                    if (arg === "ioMatList" && sColName === "MATDESC1") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "MATNO",
                                                formatter: function (MATNO) {
                                                    if (MATNO !== "") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                            }
                        })
                })

                // console.log("setRowEditMode 2");

                var vIONo = this._ioNo; //"1000115";

                // console.log(me._ioNo);
                if (arg === "IODLV") {
                    this._oModel.read('/IODLVSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            // console.log(oData);
                            // console.log("IODLV_MODEL");
                            me.getView().setModel(new JSONModel(oData.results), "IODLV_MODEL");
                        },
                        error: function (err) { }
                    })
                }

                if (arg === "IODET") {
                    var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                    var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");
                    this._oModel.read('/IODETSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + cIONo + "' and DLVSEQ eq '" + cDlvSeq + "'"
                        },
                        success: function (oData, response) {
                            // console.log(oData);
                            // console.log("IODET_MODEL");
                            me.getView().setModel(new JSONModel(oData.results), "IODET_MODEL");
                        },
                        error: function (err) { }
                    })
                }

                if (arg === "color") {
                    this._oModelStyle.read('/CustColorSet', {
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
                    this._oModelStyle.read('/AttribTypeSet', {
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
                        this._oModelStyle.read('/VASTypeSet', {
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

                        this._oModelStyle.read('/AttribCodeSet', {
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

                    if (arg === "IODLV" || arg === "IODET" || arg === "IOATTRIB") {
                        this._aColumns[arg].filter(item => item.ColumnName === sColName)
                            .forEach(ci => {
                                if (ci.DataType === "STRING" || ci.DataType === "DATETIME" || ci.DataType === "NUMBER") {
                                    col.setTemplate(new sap.m.Text({
                                        text: "{" + sColName + "}",
                                        wrapping: false
                                    }));
                                }
                                else if (ci.DataType === "BOOLEAN") {
                                    col.setTemplate(new sap.m.Text({
                                        text: "{" + sColName + "}",
                                        wrapping: false
                                    }));
                                }
                            })
                    } else {
                        this._aColumns[arg].filter(item => item.ColumnName === sColName)
                            .forEach(ci => {
                                if (ci.DataType === "STRING" || ci.DataType === "DATETIME" || ci.DataType === "NUMBER") {
                                    col.setTemplate(new sap.m.Text({
                                        text: "{" + sColName + "}",
                                        wrapping: false,
                                        tooltip: "{" + sColName + "}"
                                    }));
                                }
                                else if (ci.DataType === "BOOLEAN") {
                                    col.setTemplate(new sap.m.Text({
                                        text: "{" + sColName + "}",
                                        wrapping: false,
                                        editable: false,
                                        tooltip: "{" + sColName + "}"
                                    }));
                                }
                            })
                    }
                })
            },

            onNumberChange: function (oEvent) {
                if (this._validationErrors === undefined) this._validationErrors = [];

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (oEvent.getParameters().value.split(".")[1].length > 3) {
                        // console.log("invalid");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum of 3 decimal places.");
                        this._validationErrors.push(oEvent.getSource().getId());
                    }
                    else {
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sTableModel === "color") this._bColorChanged = false;
                else if (this._sTableModel === "process") this._bProcessChanged = false;
                else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = false;
            },

            onInputLiveChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sTableModel === "color") this._bColorChanged = false;
                else if (this._sTableModel === "process") this._bProcessChanged = false;
                else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = false;
                else if (this._sTableModel === "IODLV") this._bIODETChanged = false;
            },

            handleValueHelp: function (oEvent) {
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

                vh.sort((a, b) => (a.VHTitle > b.VHTitle ? 1 : -1));

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

            handleValueHelpClose: function (oEvent) {
                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");

                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());

                        if (this._inputValue !== oSelectedItem.getTitle()) {
                            var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;

                            this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);
                            // this._bColorChanged = true;
                            if (this._sTableModel === "color") this._bColorChanged = true;
                            else if (this._sTableModel === "process") this._bProcessChanged = true;
                            else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = true;
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

                this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sTableModel === "color") this._bColorChanged = true;
                else if (this._sTableModel === "process") this._bProcessChanged = true;
                else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = true;
            },

            handleSuggestion: function (oEvent) {
                var me = this;
                var oInput = oEvent.getSource();
                var sInputField = oInput.getBindingInfo("value").parts[0].path;

                if (sInputField === "CPOATRIB") {
                    // console.log(oInput.getSuggestionItems())
                    if (oInput.getSuggestionItems().length === 0) {
                        var oData = me.getView().getModel("CUSTCOLOR_MODEL").getData();
                        var sKey = "";
                        // console.log(oData);
                        if (sInputField === "CPOATRIB") {
                            sKey = "CUSTCOLOR";
                        }

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

            onCloseConfirmDialog: function (oEvent) {
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
                    else if (this._sTableModel === "ioMatList") {
                        this.byId("btnSubmitMRP").setVisible(true);
                        this.byId("btnAssignMatNo").setVisible(true);
                        this.byId("btnEditIOMatList").setVisible(true);
                        this.byId("btnRefreshIOMatList").setVisible(true);
                        this.byId("btnExportIOMatList").setVisible(true);
                        this.byId("btnSaveIOMatList").setVisible(false);
                        this.byId("btnCancelIOMatList").setVisible(false);
                    }

                    this.setRowReadMode(this._sTableModel);
                    this.byId(this._sTableModel + "Tab").getModel().setProperty("/rows", this._aDataBeforeChange);
                    this.byId(this._sTableModel + "Tab").bindRows("/rows");
                    this._dataMode = "READ";
                    this.setActiveRowHighlightByTableId(this._sTableModel + "Tab");

                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                    if (this._sTableModel === "color" || this._sTableModel === "process") {
                        var oIconTabBarStyle = this.byId("itbStyleDetail");
                        oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                    }
                }

                this._ConfirmDialog.close();
            },

            onCancelConfirmDialog: function (oEvent) {
                this._ConfirmDialog.close();
            },

            onManageStyle: function (oEvent) {
                var vStyle = this._styleNo;
                var me = this;
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                    target: {
                        semanticObject: "ZUI_3DERP",
                        action: "manage&/RouteStyleDetail/" + vStyle + "/" + me._sbu + "/" + me._ioNo
                    }
                    // params: {
                    //     "styleno": vStyle,
                    //     "sbu": "VER"
                    // }
                })) || ""; // generate the Hash to display style

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                }); // navigate to Supplier application

                // sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then( function (oService) {
                //     oService.hrefForExternalAsync({
                //         target : {
                //             semanticObject: "ZUI_3DERP",
                //             action: "manage&/RouteStyleDetail/" + vStyle + "/" + me._sbu
                //         }
                //         // params: {
                //         //     "styleno": vStyle,
                //         //     "sbu": me._sbu
                //         // }
                //     }).then( function(sHref) {
                //         console.log("test");
                //         console.log(sHref);
                //         // Place sHref somewhere in the DOM
                //     });
                //  });

            },

            onNewStyle: function (oEvent) {
                // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                // oRouter.navTo("RouteStyles");
                // console.log()
                var me = this;
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                    target: {
                        semanticObject: "ZUI_3DERP",
                        action: "manage&/RouteStyleDetail/NEW/" + me._sbu + "/" + me._ioNo
                    }
                    // params: {
                    //     "styleno": "NEW",
                    //     "sbu": me._sbu
                    // }
                })) || ""; // generate the Hash to display style

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                }); // navigate to Supplier application
            },

            onSaveTableLayout(arg) {
                if (arg === "style") {
                    //saving of the layout of table
                    var me = this;
                    var aTables = [];

                    aTables.push({
                        TYPE: "IOCOLOR",
                        TABNAME: "ZERP_IOATTRIB",
                        TABID: "colorTab"
                    },
                        {
                            TYPE: "IOPROCESS",
                            TABNAME: "ZERP_IOPROC",
                            TABID: "processTab"
                        },
                        {
                            TYPE: "IOSIZE",
                            TABNAME: "ZERP_IOATTRIB",
                            TABID: "sizeTab"
                        },
                        {
                            TYPE: "IOSTYLDTLDBOM",
                            TABNAME: "ZERP_S_STYLBOM",
                            TABID: "styleDetldBOMTab"
                        },
                        // {
                        //     TYPE: "IOSTYLBOMUV",
                        //     TABNAME: "ZERP_S_STYLBOMUV",
                        //     TABID: "styleBOMUVTab"
                        // },
                        {
                            TYPE: "IOSTYLMATLIST",
                            TABNAME: "ZERP_S_STYLMATLST",
                            TABID: "styleMatListTab"
                        })

                    aTables.forEach(item => {
                        setTimeout(() => {
                            var oTable = this.getView().byId(item.TABID);
                            var oColumns = oTable.getColumns();
                            var ctr = 1;

                            var oParam = {
                                "SBU": this._sbu,
                                "TYPE": item.TYPE,
                                "TABNAME": item.TABNAME,
                                "TableLayoutToItems": []
                            };

                            //get information of columns, add to payload
                            oColumns.forEach((column) => {
                                oParam.TableLayoutToItems.push({
                                    COLUMNNAME: column.mProperties.sortProperty,
                                    ORDER: ctr.toString(),
                                    SORTED: column.mProperties.sorted,
                                    SORTORDER: column.mProperties.sortOrder,
                                    SORTSEQ: "1",
                                    VISIBLE: column.mProperties.visible,
                                    WIDTH: column.mProperties.width
                                });

                                ctr++;
                            });
                            // console.log(oParam)
                            //call the layout save
                            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                            oModel.create("/TableLayoutSet", oParam, {
                                method: "POST",
                                success: function (data, oResponse) {
                                    Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_LAYOUT_SAVE"]);
                                },
                                error: function (err) {
                                    sap.m.MessageBox.error(err);
                                }
                            });
                        }, 100);
                    })
                }
            },

            onGenMatList(arg) {
                var me = this;
                var iRowCount = 0;

                if (arg === "ACC") {
                    // console.log(this.byId("styleAccBOMTab").getModel("DataModel").getData().results.items.length)
                    iRowCount = this.byId("styleAccBOMTab").getModel("DataModel").getData().results.items.length;
                }
                else if (arg === "FAB") {
                    // console.log(this.byId("styleFabBOMTab").getModel("DataModel").getData().results.items.length)
                    iRowCount = this.byId("styleFabBOMTab").getModel("DataModel").getData().results.items.length
                }

                if (iRowCount > 0) {
                    var oParam = {
                        "SBU": this._sbu,
                        "IONO": this._ioNo,
                        "MATTYPGRP": arg
                    };

                    this._oModelStyle.create("/GenIOMatListSet", oParam, {
                        method: "POST",
                        success: function (data, oResponse) {
                            var oMessage = JSON.parse(oResponse.headers["sap-message"]);

                            if (oMessage.message === "0") {
                                Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_NO_IOMATLIST_GENERATED"]);
                            }
                            else if (oMessage.message === "0") {
                                Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_IOMATLIST_GENERATED"]);
                            }
                        },
                        error: function (err) {
                            // sap.m.MessageBox.error(err);
                        }
                    });
                }
                else {
                    Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_NO_DATA_TO_PROC"]);
                }
            },

            //******************************************* */
            // MATERIAL LIST
            //******************************************* */            

            initIOMatList: function (oEvent) {
                this._oModelIOMatList = this.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                // this._aColumns = {};
                // this._aDataBeforeChange = [];
                var me = this;

                this.byId("ioMatListTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                var vIONo = this._ioNo; //"1000115";

                this._oModelIOMatList.setHeaders({
                    SBU: this._sbu,
                    PRODPLANT: this._prodplant
                });

                this._oModelIOMatList.read('/MainSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData, response) {
                        oData.results.forEach((row, index) => {
                            row.ACTIVE = index === 0 ? "X" : "";
                            row.POQTY = row.POQTY + "";
                            row.INDCQTY = row.INDCQTY + "";
                            row.ISSTOPROD = row.ISSTOPROD + "";
                            row.MITQTY = row.MITQTY + "";
                            row.MRPQTY = row.MRPQTY + "";
                            row.MRTRANSFERQTY = row.MRTRANSFERQTY + "";
                            row.PLANTAVAILQTY = row.PLANTAVAILQTY + "";
                            row.PRQTY = row.PRQTY + "";
                            row.VARIANCE = row.VARIANCE + "";
                        });

                        me.byId("ioMatListTab").getModel().setProperty("/rows", oData.results);
                        me.byId("ioMatListTab").bindRows("/rows");
                        me._tableRendered = "ioMatListTab";
                    },
                    error: function (err) { }
                })

                //get column value help prop
                this.getIOMatListColumnProp();
            },

            getIOMatListColumnProp: async function () {
                // var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                // var oModelColumns = new JSONModel();
                // await oModelColumns.loadData(sPath);

                var oColumns = []; //oModelColumns.getData();

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getIOMatListDynamicColumns("IOMATLIST", "ZDV_3DERP_MATLST", "ioMatListTab", oColumns);
                }, 100);
            },

            getIOMatListDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = this._sbu; //"VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(sTabId, oData)
                        if (oData.results.length > 0) {

                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setIOMatListTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            setIOMatListTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                // console.log(oColumns)
                // oColumns.push({
                //     ColumnLabel: "Active",
                //     ColumnName: "ACTIVE",
                //     ColumnType: "STRING",
                //     ColumnWidth: 100,
                //     Creatable: false,
                //     DataType: "STRING",
                //     Decimal: 0,
                //     DictType: "",
                //     Editable: false,
                //     Key: "",
                //     Length: 1,
                //     Mandatory: false,
                //     Order: "000",
                //     Pivot: "",
                //     SortOrder: "",
                //     SortSeq: "",
                //     Sorted: false,
                //     Visible: false
                // })
                var oTable = this.getView().byId(sTabId);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = me.getStyleColumnDesc(sTabId, context.getObject()); //context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel }),
                        template: new sap.m.Text({
                            text: "{" + sColumnId + "}",
                            wrapping: false,
                            tooltip: sColumnDataType === "BOOLEAN" ? "" : "{" + sColumnId + "}"
                        }),
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });
            },

            onAssignMatNo: function (oEvent) {
                var oTable = this.byId("ioMatListTab");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var aParam = [];

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        // console.log(aData.at(item));
                        if (aData.at(item).MATNO === "") {
                            aParam.push(aData.at(item));
                        }
                    })

                    if (aParam.length > 0) {
                        this.getOwnerComponent().getModel("ASSIGNMATNO_MODEL").setData({
                            data: aParam
                        })

                        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        oRouter.navTo("RouteIOAssignMaterial", {
                            iono: this._ioNo,
                            sbu: this._sbu
                        });
                    }
                    else {
                        Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_MATNO_ALREADY_EXIST"]);
                    }
                }
                else {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                }
            },

            onSubmitMRP: function (oEvent) {
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oTable = this.byId("ioMatListTab");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var aParam = [];
                var oParam = {};
                var me = this;

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        // console.log(aData.at(item))
                        aParam.push({
                            Mrptyp: "IOMRP",
                            Plantcd: aData.at(item).PURPLANT,
                            Iono: aData.at(item).IONO,
                            Matno: aData.at(item).MATNO,
                            Baseuom: aData.at(item).UOM,
                            Reqqty: aData.at(item).REQDQTY,
                            Purgrp: aData.at(item).PURGRP,
                            Supplytyp: aData.at(item).SUPPLYTYP,
                            Vendorcd: aData.at(item).VENDORCD,
                            Unitprice: aData.at(item).UNITPRICE,
                            Orderuom: aData.at(item).ORDERUOM,
                            Umrez: aData.at(item).UMREZ,
                            Umren: aData.at(item).UMREN
                        });
                    })

                    if (aParam.length > 0) {
                        Common.openLoadingDialog(this);

                        oParam["SBU"] = this._sbu;
                        oParam["MRPTYP"] = "IOMRP";
                        oParam["N_CreateMRPDataParam"] = aParam;
                        oParam["N_CreateMRPDataReturn"] = [];

                        oModel.create("/CreateMRPDataSet", oParam, {
                            method: "POST",
                            success: function (oDataReturn, oResponse) {
                                //assign the materials based on the return
                                console.log(oDataReturn)

                                Common.closeLoadingDialog(me);

                                if (oDataReturn.N_CreateMRPDataReturn.results.length > 0) {
                                    Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_MRPDATA_CREATED"]);
                                }

                                me.extendMaterial(oDataReturn.N_CreateMRPDataReturn.results);
                            },
                            error: function (err) {
                                Common.closeLoadingDialog(me);
                                // Common.showMessage(me._i18n.getText('t5'));
                            }
                        });
                    }
                    else {
                        Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_RECORD_TO_PROC"]);
                    }
                }
                else {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                }
            },

            extendMaterial(arg) {
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var aData = arg;
                var oParam = {};

                aData.forEach(item => {
                    oParam["IMATNR"] = item.Matno;
                    oParam["IWERKS"] = item.Plantcd;
                    oParam["ERETCODE"] = "";
                    oParam["N_ExtendMaterialReturn"] = [];

                    oModel.create("/ExtendMaterialSet", oParam, {
                        method: "POST",
                        success: function (oDataReturn, oResponse) {
                            //assign the materials based on the return
                            console.log(oDataReturn);
                        },
                        error: function (err) {
                            // Common.closeLoadingDialog(me);
                        }
                    })
                })
            },

            //******************************************* */
            // COSTING
            //******************************************* */            

            initIOCosting: function (oEvent) {
                // this._oModelIOCosting = this.getOwnerComponent().getModel("ZGW_3DERP_IOCOSTING_SRV");
                this._oModelIOCosting = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZGW_3DERP_IOCOSTING_SRV/");
                // this._aColumns = {};
                // this._aDataBeforeChange = [];
                var me = this;

                this.byId("costHdrTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("costDtlsTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                var vIONo = this._ioNo; //"1000115";

                this._oModelIOCosting.read('/VersionsSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData) {
                        oData.results.forEach((row, index) => {
                            row.ACTIVE = index === 0 ? "X" : "";
                        });

                        me.byId("costHdrTab").getModel().setProperty("/rows", oData.results);
                        me.byId("costHdrTab").bindRows("/rows");
                        me._tableRendered = "costHdrTab";
                    },
                    error: function (err) { }
                })

                //get column value help prop
                this.getIOCostingColumnProp();
            },

            getIOCostingColumnProp: async function () {
                // var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                // var oModelColumns = new JSONModel();
                // await oModelColumns.loadData(sPath);

                var oColumns = []; //oModelColumns.getData();

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getIOCostingDynamicColumns("IOCOSTHDR", "ZERP_IOCSHDR", "costHdrTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getIOCostingDynamicColumns("IOCOSTDTL", "ZDV_3DERP_CSDTL", "costDtlsTab", oColumns);
                }, 100);
            },

            getIOCostingDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = this._sbu; //"VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            console.log(oData)
                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setIOCostingTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            setIOCostingTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = me.getStyleColumnDesc(sTabId, context.getObject()); //context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel }),
                        template: new sap.m.Text({
                            text: "{" + sColumnId + "}",
                            wrapping: false,
                            tooltip: sColumnDataType === "BOOLEAN" ? "" : "{" + sColumnId + "}"
                        }),
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });
            },

            onRefresh(arg) {
                var me = this;

                if (arg === "ioMatList") {
                    this._oModelIOMatList.setHeaders({
                        SBU: this._sbu,
                        PRODPLANT: this._prodplant
                    });

                    this._oModelIOMatList.read('/MainSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + this._ioNo + "'"
                        },
                        success: function (oData, response) {
                            oData.results.forEach((row, index) => {
                                row.ACTIVE = index === 0 ? "X" : "";
                                row.POQTY = row.POQTY + "";
                                row.INDCQTY = row.INDCQTY + "";
                                row.ISSTOPROD = row.ISSTOPROD + "";
                                row.MITQTY = row.MITQTY + "";
                                row.MRPQTY = row.MRPQTY + "";
                                row.MRTRANSFERQTY = row.MRTRANSFERQTY + "";
                                row.PLANTAVAILQTY = row.PLANTAVAILQTY + "";
                                row.PRQTY = row.PRQTY + "";
                                row.VARIANCE = row.VARIANCE + "";
                            });

                            me.byId(arg + "Tab").getModel().setProperty("/rows", oData.results);
                            me.byId(arg + "Tab").bindRows("/rows");
                            me._tableRendered = (arg + "Tab");

                            // setTimeout(() => {
                            //     me.byId(arg + "Tab").getRows()[0].addStyleClass("activeRow");
                            // }, 50);
                        },
                        error: function (err) { }
                    })
                }
            },

            onTableResize(arg1, arg2) {
                // console.log(arg1, arg2)
                this._tableRendered = "";

                if (arg1 === "ioMatList") {
                    if (arg2 === "max") {
                        this.byId("objectHeader").setVisible(false);
                        this.byId("btnFullScreenIOMatList").setVisible(false);
                        this.byId("btnExitFullScreenIOMatList").setVisible(true);
                    }
                    else if (arg2 === "min") {
                        this.byId("objectHeader").setVisible(true);
                        this.byId("btnFullScreenIOMatList").setVisible(true);
                        this.byId("btnExitFullScreenIOMatList").setVisible(false);
                    }

                    this._tableRendered = "ioMatListTab";
                }
            },

            onCellClick: function (oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;

                    oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                    oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow")
                    })
                }
            },

            onSort: function (oEvent) {
                var oTable = oEvent.getSource();
                this.setActiveRowHighlightByTable(oTable);
            },

            onFilter: function (oEvent) {
                var oTable = oEvent.getSource();
                this.setActiveRowHighlightByTable(oTable);
            },

            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sTableId = oTable.getId();

                setTimeout(() => {
                    var oData = [];

                    if (sTableId.indexOf("styleBOMUVTab") >= 0) oData = oTable.getModel("DataModel").getData().results;
                    else if (sTableId.indexOf("styleFabBOMTab") >= 0 || sTableId.indexOf("styleAccBOMTab") >= 0) oData = oTable.getModel("DataModel").getData().results.items;
                    else oData = oTable.getModel().getData().rows;

                    var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                    var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                    if (oTable.getBinding("rows").aIndices.length > 0) {
                        for (var i = iStartIndex; i < iLength; i++) {
                            var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);

                            if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                    else {
                        for (var i = iStartIndex; i < iLength; i++) {
                            if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                }, 1);
            },

            onColumnUpdated: function (oEvent) {
                var oTable = oEvent.getSource();
                this.setActiveRowHighlightByTable(oTable);
            },

            onKeyUp(oEvent) {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (this.byId(oEvent.srcControl.sId).getBindingContext()) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext().sPath;

                        oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                        oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                }
            },

            onAfterTableRendering: function (oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlightByTableId(this._tableRendered);
                    this._tableRendered = "";
                }
            },

            setActiveRowHighlightByTable(arg) {
                var oTable = arg;
                setTimeout(() => {
                    if (sTableId.indexOf("styleBOMUVTab") >= 0) {
                        var iActiveRowIndex = oTable.getModel("DataModel").getData().results.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("DataModel") && +row.getBindingContext("DataModel").sPath.replace("/results/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                    else if (sTableId.indexOf("styleFabBOMTab") >= 0 || sTableId.indexOf("styleAccBOMTab") >= 0) {
                        var iActiveRowIndex = oTable.getModel("DataModel").getData().results.items.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("DataModel") && +row.getBindingContext("DataModel").sPath.replace("/results/items/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                    else {
                        var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 1);
            },

            setActiveRowHighlightByTableId(arg) {
                var oTable = this.byId(arg);

                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");
                    console.log(iActiveRowIndex)
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 1);
            },

            onExport: Utils.onExport,

            //******************************************* */
            // FA Summary
            //******************************************* */

            onFADCReceiveDtl: FASummary.onFADCReceiveDtl,
            onFADCSendDtl: FASummary.onFADCSendDtl,
            onExportFASummary: FASummary.onExportFASummary,
            onRefreshFASummary: FASummary.onRefreshFASummary,
            onCellClickFASummary: FASummary.onCellClickFASummary,
            onFirstVisibleRowChangedFASummary: FASummary.onFirstVisibleRowChanged,
            onColumnUpdatedFASummary: FASummary.onColumnUpdated,
            onFADCReceiveDetailClose: FASummary.onFADCReceiveDetailClose,
            onFADCSendDetailClose: FASummary.onFADCSendDetailClose,

            //******************************************* */
            // Attachments
            //******************************************* */

            appendUploadCollection: function () {
                //set properties and adding the attachments component to the screen
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.attachChange(that.onFileSelected);
                oUploadCollection.setMode(sap.m.ListMode.SingleSelectLeft);
                oUploadCollection.attachBeforeUploadStarts(that.onBeforeUploadStarts);
                oUploadCollection.setMultiple(true);
                //set the odata path of the upload collection
                oUploadCollection.setUploadUrl("/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet");
                //attach function when an upload is completed
                oUploadCollection.attachUploadComplete(that.onUploadComplete);
            },

            bindUploadCollection: function () {
                var oUploadCollection = this.getView().byId('UploadCollection');
                //setting the properties of the upload collection and binding
                oUploadCollection.bindItems({
                    path: 'FileModel>/FileIOSet',
                    filters: [
                        new sap.ui.model.Filter("Iono", sap.ui.model.FilterOperator.EQ, that._ioNo)
                    ],
                    template: new sap.m.UploadCollectionItem({
                        documentId: "{FileModel>Iono}",
                        fileName: "{FileModel>Filename}",
                        // url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(guid'{FileModel>Iono}')/$value",
                        // url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(Mandt='888',Sbu='VER',Iono='1000115',Seqno='3')/$value",
                        url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(Mandt='{FileModel>Mandt}',Sbu='{FileModel>Sbu}',Iono='{FileModel>Iono}',Seqno='{FileModel>Seqno}')/$value",
                        mimeType: "{FileModel>MIMEType}",
                        enableEdit: false,
                        enableDelete: false,
                        visibleDelete: false,
                        visibleEdit: false,
                        attributes: [
                            new sap.m.ObjectAttribute({ text: "{path: 'FileModel>Createddt', type: 'sap.ui.model.type.Date', formatOptions: { pattern: 'yyyy/MM/dd' }}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Desc1}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Desc2}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Remarks}" })
                        ]
                    })
                });
            },

            setFilesEditMode: function () {
                //set edit mode to the upload collection
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");

                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.setUploadButtonInvisible(false);
                oUploadCollection.setMode(sap.m.ListMode.SingleSelectLeft);

                this.disableOtherTabs();

            },

            cancelFilesEdit: function () {
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = false;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");
                //make upload button visible
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.setUploadButtonInvisible(true);
                oUploadCollection.setMode(sap.m.ListMode.None);

                this.enableOtherTabs();
            },

            onAddFile: function () {
                //open the file select dialog
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.openFileDialog();
            },

            onFileSelected: function () {
                //triggered when file selected
                that.uploadFile();
            },

            uploadFile: function () {
                //open the new file dialog
                if (!this._UploadFileDialog) {
                    this._UploadFileDialog = sap.ui.xmlfragment("zuiio2.view.fragments.UploadFile", this);
                    this.getView().addDependent(this._UploadFileDialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                this._UploadFileDialog.addStyleClass("sapUiSizeCompact");
                this._UploadFileDialog.open();


            },

            onStartUploadFile: function () {
                //on confirm of upload dialog, start upload of file
                this._UploadFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                var cFiles = oUploadCollection.getItems().length;
                if (cFiles > 0) {
                    oUploadCollection.upload();
                }
                this.enableOtherTabs();
            },

            onBeforeUploadStarts: function (oEvent) {
                //setting the HTTP headers for additional information

                //SBU
                var oStylenoParam = new sap.m.UploadCollectionParameter({
                    name: "sbu",
                    value: that._sbu
                });
                oEvent.getParameters().addHeaderParameter(oStylenoParam);

                //io no
                var oStylenoParam = new sap.m.UploadCollectionParameter({
                    name: "iono",
                    value: that._ioNo
                });
                oEvent.getParameters().addHeaderParameter(oStylenoParam);

                //file description 1
                var fileDesc1 = sap.ui.getCore().byId("FileDesc1");
                var oFileDesc1Param = new sap.m.UploadCollectionParameter({
                    name: "desc1",
                    value: fileDesc1.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileDesc1Param);
                fileDesc1.setValue('');

                //file description 2
                var fileDesc2 = sap.ui.getCore().byId("FileDesc2");
                var oFileDesc2Param = new sap.m.UploadCollectionParameter({
                    name: "desc2",
                    value: fileDesc2.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileDesc2Param);
                fileDesc2.setValue('');

                //remarks
                var fileRemarks = sap.ui.getCore().byId("FileRemarks");
                var oFileRemarksParam = new sap.m.UploadCollectionParameter({
                    name: "remarks",
                    value: fileRemarks.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileRemarksParam);
                fileRemarks.setValue('');

                //filename selected
                var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
                    name: "slug",
                    value: oEvent.getParameter("fileName")
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

                var oModel = that.getView().getModel("FileModel");
                oModel.refreshSecurityToken();

                //add the HTTP headers
                var oHeaders = oModel.oHeaders;
                var sToken = oHeaders['x-csrf-token'];

                var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
                    name: "x-csrf-token",
                    value: sToken
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderToken);
            },

            onUploadComplete: function () {
                //on upload complete refresh the list
                that.getView().getModel("FileModel").refresh();
                var oUploadCollection = that.getView().byId('UploadCollection');
                oUploadCollection.removeAllItems();
            },

            onDeleteFile: function () {
                //confirm delete selected file dialog
                var oUploadCollection = this.getView().byId('UploadCollection');
                var selected = oUploadCollection.getSelectedItems();

                if (selected.length > 0) {
                    if (!this._ConfirmDeleteFileDialog) {
                        this._ConfirmDeleteFileDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmDeleteFile", this);
                        this.getView().addDependent(this._ConfirmDeleteFileDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._ConfirmDeleteFileDialog.addStyleClass("sapUiSizeCompact");
                    this._ConfirmDeleteFileDialog.open();
                } else {
                    Common.showMessage(this._i18n.getText('t10'));
                }
            },

            onConfirmDeleteFile: function () {
                //delete selected file, call delete method of file odata service
                that._ConfirmDeleteFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                var sPath = oUploadCollection.getSelectedItems()[0].getBindingContext('FileModel').sPath;
                var oModel = that.getView().getModel("FileModel");
                oModel.remove(sPath, {
                    success: function (oData, oResponse) {
                        that.getView().getModel("FileModel").refresh();
                    },
                    error: function (err) {
                    }
                });

                this.enableOtherTabs();
            },

            onCancelUploadFile: function () {
                //close edit mode, refresh the file list
                that._UploadFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                that.getView().getModel("FileModel").refresh();
                oUploadCollection.removeAllItems();

                this.enableOtherTabs();
            },

            //******************************************* */
            // Common Functions
            //******************************************* */

            onCloseDialog: function (oEvent) {
                oEvent.getSource().getParent().close();
            },

            disableOtherTabs: function () {
                var oIconTabBar = this.byId("idIconTabBarInlineMode");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));
            },

            enableOtherTabs: function () {
                var oIconTabBar = this.byId("idIconTabBarInlineMode");
                oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
            }
        });
    });