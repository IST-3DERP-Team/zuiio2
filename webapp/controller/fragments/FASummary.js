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
], function (JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, Spreadsheet) {
    "use strict";

    var _this;
    var _thisMain;

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
            var oModel = _thisMain.getOwnerComponent().getModel();

            oModel.read('/FASUMMARYSet', { 
                urlParameters: {
                    "$filter": "IONO eq '" + _thisMain._ioNo + "'"
                },
                success: function (oData, response) {
                    console.log("getFASummary", oData)
                    _thisMain.byId("faSummaryTab").getModel().setProperty("/rows", oData.results);
                    _thisMain.byId("faSummaryTab").bindRows("/rows");
                },
                error: function (err) { }
            })
        },

        onFADCReceiveDtl() {
            var oModel = _thisMain.getOwnerComponent().getModel();
            var sPONo = _thisMain.getView().getModel("uiFASummary").getData().activePONo;
            var sPOItem = _thisMain.getView().getModel("uiFASummary").getData().activePOItem;

            oModel.read('/FADCRCVDTLSet', { 
                urlParameters: {
                    "$filter": "PONO eq '" + sPONo + "' and POITEM eq '" + sPOItem + "'"
                },
                success: function (oData, response) {
                    console.log("onFADCReceiveDtl", oData)
                    var data = oData.results;
                    var rowCount = oData.results.length;

                    _thisMain._FADCReceiveDetailDialog.getModel().setProperty("/items", data);
                    _thisMain._FADCReceiveDetailDialog.getModel().setProperty("/rowCount", rowCount);
                    _thisMain._FADCReceiveDetailDialog.open();

                    setTimeout(() => {
                        _this.getDynamicColumns("FADCRCVMOD", "ZDV_FADCRCVDTL", "faDCReceiveDetailTab", {});
                    }, 100);
                },
                error: function (err) { 
                    console.log("onFADCReceiveDtl error", err)
                }
            })
        },

        onFADCReceiveDetailClose() {
            _thisMain._FADCReceiveDetailDialog.close();
        },

        onFADCSendDtl() {
            var oModel = _thisMain.getOwnerComponent().getModel();
            var sPONo = _thisMain.getView().getModel("uiFASummary").getData().activePONo;
            var sPOItem = _thisMain.getView().getModel("uiFASummary").getData().activePOItem;

            oModel.read('/FADCSENDDTLSet', { 
                urlParameters: {
                    "$filter": "PONO eq '" + sPONo + "' and POITEM eq '" + sPOItem + "'"
                },
                success: function (oData, response) {
                    console.log("onFADCSendDtl", oData)
                    var data = oData.results;
                    var rowCount = oData.results.length;

                    _thisMain._FADCSendDetailDialog.getModel().setProperty("/items", data);
                    _thisMain._FADCSendDetailDialog.getModel().setProperty("/rowCount", rowCount);
                    _thisMain._FADCSendDetailDialog.open();

                    setTimeout(() => {
                        _this.getDynamicColumns("FADCSENDMOD", "ZDV_FADCSENDDTL", "faDCSendDetailTab", {});
                    }, 100);
                },
                error: function (err) { 
                    console.log("onFADCSendDtl error", err)
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

            console.log("onCellClickFASummary", _thisMain.getView().getModel("uiFASummary"));
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
        }
    };
});