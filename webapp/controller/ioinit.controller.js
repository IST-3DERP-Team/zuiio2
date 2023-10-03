sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
    "../control/DynamicTable",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/HashChanger",
    "../js/TableFilter"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, Common, Utils, JSONModel, Spreadsheet, control, FilterOperator, HashChanger, TableFilter) {
        "use strict";

        var that;
        var sbu;
        var IONOtxt;
        var _sAction;
        var _shellHash;

        var sIONo = "", sIODesc = "", sStyleCd = "", sSeason = "", sPlant = "", sIOType = "";
        var sStyleNo = "NEW", sVerNo, sStyleCd, sProdTyp, sSalesGrp, sSeasonCd, sCustGrp, sUOM;

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });

        return Controller.extend("zuiio2.controller.ioinit", {
            onInit: async function () {
                that = this;

                // this._tableFilter = TableFilter;
                // console.log("this._tableFilter", this._tableFilter);
                this._colFilters = {};

                // console.log("INITIALIZE START");
                that.getCaptionSet();

                this._oSmartFilterBar = this.getView().byId("smartFilterBar");

                this.getView().setModel(new JSONModel({
                    activeSTYLENO: "",
                    activeSALDOCNO: "",
                    DisplayMode: "change",
                    sbu: ""
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
                this.setSmartFilterModel();

                this._aIOColumns = {};
                this._aColumns = {};
                this._aSortableColumns = {};
                this._aFilterableColumns = {};

                this.getAppAction();
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

                // window.onhashchange = function () {
                //     _shellHome = window.history.state.sap.history[window.history.state.sap.history.length - 1];
                // }

                // sap.ui.getCore().byId("IOStyleSelectTab")
                //     .setModel(new JSONModel({
                //         columns: [],
                //         rows: []
                //     }));

                // this.onSearch();

                // console.log("INITIALIZE END");
            },

            setSmartFilterModel: function () {
                //Model StyleHeaderFilters is for the smartfilterbar
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_IO_FILTER_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },

            onInitialize: function () {
                // console.log("SmartFilterBar Initialized");
                // this.oSmartFilterBar = this.getView().byId("smartFilterBar");

                // console.log(this._oSmartFilterBar);
                this._oSmartFilterBar.setFilterData({
                    PLANPLANT: {
                        filter: [
                            { value: "SBU eq 'VER'"}
                        ]
                        // items: [
                        //     { key: "C601", text: "C601 (Test Plant)"}
                        // ]
                    }
                });
            },
            
            onColumnUpdated: function (oEvent) {
                this.setActiveRowHighlight();
            },

            setActiveRowHighlight() {
                var oTable = this.byId("IODynTable");
                
                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })                    
                }, 1);
            },

            getAppAction: async function () {
                // console.log("getAppAction");
                // console.log(sap.ushell.Container)
                var csAction = "change";
                if (sap.ushell.Container !== undefined) {
                    const fullHash = new HashChanger().getHash();
                    const urlParsing = await sap.ushell.Container.getServiceAsync("URLParsing");
                    const shellHash = urlParsing.parseShellHash(fullHash);
                    csAction = shellHash.action;
                    _sAction = shellHash.action;
                    _shellHash = shellHash;
                }

                var DisplayStateModel = new JSONModel();
                var DisplayData = {
                    sAction: csAction,
                    visible: csAction === "display" ? false : true
                }

                DisplayStateModel.setData(DisplayData);
                this.getView().setModel(DisplayStateModel, "DisplayActionModel");
                // console.log(this.getView().getModel("DisplayActionModel"));
                // console.log(this.getView());

                // alert(csAction);
                if (csAction === "display") {
                    var btnAdd = this.getView().byId("btnCopy");
                    if (btnAdd.getVisible()) {
                        btnAdd.setVisible(false);
                    }

                    var btnMenu = this.getView().byId("_IDGenMenuButton1");
                    if (btnMenu.getVisible()) {
                        btnMenu.setVisible(false);
                    }
                }
            },

            onfragmentIOSelect: function (tableName) {
                var me = this;
                var sTableName = tableName;
                sStyleNo = "NEW";

                // console.log("IO from Style");
                if (sTableName === "IOStyleSelectTab") {

                    this.getOwnerComponent().getModel("routeModel").setData([]);
                    // console.log("IOStyleSelectTab");
                    // var oTable = this.byId("IOStyleSelectTab");
                    var oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                    // console.log(oTable);
                    var oSelectedIndices = oTable.getSelectedIndices();
                    console.log("getSelectedIndices", oTable.getSelectedIndices());
                    var oTmpSelectedIndices = [];
                    var aData = oTable.getModel("IOSTYSELDataModel").getData().results;

                    console.log(aData);
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

                    var routeSBU;

                    if (this.getView().byId("cboxSBU") !== undefined) {
                        routeSBU = this.getView().byId("cboxSBU").getSelectedKey();
                    } else {
                        //SBU as DropdownList
                        routeSBU = this.getView().byId("smartFilterBar").getFilterData().SBU;  //get selected SBU
                    }

                    // console.log("routeSBU");
                    // console.log(routeSBU);

                    that._router.navTo("RouteIODetail", {
                        iono: "NEW",
                        // sbu: this.getView().byId("smartFilterBar").getFilterData().SBU,
                        sbu: routeSBU,
                        styleno: sStyleNo,
                        icontabfilterkey: "itfIOHDR"
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

                    var routeSBU;

                    if (this.getView().byId("cboxSBU") !== undefined) {
                        routeSBU = this.getView().byId("cboxSBU").getSelectedKey();
                    } else {
                        //SBU as DropdownList
                        routeSBU = this.getView().byId("smartFilterBar").getFilterData().SBU;  //get selected SBU
                    }

                    that._router.navTo("RouteIODetail", {
                        iono: "NEW",
                        // sbu: this.getView().byId("smartFilterBar").getFilterData().SBU,
                        // sbu: this.getView().byId("cboxSBU").getSelectedKey(),
                        sbu: routeSBU,
                        styleno: sStyleNo,
                        icontabfilterkey: "itfIOHDR"
                    });

                    // console.log("RouteIODetail 2");

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

            formatValueHelp: function (sValue, sPath, sKey, sText, sFormat) {

                // console.log(sValue, sPath, sKey, sText, sFormat);

                // console.log(this.getView().getModel(sPath));
                
                var oValue = this.getView().getModel(sPath).getData().filter(v => v[sKey] === sValue);

                if (oValue && oValue.length > 0) {
                    if (sFormat === "Value") {
                        return oValue[0][sText];
                    }
                    else if (sFormat === "ValueKey") {
                        return oValue[0][sText] + " (" + sValue + ")";
                    }
                    else if (sFormat === "KeyValue") {
                        return sValue + " (" + oValue[0][sText] + ")";
                    }
                }
                else return sValue;
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
                        oData.results.forEach(item => {
                            item.SOLDTOCUST = item.SOLDTOCUST;
                            item.CURRENTVER = item.CURRENTVER === "X" ? true : false;
                            item.COMPLETED = item.COMPLETED === "X" ? true : false;
                        })

                        oData.results.sort((a, b) => (a.STYLENO > b.STYLENO ? -1 : 1));

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
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: false }),  //sColumnLabel
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: false
                                ,
                                tooltip: "{" + sColumnId + "}"
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
                            label: "TEXT",//new sap.m.Text({text: sColumnLabel, wrapping: false}),  //sColumnLabel
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: false
                                ,
                                tooltip: "{" + sColumnId + "}"
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

                // console.log("TableFilter.updateColumnMenu Start");
                // TableFilter.updateColumnMenu("IODynTable", this);
                // console.log("TableFilter.updateColumnMenu end");

                //remove sort icon of currently sorted column
                oTable.attachSort(function (oEvent) {
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bDesceding = false;
                    oTable.getColumns().forEach(col => {
                        if (col.getSorted()) {
                            col.setSorted(false);
                        }
                    })


                    oEvent.getParameter("column").setSorted(true); //sort icon initiator

                    if (oEvent.getParameter("sortOrder") === "Descending") {
                        bDescending = true;
                        oEvent.getParameter("column").setSortOrder("Descending");  //sort icon descending
                    } else {
                        oEvent.getParamter("column").setSortOrder("Ascending");   //sort icon ascending
                    }

                    var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
                    var oColumn = oColumns.filter(fItem => fItem.ColumnName === oEvent.getParameter("column").getProperty("sortProperty"));
                    var columnType = oColumn[0].DataType;

                    if (columnType === "DATETIME") {
                        oSorter.fnCompare = function (a, b) {
                            //parse to Date Object
                            var aDate = new Date(a);
                            var bDate = new Date(b);

                            if (bDate === null) { return -1 };
                            if (aDate === null) { return 1 };
                            if (aDate < bDate) { return -1 };
                            if (aDate > bDate) { return 1 };

                            return 0;
                        }
                    } else if (columnType === "NUMBER") {
                        oSorter.fnCompare = function (a, b) {
                            //parse to Number Object
                            var aNumber = +a;
                            var bNumber = +b;

                            if (aNumber === null) { return 1 };
                            if (bNumber === null) { return -1 };
                            if (aNumber < bNumber) { return -1 };
                            if (aNumber > bNumber) { return 1 };

                            return 0;
                        };
                    };

                    oTable.getBinding('rows').sort(oSorter);
                    //prevent internal sorting of table
                    oEvent.preventDefault();
                })
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

                // var oModel2 = new JSONModel();
                // var oTableStyle = sap.ui.getCore().byId("IOStyleSelectTab");
                // console.log("oTableStyle", oTableStyle);
                // oTableStyle.setModel(oModel2);
                // oTableStyle.attachBrowserEvent('dblclick', function (e) {
                //     e.preventDefault();
                //     that.setChangeStatus(false); //remove change flag
                //     // that.navToDetail(IONOtxt, this._sbu, sStyleNo); //navigate to detail page
                //     that.onfragmentIOSelect('IOStyleSelectTab');

                // });

                // var oModel2 = new JSONModel();
                // var oTable2 =sap.ui.getCore().byId("IOStyleSelectTab");
                // console.log(oTable2);
                // oTable2.setModel(oModel2);
                // oTable2.attachBrowserEvent('dblclick', function (e) {
                //     e.preventDefault();
                //     that.setChangeStatus(false); //remove change flag
                //     // that.navToDetail(IONOtxt, this._sbu, sStyleNo); //navigate to detail page
                //     that.onfragmentIOSelect("IOStyleSelectTab");

                // });
            },

            setSmartFilterModel: function () {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_IO_FILTER_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },

            setColumnFilters(sTable, aFilters) {
                if (aFilters) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    aFilters.forEach(item => {
                        oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                            .forEach(col => {
                                col.filter(item.oValue1);
                            })
                    })
                }
            },

            setColumnSorters(sTable, aSorters) {
                if (aSorters) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    aSorters.forEach(item => {
                        oColumns.filter(fItem => fItem.getSortProperty() === item.sPath)
                            .forEach(col => {
                                col.sort(item.bDescending);
                            })
                    })
                }
            },

            onRowChange: function (oEvent) {
                // console.log("rowContext", oEvent.getParameter("rowContext"));

                if (oEvent.getParameter("rowContext") != null) {
                    var sPath = oEvent.getParameter("rowContext").getPath();
                    var oTable = this.getView().byId("IODynTable");
                    var model = oTable.getModel();
                    var data = model.getProperty(sPath);
                    IONOtxt = data['IONO'];
                    sStyleNo = data['STYLENO'] === undefined || data['STYLENO'] === "" ? "NEW" : data['STYLENO'];
                }
            },

            setChangeStatus: function (changed) {
                //Set change flag 
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch (err) { }
            },

            onSearch: async function () {
                // setTimeout(() => {
                    await this.getDynamicTableColumns();
                // }, 100);

                // setTimeout(() => {
                    await this.getStatistics("/IOSTATISTICSSet"); //style statistics
                // }, 100);
            },

            getDynamicTableColumns:async function () {
                var me = this;
                var sTabId = "IODynTable";

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                //SBU as Combobox
                if (this.getView().byId("cboxSBU") !== undefined) {
                    this._sbu = this.getView().byId("cboxSBU").getSelectedKey();
                    // console.log(this._sbu);
                } else {
                    //SBU as DropdownList
                    this._sbu = this.getView().byId("smartFilterBar").getFilterData().SBU;  //get selected SBU
                    // console.log(this._sbu);
                }

                this.getView().getModel("ui").setProperty("/sbu", this._sbu);

                this._Model.setHeaders({
                    sbu: this._sbu,
                    type: 'IOINIT',
                    tabname: 'ZERP_IOHDR'
                });

                //DynamicColumnsSet
                this._Model.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(oData);
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "DynColumns");  //set the view model

                        // if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                        //     oData.results.forEach(item => {
                        //         oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                        //             .forEach(col => item.ValueHelp = col.ValueHelp)
                        //     })
                        // }

                        me._aIOColumns[sTabId.replace("Tab", "")] = oData.results;
                        me._aColumns[sTabId.replace("Tab", "")] = oData.results;

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
                        // console.log(oData);
                        oData.results.forEach(item => {
                            // console.log(item.CUSTDLVDT);
                            item.CUSTDLVDT = item.CUSTDLVDT === "0000-00-00" || item.CUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.CUSTDLVDT));
                            item.REVCUSTDLVDT = item.REVCUSTDLVDT === "0000-00-00" || item.REVCUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.REVCUSTDLVDT));
                            item.REQEXFTYDT = item.REQEXFTYDT === "0000-00-00" || item.REQEXFTYDT === "    -  -  " ? "" : dateFormat.format(new Date(item.REQEXFTYDT));
                            item.MATETA = item.MATETA === "0000-00-00" || item.MATETA === "    -  -  " ? "" : dateFormat.format(new Date(item.MATETA));
                            item.MAINMATETA = item.MAINMATETA === "0000-00-00" || item.MAINMATETA === "    -  -  " ? "" : dateFormat.format(new Date(item.MAINMATETA));
                            item.SUBMATETA = item.SUBMATETA === "0000-00-00" || item.SUBMATETA === "    -  -  " ? "" : dateFormat.format(new Date(item.SUBMATETA));
                            item.CUTMATETA = item.CUTMATETA === "0000-00-00" || item.CUTMATETA === "    -  -  " ? "" : dateFormat.format(new Date(item.CUTMATETA));
                            item.PLANDLVDT = item.PLANDLVDT === "0000-00-00" || item.PLANDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.PLANDLVDT));
                            item.PRODSTART = item.PRODSTART === "0000-00-00" || item.PRODSTART === "    -  -  " ? "" : dateFormat.format(new Date(item.PRODSTART));
                            item.CREATEDDT = item.CREATEDDT === "0000-00-00" || item.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.CREATEDDT));
                            item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                        })

                        oData.results.sort((a, b,) => (a.IONO > b.IONO ? -1 : 1));

                        var aFilters = [], aSorters = [];
                        if (me.byId("IODynTable").getBinding("rows")) {
                            aFilters = me.byId("IODynTable").getBinding("rows").aFilters;
                            aSorters = me.byId("IODynTable").getBinding("rows").aSorters;
                        }

                        // me.byId("Tab").getModel.setProperty("/rows", oData.results);
                        // me.byId("Tab").bindRows("/rows");
                        // me.getView().getModel("counts").setProperty("/detail", oData.results.length);

                        oText.setText(oData.results.length + "");
                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "IODynTable");
                        me.setTableData();

                        if (aFilters.length > 0) { me.setColumnFilters("IODynTable", aFilters); }
                        if (aSorters.length > 0) { me.setColumnSorters("IODynTable", aSorters); }

                        me.setChangeStatus(false);

                        // TableFilter.applyColFilters(me);
                    },
                    error: function (err) { }
                });
            },

            setTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oColumnsModel = this.getView().getModel("DynColumns");
                var oDataModel = this.getView().getModel("IODynTable");

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
                this._colFilters = [];

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

                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === undefined || sColumnWidth === 0) sColumnWidth = 100;
                    // console.log(sColumnDataType);

                    if (sColumnDataType === "STRING") {
                        return new sap.ui.table.Column({
                            id: "IODynTable" + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                            // template: new sap.m.Text({
                            //     text: "{" + sColumnId + "}",
                            //     wrapping: false
                            //     // , 
                            //     // tooltip: "{" + sColumnId + "}"
                            // }),
                            template: me.columnTemplate(sColumnId, sColumnType),
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
                        // console.log("BOOLEAN : " + sColumnId);
                        return new sap.ui.table.Column({
                            id: "IODynTable" + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
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
                        // console.log(sColumnDataType + " : " + sColumnId);
                        return new sap.ui.table.Column({
                            id: "IODynTable" + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                            // template: new sap.m.Text({
                            //     text: "{" + sColumnId + "}",
                            //     wrapping: false
                            //     // , 
                            //     // tooltip: "{" + sColumnId + "}"
                            // }),
                            template: me.columnTemplate(sColumnId, sColumnType),
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

                // console.log("TableFilter.updateColumnMenu Start");
                // TableFilter.updateColumnMenu("IODynTable", this);
                // console.log("TableFilter.updateColumnMenu end");

                oTable.bindRows("/rows");

                //remove sort icon of currently sorted column
                oTable.attachSort(function (oEvent) {
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bDescending = false;
                    oTable.getColumns().forEach(col => {
                        if (col.getSorted()) {
                            col.setSorted(false);
                        }
                    })


                    oEvent.getParameter("column").setSorted(true); //sort icon initiator

                    if (oEvent.getParameter("sortOrder") === "Descending") {
                        bDescending = true;
                        oEvent.getParameter("column").setSortOrder("Descending");
                    } else {
                        oEvent.getParameter("column").setSortOrder("Ascending");
                    }

                    var oSorter = new sap.ui.model.Sorter(sPath, bDescending);
                    var oColumn = oColumnsData.filter(fItem => fItem.ColumnName === oEvent.getParameter("column").getProperty("sortProperty"));
                    var columnType = oColumn[0].DataType;

                    if (columnType === "DATETIME") {
                        oSorter.fnCompare = function (a, b) {
                            //parse to Date Object
                            var aDate = new Date(a);
                            var bDate = new Date(b);

                            if (bDate === null) { return -1 };
                            if (aDate === null) { return 1 };
                            if (aDate < bDate) { return -1 };
                            if (aDate > bDate) { return 1 };

                            return 0;
                        }
                    } else if (columnType === "NUMBER") {
                        oSorter.fnCompare = function (a, b) {
                            //parse to Number Object
                            var aNumber = +a;
                            var bNumber = +b;

                            if (aNumber === null) { return 1 };
                            if (bNumber === null) { return -1 };
                            if (aNumber < bNumber) { return -1 };
                            if (aNumber > bNumber) { return 1 };

                            return 0;
                        };
                    };

                    
                    oTable.getBinding('rows').sort(oSorter);
                    //prevent internal sorting of table
                    oEvent.preventDefault();
                })

            },

            columnTemplate: function (sColumnId, sColumnType) {
                var oColumnTemplate;
                // console.log(sColumnType);

                //different component based on field
                if (sColumnId === "STATUS") { //display infolabel for Status Code
                    oColumnTemplate = new sap.tnt.InfoLabel({
                        text: "{" + sColumnId + "}",
                        colorScheme: "{= ${" + sColumnId + "} === 'CMP' ? 8 : ${" + sColumnId + "} === 'CRT' ? 2 : ${" + sColumnId + "} === 'REL' ? 8 : ${" + sColumnId + "} === 'EXT' ? 5 : 1}"
                    })
                } else if (sColumnId === "STATUSCD") { //display infolabel for Status Code
                    oColumnTemplate = new sap.tnt.InfoLabel({
                        text: "{" + sColumnId + "}",
                        colorScheme: "{= ${" + sColumnId + "} === 'CLS' ? 5 : ${" + sColumnId + "} === 'CMP' ? 8: ${" + sColumnId + "} === 'CNL' ? 3: ${" + sColumnId + "} === 'CRT' ? 3: ${" + sColumnId + "} === 'MAT' ? 1 : ${" + sColumnId + "} === 'REL' ? 7 : 9}"
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
                }
                else {
                    oColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}", wrapping: false, tooltip: "{IODynTable>" + sColumnId + "}" }); //default text
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

            onSapEnterStyle(oEvent) {
                that.setChangeStatus(false); //remove change flag
                // console.log(this._sbu);
                that.onfragmentIOSelect('IOStyleSelectTab');
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

            getStatistics:async function (EntitySet) {
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
                // console.log("Statistics Filter");
                // console.log(aFilters);
                oModel.read(vEntitySet, {
                    filters: aFilters,
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

                    var oModel2 = new JSONModel();
                    var oTableStyle = sap.ui.getCore().byId("IOStyleSelectTab");
                    console.log("oTableStyle", oTableStyle);
                    oTableStyle.setModel(oModel2);
                    oTableStyle.attachBrowserEvent('dblclick', function (e) {
                        e.preventDefault();
                        that.setChangeStatus(false); //remove change flag
                        // that.navToDetail(IONOtxt, this._sbu, sStyleNo); //navigate to detail page
                        that.onfragmentIOSelect('IOStyleSelectTab');

                    });

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

                if (this.getView().byId("cboxSBU") !== undefined) {
                    this._sbu = this.getView().byId("cboxSBU").getSelectedKey();
                } else {
                    //SBU as DropdownList
                    this._sbu = this.getView().byId("smartFilterBar").getFilterData().SBU;  //get selected SBU
                }

                this.getView().getModel("ui").setProperty("/sbu", this._sbu);

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
                        that.onSapEnterStyle(oEvent);
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
                    var sColumnDataType = context.getObject().ColumnType;
                    // var sColumnToolTip = context.getObject().Tooltip;

                    // console.log(context.getObject());

                    // console.log(sColumnId, sColumnType, sColumnDataType);

                    if (sColumnDataType === "STRING") {
                        return new sap.ui.table.Column({
                            // id: sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: false }),  //sColumnLabel
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
                    } else if (sColumnDataType === "BOOLEAN") {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: false }),  //sColumnLabel
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
                    }
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

                    console.log(sColumnLabel, sColumnDataType);
                    if (sColumnWidth === undefined || sColumnWidth === 0) sColumnWidth = 100;
                    // console.log(sColumnDataType);

                    if (sColumnDataType === "STRING") {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: false }),  //sColumnLabel
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: false
                                ,
                                tooltip: "{" + sColumnId + "}"
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
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: false }),  //sColumnLabel
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
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: false }),  //sColumnLabel
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: false
                                ,
                                tooltip: "{" + sColumnId + "}"
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
                var oTable = this.getView().byId("IODynTable");

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

                // TableFilter.updateColumnMenu("IODynTable", this);

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

                if (this.getView().byId("cboxSBU") !== undefined) {
                    if (this.getView().byId("cboxSBU").getSelectedKey() === undefined) {
                        Common.showMessage("SBU required.");
                        return;
                    }
                } else {
                    if (this.getView().byId("smartFilterBar").getFilterData().SBU === undefined) {
                        Common.showMessage("SBU required.");
                        return;
                    }
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

            onSBUChange: function (oEvent) {
                // console.log("onSBUChange");
                var oFilterData = this._oSmartFilterBar.getFilterData();
                // console.log(oFilterData);

                var oField1Control = this._oSmartFilterBar.getControlByKey("SBU");
                var oField2Control = this._oSmartFilterBar.getControlByKey("PLANPLANT");

                // console.log(oField1Control);
                // console.log(oField2Control);

                // var sField1Value = oField1Control.getValue();
                // console.log("sField1Value");
                // console.log(sField1Value);

                // if (sField1Value) {
                //     oField2Control.setSelectedKey(sField1Value);
                // } else {
                //     oField2Control.setSelectedKey("");
                // }

                // return;

                oModel.read("/ZVB_3DERP_PLANPLANT_SH", {
                    urlParameters: {
                        "$filter": "SBU eq '" + vSBU + "'"
                    },
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            var aData = new JSONModel({ results: oData.results.filter(item => item.SBU === vSBU) });
                            me.getView().setModel(aData, "PlantSH");
                        }
                        else {
                            var aData = new JSONModel({ results: [] });
                            me.getView().setModel(aData, "PlantSH");
                        }
                    },
                    error: function (err) { }
                });

                oModel.read("/ZVB_3DERP_SEASON_SH", {
                    urlParameters: {
                        "$filter": "SBU eq '" + vSBU + "'"
                    },
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            var aData = new JSONModel({ results: oData.results.filter(item => item.SBU === vSBU) });
                            me.getView().setModel(aData, "SeasonSH");
                        }
                        else {
                            var aData = new JSONModel({ results: [] });
                            me.getView().setModel(aData, "SeasonSH");
                        }
                    },
                    error: function (err) { }
                });

                oModel.read("/ZVB_3DERP_IO_SH", {
                    urlParameters: {
                        "$filter": "SBU eq '" + vSBU + "'"
                    },
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            var aData = new JSONModel({ results: oData.results.filter(item => item.SBU === vSBU) });
                            me.getView().setModel(aData, "IOSH");
                        }
                        else {
                            var aData = new JSONModel({ results: [] });
                            me.getView().setModel(aData, "IOSH");
                        }
                    },
                    error: function (err) { }
                });

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

                console.log("IOCOPYSet", oParam);

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

            onHeaderChange: async function (oEvent) {
                // console.log("onHeaderChange");
                var me = this;
                if (oEvent === undefined)
                    return;

                var oSource = oEvent.getSource();

                // this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
                // console.log(this._validationErrors);
                this._bHeaderChanged = true;

                var srcInput = oSource.getBindingInfo("value").parts[0].path;
                // console.log("part", oSource.getBindingInfo("value").parts[0]);

                if (srcInput === "/PRODSCEN") {
                    var sProdScen = this.getView().byId("PRODSCEN").mBindingInfos.value.binding.aValues[0];

                    var oData = this.getView().getModel("ProdScenModel").oData;
                    for (var i = 0; i < oData.length; i++) {
                        if (oData[i].PRODSCEN === sProdScen) {
                            // alert(oData.results[i].PRODPLANT);
                            this.getView().byId("PRODPLANT").setValue(oData[i].PRODPLANT);
                            this.getView().byId("TRADPLANT").setValue(oData[i].TRADPLANT);
                            this.getView().byId("PLANPLANT").setValue(oData[i].PLANPLANT);
                            this.getView().byId("FTYSALTERM").setValue(oData[i].FTY_SALES_TERM);
                            this.getView().byId("CUSSALTERM").setValue(oData[i].CUST_SALES_TERM);
                            this.getView().byId("SALESORG").setValue(oData[i].SALESORG);
                            this.getView().getModel("ui2").setProperty("/WeaveTyp", oData[i].WVTYP);

                        }
                    }
                }

                if (srcInput === "/CUSTDLVDT") {
                    let cntBlank = 0;
                    let fieldList = "";
                    let oFormElement;
                    let oLabel;

                    let inputField = this.getView().byId("PRODSCEN");
                    if (this.isInputFieldBlank(inputField)) {
                        cntBlank++;
                        oFormElement = this.getView().byId("fePRODSCEN");
                        oLabel = oFormElement.getLabel();
                        fieldList += oLabel ? oLabel + ", " : "";
                    }

                    inputField = this.getView().byId("PRODPLANT");
                    if (this.isInputFieldBlank(inputField)) {
                        cntBlank++;
                        oFormElement = this.getView().byId("fePRODPLANT");
                        oLabel = oFormElement.getLabel();
                        fieldList += oLabel ? oLabel + ", " : "";
                    }

                    inputField = this.getView().byId("IOTYPE");
                    if (this.isInputFieldBlank(inputField)) {
                        cntBlank++;
                        oFormElement = this.getView().byId("feIOTYPE");
                        oLabel = oFormElement.getLabel();
                        fieldList += oLabel ? oLabel + ", " : "";
                    }

                    let inputValue = this.getView().byId("CUSTDLVDT").getValue();
                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                    var date = dateFormat.parse(inputValue);
                    var isValid = this.isValidDate(date);

                    if (!isValid) {
                        cntBlank++;
                    }

                    //cntBlank VALUE IS ZERO, NO ERRORS
                    if (cntBlank === 0) {
                        // console.log("true");
                        let txtWeaveTyp;
                        let txtProdPlant;
                        // let txtProdScen = this.getView().byId("PRODSCEN").getValue();
                        let txtProdScen = this.getView().byId("PRODSCEN").mBindingInfos.value.binding.aValues[0];
                        let oData = this.getView().getModel("ProdScenModel").oData;
                        for (var i = 0; i < oData.length; i++) {
                            if (oData[i].PRODSCEN === txtProdScen) {
                                txtWeaveTyp = oData[i].WVTYP;
                                txtProdPlant = oData[i].PRODPLANT;
                            }
                        }

                        // let txtIOType = this.getView().byId("IOTYPE").getValue();
                        let txtIOType = this.getView().byId("IOTYPE").mBindingInfos.value.binding.aValues[0];
                        if (txtProdPlant !== this.getView().byId("PRODPLANT").getValue()) {
                            txtProdPlant = this.getView().byId("PRODPLANT").getValue();
                        }

                        let oModel = this.getOwnerComponent().getModel();

                        let fldCustDlvDt = this.getView().byId("CUSTDLVDT");
                        let CustDlvDtValue = new Date(fldCustDlvDt.getDateValue());

                        // console.log(txtWeaveTyp);

                        await new Promise((resolve, reject) => {
                            oModel.read("/PRDLEADTMSet", {
                                urlParameters: {
                                    "$filter": "SBU eq '" + this._sbu + "' and IOTYPE eq '" + txtIOType + "' and EVENTCD eq 'ALL' and PLANTCD eq '" + txtProdPlant + "' and WEAVETYP eq '" + txtWeaveTyp + "'"
                                },
                                success: function (oData, response) {
                                    // me.getView().setModel(new JSONModel(oData), "PRDLEADTMModel");
                                    // console.log("PRDLEADTMModel");
                                    // console.log(oData);
                                    var dtProdStart = me.getView().byId("PRODSTART");
                                    oData.results.forEach(item => {
                                        CustDlvDtValue.setDate(CustDlvDtValue.getDate() - item.LEADTM);
                                        me.getView().byId("PRODSTART").setValue(sapDateFormat.format(new Date(CustDlvDtValue)));
                                        me.getView().byId("PRODDAYS").setValue(item.LEADTM);
                                        me.getView().getModel("ui2").setProperty("/ProdDays", item.LEADTM);
                                        // dtProdStart.setDateValue(CustDlvDtValue);
                                    })

                                    resolve();
                                },
                                error: function (err) {
                                    resolve();
                                }
                            })
                        })

                        inputField = this.getView().byId("PRODSTART");
                        // let vProdDt = new Date(inputField.getValue());
                        let vProdDt = sapDateFormat.format(new Date(inputField.getValue()));
                        let txtYear = new Date(inputField.getValue()).getFullYear();

                        // console.log(vProdDt);
                        // console.log(txtYear);

                        var dateFormatter = sap.ui.core.format.DateFormat.getDateTimeInstance({
                            pattern: "yyyy-MM-dd'T'HH:mm:ss"
                        });

                        vProdDt = dateFormatter.format(new Date(vProdDt)); // 2023-04-23T00:00:00
                        // console.log(vProdDt);

                        await new Promise((resolve, reject) => {
                            oModel.read("/PRDCALSet", {
                                urlParameters: {
                                    "$filter": "Plantcd eq '" + txtProdPlant + "' and Prodyr eq '" + txtYear + "' and Startdt eq datetime'" + vProdDt + "'"
                                },
                                success: function (oData, response) {
                                    // console.log(oData);
                                    oData.results.forEach(item => {
                                        me.getView().byId("PLANMONTH").setValue(item.Prodyr + "/" + item.Prodmo);
                                        me.getView().byId("PRODWK").setValue(+item.Prodwk);
                                        me.getView().getModel("ui2").setProperty("/ProdWk", item.Prodwk);
                                    })
                                    resolve();
                                },
                                error: function (err) {
                                    resolve();
                                }
                            })
                        })

                        await this.getIOPrefixSet("ZGW_3DERP_RFC_SRV", this._sbu, "");
                    }
                    //cntBlank VALUE IS GREATER THAN ZERO, WITH ERROR
                    else if (cntBlank > 0) {
                        //RESET VALUE OF CUSTDLVDT IF REQUIRED FIELDS NOT PROVIDED
                        this.getView().byId("CUSTDLVDT").setValue("");
                        //LIST OUT THE REQUIRED FIELDS THAT WERE NOT FILLED
                        let trimFieldList = this.removeLastOccurrence(fieldList, ", ");
                        MessageBox.error(trimFieldList + " " + this.getView().getModel("ddtext").getData()["ISREQUIRED"]);
                    }
                }

                if (srcInput === "/PLANDLVDT") {
                    //VALIDATE PLANDLVDT, MUST NOT BE MORE THAN CUSTDLVDT
                    let inputValue = this.getView().byId("PLANDLVDT").getValue();
                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                    var date = dateFormat.parse(inputValue);
                    var isValid = this.isValidDate(date);
                    if (isValid) {
                        let dtPlanDlv = dateFormat.format(new Date(inputValue));
                        let dtCustDlv = dateFormat.format(new Date(this.getView().byId("CUSTDLVDT").getValue()));

                        if (dtPlanDlv > dtCustDlv) {
                            this.getView().byId("PLANDLVDT").setValueState("Error");
                            this.getView().byId("PLANDLVDT").setValueStateText(this.getView().getModel("ddtext").getData()["PLANDLVDT_ERR_VALIDATION"]);
                            this.getView().byId("PLANDLVDT").setValue("");
                        } else if (!Date.parse(dtCustDlv)) {
                            this.getView().byId("PLANDLVDT").setValueState("Error");
                            this.getView().byId("PLANDLVDT").setValueStateText(this.getView().getModel("ddtext").getData()["ERR_CUSTDLVDT_REQUIRED"]);
                            this.getView().byId("PLANDLVDT").setValue("");
                        } else {
                            this.getView().byId("PLANDLVDT").setValueState("None");
                        }
                    }
                }

                if (srcInput === "/STYLENO") {
                    var sStyleNo = this.getView().byId("STYLENO").getValue();

                    var oData = this.getView().getModel("StyleNoModel").oData;
                    // console.log(oData);     
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].STYLENO === sStyleNo) {
                            this.getView().byId("VERNO").setValue(oData.results[i].VERNO);
                            this.getView().byId("PRODTYPE").setValue(oData.results[i].PRODTYP);
                            this.getView().byId("STYLECD").setValue(oData.results[i].STYLECD);
                            this.getView().byId("SEASONCD").setValue(oData.results[i].SEASONCD);
                            this.getView().byId("CUSTGRP").setValue(oData.results[i].CUSTGRP);
                            this.getView().byId("BASEUOM").setValue(oData.results[i].UOM);
                        }
                    }
                }

                if (srcInput === "/CUSTGRP" || srcInput === "SALESGRP") {
                    // var sCustGrp = this.getView().byId("CUSTGRP").getValue();
                    // var sSalesGrp = this.getView().byId("SALESGRP").getValue();

                    var sCustGrp = this.getView().byId("CUSTGRP").mBindingInfos.value.binding.aValues[0];
                    var sSalesGrp = this.getView().byId("SALESGRP").mBindingInfos.value.binding.aValues[0];

                    var oModel = this.getModel("SOLDTOModel");

                }

                if (srcInput === "CSTYPE") {
                    // console.log("CSTYPE oSource : ", oSource);
                }

                //set change flag for header
                this._headerChanged = true;
                this.setChangeStatus(true);
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
                    // alert(this.inputId);
                    var input = sap.ui.getCore().byId(this.inputId);
                    // console.log(input);
                    // console.log(oSelectedItem.getTitle());
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
                orFilter.push(new sap.ui.model.Filter("PLANTCD", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _plantGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = sap.ui.getCore().byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
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
                        console.log("SeasonsModel", oData);
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
                oSHModel.read("/PRODPLANTvhSet", {
                    urlParameters: {
                        // "$filter": "SBU eq '" + this._sbu + "'"
                    },
                    success: function (oData, oResponse) {
                        console.log("PlantModel", oData);
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "PlantModel");
                        // console.log(oView.setModel(oJSONModel, "PlantModel"));
                    },
                    error: function (err) { }
                });
            },

            applyColFilter() {
                var pFilters = this._colFilters;

                if (pFilters.length > 0) {
                    var oTable = this.byId("IODynTable");
                    var oColumns = oTable.getColumns();

                    pFilters.forEach(item => {
                        oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                            .forEach(col => col.filter(item.oValue1))
                    })
                }
            },

            onCloseDialog: function (oEvent) {
                oEvent.getSource().getParent().close();
            },


            onCloseCopyIO: function () {
                this._CopyIODialog.close();
                this._CopyIODialog.destroy();
                this._CopyIODialog = null;
            },

            onCloseIOSD: function () {
                this._IOfromSalesDocDialog.close();
                this._IOfromSalesDocDialog.destroy();
                this._IOfromSalesDocDialog = null;
            },

            onCloseIOStyle: function () {
                this._IOfromStyleDialog.close();
                this._IOfromStyleDialog.destroy();
                this._IOfromStyleDialog = null;
            },

            onCreateIO: function (createTyp) {
                if (this.getView().byId("cboxSBU") !== undefined) {
                    if (this.getView().byId("cboxSBU").getSelectedKey() === undefined) {
                        Common.showMessage("SBU required.");
                        return;
                    } else
                        this._sbu = this.getView().byId("cboxSBU").getSelectedKey();
                } else {
                    if (this.getView().byId("smartFilterBar").getFilterData().SBU === undefined) {
                        Common.showMessage("SBU required.");
                        return;
                    } else
                        this._sbu = this.getView().byId("smartFilterBar").getFilterData().SBU;  //get selected SBU
                }

                var screateTyp = createTyp;
                // Common.showMessage("Create IO : " + screateTyp);
                that.setChangeStatus(false); //remove change flag

                that.onIOCreateSelect(screateTyp);
                if (screateTyp === "Manual") {
                    // that.navToDetail("NEW"); //navigate straight to detail page if Manual
                    this.getOwnerComponent().getModel("routeModel").setData([]);

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

            onSaveSubTableLayout: function (arg) {
                var me = this;
                var ctr = 1;

                if (arg === "IOStyleSelectTab") {
                    // console.log(sap.ui.getCore().byId(arg));
                    var oTable = sap.ui.getCore().byId(arg);
                    var oColumns = oTable.getColumns();
                    var vSBU = this.getView().getModel("ui").getProperty("/sbu");

                    var oParam = {
                        "SBU": vSBU,
                        "TYPE": "IOSTYLIST",
                        "TABNAME": "ZDV__IOSTYLST",
                        "TableLayoutToItems": []
                    };

                    // console.log(oParam);

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
                            sap.m.MessageBox.information("Layout saved.");
                        },
                        error: function (err) {
                            sap.m.MessageBox.error(err);
                        }
                    });
                }
            },

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

            pad: Common.pad,

            onCustomSmartFilterValueHelpChange: function (oEvent) {
                if (oEvent.getParameter("value") === "") {
                    this._oMultiInput.setValueState("None");
                }
            },

            //******************************************* */
            // Column Filtering
            //******************************************* */

            onColFilterClear: function (oEvent) {
                TableFilter.onColFilterClear(oEvent, this);
            },

            onColFilterCancel: function (oEvent) {
                TableFilter.onColFilterCancel(oEvent, this);
            },

            onColFilterConfirm: function (oEvent) {
                TableFilter.onColFilterConfirm(oEvent, this);
            },

            onFilterItemPress: function (oEvent) {
                TableFilter.onFilterItemPress(oEvent, this);
            },

            onFilterValuesSelectionChange: function (oEvent) {
                TableFilter.onFilterValuesSelectionChange(oEvent, this);
            },

            onSearchFilterValue: function (oEvent) {
                TableFilter.onSearchFilterValue(oEvent, this);
            },

            onCustomColFilterChange: function (oEvent) {
                TableFilter.onCustomColFilterChange(oEvent, this);
            },

            onSetUseColFilter: function (oEvent) {
                TableFilter.onSetUseColFilter(oEvent, this);
            },

            onRemoveColFilter: function (oEvent) {
                TableFilter.onRemoveColFilter(oEvent, this);
            },

            getCaptionSet: function () {
                let me = this;
                var oDDTextParam = [], oDDTextResult = {};
                var oJSONModelDDText = new JSONModel();
                var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oDDTextParam.push({ CODE: "COPY" });
                oDDTextParam.push({ CODE: "SAVE" });
                oDDTextParam.push({ CODE: "FORECAST" });
                oDDTextParam.push({ CODE: "ORDER" });
                oDDTextParam.push({ CODE: "SHIPPED" });
                oDDTextParam.push({ CODE: "EXPORTOEXCEL" });
                oDDTextParam.push({ CODE: "MANUALLY" });
                oDDTextParam.push({ CODE: "FRMSALESDOC" });
                oDDTextParam.push({ CODE: "FRMSTYLE" });
                oDDTextParam.push({ CODE: "IONO" });
                oDDTextParam.push({ CODE: "STYLECD" });
                oDDTextParam.push({ CODE: "IOTYPE" });
                oDDTextParam.push({ CODE: "PLANT" });
                oDDTextParam.push({ CODE: "CUSTGRP" });
                oDDTextParam.push({ CODE: "SEASONCD" });
                oDDTextParam.push({ CODE: "SALESGRP" });
                oDDTextParam.push({ CODE: "SBU" });
                oDDTextParam.push({ CODE: "SELECT" });
                oDDTextParam.push({ CODE: "CANCEL" });
                oDDTextParam.push({ CODE: "FILTER" });
                oDDTextParam.push({ CODE: "SELECTSD" });
                oDDTextParam.push({ CODE: "SELECTSTYLE" });
                oDDTextParam.push({ CODE: "COPYIO" });
                oDDTextParam.push({ CODE: "SRCIO" });
                oDDTextParam.push({ CODE: "IODESC" });
                oDDTextParam.push({ CODE: "STYLECD" });
                oDDTextParam.push({ CODE: "SEASONCD" });
                oDDTextParam.push({ CODE: "PLANTCD" });

                oDDTextParam.push({ CODE: "NEWIODESC" });
                oDDTextParam.push({ CODE: "NEWSTYLECD" });
                oDDTextParam.push({ CODE: "NEWSEASONCD" });
                oDDTextParam.push({ CODE: "NEWPLANTCD" });
                oDDTextParam.push({ CODE: "PLANTCD" });

                oDDTextParam.push({ CODE: "NEWSTYLE" });
                oDDTextParam.push({ CODE: "COLOR" });
                oDDTextParam.push({ CODE: "BOM" });
                oDDTextParam.push({ CODE: "COSTING" });
                oDDTextParam.push({ CODE: "SAVELAYOUT" });
                oDDTextParam.push({ CODE: "EXPORTTOEXCEL" });
                oDDTextParam.push({ CODE: "COPYIO" });
                oDDTextParam.push({ CODE: "CREATEIO" });

                // console.log(oDDTextParam);

                setTimeout(() => {
                    oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam }, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            // console.log(oData);
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
            }
        });
    });
