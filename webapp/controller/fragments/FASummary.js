sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController",
    "sap/ui/export/Spreadsheet",
    "../../js/Common",
], function (JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, Spreadsheet, Common) {
    "use strict";

    var _this;
    var _thisMain;

    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

    return {
        onInit(pThis) {
            _thisMain = pThis;
            _this = this;

            this._aColumns = {};
            this._aDataBeforeChange = [];

            var oJSONModel = new sap.ui.model.json.JSONModel();
            oJSONModel.setData({
                activePONo: "",
                activePOItem: ""
            });

            _thisMain.getView().setModel(oJSONModel, "uiFASummary");

            this._aEntitySet = {
                faSummary: "FASUMMARYSet"
            };

            this._aColumns = {};
            this._aSortableColumns = {};
            this._aFilterableColumns = {};

            this.getColumns();
            
            this._oDataBeforeChange = {};
            this._aInvalidValueState = [];

            // _thisMain.byId("faSummaryTab")
            //     .setModel(new JSONModel({
            //         columns: [],
            //         rows: []
            //     }));

            this.getFASummary();
            this.initializeComponent();
        },

        initializeComponent() {
            // FA Sending Detail
            _thisMain._FADCSendDetailDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.FADCSendDetailDialog", _thisMain);
            _thisMain._FADCSendDetailDialog.setModel(
                new JSONModel({
                    items: [],
                    rowCount: 0
                })
            )
            _thisMain.getView().addDependent(_thisMain._FADCSendDetailDialog);

            // FA Receiving Detail
            _thisMain._FADCReceiveDetailDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.FADCReceiveDetailDialog", _thisMain);
            _thisMain._FADCReceiveDetailDialog.setModel(
                new JSONModel({
                    items: [],
                    rowCount: 0
                })
            )
            _thisMain.getView().addDependent(_thisMain._FADCReceiveDetailDialog);

            this._tableRendered = "";
            var oTableEventDelegate = {
                onkeyup: function(oEvent){
                    _this.onKeyUp(oEvent);
                },

                onAfterRendering: function(oEvent) {
                    _this.onAfterTableRendering(oEvent);
                }
            };

            _thisMain.byId("faSummaryTab").addEventDelegate(oTableEventDelegate);

            // Get Captions
            setTimeout(() => {
                this.getCaption();
            }, 100);
        },

        onAfterTableRendering: function(oEvent) {
            if (this._tableRendered !== "") {
                this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                this._tableRendered = "";
            }
        },

        onKeyUp(oEvent) {
            if ((oEvent.key == "ArrowUp" || oEvent.key == "ArrowDown") && oEvent.srcControl.sParentAggregationName == "rows") {
                var oTable = _thisMain.byId(oEvent.srcControl.sId).oParent;

                var sModel = "faSummary";

                if (_thisMain.byId(oEvent.srcControl.sId).getBindingContext(sModel)) {
                    var sRowPath = _thisMain.byId(oEvent.srcControl.sId).getBindingContext(sModel).sPath;

                    oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                    oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow")
                    })
                }
            }
        },

        getColumns: async function() {
            var oModelColumns = new JSONModel();
            var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json")
            await oModelColumns.loadData(sPath);

            var oColumns = oModelColumns.getData();
            var oModel = _thisMain.getOwnerComponent().getModel();

            oModel.metadataLoaded().then(() => {
                this.getDynamicColumns(oColumns, "FASUMMARYMOD", "ZDV_FASUMMARY");
            })
        },

        getDynamicColumns(arg1, arg2, arg3) {
            var oColumns = arg1;
            var modCode = arg2;
            var tabName = arg3;

            //get dynamic columns based on saved layout or ZERP_CHECK
            var oJSONColumnsModel = new JSONModel();
            // this.oJSONModel = new JSONModel();
            var vSBU = _thisMain._sbu;

            var oModel = _thisMain.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            oModel.setHeaders({
                sbu: vSBU,
                type: modCode,
                tabname: tabName
            });
            
            oModel.read("/ColumnsSet", {
                success: function (oData, oResponse) {
                    oJSONColumnsModel.setData(oData);
                    // _this.getView().setModel(oJSONColumnsModel, "columns"); //set the view model

                    if (oData.results.length > 0) {
                        // console.log(modCode)
                        if (modCode === 'FASUMMARYMOD') {
                            var aColumns = _this.setTableColumns(oColumns["faSummary"], oData.results);                               
                            // console.log(aColumns);
                            _this._aColumns["faSummary"] = aColumns["columns"];
                            _this._aSortableColumns["faSummary"] = aColumns["sortableColumns"];
                            _this._aFilterableColumns["faSummary"] = aColumns["filterableColumns"]; 
                            _this.addColumns(_thisMain.byId("faSummaryTab"), aColumns["columns"], "faSummary");
                            _this.setRowReadMode("faSummary");
                        } else if (modCode == 'FADCRCVMOD') {
                            var aColumns = _this.setTableColumns(oColumns["faDCReceiveDetail"], oData.results);                               
                            // console.log(aColumns);
                            _this._aColumns["faDCReceiveDetail"] = aColumns["columns"];
                            _this._aSortableColumns["faDCReceiveDetail"] = aColumns["sortableColumns"];
                            _this._aFilterableColumns["faDCReceiveDetail"] = aColumns["filterableColumns"]; 
                            _this.addColumns(sap.ui.getCore().byId("faDCReceiveDetailTab"), aColumns["columns"], "faDCReceiveDetail");
                            _this.setRowReadMode("faDCReceiveDetail");
                        } else if (modCode == 'FADCSENDMOD') {
                            var aColumns = _this.setTableColumns(oColumns["faDCSendDetail"], oData.results);                               
                            // console.log(aColumns);
                            _this._aColumns["faDCSendDetail"] = aColumns["columns"];
                            _this._aSortableColumns["faDCSendDetail"] = aColumns["sortableColumns"];
                            _this._aFilterableColumns["faDCSendDetail"] = aColumns["filterableColumns"]; 
                            _this.addColumns(sap.ui.getCore().byId("faDCSendDetailTab"), aColumns["columns"], "faDCSendDetail");
                            _this.setRowReadMode("faDCSendDetail");
                        }
                    }
                },
                error: function (err) {
                    _this.closeLoadingDialog();
                }
            });
        },

        setTableColumns: function(arg1, arg2) {
            var oColumn = (arg1 ? arg1 : []);
            var oMetadata = arg2;
            
            var aSortableColumns = [];
            var aFilterableColumns = [];
            var aColumns = [];

            oMetadata.forEach((prop, idx) => {
                var vCreatable = prop.Creatable;
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
                    width: prop.ColumnWidth + 'px',
                    sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                    hideOnChange: false,
                    valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                    showable: vShowable,
                    key: prop.Key === '' ? false : true,
                    maxLength: prop.Length,
                    precision: prop.Decimal,
                    scale: prop.Scale !== undefined ? prop.Scale : null
                })
            })

            aSortableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
            this.createViewSettingsDialog("sort", 
                new JSONModel({
                    items: aSortableColumns,
                    rowCount: aSortableColumns.length,
                    activeRow: 0,
                    table: ""
                })
            );

            aFilterableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
            this.createViewSettingsDialog("filter", 
                new JSONModel({
                    items: aFilterableColumns,
                    rowCount: aFilterableColumns.length,
                    table: ""
                })
            );

            aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
            var aColumnProp = aColumns.filter(item => item.showable === true);

            this.createViewSettingsDialog("column", 
                new JSONModel({
                    items: aColumnProp,
                    rowCount: aColumnProp.length,
                    table: ""
                })
            );

            
            return { columns: aColumns, sortableColumns: aSortableColumns, filterableColumns: aFilterableColumns };
        },

        addColumns(table, columns, model) {
            //console.log("addColumns", table.getColumns(), model)
            if (table.getColumns().length == 0) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
    
                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            // id: col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "BOOLEAN" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })
            }
        },

        getFASummary() {
            Common.openLoadingDialog(_thisMain);

            var oModel = _thisMain.getOwnerComponent().getModel();
            oModel.read('/FASUMMARYSet', { 
                urlParameters: {
                    "$filter": "IONO eq '" + _thisMain._ioNo + "'"
                },
                success: function (data, response) {
                    //console.log("getFASummary", data)

                    data.results.forEach(item => {
                        if (item.PODATE !== null) item.PODATE = dateFormat.format(item.PODATE);
                        if (item.DELIVERYDT !== null) item.DELIVERYDT = dateFormat.format(item.DELIVERYDT);
                    })

                    var oJSONModel = new sap.ui.model.json.JSONModel();
                    oJSONModel.setData(data);

                    var aFilters = [];
                    if (_thisMain.getView().byId("faSummaryTab").getBinding("rows")) {
                        aFilters = _thisMain.getView().byId("faSummaryTab").getBinding("rows").aFilters;
                    }

                    // _thisMain.byId("faSummaryTab").getModel().setProperty("/rows", data.results);
                    // _thisMain.byId("faSummaryTab").bindRows("/rows");
                    _thisMain.getView().setModel(oJSONModel, "faSummary");
                    _this.onRefreshFilter("faSummary", aFilters);
                    _this._tableRendered = "faSummaryTab";

                    if (data.results.length > 0) {
                        var sPONo = data.results[0].PONO;
                        var sPOItem = data.results[0].POITEM;
                        
                        _thisMain.getView().getModel("uiFASummary").setProperty("/activePONo", sPONo);
                        _thisMain.getView().getModel("uiFASummary").setProperty("/activePOItem", sPOItem);
                    }

                    Common.closeLoadingDialog(_thisMain);
                },
                error: function (err) { 
                    Common.closeLoadingDialog(_thisMain);
                }
            })
        },

        onFADCReceiveDtl() {
            Common.openLoadingDialog(_thisMain);

            var oModel = _thisMain.getOwnerComponent().getModel();
            var sPONo = _thisMain.getView().getModel("uiFASummary").getData().activePONo;
            var sPOItem = _thisMain.getView().getModel("uiFASummary").getData().activePOItem;

            oModel.read('/FADCRCVDTLSet', { 
                urlParameters: {
                    "$filter": "PONO eq '" + sPONo + "' and POITEM eq '" + sPOItem + "'"
                },
                success: function (data, response) {
                    //console.log("onFADCReceiveDtl", data)

                    data.results.forEach(item => {
                        if (item.POSTDT !== null) item.POSTDT = dateFormat.format(item.POSTDT);
                        if (item.ACTDLVDT !== null) item.ACTDLVDT = dateFormat.format(item.ACTDLVDT);
                        if (item.REFDOCDT !== null) item.REFDOCDT = dateFormat.format(item.REFDOCDT);
                    })

                    _thisMain._FADCReceiveDetailDialog.getModel().setProperty("/items", data.results);
                    _thisMain._FADCReceiveDetailDialog.getModel().setProperty("/rowCount", data.results.length);
                    _thisMain._FADCReceiveDetailDialog.open();

                    setTimeout(() => {
                        _this.getDynamicColumns({}, "FADCRCVMOD", "ZDV_FADCRCVDTL");
                        //_this.getDynamicColumns("FADCRCVMOD", "ZDV_FADCRCVDTL", "faDCReceiveDetailTab", {});
                    }, 100);

                    Common.closeLoadingDialog(_thisMain);
                },
                error: function (err) { 
                    // console.log("onFADCReceiveDtl error", err)
                    Common.closeLoadingDialog(_thisMain);
                }
            })
        },

        onFADCReceiveDetailClose() {
            _thisMain._FADCReceiveDetailDialog.close();
        },

        onFADCSendDtl() {
            Common.openLoadingDialog(_thisMain);

            var oModel = _thisMain.getOwnerComponent().getModel();
            var sPONo = _thisMain.getView().getModel("uiFASummary").getData().activePONo;
            var sPOItem = _thisMain.getView().getModel("uiFASummary").getData().activePOItem;

            oModel.read('/FADCSENDDTLSet', { 
                urlParameters: {
                    "$filter": "PONO eq '" + sPONo + "' and POITEM eq '" + sPOItem + "'"
                },
                success: function (data, response) {
                    //console.log("onFADCSendDtl", data)

                    data.results.forEach(item => {
                        if (item.POSTDT !== null) item.POSTDT = dateFormat.format(item.POSTDT);
                        if (item.ACTDLVDT !== null) item.ACTDLVDT = dateFormat.format(item.ACTDLVDT);
                        if (item.REFDOCDT !== null) item.REFDOCDT = dateFormat.format(item.REFDOCDT);
                        if (item.ETD !== null) item.ETD = dateFormat.format(item.ETD);
                        if (item.ETA !== null) item.ETA = dateFormat.format(item.ETA);
                    })

                    _thisMain._FADCSendDetailDialog.getModel().setProperty("/items", data.results);
                    _thisMain._FADCSendDetailDialog.getModel().setProperty("/rowCount", data.results.length);
                    _thisMain._FADCSendDetailDialog.open();

                    setTimeout(() => {
                        _this.getDynamicColumns({}, "FADCSENDMOD", "ZDV_FADCSENDDTL");
                        //_this.getDynamicColumns("FADCSENDMOD", "ZDV_FADCSENDDTL", "faDCSendDetailTab", {});
                    }, 100);

                    Common.closeLoadingDialog(_thisMain);
                },
                error: function (err) { 
                    // console.log("onFADCSendDtl error", err);
                    Common.closeLoadingDialog(_thisMain);
                }
            })
        },

        onFADCSendDetailClose() {
            _thisMain._FADCSendDetailDialog.close();
        },

        setRowReadMode(arg) {
            var oTable;

            if (arg == "faSummary") {
                oTable = _thisMain.byId(arg + "Tab");
            } else {
                oTable = sap.ui.getCore().byId(arg + "Tab");
            }
            
            oTable.getColumns().forEach((col, idx) => {                    
                this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                    .forEach(ci => {
                        if (ci.type === "STRING" || ci.type === "NUMBER") {
                            col.setTemplate(new sap.m.Text({
                                text: "{" + arg + ">" + ci.name + "}",
                                wrapping: false,
                                tooltip: "{" + arg + ">" + ci.name + "}"
                            }));
                        }
                        else if (ci.type === "BOOLEAN") {
                            col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                        }

                        if (ci.required) {
                            col.getLabel().removeStyleClass("requiredField");
                        }
                    })
            })

            if (arg == "faSummary") {
                // Reapply filter
                var aFilters = [];
                if (oTable.getBinding("rows")) {
                    aFilters = oTable.getBinding("rows").aFilters;
                }

                _this.onRefreshFilter(arg, aFilters);
            }
        },

        onCellClickFASummary(oEvent) {
            var sPONo = oEvent.getParameters().rowBindingContext.getObject().PONO;
            var sPOItem = oEvent.getParameters().rowBindingContext.getObject().POITEM;

            _thisMain.getView().getModel("uiFASummary").setProperty("/activePONo", sPONo);
            _thisMain.getView().getModel("uiFASummary").setProperty("/activePOItem", sPOItem);

            _this.onCellClick(oEvent);
            //console.log("onCellClickFASummary", _thisMain.getView().getModel("uiFASummary"));
        },

        onExportFASummary() {
            // var oButton = oEvent.getSource();
            // var tabName = oButton.data('TableName')
            var oTable = _thisMain.getView().byId("faSummaryTab");

            var aCols = [], aRows, oSettings, oSheet;
            var aParent, aChild;
            var fileName;

            var columns = oTable.getColumns();
            // console.log(oTable.getModel())
            for (var i = 0; i < columns.length; i++) {
                aCols.push({
                    label: columns[i].mProperties.filterProperty,
                    property: columns[i].mProperties.filterProperty,
                    type: 'string'
                })
            }

            aRows = _thisMain.getView().getModel("faSummary").getData.results;
            // var property;
            // property = '/rows';
            // aRows = oTable.getModel().getProperty(property);
            // if (tabName === 'styleDetldBOMTab') {
            //     property = '/results/items';
            //     aParent = oTable.getModel('DataModel').getProperty(property);

            //     aRows = [];

            //     for (var i = 0; i < aParent.length; i++) {
            //         aRows.push(aParent[i]);
            //         try {
            //             for (var j = 0; j < aParent[i].items.length; j++) {
            //                 aChild = aParent[i].items[j];
            //                 aRows.push(aChild);

            //                 try {
            //                     for (var k = 0; k < aChild.items.length; k++) {
            //                         aChild = aParent[i].items[j].items[k];
            //                         aRows.push(aChild);
            //                     }
            //                 } catch(err) {}
            //             }
            //         } catch(err) {}
            //     }
                
            // } 
            // else if (tabName === "styleMatListTab") {
            //     property = '/rows';
            //     aRows = oTable.getModel().getProperty(property);
            // }
            // else {
            //     property = '/results';
            //     aRows = oTable.getModel('DataModel').getProperty(property);
            // }

            var date = new Date();
            fileName = "FASummary " + date.toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" });

            oSettings = {
                fileName: fileName,
                workbook: { columns: aCols },
                dataSource: aRows
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    MessageToast.show('Spreadsheet export has finished');
                })
                .finally(function () {
                    oSheet.destroy();
                });
        },

        onRefreshFASummary() {
            _this.getFASummary();
        },

        onRefreshFilter(pModel, pFilters) {
            // console.log("onRefreshFilter", pFilters)
            if (pFilters.length > 0) {
                pFilters.forEach(item => {
                    var iColIdx = _this._aColumns[pModel].findIndex(x => x.ColumnName == item.sPath);
                    // console.log("pFilterspath", iColIdx, _this._aColumns[pModel], item.sPath)
                    _thisMain.getView().byId(pModel + "Tab").filter(_thisMain.getView().byId(pModel + "Tab").getColumns()[iColIdx], 
                        item.oValue1);
                });
            }
        },

        createViewSettingsDialog: function (arg1, arg2) {
            // var sDialogFragmentName = null;

            // if (arg1 === "sort") sDialogFragmentName = "zuiio2.view.fragments.SortDialog";
            // else if (arg1 === "filter") sDialogFragmentName = "zuiio2.view.fragments.FilterDialog";
            // else if (arg1 === "column") sDialogFragmentName = "zuiio2.view.fragments.ColumnDialog";

            // var oViewSettingsDialog = this._oViewSettingsDialog[sDialogFragmentName];

            // if (!oViewSettingsDialog) {
            //     oViewSettingsDialog = sap.ui.xmlfragment(sDialogFragmentName, this);
                
            //     if (Device.system.desktop) {
            //         oViewSettingsDialog.addStyleClass("sapUiSizeCompact");
            //     }

            //     oViewSettingsDialog.setModel(arg2);

            //     this._oViewSettingsDialog[sDialogFragmentName] = oViewSettingsDialog;
            //     this.getView().addDependent(oViewSettingsDialog);
            // }
        },
        
        getConnector(args) {
            var oConnector;

            switch (args) {
                case "EQ":
                    oConnector = sap.ui.model.FilterOperator.EQ
                    break;
                  case "Contains":
                    oConnector = sap.ui.model.FilterOperator.Contains
                    break;
                  default:
                    // code block
                    break;
            }

            return oConnector;
        },

        onFirstVisibleRowChanged: function (oEvent) {
            var oTable = oEvent.getSource();
            var sModel = "faSummary";

            setTimeout(() => {
                var oData = oTable.getModel(sModel).getData().results;
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
            var sModel = "faSummary";

            _this.setActiveRowHighlight(sModel);
        },

        setActiveRowHighlight(arg) {
            var oTable = _thisMain.byId(arg + "Tab");

            setTimeout(() => {
                var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");
                oTable.getRows().forEach((row, idx) => {
                    if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                        row.addStyleClass("activeRow");
                    }
                    else {
                        row.removeStyleClass("activeRow");
                    }
                })
            }, 2);
        },

        onCellClick: function(oEvent) {
            if (oEvent.getParameters().rowBindingContext) {
                var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                var sModel = "faSummary";

                oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                oTable.getRows().forEach(row => {
                    if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                        row.addStyleClass("activeRow");
                    }
                    else row.removeStyleClass("activeRow");
                })
            }
        },

        getCaption() {
            var oJSONModel = new JSONModel();
            var oDDTextParam = [];
            var oDDTextResult = {};
            var oModel = _thisMain.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            
            // Label
            oDDTextParam.push({CODE: "FADCRCVDTL"});
            oDDTextParam.push({CODE: "FADCSENDDTL"});
            oDDTextParam.push({CODE: "EXPORTTOEXCEL"});
            oDDTextParam.push({CODE: "CLOSE"});
            oDDTextParam.push({CODE: "REFRESH"});
            // console.log("getCaption", { CaptionMsgItems: oDDTextParam  })
            oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                method: "POST",
                success: function(oData, oResponse) {
                    // console.log("getCaption", oData.CaptionMsgItems.results)
                    oData.CaptionMsgItems.results.forEach(item => {
                        oDDTextResult[item.CODE] = item.TEXT;
                    })

                    oJSONModel.setData(oDDTextResult);
                    _thisMain.getView().setModel(oJSONModel, "ddtextFASummary");
                },
                error: function(err) {
                    // console.log("getCaption error", err)
                }
            });
        }
    };
});