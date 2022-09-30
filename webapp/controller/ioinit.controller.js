sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
     "../control/DynamicTable"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, Common, Utils, JSONModel, Spreadsheet, control) {
        "use strict";

        var that;
        var sbu;

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        return Controller.extend("zuiio2.controller.ioinit", {
            onInit: function () {
                that = this; 

                //get current userid
                var oModel= new sap.ui.model.json.JSONModel();
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                // this._router.getRoute("RouteSalesDocHdr").attachPatternMatched(this._routePatternMatched, this);

                this._Model = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this.setSmartFilterModel();  
            },
            setSmartFilterModel: function () {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_IO_FILTER_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },

            setChangeStatus: function(changed) {
                //Set change flag 
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch (err) {}
            },

            onSearch: function () {
                this.getDynamicTableColumns();
                // this.getStyleStats(); //style statistics
            },

            getDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                // this._sbu = this.getView().byId("smartFilterBar").getFilterData().SBU.text;  //get selected SBU
                this._sbu = this.getView().byId("cboxSBU").getSelectedKey();
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
                console.log(aFilters);
                var oText = this.getView().byId("IOCount");

                // this.addDateFilters(aFilters); //date not automatically added to filters
                // console.log(oModel);
                oModel.read("/IOHDRSet", {
                    filters: aFilters,
                    success: function (oData, oResponse) {
                        oData.results.forEach(item => {
                            item.CUSTDLVDT = dateFormat.format(item.CUSTDLVDT);
                            item.REVCUSTDLVDT = dateFormat.format(item.REVCUSTDLVDT);
                            item.REQEXFTYDT = dateFormat.format(item.REQEXFTYDT);                            
                            item.MATETA = dateFormat.format(item.MATETA);
                            item.MAINMATETA = dateFormat.format(item.MAINMATETA);
                            item.SUBMATETA = dateFormat.format(item.SUBMATETA);
                            item.CUTMATETA = dateFormat.format(item.CUTMATETA);
                            item.PLANDLVDT = dateFormat.format(item.PLANDLVDT);
                            item.PRODSTART = dateFormat.format(item.PLANDLVDT);
                            item.CREATEDDT = dateFormat.format(item.CREATEDDT);
                            item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);
                        })
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

                // //add column for copy button
                // oColumnsData.unshift({
                //     "ColumnName": "Copy",
                //     "ColumnType": "COPY",
                //     "Visible": false
                // });

                //add column for manage button
                oColumnsData.unshift({
                    "ColumnName": "Manage",
                    "ColumnType": "SEL"
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({ 
                    columns: oColumnsData,
                    rows: oData
                });

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

                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible ,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                });

                //bind the data to the table
                oTable.bindRows("/rows");
            },

            columnTemplate: function (sColumnId, sColumnType) {
                var oColumnTemplate;
                
                //different component based on field
                if (sColumnId === "STATUS") { //display infolabel for Status Code
                    // console.log(sColumnId);
                    oColumnTemplate = new sap.tnt.InfoLabel({
                        text: "{" + sColumnId + "}",
                        colorScheme: "{= ${" + sColumnId + "} === 'CMP' ? 8 : ${" + sColumnId + "} === 'CRT' ? 3 : ${" + sColumnId + "} === 'REL' ? 8 : ${" + sColumnId + "} === 'EXT' ? 5 : 1}"
                    })
                }else if (sColumnId === "STATUSCD") { //display infolabel for Status Code
                    oColumnTemplate = new sap.tnt.InfoLabel({
                        text: "{" + sColumnId + "}",
                        colorScheme: "{= ${" + sColumnId + "} === 'CMP' ? 8 : ${" + sColumnId + "} === 'CRT' ? 3 : ${" + sColumnId + "} === 'REL' ? 8 : ${" + sColumnId + "} === 'EXT' ? 5 : 1}"
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
                // alert(this.sbu);
                that._router.navTo("RouteIODetail", {
                    iono: ioNO,
                    sbu: that._sbu
                });
            },

            onCopyIO: function(oEvent) {
                // var oButton = oEvent.getSource();
                // var ioNO = oButton.data("IONO").IONO;   
                
                alert("Copy IO");
                
                 //open the copy style dialog
                 if (!that._CopyIODialog) {
                    that._CopyIODialog = sap.ui.xmlfragment("zuiio2.view.fragments.CopyIO", that);
                    that.getView().addDependent(that._CopyIODialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", that.getView(), that._LoadingDialog);
                that._CopyIODialog.addStyleClass("sapUiSizeCompact");
                that._CopyIODialog.open();
            },

            pad: Common.pad
        });
    });
