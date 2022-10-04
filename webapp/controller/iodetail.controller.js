sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "sap/ui/model/json/JSONModel",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger',
    'sap/m/MessageStrip',
    "../control/DynamicTable"
],
    /** 
     * @param {typeof sap.ui.core.mvc.Controller} Controller 
     */
    function (Controller, Filter, Common, Utils, JSONModel, jQuery, HashChanger, MessageStrip, control) {
        "use strict"; 

        var that;

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        var Core = sap.ui.getCore();

        return Controller.extend("zuiio2.controller.iodetail", {
            onInit: function () {
                that = this; 
                
                //get current userid
                var oModel= new sap.ui.model.json.JSONModel();
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })

                this._Model = this.getOwnerComponent().getModel();
                this._Model2 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this._Model3 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteIODetail").attachPatternMatched(this._routePatternMatched, this);                
            },

            _routePatternMatched: function (oEvent) {
                this._ioNo = oEvent.getParameter("arguments").iono; //get Style from route pattern
                this._sbu = oEvent.getParameter("arguments").sbu; //get SBU from route pattern

                //set all as no changes at first load
                this._headerChanged = false;

                //set Change Status    
                this.setChangeStatus(false);
                
                if (this._ioNo === "NEW") { 
                    //create new - only header is editable at first
                    this.setHeaderEditMode(); 
                    // this.setDetailVisible(false);
                }else {
                    //existing style, get the style data
                    this.cancelHeaderEdit(); 
                    // this.setDetailVisible(true); //make detail section visible
                }
                
                //Load header
                this.getHeaderConfig(); //get visible header fields
                this.getHeaderData(); //get header data

                // build Dynamic table for Attributes
                setTimeout(() => {
                    this.getAttribDynamicTableColumns(); 
                },100);

                //build Dynamic table for Status
                setTimeout(() => {
                    this.getStatDynamicTableColumns(); 
                },100);

                //build Dynamic table for Delivery Schedule
                setTimeout(() => {
                    this.getDlvSchedDynamicTableColumns(); 
                },100);

                // //build Dynamic table for Delivery Details
                // setTimeout(() => {
                //     this.getDlvDetDynamicTableColumns(); 
                // },100);
            },

            getDlvSchedDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();
                
                // this._SBU = this.getView().byId("SmartFilterBar").getFilterData().SBU;  //get selected SBU
                // this._sbu = 'VER'
                this._Model3.setHeaders({
                    sbu: this._sbu,
                    type: 'IODLV',
                    tabname: 'ZDV_3DERP_IODLV'
                    // userid: this._userid
                    // userid: 'BAS_CONN'
                });

                this._Model3.read("/ColumnsSet", {
                    success: function (oData, oResponse) { 
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "DlvSchedDynColumns");  //set the view model
                        console.log(me.getView().setModel(oJSONColumnsModel, "DlvSchedDynColumns"));  //set the view model
                        setTimeout(() => {
                            me.getDlvSchedDynamicTableData(oData.results); 
                        },100);                        
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

                var oText = this.getView().byId("DlvSchedCount");
                
                oModel.read("/IODLVSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) { 
                        // oText.setText(oData.Results.length + "");

                        // oData.results.forEach(item => {
                        //     item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);                            
                        // })

                        console.log(oData);

                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "DlvSchedDataModel");
                        // console.log(me.getView().setModel(oJSONDataModel, "DataModel"));
                        setTimeout(() => {
                            me.setDlvSchedTableData();
                        },100);                           
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

                // //add column for copy button
                // oColumnsData.unshift({
                //     "ColumnName": "Copy",
                //     "ColumnType": "COPY",
                //     "Visible": false
                // });
 
                // //add column for manage button
                // oDetColumnsData.unshift({
                //     "ColumnName": "ManageStat",
                //     "ColumnType": "SEL"
                // });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTableDlvSched = this.getView().byId("IODlvSchedDynTable");
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
                        template: me.columnTemplate(sColumnId, sColumnType,"DlvSched"),
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
                        },100);                        
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
                        },100);                           
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
                        template: me.columnTemplate(sColumnId, sColumnType,"Stat"),
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
                        },100);                        
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
                        console.log("attrib data");
                        console.log(me.getView().setModel(oJSONDataModel, "DataModel"));
                        setTimeout(() => {
                            me.setAttribTableData();
                        },100);
                        
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
                        template: me.columnTemplate(sColumnId, sColumnType,"Attrib"),
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
                    if(sSource === "Attrib") {
                        tToolTip = "Manage this Attribute"
                        sKey ="VERNO"
                    } else if(sSource === "Stat") {
                        tToolTip = "Manage this Status"
                        sKey ="STATUSCD"
                    } else if(sSource === "DlvSched") {
                        tToolTip = "Manage this Status"
                        sKey ="DLVSEQ"
                    }
                    oDetColumnTemplate = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://detail-view",
                        type: "Ghost"
                        // ,press: this.goToDetail 
                        ,tooltip: tToolTip
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
                    ,wrapping: false
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
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var oJSONModel = new sap.ui.model.json.JSONModel();

                //get header fields
                oModel.setHeaders({
                    sbu: this._sbu,
                    type: 'IOHDR',
                    userid: this._userid
                });
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        var visibleFields = new JSONModel();
                        var visibleFields = {};
                        //get only visible fields
                        for (var i = 0; i < oData.results.length; i++) {
                            visibleFields[oData.results[i].ColumnName] = oData.results[i].Visible;
                        }
                        var JSONdata = JSON.stringify(visibleFields);
                        var JSONparse = JSON.parse(JSONdata);
                        oJSONModel.setData(JSONparse);
                        oView.setModel(oJSONModel, "VisibleFieldsData");
                    },
                    error: function (err) { }
                });

            },

            setChangeStatus: function(changed) {
                //controls the edited warning message
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch(err) {}
            },

            getHeaderData: function () {
                var me = this;
                var ioNo = this._ioNo;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                Common.openLoadingDialog(that);

                //read Style header data
                var entitySet = "/IOHDRSet('" + ioNo + "')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {

                        // oData.results.forEach(item => {
                        //     // item.CUSTDLVDT = dateFormat.format(item.CUSTDLVDT);
                        //     // item.REVCUSTDLVDT = dateFormat.format(item.REVCUSTDLVDT);
                        //     // item.REQEXFTYDT = dateFormat.format(item.REQEXFTYDT);                            
                        //     // item.MATETA = dateFormat.format(item.MATETA);
                        //     // item.MAINMATETA = dateFormat.format(item.MAINMATETA);
                        //     // item.SUBMATETA = dateFormat.format(item.SUBMATETA);
                        //     // item.CUTMATETA = dateFormat.format(item.CUTMATETA);
                        //     // item.PLANDLVDT = dateFormat.format(item.PLANDLVDT);
                        //     // item.PRODSTART = dateFormat.format(item.PLANDLVDT);
                        //     item.CREATEDDT = dateFormat.format(item.CREATEDDT);
                        //     item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);                           
                        // })

                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "headerData");
                        // console.log(oView);
                        Common.closeLoadingDialog(that);
                        me.setChangeStatus(false);
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
            },

            // setDetailVisible: function(bool) {
            //     var detailPanel = this.getView().byId('detailPanel'); //show detail section if there is header info
            //     detailPanel.setVisible(bool);
            // },

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
                    that.getHeaderData();
                }
                var oMsgStrip = that.getView().byId('HeaderMessageStrip');
                oMsgStrip.setVisible(false);
            }
        });
    });