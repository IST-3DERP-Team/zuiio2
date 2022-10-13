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
            this.getColumnProp();

            this._aColumns = {};
            this._aDataBeforeChange = [];

            var oJSONModel = new sap.ui.model.json.JSONModel();
            oJSONModel.setData({
                activePONo: "",
                activePOItem: ""
            });

            _thisMain.getView().setModel(oJSONModel, "uiFASummary");

            _thisMain.byId("faSummaryTab")
                .setModel(new JSONModel({
                    columns: [],
                    rows: []
                }));

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

            // Get Captions
            setTimeout(() => {
                this.getCaption();
            }, 100);
        },

        getColumnProp: async function() {
            var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");
    
            var oModelColumns = new JSONModel();
            await oModelColumns.loadData(sPath);

            var oColumns = oModelColumns.getData();

            setTimeout(() => {
                this.getDynamicColumns("FASUMMARYMOD", "ZDV_FASUMMARY", "faSummaryTab", oColumns);
            }, 100);
        },

        getDynamicColumns(arg1, arg2, arg3, arg4) {
            var sType = arg1;
            var sTabName = arg2;
            var sTabId = arg3;
            var oLocColProp = arg4;
            var oModel = _thisMain.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            var vSBU = _thisMain._sbu;

            oModel.setHeaders({
                sbu: vSBU,
                type: sType,
                tabname: sTabName
            });

            oModel.read("/ColumnsSet", {
                success: function (oData, oResponse) {
                     console.log(sTabId, oData)
                    if (oData.results.length > 0) {

                        if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                            oData.results.forEach(item => {
                                oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                    .forEach(col => item.ValueHelp = col.ValueHelp )
                            })
                        }

                        _this._aColumns[sTabId.replace("Tab", "")] = oData.results;
                        _this.setTableColumns(sTabId, oData.results);
                    }
                },
                error: function (err) {
                }
            });
        },

        setTableColumns(arg1, arg2) {

            var sTabId = arg1;
            var oColumns = arg2;
            var oTable; // = _thisMain.getView().byId(sTabId);

            if (sTabId == "faSummaryTab") {
                oTable = _thisMain.getView().byId(sTabId);
            } else {
                oTable = sap.ui.getCore().byId(sTabId)
            }
           
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
                    label: new sap.m.Text({text: sColumnLabel}),
                    template: new sap.m.Text({ 
                        text: "{" + sColumnId + "}", 
                        wrapping: false
                        //tooltip: "{" + sColumnId + "}"
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

                    var aFilters = [];
                    if (_thisMain.getView().byId("faSummaryTab").getBinding("rows")) {
                        aFilters = _thisMain.getView().byId("faSummaryTab").getBinding("rows").aFilters;
                    }

                    _thisMain.byId("faSummaryTab").getModel().setProperty("/rows", data.results);
                    _thisMain.byId("faSummaryTab").bindRows("/rows");

                    _this.onRefreshFilter("faSummary", aFilters);

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
                        _this.getDynamicColumns("FADCRCVMOD", "ZDV_FADCRCVDTL", "faDCReceiveDetailTab", {});
                    }, 100);

                    Common.closeLoadingDialog(_thisMain);
                },
                error: function (err) { 
                    console.log("onFADCReceiveDtl error", err)
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
                        _this.getDynamicColumns("FADCSENDMOD", "ZDV_FADCSENDDTL", "faDCSendDetailTab", {});
                    }, 100);

                    Common.closeLoadingDialog(_thisMain);
                },
                error: function (err) { 
                    console.log("onFADCSendDtl error", err);
                    Common.closeLoadingDialog(_thisMain);
                }
            })
        },

        onFADCSendDetailClose() {
            _thisMain._FADCSendDetailDialog.close();
        },

        onCellClickFASummary(oEvent) {
            var sPONo = oEvent.getParameters().rowBindingContext.getObject().PONO;
            var sPOItem = oEvent.getParameters().rowBindingContext.getObject().POITEM;

            _thisMain.getView().getModel("uiFASummary").setProperty("/activePONo", sPONo);
            _thisMain.getView().getModel("uiFASummary").setProperty("/activePOItem", sPOItem);

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
            console.log(oTable.getModel())
            for (var i = 0; i < columns.length; i++) {
                aCols.push({
                    label: columns[i].mProperties.filterProperty,
                    property: columns[i].mProperties.filterProperty,
                    type: 'string'
                })
            }

            var property;
            property = '/rows';
            aRows = oTable.getModel().getProperty(property);
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
            console.log("onRefreshFilter", pFilters)
            if (pFilters.length > 0) {
                pFilters.forEach(item => {
                    var iColIdx = _this._aColumns[pModel].findIndex(x => x.ColumnName == item.sPath);
                    console.log("pFilterspath", iColIdx, _this._aColumns[pModel], item.sPath)
                    _thisMain.getView().byId(pModel + "Tab").filter(_thisMain.getView().byId(pModel + "Tab").getColumns()[iColIdx], 
                        item.oValue1);
                });
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
            console.log("getCaption", { CaptionMsgItems: oDDTextParam  })
            oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                method: "POST",
                success: function(oData, oResponse) {
                    console.log("getCaption", oData.CaptionMsgItems.results)
                    oData.CaptionMsgItems.results.forEach(item => {
                        oDDTextResult[item.CODE] = item.TEXT;
                    })

                    oJSONModel.setData(oDDTextResult);
                    _thisMain.getView().setModel(oJSONModel, "ddtextFASummary");
                },
                error: function(err) {
                    console.log("getCaption error", err)
                }
            });
        }
    };
});