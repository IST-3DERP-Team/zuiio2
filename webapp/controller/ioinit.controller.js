sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
    "../control/DynamicTable",
    "sap/ui/model/FilterOperator"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, Common, Utils, JSONModel, Spreadsheet, control, FilterOperator) {
        "use strict";

        var that;
        var sbu;
        var IONOtxt;

        var sIONo = "", sIODesc = "", sStyleCd = "", sSeason = "", sPlant = "", sIOType = "";
        var sStyleNo = "NEW", sVerNo, sStyleCd, sProdTyp, sSalesGrp, sSeasonCd, sCustGrp, sUOM;

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });

        return Controller.extend("zuiio2.controller.ioinit", {
            onInit: async function () {
                that = this;

                this.getView().setModel(new JSONModel({
                    activeSTYLENO: '',
                    activeSALDOCNO: ''
                }), "ui");

                //get current userid
                var oModel = new sap.ui.model.json.JSONModel();
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                // this._router.getRoute("RouteSalesDocHdr").attachPatternMatched(this._routePatternMatched, this);

                this._Model = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this._oModel = this.getOwnerComponent().getModel();

                this._aIOColumns = {};
                this._aColumns = {};
                this._aSortableColumns = {};
                this._aFilterableColumns = {};

                this.setSmartFilterModel();

                if (sap.ui.getCore().byId("backBtn") !== undefined) {
                    this._fBackButton = sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction;

                    var oView = this.getView();
                    oView.addEventDelegate({
                        onAfterShow: function (oEvent) {
                            // console.log("back")
                            sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = that._fBackButton;
                            that.onRefresh();
                        }
                    }, oView);
                }

                // sap.ui.getCore().byId("IOStyleSelectTab")
                //     .setModel(new JSONModel({
                //         columns: [],
                //         rows: []
                //     }));

                // this.onSearch();
            },

            onfragmentIOSelect: function (tableName) {
                var me = this;
                var sTableName = tableName;
                sStyleNo = "NEW";

                // console.log("IO from Style");
                if (sTableName === "IOStyleSelectTab") {

                    // console.log("IOStyleSelectTab");
                    // var oTable = this.byId("IOStyleSelectTab");
                    var oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                    // console.log(oTable);
                    var oSelectedIndices = oTable.getSelectedIndices();
                    // console.log(oTable.getSelectedIndices());
                    var oTmpSelectedIndices = [];
                    var aData = oTable.getModel("IOSTYSELDataModel").getData().results;

                    // console.log(aData);
                    // console.log(oTable.getBinding("rows"));
                    var oParamData = [];
                    var oParam = {};
                    var bProceed = true;

                    if (oSelectedIndices.length <= 0) {
                        Common.showMessage("No selected row to process.");
                        return;
                    }


                    // var vSBU = this.getView().getModel("ui").getData().sbu;
                    // var sIONo = "", sIODesc = "", sStyleCd = "", sSeason = "", sPlant = "", sIOType = "";

                    //reset variables
                    sIONo = "", sIODesc = "", sStyleCd = "", sSeason = "", sPlant = "", sIOType = "";
                    if (oSelectedIndices.length > 0) {
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })

                        oSelectedIndices = oTmpSelectedIndices;

                        oSelectedIndices.forEach(item => {
                            // alert(aData.at(item).STYLENO);
                            sStyleNo = aData.at(item).STYLENO;
                        })
                    }
                    // return;

                    that._router.navTo("RouteIODetail", {
                        iono: "NEW",
                        sbu: this.getView().byId("smartFilterBar").getFilterData().SBU,
                        styleno: sStyleNo
                    });

                    me._CopyStyleDialog.close();

                }

                if (sTableName === "IOSDSelectTab") {
                    // console.log(sTableName);
                    // var oTable = this.byId("IOStyleSelectTab");
                    var oTable = sap.ui.getCore().byId(sTableName);
                    var oSelectedIndices = oTable.getSelectedIndices();
                    var oTmpSelectedIndices = [];
                    var aData = oTable.getModel("IOSDSELDataModel").getData().results;

                    var oParamData = [];
                    var oParam = {};
                    var bProceed = true;

                    if (oSelectedIndices.length <= 0) {
                        Common.showMessage("No selected row to process.");
                        return;
                    }

                    sIONo = "", sIODesc = "", sStyleCd = "", sSeason = "", sPlant = "", sIOType = "";
                    if (oSelectedIndices.length > 0) {
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })

                        oSelectedIndices = oTmpSelectedIndices;

                        var aSelectedItems = [];
                        oSelectedIndices.forEach(item => {
                            // alert(aData.at(item).STYLENO);
                            // sStyleNo = aData.at(item).STYLENO;
                            aSelectedItems.push(aData.at(item));

                        })

                        // console.log("Route Model 1");
                        this.getOwnerComponent().getModel("routeModel").setProperty("/results", aSelectedItems);

                        var rowData = this.getOwnerComponent().getModel("routeModel").getProperty("/results");
                        // console.log("rowData");
                        // console.log(rowData);

                        var unique = rowData.filter((rowData, index, self) =>
                            index === self.findIndex((t) => (t.SALESGRP === rowData.SALESGRP && t.STYLENO === rowData.STYLENO && t.UOM === rowData.UOM
                                && t.PRODTYP === rowData.PRODTYP && t.SEASONCD === rowData.SEASONCD && t.STYLECD === rowData.STYLECD && t.VERNO === rowData.VERNO
                                && t.CUSTGRP === rowData.CUSTGRP)));

                        // console.log("unique");    
                        // console.log(unique);

                        if (rowData.length <= 0) {
                            Common.showMessage("No row/s selected.");
                            this.getOwnerComponent().getModel("routeModel").setData(null);
                            return;
                        }

                        if (unique.length > 1) {
                            Common.showMessage("Selected items must have the same: Style No. / Style Code / Season  Sales Group / Customer Group / Product Type / UOM");
                            this.getOwnerComponent().getModel("routeModel").setData(null);
                            return;
                        } else {
                            unique.forEach(item => {
                                // alert(item.STYLENO);
                                sStyleNo = item.STYLENO;
                            })
                        }

                    }
                    // return;
                    // console.log(that._sbu);
                    // console.log(sStyleNo);

                    that._router.navTo("RouteIODetail", {
                        iono: "NEW",
                        sbu: this.getView().byId("smartFilterBar").getFilterData().SBU,
                        styleno: sStyleNo
                    });

                    me._IOfromSalesDocDialog.close();
                }

                // me._CopyStyleDialog.close();

            },

            filterGlobally: function (oEvent) {
                // var oTable = oEvent.getSource().oParent.oParent;
                var oTable = oEvent.getSource().oParent.oParent;
                var sTable = oTable.sId;
                var sQuery = oEvent.getParameter("query");

                if (sTable === "IOStyleSelectTab") {
                    //remove filters from other source if IOStyleSelectTab filter is updated
                    // sap.ui.getCore().byId("searchFieldStyle").setProperty("value", "");
                }

                this.exeGlobalSearch(sQuery, sTable);
            },

            exeGlobalSearch(arg1, arg2) {
                var oFilter = null;
                var aFilter = [];

                if (arg1) {
                    this._aFilterableColumns[arg2.replace("Tab", "")].forEach(item => {
                        var sDataType = this._aColumns[arg2.replace("Tab", "")].filter(col => col.ColumnName === item.name)[0].DataType;

                        if (sDataType === "BOOLEAN") aFilter.push(new Filter(item.name, FilterOperator.EQ, arg1));
                        else aFilter.push(new Filter(item.name, FilterOperator.Contains, arg1));
                    })

                    oFilter = new Filter(aFilter, false);
                }

                sap.ui.getCore().byId(arg2).getBinding("rows").filter(oFilter, "Application");

                if (arg1 && arg2 === "IOStyleSelectTab") {
                    var vStyleNo = this.getView().getModel("IOSTYSELDataModel").getData().results.filter((item, index) => index === sap.ui.getCore().byId(arg2).getBinding("rows").aIndices[0])[0].STYLENO;
                    this.getView().getModel("ui").setProperty("/activeSTYLENO", vStyleNo);
                }

                if (arg1 && arg2 === "IOSDSelectTab") {
                    var vStyleNo = this.getView().getModel("IOSDSELDataModel").getData().results.filter((item, index) => index === sap.ui.getCore().byId(arg2).getBinding("rows").aIndices[0])[0].STYLENO;
                    this.getView().getModel("ui").setProperty("/activeSALDOCNO", vStyleNo);
                }
            },

            getIOSDLISTData: function () {
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var entitySet = "/IOSDLISTSet"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "IOSDSELDataModel");
                        // console.log(oView.setModel(oJSONModel, "IOSDSELDataModel"));

                        me.setSearchTableData("IOSDSelectTab");
                    },
                    error: function () { }
                })
            },

            getIOSTYLISTData: function () {
                //get versions of selected styleno
                var me = this;
                // var oView = sap.ui.getCore().byId("IOStyleSelectTab");

                // var oModel = new sap.ui.model.json.JSONModel({ columns: [],rows: [] });
                // oView.setModel(oModel);
                // oView.setModel(new JSONModel({
                //     columns: [],
                //     rows: []
                // }));

                // setTimeout(() => {

                //     this._oModel.read('/IOSTYLISTSet', {
                //         success: function (oData, response) {
                //             oView.getModel().setProperty("/rows", oData.results);
                //             oView.bindRows("/rows");

                //             var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                //             var oModelColumns = new JSONModel();
                //             oModelColumns.loadData(sPath);

                //             var oColumns = oModelColumns.getData();

                //             me.getIODynamicColumns('IOSTYTLST','ZDV__IOSTYLST','IOStyleSelectTab',oColumns);
                //         },
                //         error: function (err) { }
                //     })
                // }, 100);

                var oView = this.getView();
                // var oView = sap.ui.getCore().byId("IOStyleSelectTab");
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var entitySet = "/IOSTYLISTSet"
                // oModel.setHeaders({
                //     styleno: styleNo
                // });
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "IOSTYSELDataModel");
                        // console.log("IOSTYSELDataModel");
                        // console.log(oData);

                        me.setSearchTableData("IOStyleSelectTab");
                        // console.log(oView.setModel(oJSONModel, "IOSTYSELDataModel"));

                        // me.byId("IOStyleSelectTab").getModel().setProperty("/rows", oData.results);
                        // me.byId("IOStyleSelectTab").bindRows("/rows");

                        // var oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                        // oTable.getModel().setProperty("/rows", oData.results);
                        // oTable.bindRows("/rows");

                        // me._tableRendered = "IOStyleSelectTab";
                    },
                    error: function () { }
                })
            },

            getIODynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // var vSBU = "VER"; //this.getView().getModel("ui").getData().sbu;
                var vSBU = this._sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            // console.log(oData);
                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aIOColumns[sTabId.replace("Tab", "")] = oData.results;
                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setIOTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                        // Common.closeLoadingDialog();
                    }
                });
            },

            setIOTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                // var oTable = this.getView().byId(sTabId);
                var oTable = sap.ui.getCore().byId(sTabId);

                // console.log("before set Property");
                oTable.getModel().setProperty("/columns", oColumns);
                // console.log("after set Property");

                // console.log(oTable);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    // console.log("bind Columns");
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    // console.log("sColumnSortOrder");
                    // console.log(sColumnSortOrder);

                    if (sColumnWidth === 0) sColumnWidth = 100;

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
                            template: new sap.m.CheckBox({ selected: true, editable: false }),
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
                });
            },

            onAfterRendering: function () {
                //double click event
                var oModel = new JSONModel();
                var oTable = this.getView().byId("IODynTable");
                oTable.setModel(oModel);
                oTable.attachBrowserEvent('dblclick', function (e) {
                    e.preventDefault();
                    that.setChangeStatus(false); //remove change flag
                    that.navToDetail(IONOtxt, this._sbu, sStyleNo); //navigate to detail page

                });
            },

            setSmartFilterModel: function () {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_IO_FILTER_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },

            onRowChange: function (oEvent) {
                var sPath = oEvent.getParameter("rowContext").getPath();
                var oTable = this.getView().byId("IODynTable");
                var model = oTable.getModel();
                var data = model.getProperty(sPath);
                IONOtxt = data['IONO'];
            },

            setChangeStatus: function (changed) {
                //Set change flag 
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch (err) { }
            },

            onSearch: function () {
                setTimeout(() => {
                    this.getDynamicTableColumns();
                }, 100);

                setTimeout(() => {
                    this.getStatistics("/IOSTATISTICSSet"); //style statistics
                }, 100);
            },

            getDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                this._sbu = this.getView().byId("smartFilterBar").getFilterData().SBU.Text;  //get selected SBU
                // console.log(this._sbu);
                // this._sbu = this.getView().byId("cboxSBU").getSelectedKey();
                this._sbu = 'VER';
                this._Model.setHeaders({
                    sbu: this._sbu,
                    type: 'IOINIT',
                    tabname: 'ZERP_IOHDR'
                });

                //DynamicColumnsSet
                this._Model.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "DynColumns");  //set the view model
                        me.getDynamicTableData(oData.results);
                    },
                    error: function (err) { }
                });
            },

            getDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();

                //get dynamic data
                var oJSONDataModel = new sap.ui.model.json.JSONModel();
                var aFilters = this.getView().byId("smartFilterBar").getFilters();
                // console.log(aFilters);
                var oText = this.getView().byId("IOCount");

                // this.addDateFilters(aFilters); //date not automatically added to filters

                oModel.read("/IOHDRSet", {
                    filters: aFilters,
                    success: function (oData, oResponse) {
                        // oData.results.forEach(item => {
                        //     item.CUSTDLVDT = dateFormat.format(item.CUSTDLVDT);
                        //     item.REVCUSTDLVDT = dateFormat.format(item.REVCUSTDLVDT);
                        //     item.REQEXFTYDT = dateFormat.format(item.REQEXFTYDT);                            
                        //     item.MATETA = dateFormat.format(item.MATETA);
                        //     item.MAINMATETA = dateFormat.format(item.MAINMATETA);
                        //     item.SUBMATETA = dateFormat.format(item.SUBMATETA);
                        //     item.CUTMATETA = dateFormat.format(item.CUTMATETA);
                        //     item.PLANDLVDT = dateFormat.format(item.PLANDLVDT);
                        //     item.PRODSTART = dateFormat.format(item.PLANDLVDT);
                        //     item.CREATEDDT = dateFormat.format(item.CREATEDDT);
                        //     item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);   
                        // })

                        oText.setText(oData.results.length + "");
                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "DataModel");
                        me.setTableData();
                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            setTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oColumnsModel = this.getView().getModel("DynColumns");
                var oDataModel = this.getView().getModel("DataModel");

                //the selected styles data
                var oColumnsData = oColumnsModel.getProperty('/results');
                var oData = oDataModel.getProperty('/results');

                //add column for manage button
                oColumnsData.unshift({
                    "ColumnName": "Manage",
                    "ColumnType": "SEL",
                    "Visible": false
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oColumnsData,
                    rows: oData
                });

                var oDelegateKeyUp = {
                    onkeyup: function (oEvent) {
                        that.onKeyUp(oEvent);
                    },

                    onsapenter: function (oEvent) {
                        that.onSapEnter(oEvent);
                    }
                };

                this.byId("IODynTable").addEventDelegate(oDelegateKeyUp);

                var oTable = this.getView().byId("IODynTable");
                oTable.setModel(oModel);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    // var sColumnToolTip = context.getObject().Tooltip;

                    // console.log(context.getObject());

                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType),
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
                oTable.bindRows("/rows");
            },

            columnTemplate: function (sColumnId, sColumnType) {
                var oColumnTemplate;

                //different component based on field
                if (sColumnId === "STATUS") { //display infolabel for Status Code
                    oColumnTemplate = new sap.tnt.InfoLabel({
                        text: "{" + sColumnId + "}",
                        colorScheme: "{= ${" + sColumnId + "} === 'CMP' ? 8 : ${" + sColumnId + "} === 'CRT' ? 3 : ${" + sColumnId + "} === 'REL' ? 8 : ${" + sColumnId + "} === 'EXT' ? 5 : 1}"
                    })
                } else if (sColumnId === "STATUSCD") { //display infolabel for Status Code
                    oColumnTemplate = new sap.tnt.InfoLabel({
                        text: "{" + sColumnId + "}",
                        colorScheme: "{= ${" + sColumnId + "} === 'CLS' ? 5 : ${" + sColumnId + "} === 'CNL' ? 3: ${" + sColumnId + "} === 'CRT' ? 8: ${" + sColumnId + "} === 'MAT' ? 8 : ${" + sColumnId + "} === 'REL' ? 9 : 1}"
                    })
                } else if (sColumnType === "SEL") { //Manage button
                    oColumnTemplate = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://detail-view",
                        type: "Ghost",
                        press: this.goToDetail,
                        tooltip: "Manage this IO"
                        // ,
                        // visible: "false"
                    });
                    oColumnTemplate.data("IONO", "{}"); //custom data to hold style number
                } else if (sColumnType === "COPY") { //Copy button
                    oColumnTemplate = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://copy",
                        type: "Ghost",
                        press: this.onCopyStyle,
                        tooltip: "Copy this style"
                    });
                    oColumnTemplate.data("IONO", "{}"); //custom data to hold style number
                } else {
                    oColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}" }); //default text
                }

                return oColumnTemplate;
            },

            getColumnSize: function (sColumnId, sColumnType) {
                //column width of fields
                var mSize = '50';
                if (sColumnType === "SEL") {
                    mSize = '50';
                } else if (sColumnType === "COPY") {
                    mSize = '50';
                } else if (sColumnId === "STYLECD") {
                    mSize = '100';
                } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
                    mSize = '300';
                } else if (sColumnId === "DLVDT" || sColumnId === "DOCDT" || sColumnId === "CREATEDDT" || sColumnId === "UPDATEDDT") {
                    mSize = '500';
                }
                return mSize;
            },

            getFormatColumnSize: function (sColumnId, sColumnType, sColumnSize) {
                //column width of fields
                var mSize = sColumnSize;
                if (sColumnType === "SEL") {
                    mSize = '50';
                } else if (sColumnType === "COPY") {
                    mSize = '50';
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

            onKeyUp(oEvent) {
                //console.log("onKeyUp!");

                // var _dataMode = this.getView().getModel("undefined").getData().dataMode;
                // _dataMode = _dataMode === undefined ? "READ" : _dataMode;

                // if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows" && _dataMode === "READ") {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.getView().byId("IODynTable");
                    var model = oTable.getModel();

                    var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["undefined"].sPath;
                    var index = sRowPath.split("/");
                    oTable.setSelectedIndex(parseInt(index[2]));
                }
            },

            onSapEnter(oEvent) {
                that.setChangeStatus(false); //remove change flag
                // console.log(this._sbu);
                that.navToDetail(IONOtxt, that._sbu, sStyleNo); //navigate to detail page
            },

            goToDetail: function (oEvent) {
                var oButton = oEvent.getSource();
                var ioNO = oButton.data("IONO").IONO; //get the styleno binded to manage button
                that.setChangeStatus(false); //remove change flag
                // alert(ioNO);
                that.navToDetail(ioNO); //navigate to detail page
            },

            goToDetailClick: function (iono) {
                var ioNO = iono;
                that.setChangeStatus(false); //remove change flag
                that.navToDetail(ioNO); //navigate to detail page
            },

            navToDetail: function (ioNO) {
                //route to detail page
                // alert(sIONO);
                // alert(this.sbu);
                // alert(sStyleNo);
                // return;
                var sIONO = ioNO
                that._router.navTo("RouteIODetail", {
                    iono: sIONO.trim(),
                    sbu: that._sbu,
                    styleno: sStyleNo,
                    icontabfilterkey: "itfIOHDR"
                });
            },

            // onCopyIO: function(oEvent) {
            //     // var oButton = oEvent.getSource();
            //     // var ioNO = oButton.data("IONO").IONO;   

            //     alert("Copy IO");

            //      //open the copy style dialog
            //      if (!that._CopyIODialog) {
            //         that._CopyIODialog = sap.ui.xmlfragment("zuiio2.view.fragments.CopyIO", that);
            //         that.getView().addDependent(that._CopyIODialog);
            //     }
            //     jQuery.sap.syncStyleClass("sapUiSizeCompact", that.getView(), that._LoadingDialog);
            //     that._CopyIODialog.addStyleClass("sapUiSizeCompact");
            //     that._CopyIODialog.open();
            // },

            // onSalesDocReader: function () {
            //     var oModel = this.getOwnerComponent().getModel();
            //     var oForecast = this.getView().byId("forecastNumber");
            //     var oOrder = this.getView().byId("orderNumber");
            //     var oShipped = this.getView().byId("shippedNumber");

            //     var aFilters = this.getView().byId("smartFilterBar").getFilters();

            //     this._Model.read("/SalDocStatsSet", {
            //         filters: aFilters,
            //         success: function (oData) {
            //             oForecast.setNumber(oData.results[0].FORECAST);
            //             oOrder.setNumber(oData.results[0].ORDER);
            //             oShipped.setNumber(oData.results[0].SHIPPED);
            //         },
            //         error: function (err) { }
            //     });
            // },

            getStatistics: function (EntitySet) {
                //select the style statistics
                var vEntitySet = EntitySet;
                var oModel = this.getOwnerComponent().getModel();
                var oForecast = this.getView().byId("forecastNumber");
                var oOrder = this.getView().byId("orderNumber");
                var oShipped = this.getView().byId("shippedNumber");

                //get the smartfilterbar filters for odata filter
                var aFilters = this.getView().byId("smartFilterBar").getFilters();
                // this.addDateFilters(aFilters);

                // console.log(vEntitySet);
                // console.log(aFilters);

                // var lv_createdDateFilter = new sap.ui.model.Filter({
                //     path: "SBU",
                //     operator: sap.ui.model.FilterOperator.EQ,
                //     value1: this._sbu
                // });

                // aFilters.push(lv_createdDateFilter);
                // console.log("Statistics");
                // console.log(aFilters);
                oModel.read(vEntitySet, {
                    // filters: aFilters,
                    success: function (oData) {
                        // console.log("Statistics oData");
                        // console.log(oData);
                        oForecast.setNumber(oData.results[0].FORECASTQTY);
                        oOrder.setNumber(oData.results[0].ORDERQTY);
                        oShipped.setNumber(oData.results[0].SHIPQTY);
                    }
                    ,
                    error: function (err) { }
                });
            },

            onIOCreateSelect: async function (source) {
                var me = this;
                var sSource = source;
                if (sSource === "Style") {
                    if (!me._IOfromStyleDialog) {

                        // var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                        // var oModelColumns = new JSONModel();
                        // await oModelColumns.loadData(sPath);

                        // var oColumns = oModelColumns.getData();

                        // var oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                        // oTable.setModel(new JSONModel({
                        //     columns: [],
                        //     rows: []
                        // }));


                        // this.getIOSTYLISTData();
                        // this.getSearchDynamicTableColumns("IOSTYLIST", "ZDV__IOSTYLST", "IOStyleSelectTab", oColumns);

                        me._IOfromStyleDialog = sap.ui.xmlfragment("zuiio2.view.fragments.CreateIOfromStyle", me);
                        me.getView().addDependent(me._IOfromStyleDialog);

                        var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                        var oModelColumns = new JSONModel();
                        await oModelColumns.loadData(sPath);

                        var oColumns = oModelColumns.getData();

                        var oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                        oTable.setModel(new JSONModel({
                            columns: [],
                            rows: []
                        }));

                        // console.log(oTable);

                        // setTimeout(() => {
                        //     this.getIOSTYLISTData();
                        // }, 100);

                        this.getSearchDynamicTableColumns("IOSTYLIST", "ZDV__IOSTYLST", "IOStyleSelectTab", oColumns);

                        // sap.ui.getCore().byId("searchFieldStyle").setProperty("value", "");
                    }
                    me._IOfromStyleDialog.open();

                } else if (sSource === "SalesDoc") {
                    // Common.showMessge("Ongoing ...");
                    // return;

                    if (!me._IOfromSalesDocDialog) {

                        // this.getIOSDLISTData();

                        me._IOfromSalesDocDialog = sap.ui.xmlfragment("zuiio2.view.fragments.CreateIOfromSalesDoc", me);
                        me.getView().addDependent(me._IOfromSalesDocDialog);

                        var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                        var oModelColumns = new JSONModel();
                        await oModelColumns.loadData(sPath);

                        var oColumns = oModelColumns.getData();

                        var oTable = sap.ui.getCore().byId("IOSDSelectTab");
                        oTable.setModel(new JSONModel({
                            columns: [],
                            rows: []
                        }));

                        // console.log("getSearchDynamicTableColumns");
                        this.getSearchDynamicTableColumns("IOSDLIST", "ZDV_3D_SDLIST", "IOSDSelectTab", oColumns);
                    }
                    me._IOfromSalesDocDialog.open();
                }
            },

            getSearchDynamicTableColumns: function (arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                this._sbu = this.getView().byId("smartFilterBar").getFilterData().SBU.Text;  //get selected SBU
                // console.log(this._sbu);
                // this._sbu = this.getView().byId("cboxSBU").getSelectedKey();
                // this._sbu = 'VER';
                this._Model.setHeaders({
                    sbu: this._sbu,
                    type: sType,
                    tabname: sTabName
                });

                //DynamicColumnsSet
                this._Model.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            // console.log(oData);

                            var aColumns;

                            if (sTabId === "IOStyleSelectTab")
                                aColumns = me.setTableColumns(oLocColProp["iostylist"], oData.results);

                            if (sTabId === "IOSDSelectTab")
                                aColumns = me.setTableColumns(oLocColProp["iosdlist"], oData.results);

                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aIOColumns[sTabId.replace("Tab", "")] = oData.results;
                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            // console.log(me._aColumns[sTabId.replace("Tab", "")]);
                            me._aFilterableColumns[sTabId.replace("Tab", "")] = aColumns["filterableColumns"];

                            // console.log("io style list filterable columns");
                            // console.log(me._aFilterableColumns["iostylist"]);

                            me.setIOSearchTableColumns(sTabId, oData.results);

                            oJSONColumnsModel.setData(oData);
                            me.oJSONModel.setData(oData);

                            // me.getView().setModel(oJSONColumnsModel, "IOSTYLISTColumns");  //set the view model
                            // me.getIOSTYLISTData();

                            if (sTabId === "IOStyleSelectTab") {
                                me.getView().setModel(oJSONColumnsModel, "IOSTYLISTColumns");  //set the view model
                                me.getIOSTYLISTData();
                            }


                            if (sTabId === "IOSDSelectTab") {
                                me.getView().setModel(oJSONColumnsModel, "IOSDLISTColumns");  //set the view model
                                me.getIOSDLISTData();
                            }
                        }
                    },
                    error: function (err) { }
                });
            },

            setSearchTableData: function (tableName) {
                var me = this;
                var sTabId = tableName;

                var oColumnsModel;
                var oDataModel;

                //the selected dynamic columns
                if (sTabId === "IOStyleSelectTab") {
                    oColumnsModel = this.getView().getModel("IOSTYLISTColumns");
                    oDataModel = this.getView().getModel("IOSTYSELDataModel");
                }

                if (sTabId === "IOSDSelectTab") {
                    oColumnsModel = this.getView().getModel("IOSDLISTColumns");
                    oDataModel = this.getView().getModel("IOSDSELDataModel");
                }

                // console.log(oColumnsModel);
                // console.log(oDataModel);

                //the selected styles data
                var oColumnsData = oColumnsModel.getProperty('/results');
                var oData = oDataModel.getProperty('/results');

                // //add column for manage button
                // oColumnsData.unshift({
                //     "ColumnName": "Manage",
                //     "ColumnType": "SEL",
                //     "Visible": false
                // });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oColumnsData,
                    rows: oData
                });

                var oDelegateKeyUp = {
                    onkeyup: function (oEvent) {
                        that.onKeyUp(oEvent);
                    },

                    onsapenter: function (oEvent) {
                        that.onSapEnter(oEvent);
                    }
                };

                // this.byId("IODynTable").addEventDelegate(oDelegateKeyUp);
                // sap.ui.getCore().byId("IOStyleSelectTab").addEventDelegate(oDelegateKeyUp);

                // var oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                var oTable;
                var oColumnsModel;
                var oDataModel;
                
                if (sTabId === "IOStyleSelectTab") {
                    sap.ui.getCore().byId("IOStyleSelectTab").addEventDelegate(oDelegateKeyUp);
                    oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                    oColumnsModel = this.getView().getModel("IOSTYLISTColumns");
                    oDataModel = this.getView().getModel("IOSTYSELDataModel");
                }

                if (sTabId === "IOSDSelectTab") {
                    sap.ui.getCore().byId("IOSDSelectTab").addEventDelegate(oDelegateKeyUp);
                    oTable = sap.ui.getCore().byId("IOSDSelectTab");
                    oColumnsModel = this.getView().getModel("IOSDLISTColumns");
                    oDataModel = this.getView().getModel("IOSDSELDataModel");
                }
                
                oTable.setModel(oModel);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    // var sColumnToolTip = context.getObject().Tooltip;

                    // console.log(context.getObject());

                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType),
                        // width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        width: sColumnWidth + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oTable.bindRows("/rows");
            },

            setIOSearchTableColumns: function (arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                // var oTable = me.getView().byId(sTabId);
                var oTable = sap.ui.getCore().byId(sTabId);

                // console.log("setIOSearchTableColumns");
                // console.log(oTable);

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
                // var aItems = oTable.getItems();
                // aItems[0].setSelected(true);
            },

            setTableColumns: function (arg1, arg2) {
                var oColumn = arg1;
                var oMetadata = arg2;

                // console.log(oColumn);
                // console.log(oMetadata);

                var aSortableColumns = [];
                var aFilterableColumns = [];
                var aColumns = [];

                oMetadata.sort((a, b) => (+a.Order > +b.Order ? 1 : -1));

                oMetadata.forEach((item, index) => {
                    item.Order = index;
                });

                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Editable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    // console.log(prop)
                    if (vShowable) {
                        //sortable
                        if (vSortable) {
                            aSortableColumns.push({
                                name: prop.ColumnName,
                                label: vName,
                                position: +vOrder,
                                sorted: vSorted,
                                sortOrder: vSortOrder
                            });
                        }

                        //filterable
                        if (vFilterable) {
                            aFilterableColumns.push({
                                name: prop.ColumnName,
                                label: vName,
                                position: +vOrder,
                                value: "",
                                connector: "Contains"
                            });
                        }
                    }

                    //columns
                    aColumns.push({
                        name: prop.ColumnName,
                        label: vName,
                        position: +vOrder,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'rem',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? { "show": false } : oColumnLocalProp[0].valueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Decimal,
                        scale: prop.Scale !== undefined ? prop.Scale : null
                    })
                })

                // aSortableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // this.createViewSettingsDialog("sort", 
                //     new JSONModel({
                //         items: aSortableColumns,
                //         rowCount: aSortableColumns.length,
                //         activeRow: 0,
                //         table: ""
                //     })
                // );

                // aFilterableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // this.createViewSettingsDialog("filter", 
                //     new JSONModel({
                //         items: aFilterableColumns,
                //         rowCount: aFilterableColumns.length,
                //         table: ""
                //     })
                // );

                // aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // var aColumnProp = aColumns.filter(item => item.showable === true);

                // this.createViewSettingsDialog("column", 
                //     new JSONModel({
                //         items: aColumnProp,
                //         rowCount: aColumnProp.length,
                //         table: ""
                //     })
                // );


                return { columns: aColumns, sortableColumns: aSortableColumns, filterableColumns: aFilterableColumns };
            },

            onCopyIO: function (oEvent) {
                var me = this;

                if (this.getView().byId("smartFilterBar").getFilterData().SBU === undefined) {
                    Common.showMessage("SBU required.");
                    return;
                }

                var oTable = this.byId("IODynTable");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamData = [];
                var oParam = {};
                var bProceed = true;

                if (oSelectedIndices.length <= 0) {
                    Common.showMessage("No selected row to Copy.");
                    return;
                }
                // var vSBU = this.getView().getModel("ui").getData().sbu;
                // var sIONo = "", sIODesc = "", sStyleCd = "", sSeason = "", sPlant = "", sIOType = "";

                //reset variables
                sIONo = "", sIODesc = "", sStyleCd = "", sSeason = "", sPlant = "", sIOType = "";
                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach(item => {
                        sIONo = aData.at(item).IONO;
                        sIOType = aData.at(item).IOTYPE;
                        sIODesc = aData.at(item).IODESC;
                        sStyleCd = aData.at(item).STYLECD;
                        sSeason = aData.at(item).SEASONCD;
                        sPlant = aData.at(item).PLANPLANT;

                        if (sIONo === "") {
                            bProceed = false;
                        }
                    })
                    if (!bProceed) {
                        me.closeLoadingDialog();
                    } else {
                        this.getSeasonsSet();   //SeasonsModel
                        this.getPlantSet();     //PlantModel                        

                        // alert(sIONo);
                        if (!this._CopyIODialog) {
                            this._CopyIODialog = sap.ui.xmlfragment("zuiio2.view.fragments.CopyIO", this);
                            this.getView().addDependent(this._CopyIODialog);
                        }
                        this._CopyIODialog.open();
                        sap.ui.getCore().byId("iIONo").setValue(sIONo);
                        sap.ui.getCore().byId("iIODesc").setValue(sIODesc);
                        sap.ui.getCore().byId("iStyleCd").setValue(sStyleCd);
                        sap.ui.getCore().byId("iSeasonCd").setValue(sSeason);
                        sap.ui.getCore().byId("iPlant").setValue(sPlant);

                        sap.ui.getCore().byId("newIODesc").setValue("");
                        sap.ui.getCore().byId("newStyleCd").setValue("");
                        sap.ui.getCore().byId("newSeasonCd").setValue("");
                        sap.ui.getCore().byId("newPlant").setValue("");
                    }
                }
            },

            onfragmentCopyIO: function () {
                var newIONO;
                //reset variables
                var _this = this;
                newIODesc = "", newStyleCd = "", newSeasonCd = "";
                StyleCB = false, ColorCB = false, BOMCB = false, CostingCB = false;

                //capture data of Inputs at Copy Style Fragment
                var newIODesc = sap.ui.getCore().byId("newIODesc").getValue();
                var newStyleCd = sap.ui.getCore().byId("newStyleCd").getValue();
                var newSeasonCd = sap.ui.getCore().byId("newSeasonCd").getValue();
                var newPlant = sap.ui.getCore().byId("newPlant").getValue();
                var StyleCB = sap.ui.getCore().byId("StyleCB").getSelected();
                var ColorCB = sap.ui.getCore().byId("ColorCB").getSelected();
                var BOMCB = sap.ui.getCore().byId("BOMCB").getSelected();
                var CostingCB = sap.ui.getCore().byId("CostingCB").getSelected();

                //check: if New Style Checkbox value is true, require New Style Code entry.
                if (StyleCB === true && newStyleCd === "") {
                    // alert("New Style Code entry required.");
                    Common.showMessage("New Style is selected. New Style Code entry required.");
                    return;
                }

                //build Parameters to be used into IOCOPYSet Entity
                var oParam = {
                    "Iono": sIONo,
                    "Iotype": sIOType,
                    "Iodesc": sIODesc,
                    "Stylecd": sStyleCd,
                    "Seasoncd": sSeason,
                    "Purplant": sPlant,
                    // "Znewiono": "",
                    "Znewiodesc": newIODesc,
                    "Znewstylecd": newStyleCd,
                    "Znewseasoncd": newSeasonCd,
                    "Znewpurplant": newPlant,
                    "Zcheckstyle": StyleCB,
                    "Zcheckcolor": ColorCB,
                    "Zcheckbom": BOMCB,
                    "Zcheckcost": CostingCB
                };

                var bSuccess = false;

                var oCopyIOModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                setTimeout(() => {
                    oCopyIOModel.create("/IOCOPYSet", oParam, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, "CopyIOModel");
                            // console.log(oParam);
                            // console.log(oData);
                            //capture new IONO
                            // alert("IO Copied");
                            newIONO = oData.Znewiono;
                            Common.showMessage("Successfully create IO# " + newIONO);
                            _this._CopyIODialog.close();
                            // _this.onSearch();
                            setTimeout(() => {
                                _this.navToDetail(newIONO);
                            }, 100);

                        },
                        error: function (err) { }
                    });
                }, 100);
            },

            getSeasonsSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();
                // oSHModel.setHeaders({
                //     sbu: this._sbu
                // });
                oSHModel.read("/SEASONSet", {
                    urlParameters: {
                        "$filter": "SBU eq '" + this._sbu + "'"
                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "SeasonsModel");
                        // console.log(oView.setModel(oJSONModel, "SeasonsModel"));
                    },
                    error: function (err) { }
                });
            },

            getPlantSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();
                // oSHModel.setHeaders({
                //     sbu: this._sbu
                // });
                oSHModel.read("/PLANTSet", {
                    urlParameters: {
                        "$filter": "SBU eq '" + this._sbu + "'"
                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "PlantModel");
                        // console.log(oView.setModel(oJSONModel, "PlantModel"));
                    },
                    error: function (err) { }
                });
            },

            onCloseDialog: function (oEvent) {
                oEvent.getSource().getParent().close();
            },

            onCreateIO: function (createTyp) {
                // console.log("on Create IO");
                if (this.getView().byId("smartFilterBar").getFilterData().SBU === undefined) {
                    Common.showMessage("SBU required.");
                    return;
                }

                this._sbu = this.getView().byId("smartFilterBar").getFilterData().SBU;

                var screateTyp = createTyp;
                // Common.showMessage("Create IO : " + screateTyp);
                that.setChangeStatus(false); //remove change flag

                that.onIOCreateSelect(screateTyp);
                if (screateTyp === "Manual") {
                    // that.navToDetail("NEW"); //navigate straight to detail page if Manual

                    that._router.navTo("RouteIODetail", {
                        iono: "NEW",
                        sbu: that._sbu,
                        styleno: "NEW",
                        icontabfilterkey: "itfIOHDR"
                    });
                }

            },

            //export to spreadsheet utility
            onExport: Utils.onExport
            ,

            onSaveTableLayout: function (oEvent) {
                //saving of the layout of table
                var me = this;
                var ctr = 1;

                var oTable = this.getView().byId("IODynTable");
                var oColumns = oTable.getColumns();
                var vSBU = this._sbu;

                var oParam = {
                    "SBU": vSBU,
                    "TYPE": "IOINIT",
                    "TABNAME": "ZERP_IOHDR",
                    "TableLayoutToItems": []
                };

                //get information of columns, add to payload
                oColumns.forEach((column) => {
                    if (column.sId !== "Manage" && column.sId !== "Copy") {
                        oParam.TableLayoutToItems.push({
                            // COLUMNNAME: column.sId,
                            COLUMNNAME: column.mProperties.sortProperty,
                            ORDER: ctr.toString(),
                            SORTED: column.mProperties.sorted,
                            SORTORDER: column.mProperties.sortOrder,
                            SORTSEQ: "1",
                            VISIBLE: column.mProperties.visible,
                            WIDTH: column.mProperties.width.replace('px', '')
                        });

                        ctr++;
                    }
                });
                //call the layout save
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function (data, oResponse) {
                        sap.m.MessageBox.information("Layout saved.");
                    },
                    error: function (err) {
                        // console.log(err);
                        sap.m.MessageBox.error(err);
                    }
                });
            },

            onRefresh: function (oEvent) {
                //this.getColumns("SEARCH");
                this.getDynamicTableData("");
            },

            pad: Common.pad
        });
    });
